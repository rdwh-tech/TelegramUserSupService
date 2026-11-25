//go:build integration

package app

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func appTestDSN(t *testing.T) string {
	t.Helper()
	base := os.Getenv("TEST_DSN")
	if base == "" {
		t.Fatal("TEST_DSN is required for integration tests")
	}
	admin, err := gorm.Open(postgres.Open(base), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	schema := "api01_app_" + strings.ReplaceAll(uuid.NewString(), "-", "")
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
		return parsed.String()
	}
	return base + " search_path=" + schema
}

func TestRunPortInUse(t *testing.T) {
	occupied, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer occupied.Close()
	cfg := &config.Config{
		Db: config.DbConfig{
			Dsn:             appTestDSN(t),
			ConnectTimeout:  time.Second,
			MaxOpenConns:    2,
			MaxIdleConns:    1,
			ConnMaxLifetime: time.Minute,
		},
		Server: config.HttpServerConfig{
			HTTPAddr:          occupied.Addr().String(),
			ReadHeaderTimeout: time.Second,
			IdleTimeout:       time.Second,
			ShutdownTimeout:   100 * time.Millisecond,
			ReadinessTimeout:  100 * time.Millisecond,
		},
	}
	result := make(chan error, 1)
	go func() { result <- Run(context.Background(), cfg) }()
	select {
	case err := <-result:
		if err == nil || !strings.Contains(err.Error(), "listen") {
			t.Fatalf("expected safe listen error, got %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Run did not return for occupied port")
	}
}

func TestRunStartsAndStopsOnCancellation(t *testing.T) {
	reserved, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	address := reserved.Addr().String()
	if err := reserved.Close(); err != nil {
		t.Fatal(err)
	}
	cfg := &config.Config{
		Db: config.DbConfig{
			Dsn:             appTestDSN(t),
			ConnectTimeout:  time.Second,
			MaxOpenConns:    2,
			MaxIdleConns:    1,
			ConnMaxLifetime: time.Minute,
		},
		Server: config.HttpServerConfig{
			HTTPAddr:          address,
			ReadHeaderTimeout: time.Second,
			IdleTimeout:       time.Second,
			ShutdownTimeout:   time.Second,
			ReadinessTimeout:  100 * time.Millisecond,
		},
	}
	ctx, cancel := context.WithCancel(context.Background())
	result := make(chan error, 1)
	go func() { result <- Run(ctx, cfg) }()

	deadline := time.Now().Add(2 * time.Second)
	for {
		connection, dialErr := net.DialTimeout("tcp", address, 25*time.Millisecond)
		if dialErr == nil {
			_ = connection.Close()
			break
		}
		select {
		case err := <-result:
			t.Fatalf("Run returned before cancellation: %v", err)
		default:
		}
		if time.Now().After(deadline) {
			t.Fatal("API listener did not start")
		}
		time.Sleep(10 * time.Millisecond)
	}

	cancel()
	select {
	case err := <-result:
		if err != nil {
			t.Fatalf("Run after cancellation: %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Run did not stop after cancellation")
	}
}
