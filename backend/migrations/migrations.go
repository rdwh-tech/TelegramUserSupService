// Package migrations applies versioned PostgreSQL migrations after the API-01
// baseline has been created or adopted.
package migrations

import (
	_ "embed"
	"errors"
	"fmt"

	"gorm.io/gorm"
)

//go:embed 0002_schema_and_outbox.sql
var schemaAndOutboxSQL string

const (
	baselineVersion = 1
	currentVersion  = 2
)

// Apply records the adopted API-01 baseline and applies every later migration
// once. Each version is atomic and migration runners are serialized per schema.
func Apply(db *gorm.DB) error {
	if db == nil {
		return errors.New("migrations: db is nil")
	}
	if err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version integer PRIMARY KEY,
		name varchar(255) NOT NULL,
		applied_at timestamptz NOT NULL DEFAULT now()
	)`).Error; err != nil {
		return fmt.Errorf("migrations: create version table: %w", err)
	}

	return db.Transaction(func(tx *gorm.DB) error {
		// Roles are database-wide while tables are schema-local, so migrations
		// across test/tenant schemas must share one database-wide lock.
		if err := tx.Exec(`SELECT pg_advisory_xact_lock(hashtextextended(current_database() || ':support-global-migrations', 0))`).Error; err != nil {
			return fmt.Errorf("migrations: acquire lock: %w", err)
		}
		if err := tx.Exec(`INSERT INTO schema_migrations (version, name)
			VALUES (?, 'api01_baseline') ON CONFLICT (version) DO NOTHING`, baselineVersion).Error; err != nil {
			return fmt.Errorf("migrations: record baseline: %w", err)
		}

		var applied bool
		if err := tx.Raw(`SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = ?)`, currentVersion).Scan(&applied).Error; err != nil {
			return fmt.Errorf("migrations: inspect version: %w", err)
		}
		if applied {
			return nil
		}
		if err := tx.Exec(schemaAndOutboxSQL).Error; err != nil {
			return fmt.Errorf("migrations: apply version %d: %w", currentVersion, err)
		}
		if err := tx.Exec(`INSERT INTO schema_migrations (version, name) VALUES (?, 'api02_schema_and_outbox')`, currentVersion).Error; err != nil {
			return fmt.Errorf("migrations: record version %d: %w", currentVersion, err)
		}
		return nil
	})
}
