package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/rdwh-tech/TelegramUserSupService/internal/app"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := app.Run(ctx, cfg); err != nil {
		panic(err)
	}
}