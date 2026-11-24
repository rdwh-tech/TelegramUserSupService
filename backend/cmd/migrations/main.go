package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/database"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/models"
)

func main() {
	signalCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	ctx, cancel := context.WithTimeout(signalCtx, 2*time.Minute)
	defer cancel()
	if err := runMigration(ctx, os.Getenv("DSN")); err != nil {
		slog.Error("database migration failed", "error", err)
		os.Exit(1)
	}
}

func runMigration(ctx context.Context, dsn string) error {
	if dsn == "" {
		return errors.New("DSN is required")
	}
	db, err := database.NewDatabaseContext(ctx, dsn)
	if err != nil {
		return errors.New("database connection failed")
	}
	sqlDB, err := db.DB.DB()
	if err != nil {
		return errors.New("database pool unavailable")
	}
	defer sqlDB.Close()
	if err := models.MigrateUp(db.DB.WithContext(ctx)); err != nil {
		return errors.New("database schema migration failed")
	}
	return nil
}
