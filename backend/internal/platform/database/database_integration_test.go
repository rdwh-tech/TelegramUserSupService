//go:build integration

package database

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/config"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func isolatedDSN(t *testing.T) string {
	t.Helper()
	base := os.Getenv("TEST_DSN")
	if base == "" {
		t.Fatal("TEST_DSN is required for integration tests")
	}
	admin, err := gorm.Open(postgres.Open(base), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	schema := "api01_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	if err := admin.Exec(fmt.Sprintf(`CREATE SCHEMA %q`, schema)).Error; err != nil {
		t.Fatalf("create test schema: %v", err)
	}
	t.Cleanup(func() {
		if err := admin.Exec(fmt.Sprintf(`DROP SCHEMA %q CASCADE`, schema)).Error; err != nil {
			t.Errorf("drop test schema: %v", err)
		}
		sqlDB, err := admin.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	parsed, err := url.Parse(base)
	if err == nil && parsed.Scheme != "" {
		query := parsed.Query()
		query.Set("search_path", schema)
		parsed.RawQuery = query.Encode()
		return parsed.String()
	}
	return base + " search_path=" + schema
}

func testDBConfig(dsn string) config.DbConfig {
	return config.DbConfig{
		Dsn:             dsn,
		ConnectTimeout:  2 * time.Second,
		MaxOpenConns:    4,
		MaxIdleConns:    2,
		ConnMaxLifetime: time.Minute,
	}
}

func TestOpenAndReady(t *testing.T) {
	dsn := isolatedDSN(t)
	db, err := Open(context.Background(), testDBConfig(dsn))
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })

	if err := Ready(context.Background(), db); err == nil {
		t.Fatal("empty schema reported ready")
	}
	if err := models.MigrateUp(db.DB); err != nil {
		t.Fatal(err)
	}
	if err := Ready(context.Background(), db); err != nil {
		t.Fatalf("migrated schema not ready: %v", err)
	}
}

func TestReadyRejectsViewWithBaselineTableName(t *testing.T) {
	dsn := isolatedDSN(t)
	db, err := Open(context.Background(), testDBConfig(dsn))
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := models.MigrateUp(db.DB); err != nil {
		t.Fatal(err)
	}
	if err := db.Exec("DROP TABLE audit_logs CASCADE").Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Exec("CREATE VIEW audit_logs AS SELECT 1 AS id").Error; err != nil {
		t.Fatal(err)
	}
	if err := Ready(context.Background(), db); err == nil {
		t.Fatal("view with baseline name reported ready")
	}
}

func TestReadyAcceptsReadOnlyBaselineAccess(t *testing.T) {
	dsn := isolatedDSN(t)
	owner, err := Open(context.Background(), testDBConfig(dsn))
	if err != nil {
		t.Fatal(err)
	}
	ownerSQL, err := owner.DB.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = ownerSQL.Close() })
	if err := models.MigrateUp(owner.DB); err != nil {
		t.Fatal(err)
	}
	parsed, err := url.Parse(dsn)
	if err != nil {
		t.Fatal(err)
	}
	schema := parsed.Query().Get("search_path")
	role := "api01_reader_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	password := strings.ReplaceAll(uuid.NewString(), "-", "")
	if err := owner.Exec(fmt.Sprintf(`CREATE ROLE %q LOGIN PASSWORD '%s'`, role, password)).Error; err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := owner.Exec(fmt.Sprintf(`DROP OWNED BY %q; DROP ROLE %q`, role, role)).Error; err != nil {
			t.Errorf("drop reader role: %v", err)
		}
	})
	if err := owner.Exec(fmt.Sprintf(`GRANT USAGE ON SCHEMA %q TO %q; GRANT SELECT ON ALL TABLES IN SCHEMA %q TO %q`, schema, role, schema, role)).Error; err != nil {
		t.Fatal(err)
	}
	parsed.User = url.UserPassword(role, password)
	reader, err := Open(context.Background(), testDBConfig(parsed.String()))
	if err != nil {
		t.Fatal(err)
	}
	readerSQL, err := reader.DB.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = readerSQL.Close() })
	if err := Ready(context.Background(), reader); err != nil {
		t.Fatalf("read-only baseline access reported unready: %v", err)
	}
}

func TestOpenDeadline(t *testing.T) {
	dsn := isolatedDSN(t)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if db, err := Open(ctx, testDBConfig(dsn)); err == nil {
		if db != nil {
			if sqlDB, dbErr := db.DB.DB(); dbErr == nil {
				_ = sqlDB.Close()
			}
		}
		t.Fatal("Open accepted cancelled context")
	}
}

func TestReadyAfterDatabaseFailure(t *testing.T) {
	dsn := isolatedDSN(t)
	db, err := Open(context.Background(), testDBConfig(dsn))
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB.DB()
	if err != nil {
		t.Fatal(err)
	}
	if err := sqlDB.Close(); err != nil {
		t.Fatal(err)
	}
	if err := Ready(context.Background(), db); err == nil {
		t.Fatal("closed database reported ready")
	}
}

func TestNewDatabaseUsesSafeDefaults(t *testing.T) {
	dsn := isolatedDSN(t)
	db, err := NewDatabase(dsn)
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := sqlDB.PingContext(context.Background()); err != nil {
		t.Fatalf("ping database opened by compatibility wrapper: %v", err)
	}
}

func TestWithinCompanyAppliesDenyByDefaultRLS(t *testing.T) {
	dsn := isolatedDSN(t)
	db, err := Open(context.Background(), testDBConfig(dsn))
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := models.MigrateUp(db.DB); err != nil {
		t.Fatal(err)
	}
	firstCompany, secondCompany := uuid.New(), uuid.New()
	if err := db.Exec(`INSERT INTO companies (id, name) VALUES (?, 'First'), (?, 'Second')`, firstCompany, secondCompany).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`INSERT INTO clients (company_id, telegram_user_id, telegram_chat_id) VALUES (?, 101, 201), (?, 102, 202)`, firstCompany, secondCompany).Error; err != nil {
		t.Fatal(err)
	}

	var count int64
	if err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(`SET LOCAL ROLE support_api_svc`).Error; err != nil {
			return err
		}
		return tx.Raw(`SELECT count(*) FROM clients`).Scan(&count).Error
	}); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("RLS without company context returned %d rows", count)
	}
	if err := WithinCompany(context.Background(), db.DB, firstCompany, func(tx *gorm.DB) error {
		return ForCompany(tx, firstCompany).Model(&models.Client{}).Count(&count).Error
	}); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("tenant query returned %d rows, want 1", count)
	}
	if err := WithinCompany(context.Background(), db.DB, firstCompany, func(tx *gorm.DB) error {
		return ForCompany(tx, secondCompany).Model(&models.Client{}).Count(&count).Error
	}); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("cross-tenant explicit query returned %d rows", count)
	}
}

func TestAnalyticsRoleUsesColumnAllowlistAndSeparateBypass(t *testing.T) {
	dsn := isolatedDSN(t)
	db, err := Open(context.Background(), testDBConfig(dsn))
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := models.MigrateUp(db.DB); err != nil {
		t.Fatal(err)
	}

	checks := map[string]bool{
		`SELECT has_column_privilege('analytics_svc', format('%I.users', current_schema()), 'id', 'SELECT')`:                     true,
		`SELECT has_column_privilege('analytics_svc', format('%I.users', current_schema()), 'password_hash', 'SELECT')`:          false,
		`SELECT has_column_privilege('analytics_svc', format('%I.ticket_messages', current_schema()), 'content', 'SELECT')`:      false,
		`SELECT has_table_privilege('analytics_svc', format('%I.bot_configs', current_schema()), 'SELECT')`:                      false,
		`SELECT has_table_privilege('analytics_svc', format('%I.message_attachments', current_schema()), 'SELECT')`:              false,
		`SELECT has_table_privilege('analytics_svc', format('%I.ticket_sla_metrics', current_schema()), 'INSERT,UPDATE,SELECT')`: true,
	}
	for query, want := range checks {
		var got bool
		if err := db.Raw(query).Scan(&got).Error; err != nil {
			t.Fatal(err)
		}
		if got != want {
			t.Fatalf("privilege check %q=%t, want %t", query, got, want)
		}
	}
	var bypass bool
	if err := db.Raw(`SELECT rolbypassrls FROM pg_roles WHERE rolname = 'analytics_background_svc'`).Scan(&bypass).Error; err != nil {
		t.Fatal(err)
	}
	if !bypass {
		t.Fatal("analytics background role has no RLS bypass")
	}
}
