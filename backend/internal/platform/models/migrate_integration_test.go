//go:build integration

package models

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

func migrationTestDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	base := os.Getenv("TEST_DSN")
	if base == "" {
		t.Fatal("TEST_DSN is required for integration tests")
	}
	admin, err := gorm.Open(postgres.Open(base), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	schema := "api01_migrate_" + strings.ReplaceAll(uuid.NewString(), "-", "")
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
	if err == nil && parsed.Scheme != "" {
		query := parsed.Query()
		query.Set("search_path", schema)
		parsed.RawQuery = query.Encode()
		base = parsed.String()
	} else {
		base += " search_path=" + schema
	}
	db, err := gorm.Open(postgres.Open(base), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	return db
}

func TestBaselineMigrationRerun(t *testing.T) {
	db := migrationTestDatabase(t)
	if err := MigrateUp(db); err != nil {
		t.Fatalf("first migration: %v", err)
	}
	marker := "api01-persistence-" + uuid.NewString()
	if err := db.Exec("INSERT INTO companies (name) VALUES (?)", marker).Error; err != nil {
		t.Fatalf("insert marker: %v", err)
	}
	if err := MigrateUp(db); err != nil {
		t.Fatalf("second migration: %v", err)
	}
	var tableCount int64
	if err := db.Raw("SELECT count(*) FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'").Scan(&tableCount).Error; err != nil {
		t.Fatal(err)
	}
	if tableCount != 18 {
		t.Fatalf("got %d baseline tables, want 18", tableCount)
	}
	var markerCount int64
	if err := db.Raw("SELECT count(*) FROM companies WHERE name = ?", marker).Scan(&markerCount).Error; err != nil {
		t.Fatal(err)
	}
	if markerCount != 1 {
		t.Fatalf("migration rerun lost marker row: %d", markerCount)
	}
}

func TestMigrateDownRemovesBaselineSchema(t *testing.T) {
	db := migrationTestDatabase(t)
	if err := MigrateUp(db); err != nil {
		t.Fatalf("migrate up: %v", err)
	}
	if err := MigrateDown(db); err != nil {
		t.Fatalf("migrate down: %v", err)
	}
	var tableCount int64
	if err := db.Raw("SELECT count(*) FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'").Scan(&tableCount).Error; err != nil {
		t.Fatal(err)
	}
	if tableCount != 0 {
		t.Fatalf("got %d tables after migrate down, want 0", tableCount)
	}
}

func TestMigrationRejectsNilDatabase(t *testing.T) {
	if err := MigrateUp(nil); err == nil {
		t.Fatal("MigrateUp accepted nil database")
	}
	if err := MigrateDown(nil); err == nil {
		t.Fatal("MigrateDown accepted nil database")
	}
}

func TestMigrateUpHonorsCancelledContext(t *testing.T) {
	db := migrationTestDatabase(t)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := MigrateUp(db.WithContext(ctx)); err == nil {
		t.Fatal("MigrateUp ignored cancelled context")
	}
}

func TestMigrationsInSeparateSchemasCreateOwnConstraints(t *testing.T) {
	first := migrationTestDatabase(t)
	second := migrationTestDatabase(t)
	if err := MigrateUp(first); err != nil {
		t.Fatalf("migrate first schema: %v", err)
	}
	if err := MigrateUp(second); err != nil {
		t.Fatalf("migrate second schema: %v", err)
	}
	for index, db := range []*gorm.DB{first, second} {
		var count int64
		if err := db.Raw(`SELECT count(*)
			FROM pg_constraint c
			JOIN pg_class r ON r.oid = c.conrelid
			JOIN pg_namespace n ON n.oid = r.relnamespace
			WHERE n.nspname = current_schema()
			  AND r.relname = 'bot_configs'
			  AND c.conname = 'fk_bot_configs_company'`).Scan(&count).Error; err != nil {
			t.Fatal(err)
		}
		if count != 1 {
			t.Fatalf("schema %d has %d bot config constraints, want 1", index+1, count)
		}
	}
}
