package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/rdwh-tech/TelegramUserSupService/internal/app"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("API configuration failed")
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := app.Run(ctx, cfg); err != nil {
		slog.Error("API stopped with an error", "error", err)
		os.Exit(1)
	}
}
