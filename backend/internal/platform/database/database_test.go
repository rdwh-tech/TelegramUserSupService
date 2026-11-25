package database

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

func TestReadyRejectsUninitializedDatabase(t *testing.T) {
	tests := []struct {
		name string
		db   *Db
	}{
		{name: "nil wrapper"},
		{name: "nil gorm database", db: &Db{}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if err := Ready(context.Background(), test.db); err == nil {
				t.Fatal("uninitialized database reported ready")
			}
		})
	}
}

func TestWithinCompanyRejectsMissingInputs(t *testing.T) {
	if err := WithinCompany(context.Background(), nil, uuid.New(), nil); err == nil {
		t.Fatal("nil database accepted")
	}
}
