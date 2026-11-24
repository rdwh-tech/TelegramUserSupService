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
