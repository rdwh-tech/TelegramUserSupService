// Package outbox stores target-specific integration events in the same
// PostgreSQL transaction as their business change.
package outbox

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Event struct {
	ID            uuid.UUID
	CompanyID     uuid.UUID
	AggregateType string
	AggregateID   uuid.UUID
	Sequence      int64
	EventType     string
	SchemaVersion int
	RoutingKey    string
	CorrelationID uuid.UUID
	Payload       json.RawMessage
	OccurredAt    time.Time
	AvailableAt   time.Time
	AttemptCount  int
	LockedBy      *uuid.UUID
	LockedUntil   *time.Time
	PublishedAt   *time.Time
	FailedAt      *time.Time
	LastError     *string
}

func (Event) TableName() string { return "outbox_events" }

type eventRow struct {
	ID            uuid.UUID      `gorm:"type:uuid;primaryKey"`
	CompanyID     uuid.UUID      `gorm:"type:uuid;not null"`
	AggregateType string         `gorm:"type:varchar(50);not null"`
	AggregateID   uuid.UUID      `gorm:"type:uuid;not null"`
	Sequence      int64          `gorm:"not null"`
	EventType     string         `gorm:"type:varchar(100);not null"`
	SchemaVersion int            `gorm:"not null"`
	RoutingKey    string         `gorm:"type:varchar(255);not null"`
	CorrelationID uuid.UUID      `gorm:"type:uuid;not null"`
	Payload       datatypes.JSON `gorm:"type:jsonb;not null"`
	OccurredAt    time.Time      `gorm:"not null"`
	AvailableAt   time.Time      `gorm:"not null"`
}

func (eventRow) TableName() string { return "outbox_events" }

type Store struct {
	db *gorm.DB
}

func NewStore(db *gorm.DB) (*Store, error) {
	if db == nil {
		return nil, errors.New("outbox: db is nil")
	}
	return &Store{db: db}, nil
}

// Enqueue persists an event using tx. Callers that need atomic business writes
// pass their active transaction; a rollback then removes both writes.
func (s *Store) Enqueue(ctx context.Context, tx *gorm.DB, event Event) (Event, error) {
	if err := validateEvent(event); err != nil {
		return Event{}, err
	}
	if tx == nil {
		return Event{}, errors.New("outbox: transaction is nil")
	}
	if event.ID == uuid.Nil {
		event.ID = uuid.New()
	}
	if event.CorrelationID == uuid.Nil {
		event.CorrelationID = event.ID
	}
	if event.SchemaVersion == 0 {
		event.SchemaVersion = 1
	}
	if event.OccurredAt.IsZero() {
		event.OccurredAt = time.Now().UTC()
	}
	event.AvailableAt = event.OccurredAt

	if err := tx.WithContext(ctx).Raw(`INSERT INTO outbox_sequences (aggregate_type, aggregate_id, next_sequence)
		VALUES (?, ?, 1)
		ON CONFLICT (aggregate_type, aggregate_id)
		DO UPDATE SET next_sequence = outbox_sequences.next_sequence + 1
		RETURNING next_sequence`, event.AggregateType, event.AggregateID).Scan(&event.Sequence).Error; err != nil {
		return Event{}, fmt.Errorf("outbox: allocate sequence: %w", err)
	}
	row := eventRow{
		ID: event.ID, CompanyID: event.CompanyID,
		AggregateType: event.AggregateType, AggregateID: event.AggregateID,
		Sequence: event.Sequence, EventType: event.EventType,
		SchemaVersion: event.SchemaVersion, RoutingKey: event.RoutingKey,
		CorrelationID: event.CorrelationID, Payload: datatypes.JSON(event.Payload),
		OccurredAt: event.OccurredAt, AvailableAt: event.AvailableAt,
	}
	if err := tx.WithContext(ctx).Create(&row).Error; err != nil {
		return Event{}, fmt.Errorf("outbox: insert event: %w", err)
	}
	return event, nil
}

func validateEvent(event Event) error {
	switch {
	case event.CompanyID == uuid.Nil:
		return errors.New("outbox: company id is required")
	case event.AggregateID == uuid.Nil:
		return errors.New("outbox: aggregate id is required")
	case strings.TrimSpace(event.AggregateType) == "":
		return errors.New("outbox: aggregate type is required")
	case strings.TrimSpace(event.EventType) == "":
		return errors.New("outbox: event type is required")
	case strings.TrimSpace(event.RoutingKey) == "":
		return errors.New("outbox: routing key is required")
	case !json.Valid(event.Payload) || len(bytes.TrimSpace(event.Payload)) == 0 || bytes.TrimSpace(event.Payload)[0] != '{':
		return errors.New("outbox: payload must be a JSON object")
	case event.SchemaVersion < 0:
		return errors.New("outbox: schema version must be positive")
	default:
		return nil
	}
}

func (s *Store) Claim(ctx context.Context, workerID uuid.UUID, limit int, lease time.Duration) ([]Event, error) {
	if workerID == uuid.Nil || limit <= 0 || lease <= 0 {
		return nil, errors.New("outbox: invalid claim parameters")
	}
	var events []Event
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return tx.Raw(`WITH candidates AS (
			SELECT e.id
			FROM outbox_events e
			WHERE e.published_at IS NULL
			  AND e.failed_at IS NULL
			  AND e.available_at <= now()
			  AND (e.locked_until IS NULL OR e.locked_until < now())
			  AND NOT EXISTS (
			      SELECT 1 FROM outbox_events earlier
			      WHERE earlier.aggregate_type = e.aggregate_type
			        AND earlier.aggregate_id = e.aggregate_id
			        AND earlier.sequence < e.sequence
			        AND earlier.published_at IS NULL
			  )
			ORDER BY e.occurred_at, e.id
			FOR UPDATE SKIP LOCKED
			LIMIT ?
		)
		UPDATE outbox_events e
		SET locked_by = ?, locked_until = now() + (? * interval '1 millisecond')
		FROM candidates c
		WHERE e.id = c.id
		RETURNING e.*`, limit, workerID, lease.Milliseconds()).Scan(&events).Error
	})
	if err != nil {
		return nil, fmt.Errorf("outbox: claim events: %w", err)
	}
	return events, nil
}

func (s *Store) MarkPublished(ctx context.Context, eventID, workerID uuid.UUID) error {
	result := s.db.WithContext(ctx).Exec(`UPDATE outbox_events
		SET published_at = now(), locked_by = NULL, locked_until = NULL, last_error = NULL
		WHERE id = ? AND locked_by = ? AND published_at IS NULL`, eventID, workerID)
	if result.Error != nil {
		return fmt.Errorf("outbox: mark published: %w", result.Error)
	}
	if result.RowsAffected != 1 {
		return errors.New("outbox: publish lease lost")
	}
	return nil
}

func (s *Store) MarkFailed(ctx context.Context, eventID, workerID uuid.UUID, retryAt time.Time, terminal bool, publishErr error) error {
	message := "publish failed"
	if publishErr != nil {
		message = publishErr.Error()
	}
	if len(message) > 1000 {
		message = message[:1000]
	}
	result := s.db.WithContext(ctx).Exec(`UPDATE outbox_events
		SET attempt_count = attempt_count + 1,
		    available_at = ?,
		    failed_at = CASE WHEN ? THEN now() ELSE NULL END,
		    last_error = ?, locked_by = NULL, locked_until = NULL
		WHERE id = ? AND locked_by = ? AND published_at IS NULL`, retryAt, terminal, message, eventID, workerID)
	if result.Error != nil {
		return fmt.Errorf("outbox: mark failed: %w", result.Error)
	}
	if result.RowsAffected != 1 {
		return errors.New("outbox: publish lease lost")
	}
	return nil
}
