package database

import (
	"context"
	"testing"
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
