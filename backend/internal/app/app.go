package app

import (
	"context"
	"errors"
	"log"
	"net"
	"net/http"

	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/config"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/database"
)

func Run(ctx context.Context, cfg *config.Config) error {
	db, err := database.Open(ctx, cfg.Db)
	if err != nil {
		return err
	}
	sqlDb, err := db.DB.DB()
	if err != nil {
		return err
	}
	defer func() {
		if err := sqlDb.Close(); err != nil {
			log.Printf("failed to close db: %v", err)
		}
	}()

	listener, err := net.Listen("tcp", cfg.Server.HTTPAddr)
	if err != nil {
		return errors.New("listen: address unavailable")
	}
	server := &http.Server{
		Handler: NewRouter(func(readyCtx context.Context) error {
			return database.Ready(readyCtx, db)
		}, cfg.Server.ReadinessTimeout, nil),
		ReadHeaderTimeout: cfg.Server.ReadHeaderTimeout,
		IdleTimeout:       cfg.Server.IdleTimeout,
	}
	return serve(ctx, server, listener, cfg.Server.ShutdownTimeout)
}
