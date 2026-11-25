package outbox

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
)

type fakeQueue struct {
	events    []Event
	published []uuid.UUID
	failed    []uuid.UUID
	terminal  bool
	retryAt   time.Time
	failure   error
	claimErr  error
	markErr   error
}

func (q *fakeQueue) Claim(context.Context, uuid.UUID, int, time.Duration) ([]Event, error) {
	return q.events, q.claimErr
}
func (q *fakeQueue) MarkPublished(_ context.Context, eventID, _ uuid.UUID) error {
	q.published = append(q.published, eventID)
	return q.markErr
}
func (q *fakeQueue) MarkFailed(_ context.Context, eventID, _ uuid.UUID, retryAt time.Time, terminal bool, err error) error {
	q.failed = append(q.failed, eventID)
	q.retryAt, q.terminal, q.failure = retryAt, terminal, err
	return q.markErr
}

type fakePublisher struct {
	messages []Message
	err      error
	closed   bool
}

func (p *fakePublisher) Publish(_ context.Context, message Message) error {
	p.messages = append(p.messages, message)
	return p.err
}
func (p *fakePublisher) Close() error { p.closed = true; return nil }

func validWorkerConfig() WorkerConfig {
	return WorkerConfig{
		BatchSize: 10, PollInterval: time.Millisecond, LeaseDuration: time.Second,
		PublishTimeout: time.Second, MaxAttempts: 5,
		RetryBase: time.Second, RetryMax: 8 * time.Second,
	}
}

func testEvent() Event {
	return Event{
		ID: uuid.New(), CompanyID: uuid.New(), AggregateType: "ticket", AggregateID: uuid.New(),
		Sequence: 1, EventType: "ticket.created", SchemaVersion: 1,
		RoutingKey: "analytics.ticket.created", CorrelationID: uuid.New(),
		Payload: json.RawMessage(`{"ticket_id":"example"}`), OccurredAt: time.Date(2026, 11, 25, 8, 0, 0, 0, time.UTC),
	}
}

func TestWorkerPublishesContractEnvelopeAndMarksEvent(t *testing.T) {
	event := testEvent()
	queue := &fakeQueue{events: []Event{event}}
	publisher := &fakePublisher{}
	worker, err := NewWorker(queue, publisher, validWorkerConfig())
	if err != nil {
		t.Fatal(err)
	}
	if err := worker.RunOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(queue.published) != 1 || queue.published[0] != event.ID || len(queue.failed) != 0 {
		t.Fatalf("unexpected queue result: published=%v failed=%v", queue.published, queue.failed)
	}
	if len(publisher.messages) != 1 || publisher.messages[0].EventID != event.ID {
		t.Fatalf("unexpected published message: %+v", publisher.messages)
	}
	var envelope map[string]any
	if err := json.Unmarshal(publisher.messages[0].Body, &envelope); err != nil {
		t.Fatal(err)
	}
	for _, field := range []string{"event_id", "event_type", "schema_version", "occurred_at", "company_id", "correlation_id", "payload"} {
		if _, ok := envelope[field]; !ok {
			t.Fatalf("envelope has no %s: %s", field, publisher.messages[0].Body)
		}
	}
}

func TestWorkerRetriesWithBoundedExponentialBackoff(t *testing.T) {
	event := testEvent()
	event.AttemptCount = 2
	queue := &fakeQueue{events: []Event{event}}
	publishErr := errors.New("broker unavailable")
	publisher := &fakePublisher{err: publishErr}
	worker, err := NewWorker(queue, publisher, validWorkerConfig())
	if err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, 11, 25, 9, 0, 0, 0, time.UTC)
	worker.now = func() time.Time { return now }
	if err := worker.RunOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(queue.failed) != 1 || queue.terminal || !errors.Is(queue.failure, publishErr) {
		t.Fatalf("unexpected failure result: %+v", queue)
	}
	if want := now.Add(4 * time.Second); !queue.retryAt.Equal(want) {
		t.Fatalf("retry at %s, want %s", queue.retryAt, want)
	}
}

func TestWorkerStopsRetryingAtConfiguredAttemptLimit(t *testing.T) {
	event := testEvent()
	event.AttemptCount = 4
	queue := &fakeQueue{events: []Event{event}}
	publisher := &fakePublisher{err: errors.New("nack")}
	worker, err := NewWorker(queue, publisher, validWorkerConfig())
	if err != nil {
		t.Fatal(err)
	}
	if err := worker.RunOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if !queue.terminal {
		t.Fatal("fifth failure was not terminal")
	}
}

func TestNewWorkerRejectsUnsafeConfiguration(t *testing.T) {
	if _, err := NewWorker(&fakeQueue{}, &fakePublisher{}, WorkerConfig{}); err == nil {
		t.Fatal("invalid worker configuration accepted")
	}
}

func TestWorkerRunStopsAndClosesPublisher(t *testing.T) {
	queue := &fakeQueue{}
	publisher := &fakePublisher{}
	config := validWorkerConfig()
	config.PollInterval = time.Hour
	worker, err := NewWorker(queue, publisher, config)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	result := make(chan error, 1)
	go func() { result <- worker.Run(ctx) }()
	cancel()
	select {
	case err := <-result:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(time.Second):
		t.Fatal("worker did not stop")
	}
	if !publisher.closed {
		t.Fatal("publisher was not closed")
	}
}

func TestWorkerPropagatesQueueErrors(t *testing.T) {
	want := errors.New("database unavailable")
	worker, err := NewWorker(&fakeQueue{claimErr: want}, &fakePublisher{}, validWorkerConfig())
	if err != nil {
		t.Fatal(err)
	}
	if err := worker.RunOnce(context.Background()); !errors.Is(err, want) {
		t.Fatalf("RunOnce error=%v, want %v", err, want)
	}
}

func TestWorkerPropagatesLeaseUpdateErrors(t *testing.T) {
	want := errors.New("lease lost")
	worker, err := NewWorker(&fakeQueue{events: []Event{testEvent()}, markErr: want}, &fakePublisher{}, validWorkerConfig())
	if err != nil {
		t.Fatal(err)
	}
	if err := worker.RunOnce(context.Background()); !errors.Is(err, want) {
		t.Fatalf("RunOnce error=%v, want %v", err, want)
	}
}
