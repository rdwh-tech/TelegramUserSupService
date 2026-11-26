//go:build integration

package amqp

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	rabbit "github.com/rabbitmq/amqp091-go"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/outbox"
)

func TestPublisherUsesPersistentConfirmedRoutedMessages(t *testing.T) {
	url := os.Getenv("TEST_AMQP_URL")
	if url == "" {
		t.Fatal("TEST_AMQP_URL is required for integration tests")
	}
	connection, err := rabbit.Dial(url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = connection.Close() })
	channel, err := connection.Channel()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = channel.Close() })
	exchange := "api02-test-" + uuid.NewString()
	if err := channel.ExchangeDeclare(exchange, "topic", true, false, false, false, nil); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = channel.ExchangeDelete(exchange, false, false) })
	queue, err := channel.QueueDeclare("", false, true, true, false, nil)
	if err != nil {
		t.Fatal(err)
	}
	routingKey := "analytics.ticket.created"
	if err := channel.QueueBind(queue.Name, routingKey, exchange, false, nil); err != nil {
		t.Fatal(err)
	}
	deliveries, err := channel.Consume(queue.Name, "", true, true, false, false, nil)
	if err != nil {
		t.Fatal(err)
	}

	publisher, err := NewPublisher(url, exchange, 5*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = publisher.Close() })
	eventID, correlationID := uuid.New(), uuid.New()
	message := outbox.Message{
		EventID: eventID, EventType: "ticket.created", RoutingKey: routingKey,
		CorrelationID: correlationID, OccurredAt: time.Now().UTC(), Body: []byte(`{"event_id":"test"}`),
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := publisher.Publish(ctx, message); err != nil {
		t.Fatal(err)
	}
	select {
	case delivery := <-deliveries:
		if delivery.DeliveryMode != rabbit.Persistent || delivery.MessageId != eventID.String() ||
			delivery.Type != message.EventType || delivery.CorrelationId != correlationID.String() {
			t.Fatalf("unexpected AMQP properties: %+v", delivery)
		}
	case <-ctx.Done():
		t.Fatal("published message was not routed")
	}

	unroutable := message
	unroutable.EventID = uuid.New()
	unroutable.RoutingKey = "nobody.is.bound"
	if err := publisher.Publish(ctx, unroutable); err == nil {
		t.Fatal("mandatory unroutable message was accepted")
	}
}
