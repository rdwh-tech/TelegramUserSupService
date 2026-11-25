package outbox

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type Queue interface {
	Claim(context.Context, uuid.UUID, int, time.Duration) ([]Event, error)
	MarkPublished(context.Context, uuid.UUID, uuid.UUID) error
	MarkFailed(context.Context, uuid.UUID, uuid.UUID, time.Time, bool, error) error
}

type Message struct {
	EventID       uuid.UUID
	EventType     string
	RoutingKey    string
	CorrelationID uuid.UUID
	OccurredAt    time.Time
	Body          []byte
}

type Publisher interface {
	Publish(context.Context, Message) error
	Close() error
}

type WorkerConfig struct {
	BatchSize      int
	PollInterval   time.Duration
	LeaseDuration  time.Duration
	PublishTimeout time.Duration
	MaxAttempts    int
	RetryBase      time.Duration
	RetryMax       time.Duration
}

type Worker struct {
	queue     Queue
	publisher Publisher
	config    WorkerConfig
	id        uuid.UUID
	now       func() time.Time
}

func NewWorker(queue Queue, publisher Publisher, config WorkerConfig) (*Worker, error) {
	if queue == nil || publisher == nil {
		return nil, errors.New("outbox: queue and publisher are required")
	}
	if config.BatchSize <= 0 || config.PollInterval <= 0 || config.LeaseDuration <= 0 ||
		config.PublishTimeout <= 0 || config.MaxAttempts <= 0 || config.RetryBase <= 0 || config.RetryMax < config.RetryBase {
		return nil, errors.New("outbox: invalid worker configuration")
	}
	return &Worker{queue: queue, publisher: publisher, config: config, id: uuid.New(), now: time.Now}, nil
}

func (w *Worker) Run(ctx context.Context) error {
	defer w.publisher.Close()
	ticker := time.NewTicker(w.config.PollInterval)
	defer ticker.Stop()
	for {
		if err := w.RunOnce(ctx); err != nil && !errors.Is(err, context.Canceled) {
			return err
		}
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
		}
	}
}

func (w *Worker) RunOnce(ctx context.Context) error {
	events, err := w.queue.Claim(ctx, w.id, w.config.BatchSize, w.config.LeaseDuration)
	if err != nil {
		return err
	}
	for _, event := range events {
		body, err := envelope(event)
		if err != nil {
			return err
		}
		publishCtx, cancel := context.WithTimeout(ctx, w.config.PublishTimeout)
		err = w.publisher.Publish(publishCtx, Message{
			EventID: event.ID, EventType: event.EventType, RoutingKey: event.RoutingKey,
			CorrelationID: event.CorrelationID, OccurredAt: event.OccurredAt, Body: body,
		})
		cancel()
		if err == nil {
			if err := w.queue.MarkPublished(ctx, event.ID, w.id); err != nil {
				return err
			}
			continue
		}
		attempt := event.AttemptCount + 1
		terminal := attempt >= w.config.MaxAttempts
		retryAt := w.now().UTC().Add(w.backoff(attempt))
		if markErr := w.queue.MarkFailed(ctx, event.ID, w.id, retryAt, terminal, err); markErr != nil {
			return markErr
		}
	}
	return nil
}

func envelope(event Event) ([]byte, error) {
	message := struct {
		EventID       uuid.UUID       `json:"event_id"`
		EventType     string          `json:"event_type"`
		SchemaVersion int             `json:"schema_version"`
		OccurredAt    time.Time       `json:"occurred_at"`
		CompanyID     uuid.UUID       `json:"company_id"`
		CorrelationID uuid.UUID       `json:"correlation_id"`
		Payload       json.RawMessage `json:"payload"`
	}{event.ID, event.EventType, event.SchemaVersion, event.OccurredAt, event.CompanyID, event.CorrelationID, event.Payload}
	body, err := json.Marshal(message)
	if err != nil {
		return nil, fmt.Errorf("outbox: encode envelope: %w", err)
	}
	return body, nil
}

func (w *Worker) backoff(attempt int) time.Duration {
	delay := w.config.RetryBase
	for step := 1; step < attempt && delay < w.config.RetryMax; step++ {
		if delay > w.config.RetryMax/2 {
			return w.config.RetryMax
		}
		delay *= 2
	}
	if delay > w.config.RetryMax {
		return w.config.RetryMax
	}
	return delay
}
