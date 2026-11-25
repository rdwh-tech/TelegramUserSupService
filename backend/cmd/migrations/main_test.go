package main

import (
	"context"
	"strings"
	"testing"
)

func TestRunMigrationRejectsMissingDSNWithoutLeakingIt(t *testing.T) {
	const secret = "postgres://user:private-password@example.invalid/support"
	err := runMigration(context.Background(), "")
	if err == nil {
		t.Fatal("runMigration accepted an empty DSN")
	}
	if strings.Contains(err.Error(), secret) || strings.Contains(err.Error(), "password") {
		t.Fatalf("unsafe migration error: %v", err)
	}
}

func TestRunMigrationSanitizesConnectionFailure(t *testing.T) {
	const secret = "private-password"
	dsn := "postgres://user:" + secret + "@127.0.0.1:1/support?sslmode=disable&connect_timeout=1"
	err := runMigration(context.Background(), dsn)
	if err == nil {
		t.Fatal("runMigration unexpectedly connected")
	}
	if strings.Contains(err.Error(), secret) || strings.Contains(err.Error(), dsn) {
		t.Fatalf("connection details leaked: %v", err)
	}
}
