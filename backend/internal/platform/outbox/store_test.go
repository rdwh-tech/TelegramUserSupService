package outbox

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/google/uuid"
)

func TestValidateEvent(t *testing.T) {
	valid := Event{
		CompanyID: uuid.New(), AggregateType: "ticket", AggregateID: uuid.New(),
		EventType: "ticket.created", RoutingKey: "analytics.ticket.created",
		Payload: json.RawMessage(`{"id":"ticket"}`),
	}
	if err := validateEvent(valid); err != nil {
		t.Fatal(err)
	}
	tests := []struct {
		name string
		edit func(*Event)
	}{
		{"company", func(e *Event) { e.CompanyID = uuid.Nil }},
		{"aggregate", func(e *Event) { e.AggregateID = uuid.Nil }},
		{"aggregate type", func(e *Event) { e.AggregateType = "" }},
		{"type", func(e *Event) { e.EventType = "" }},
		{"routing", func(e *Event) { e.RoutingKey = "" }},
		{"payload", func(e *Event) { e.Payload = json.RawMessage(`[]`) }},
		{"schema version", func(e *Event) { e.SchemaVersion = -1 }},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			event := valid
			test.edit(&event)
			if err := validateEvent(event); err == nil {
				t.Fatal("invalid event accepted")
			}
		})
	}
}

func TestStoreRejectsNilDependencies(t *testing.T) {
	if _, err := NewStore(nil); err == nil {
		t.Fatal("nil database accepted")
	}
	store := &Store{}
	if _, err := store.Enqueue(context.Background(), nil, Event{}); err == nil {
		t.Fatal("invalid enqueue accepted")
	}
}
