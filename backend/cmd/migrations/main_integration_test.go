//go:build integration

package main

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestRunMigrationCreatesCurrentSchema(t *testing.T) {
	base := os.Getenv("TEST_DSN")
	if base == "" {
		t.Fatal("TEST_DSN is required for integration tests")
	}
	admin, err := gorm.Open(postgres.Open(base), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	schema := "api01_migration_command_" + strings.ReplaceAll(uuid.NewString(), "-", "")
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
	if err := runMigration(context.Background(), parsed.String()); err != nil {
		t.Fatalf("run migration: %v", err)
	}

	var tableCount int64
	if err := admin.Raw("SELECT count(*) FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'", schema).Scan(&tableCount).Error; err != nil {
		t.Fatal(err)
	}
	if tableCount != 24 {
		t.Fatalf("got %d migrated tables, want 24", tableCount)
	}
}
