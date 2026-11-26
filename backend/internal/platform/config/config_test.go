package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

var configEnvironment = []string{
	"DSN", "SECRET", "HTTPAddr",
	"RABBITMQ_URL", "RABBITMQ_EXCHANGE", "RABBITMQ_CONNECT_TIMEOUT",
	"OUTBOX_BATCH_SIZE", "OUTBOX_POLL_INTERVAL", "OUTBOX_LEASE_DURATION", "OUTBOX_PUBLISH_TIMEOUT",
	"OUTBOX_MAX_ATTEMPTS", "OUTBOX_RETRY_BASE", "OUTBOX_RETRY_MAX",
	"DB_CONNECT_TIMEOUT", "DB_MAX_OPEN_CONNS", "DB_MAX_IDLE_CONNS", "DB_CONN_MAX_LIFETIME",
	"HTTP_READ_HEADER_TIMEOUT", "HTTP_IDLE_TIMEOUT", "HTTP_SHUTDOWN_TIMEOUT", "HTTP_READINESS_TIMEOUT",
}

func inWorkingDirectory(t *testing.T, dir string) {
	t.Helper()
	original, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(original); err != nil {
			t.Errorf("restore working directory: %v", err)
		}
	})
}

func clearConfigEnvironment(t *testing.T) {
	t.Helper()
	for _, name := range configEnvironment {
		original, existed := os.LookupEnv(name)
		if err := os.Unsetenv(name); err != nil {
			t.Fatal(err)
		}
		name := name
		t.Cleanup(func() {
			if existed {
				_ = os.Setenv(name, original)
				return
			}
			_ = os.Unsetenv(name)
		})
	}
	t.Setenv("RABBITMQ_URL", "amqp://runtime-user:runtime-password@rabbitmq:5672/")
}

func TestLoadWithoutDotenv(t *testing.T) {
	inWorkingDirectory(t, t.TempDir())
	clearConfigEnvironment(t)
	t.Setenv("DSN", "postgres://runtime-user:runtime-password@db:5432/support")
	t.Setenv("SECRET", "runtime-jwt-secret")

	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Server.HTTPAddr != ":8080" {
		t.Fatal("unexpected default address")
	}
	if cfg.Server.ShutdownTimeout != 10*time.Second {
		t.Fatal("unexpected shutdown timeout")
	}
	if cfg.Db.ConnectTimeout != 5*time.Second || cfg.Db.MaxOpenConns != 10 || cfg.Db.MaxIdleConns != 5 || cfg.Db.ConnMaxLifetime != 30*time.Minute {
		t.Fatalf("unexpected database defaults: %+v", cfg.Db)
	}
	if cfg.Server.ReadHeaderTimeout != 5*time.Second || cfg.Server.IdleTimeout != time.Minute || cfg.Server.ReadinessTimeout != time.Second {
		t.Fatalf("unexpected HTTP defaults: %+v", cfg.Server)
	}
}

func TestEnvironmentOverridesDotenv(t *testing.T) {
	dir := t.TempDir()
	inWorkingDirectory(t, dir)
	clearConfigEnvironment(t)
	if err := os.WriteFile(filepath.Join(dir, ".env"), []byte("DSN=postgres://file-user:file-password@file-db/support\nSECRET=file-secret\nHTTPAddr=:9000\nDB_MAX_OPEN_CONNS=20\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("DSN", "postgres://env-user:env-password@env-db/support")
	t.Setenv("SECRET", "env-secret")
	t.Setenv("HTTPAddr", ":7000")

	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Db.Dsn != "postgres://env-user:env-password@env-db/support" || cfg.Auth.Secret != "env-secret" || cfg.Server.HTTPAddr != ":7000" {
		t.Fatalf("environment did not win: %+v", cfg)
	}
	if cfg.Db.MaxOpenConns != 20 {
		t.Fatalf("dotenv value not loaded: %d", cfg.Db.MaxOpenConns)
	}
}

func TestMalformedDotenv(t *testing.T) {
	dir := t.TempDir()
	inWorkingDirectory(t, dir)
	clearConfigEnvironment(t)
	t.Setenv("DSN", "postgres://valid-user:valid-password@db/support")
	t.Setenv("SECRET", "valid-secret")
	leakedValue := "secret-value-must-not-leak"
	if err := os.WriteFile(filepath.Join(dir, ".env"), []byte("SECRET='"+leakedValue+"\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), ".env") {
		t.Fatalf("expected named dotenv parse error, got %v", err)
	}
	if strings.Contains(err.Error(), leakedValue) {
		t.Fatalf("dotenv value leaked in error: %v", err)
	}
}

func TestBlankEnvironmentOverridesDotenvAndFailsValidation(t *testing.T) {
	dir := t.TempDir()
	inWorkingDirectory(t, dir)
	clearConfigEnvironment(t)
	fileSecret := "file-secret-must-not-be-used"
	if err := os.WriteFile(filepath.Join(dir, ".env"), []byte("DSN=postgres://file-user:file-password@db/support\nSECRET="+fileSecret+"\nHTTPAddr=:9000\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("SECRET", "   ")
	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "SECRET") {
		t.Fatalf("expected blank SECRET validation error, got %v", err)
	}
	if strings.Contains(err.Error(), fileSecret) {
		t.Fatalf("dotenv secret leaked in error: %v", err)
	}
}

func TestConfigValidation(t *testing.T) {
	tests := []struct {
		name     string
		variable string
		value    string
	}{
		{name: "missing DSN", variable: "DSN", value: ""},
		{name: "missing secret", variable: "SECRET", value: ""},
		{name: "missing RabbitMQ URL", variable: "RABBITMQ_URL", value: ""},
		{name: "invalid duration", variable: "DB_CONNECT_TIMEOUT", value: "five-seconds"},
		{name: "negative max open", variable: "DB_MAX_OPEN_CONNS", value: "-1"},
		{name: "negative max idle", variable: "DB_MAX_IDLE_CONNS", value: "-1"},
		{name: "idle exceeds open", variable: "DB_MAX_IDLE_CONNS", value: "11"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			dir := t.TempDir()
			inWorkingDirectory(t, dir)
			clearConfigEnvironment(t)
			secretValue := "secret-value-must-not-leak"
			dsnValue := "postgres://private-user:private-password@private-host/support"
			t.Setenv("DSN", dsnValue)
			t.Setenv("SECRET", secretValue)
			t.Setenv(test.variable, test.value)

			_, err := Load()
			if err == nil {
				t.Fatal("expected validation error")
			}
			errText := err.Error()
			if !strings.Contains(errText, test.variable) {
				t.Fatalf("error does not name %s: %s", test.variable, errText)
			}
			if strings.Contains(errText, secretValue) || strings.Contains(errText, dsnValue) {
				t.Fatal("configuration error contains a secret")
			}
		})
	}
}
