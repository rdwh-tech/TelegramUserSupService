//go:build integration

package models

import (
	"context"
	"crypto/sha256"
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

func createAPIOneSchema(t *testing.T, db *gorm.DB) {
	t.Helper()
	if err := migrateBaseline(db); err != nil {
		t.Fatalf("create API-01 baseline: %v", err)
	}
	legacySQL := []string{
		`ALTER TABLE bot_configs ADD COLUMN bot_token varchar(255) NOT NULL DEFAULT 'legacy-token'`,
		`ALTER TABLE bot_configs ALTER COLUMN bot_token DROP DEFAULT`,
		`ALTER TABLE bot_configs DROP COLUMN bot_token_hash`,
		`ALTER TABLE tickets DROP COLUMN schedule_version_id, DROP COLUMN current_cycle_number, DROP COLUMN closed_by_user_id, DROP COLUMN last_operator_id`,
		`ALTER TABLE ticket_messages ADD COLUMN is_delivered boolean NOT NULL DEFAULT true`,
		`ALTER TABLE ticket_messages DROP COLUMN delivery_status, DROP COLUMN delivery_error, DROP COLUMN delivery_updated_at`,
		`ALTER TABLE message_attachments ALTER COLUMN telegram_file_id SET NOT NULL`,
		`CREATE UNIQUE INDEX idx_message_attachments_telegram_file_id ON message_attachments(telegram_file_id)`,
		`ALTER TABLE ticket_sla_metrics RENAME COLUMN calculated_at TO last_calculated_at`,
		`ALTER TABLE audit_logs ALTER COLUMN company_id SET NOT NULL`,
		`ALTER TABLE users DROP CONSTRAINT chk_user_company_role`,
		`ALTER TABLE users ADD CONSTRAINT chk_user_company_role CHECK ((company_id IS NULL AND role = 'unassigned_operator') OR (company_id IS NOT NULL AND role <> 'unassigned_operator'))`,
		`DROP INDEX idx_uq_active_ticket_per_operator`,
		`CREATE UNIQUE INDEX idx_uq_active_ticket_per_operator ON tickets(assigned_operator_id) WHERE status = 'in_progress' AND assigned_operator_id IS NOT NULL`,
	}
	for _, statement := range legacySQL {
		if err := db.Exec(statement).Error; err != nil {
			t.Fatalf("restore API-01 shape: %v", err)
		}
	}
}

type legacyFixture struct {
	companyID, policyID, operatorID, clientID, ticketID uuid.UUID
}

func seedLegacyTicket(t *testing.T, db *gorm.DB) legacyFixture {
	t.Helper()
	fixture := legacyFixture{uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()}
	statements := []struct {
		query string
		args  []any
	}{
		{`INSERT INTO companies (id, name) VALUES (?, 'Legacy company')`, []any{fixture.companyID}},
		{`INSERT INTO bot_configs (company_id, bot_token, welcome_message) VALUES (?, 'plain-service-token', 'Welcome')`, []any{fixture.companyID}},
		{`INSERT INTO company_schedules (company_id, day_of_week, is_working_day, start_time, end_time) VALUES (?, 1, true, '2000-01-01 09:00:00+00', '2000-01-01 18:00:00+00')`, []any{fixture.companyID}},
		{`INSERT INTO company_sla_policies (id, company_id, version) VALUES (?, ?, 1)`, []any{fixture.policyID, fixture.companyID}},
		{`INSERT INTO users (id, company_id, login, password_hash, full_name, role) VALUES (?, ?, 'legacy-operator', 'hash', 'Operator', 'operator_l1')`, []any{fixture.operatorID, fixture.companyID}},
		{`INSERT INTO clients (id, company_id, telegram_user_id, telegram_chat_id) VALUES (?, ?, 1001, 2001)`, []any{fixture.clientID, fixture.companyID}},
		{`INSERT INTO tickets (id, company_id, client_id, assigned_operator_id, sla_policy_id, status, escalation_level) VALUES (?, ?, ?, ?, ?, 'waiting_client', 'l1')`, []any{fixture.ticketID, fixture.companyID, fixture.clientID, fixture.operatorID, fixture.policyID}},
	}
	for _, statement := range statements {
		if err := db.Exec(statement.query, statement.args...).Error; err != nil {
			t.Fatalf("seed API-01 data with %q: %v", statement.query, err)
		}
	}
	return fixture
}

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
	if tableCount != 24 {
		t.Fatalf("got %d migrated tables, want 24", tableCount)
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

func TestAPIOneSchemaUpgradesWithoutLosingData(t *testing.T) {
	db := migrationTestDatabase(t)
	createAPIOneSchema(t, db)
	fixture := seedLegacyTicket(t, db)
	messageID := uuid.New()
	if err := db.Exec(`INSERT INTO ticket_messages (id, ticket_id, sender_type, telegram_message_id, content, is_delivered)
		VALUES (?, ?, 'client', 77, 'hello', true)`, messageID, fixture.ticketID).Error; err != nil {
		t.Fatal(err)
	}
	if err := MigrateUp(db); err != nil {
		t.Fatalf("upgrade API-01 schema: %v", err)
	}

	wantHash := fmt.Sprintf("%x", sha256.Sum256([]byte("plain-service-token")))
	var tokenHash string
	if err := db.Raw(`SELECT bot_token_hash FROM bot_configs WHERE company_id = ?`, fixture.companyID).Scan(&tokenHash).Error; err != nil {
		t.Fatal(err)
	}
	if tokenHash != wantHash {
		t.Fatalf("token hash=%q, want %q", tokenHash, wantHash)
	}
	var delivery string
	if err := db.Raw(`SELECT delivery_status FROM ticket_messages WHERE id = ?`, messageID).Scan(&delivery).Error; err != nil {
		t.Fatal(err)
	}
	if delivery != "delivered" {
		t.Fatalf("legacy delivery status=%q", delivery)
	}
	var cycles int64
	if err := db.Raw(`SELECT count(*) FROM ticket_cycles WHERE ticket_id = ? AND cycle_number = 1`, fixture.ticketID).Scan(&cycles).Error; err != nil {
		t.Fatal(err)
	}
	if cycles != 1 {
		t.Fatalf("backfilled cycles=%d, want 1", cycles)
	}
	var versions []int
	if err := db.Raw(`SELECT version FROM schema_migrations ORDER BY version`).Scan(&versions).Error; err != nil {
		t.Fatal(err)
	}
	if fmt.Sprint(versions) != "[1 2]" {
		t.Fatalf("migration versions=%v", versions)
	}

	adminID := uuid.New()
	if err := db.Exec(`INSERT INTO users (id, login, password_hash, full_name, role) VALUES (?, 'onboarding-admin', 'hash', 'Admin', 'admin')`, adminID).Error; err != nil {
		t.Fatalf("pre-company admin rejected: %v", err)
	}
	if err := db.Exec(`INSERT INTO audit_logs (user_id, action_type) VALUES (?, 'login')`, adminID).Error; err != nil {
		t.Fatalf("pre-company audit rejected: %v", err)
	}
}

func TestAPITwoMigrationRejectsConflictingClientMessagesAtomically(t *testing.T) {
	db := migrationTestDatabase(t)
	createAPIOneSchema(t, db)
	fixture := seedLegacyTicket(t, db)
	for _, id := range []uuid.UUID{uuid.New(), uuid.New()} {
		if err := db.Exec(`INSERT INTO ticket_messages (id, ticket_id, sender_type, telegram_message_id, is_delivered)
			VALUES (?, ?, 'client', 88, true)`, id, fixture.ticketID).Error; err != nil {
			t.Fatal(err)
		}
	}
	if err := MigrateUp(db); err == nil || !strings.Contains(err.Error(), "duplicate client Telegram messages") {
		t.Fatalf("expected duplicate-message migration failure, got %v", err)
	}
	var outboxTable bool
	if err := db.Raw(`SELECT to_regclass(current_schema() || '.outbox_events') IS NOT NULL`).Scan(&outboxTable).Error; err != nil {
		t.Fatal(err)
	}
	if outboxTable {
		t.Fatal("failed API-02 migration left outbox table behind")
	}
	var versionTwo bool
	if err := db.Raw(`SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 2)`).Scan(&versionTwo).Error; err != nil {
		t.Fatal(err)
	}
	if versionTwo {
		t.Fatal("failed API-02 migration recorded version 2")
	}
}
