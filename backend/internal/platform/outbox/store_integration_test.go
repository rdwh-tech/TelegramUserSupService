//go:build integration

package outbox

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func outboxTestDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	base := os.Getenv("TEST_DSN")
	if base == "" {
		t.Fatal("TEST_DSN is required for integration tests")
	}
	admin, err := gorm.Open(postgres.Open(base), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	schema := "api02_outbox_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	if err := admin.Exec(fmt.Sprintf(`CREATE SCHEMA %q`, schema)).Error; err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := admin.Exec(fmt.Sprintf(`DROP SCHEMA %q CASCADE`, schema)).Error; err != nil {
			t.Errorf("drop schema: %v", err)
		}
		if sqlDB, err := admin.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})
	parsed, err := url.Parse(base)
	if err != nil || parsed.Scheme == "" {
		t.Fatal("TEST_DSN must use URI form")
	}
	query := parsed.Query()
	query.Set("search_path", schema)
	parsed.RawQuery = query.Encode()
	db, err := gorm.Open(postgres.Open(parsed.String()), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	if err := models.MigrateUp(db); err != nil {
		t.Fatal(err)
	}
	return db
}

func integrationEvent(companyID, aggregateID uuid.UUID) Event {
	return Event{
		CompanyID: companyID, AggregateType: "ticket", AggregateID: aggregateID,
		EventType: "ticket.created", RoutingKey: "analytics.ticket.created",
		Payload: json.RawMessage(`{"ticket_number":42}`),
	}
}

func TestEnqueueRollsBackWithBusinessTransaction(t *testing.T) {
	db := outboxTestDatabase(t)
	companyID := uuid.New()
	if err := db.Exec(`INSERT INTO companies (id, name) VALUES (?, 'Outbox company')`, companyID).Error; err != nil {
		t.Fatal(err)
	}
	store, err := NewStore(db)
	if err != nil {
		t.Fatal(err)
	}
	wantRollback := errors.New("rollback business change")
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(`UPDATE companies SET description = 'changed' WHERE id = ?`, companyID).Error; err != nil {
			return err
		}
		if _, err := store.Enqueue(context.Background(), tx, integrationEvent(companyID, uuid.New())); err != nil {
			return err
		}
		return wantRollback
	})
	if !errors.Is(err, wantRollback) {
		t.Fatalf("transaction error=%v", err)
	}
	var eventCount, sequenceCount int64
	if err := db.Raw(`SELECT count(*) FROM outbox_events`).Scan(&eventCount).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Raw(`SELECT count(*) FROM outbox_sequences`).Scan(&sequenceCount).Error; err != nil {
		t.Fatal(err)
	}
	if eventCount != 0 || sequenceCount != 0 {
		t.Fatalf("rollback left events=%d sequences=%d", eventCount, sequenceCount)
	}
}

func TestPersistedEventPublishesAfterWorkerRestart(t *testing.T) {
	db := outboxTestDatabase(t)
	companyID, aggregateID := uuid.New(), uuid.New()
	if err := db.Exec(`INSERT INTO companies (id, name) VALUES (?, 'Restart company')`, companyID).Error; err != nil {
		t.Fatal(err)
	}
	firstStore, err := NewStore(db)
	if err != nil {
		t.Fatal(err)
	}
	var saved Event
	if err := db.Transaction(func(tx *gorm.DB) error {
		var enqueueErr error
		saved, enqueueErr = firstStore.Enqueue(context.Background(), tx, integrationEvent(companyID, aggregateID))
		return enqueueErr
	}); err != nil {
		t.Fatal(err)
	}

	// A fresh store and worker represent an API process restarted after commit.
	restartedStore, err := NewStore(db)
	if err != nil {
		t.Fatal(err)
	}
	publisher := &fakePublisher{}
	worker, err := NewWorker(restartedStore, publisher, validWorkerConfig())
	if err != nil {
		t.Fatal(err)
	}
	if err := worker.RunOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(publisher.messages) != 1 || publisher.messages[0].EventID != saved.ID {
		t.Fatalf("published messages=%+v, saved event=%s", publisher.messages, saved.ID)
	}
	var publishedAt *time.Time
	if err := db.Raw(`SELECT published_at FROM outbox_events WHERE id = ?`, saved.ID).Scan(&publishedAt).Error; err != nil {
		t.Fatal(err)
	}
	if publishedAt == nil {
		t.Fatal("confirmed event was not marked published")
	}
}

func TestClaimPreservesAggregateOrder(t *testing.T) {
	db := outboxTestDatabase(t)
	companyID, aggregateID := uuid.New(), uuid.New()
	if err := db.Exec(`INSERT INTO companies (id, name) VALUES (?, 'Ordered company')`, companyID).Error; err != nil {
		t.Fatal(err)
	}
	store, err := NewStore(db)
	if err != nil {
		t.Fatal(err)
	}
	var saved []Event
	for index := 0; index < 2; index++ {
		if err := db.Transaction(func(tx *gorm.DB) error {
			event, enqueueErr := store.Enqueue(context.Background(), tx, integrationEvent(companyID, aggregateID))
			saved = append(saved, event)
			return enqueueErr
		}); err != nil {
			t.Fatal(err)
		}
	}
	workerID := uuid.New()
	first, err := store.Claim(context.Background(), workerID, 10, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if len(first) != 1 || first[0].ID != saved[0].ID || first[0].Sequence != 1 {
		t.Fatalf("first claim=%+v", first)
	}
	if err := store.MarkPublished(context.Background(), first[0].ID, workerID); err != nil {
		t.Fatal(err)
	}
	second, err := store.Claim(context.Background(), workerID, 10, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if len(second) != 1 || second[0].ID != saved[1].ID || second[0].Sequence != 2 {
		t.Fatalf("second claim=%+v", second)
	}
}

func TestFailedPublishRetriesThenStopsAtTerminalFailure(t *testing.T) {
	db := outboxTestDatabase(t)
	companyID, aggregateID := uuid.New(), uuid.New()
	if err := db.Exec(`INSERT INTO companies (id, name) VALUES (?, 'Retry company')`, companyID).Error; err != nil {
		t.Fatal(err)
	}
	store, err := NewStore(db)
	if err != nil {
		t.Fatal(err)
	}
	var saved Event
	if err := db.Transaction(func(tx *gorm.DB) error {
		var enqueueErr error
		saved, enqueueErr = store.Enqueue(context.Background(), tx, integrationEvent(companyID, aggregateID))
		return enqueueErr
	}); err != nil {
		t.Fatal(err)
	}
	if saved.ID == uuid.Nil || saved.CorrelationID != saved.ID || saved.SchemaVersion != 1 || saved.Sequence != 1 {
		t.Fatalf("enqueue defaults were not applied: %+v", saved)
	}
	workerID := uuid.New()
	claimed, err := store.Claim(context.Background(), workerID, 1, time.Minute)
	if err != nil || len(claimed) != 1 {
		t.Fatalf("claim=%+v error=%v", claimed, err)
	}
	if err := store.MarkFailed(context.Background(), saved.ID, workerID, time.Now().Add(-time.Second), false, errors.New("temporary nack")); err != nil {
		t.Fatal(err)
	}
	claimed, err = store.Claim(context.Background(), workerID, 1, time.Minute)
	if err != nil || len(claimed) != 1 || claimed[0].AttemptCount != 1 {
		t.Fatalf("retry claim=%+v error=%v", claimed, err)
	}
	if err := store.MarkFailed(context.Background(), saved.ID, workerID, time.Now(), true, errors.New("permanent nack")); err != nil {
		t.Fatal(err)
	}
	claimed, err = store.Claim(context.Background(), workerID, 1, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if len(claimed) != 0 {
		t.Fatalf("terminal event was claimed again: %+v", claimed)
	}
	if err := store.MarkPublished(context.Background(), saved.ID, uuid.New()); err == nil {
		t.Fatal("wrong worker was allowed to complete event")
	}
	var attempts int
	var failedAt *time.Time
	if err := db.Raw(`SELECT attempt_count, failed_at FROM outbox_events WHERE id = ?`, saved.ID).Row().Scan(&attempts, &failedAt); err != nil {
		t.Fatal(err)
	}
	if attempts != 2 || failedAt == nil {
		t.Fatalf("attempts=%d failed_at=%v", attempts, failedAt)
	}
}
