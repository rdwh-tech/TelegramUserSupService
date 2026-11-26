package app

import (
	"context"
	"errors"
	"log"
	"net"
	"net/http"

	platformamqp "github.com/rdwh-tech/TelegramUserSupService/internal/platform/amqp"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/config"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/database"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/outbox"
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

	runCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	var workerResult chan error
	if cfg.Rabbit.URL != "" {
		store, err := outbox.NewStore(db.DB)
		if err != nil {
			_ = listener.Close()
			return err
		}
		publisher, err := platformamqp.NewPublisher(cfg.Rabbit.URL, cfg.Rabbit.Exchange, cfg.Rabbit.ConnectTimeout)
		if err != nil {
			_ = listener.Close()
			return err
		}
		worker, err := outbox.NewWorker(store, publisher, outbox.WorkerConfig{
			BatchSize: cfg.Outbox.BatchSize, PollInterval: cfg.Outbox.PollInterval,
			LeaseDuration: cfg.Outbox.LeaseDuration, PublishTimeout: cfg.Outbox.PublishTimeout,
			MaxAttempts: cfg.Outbox.MaxAttempts, RetryBase: cfg.Outbox.RetryBase, RetryMax: cfg.Outbox.RetryMax,
		})
		if err != nil {
			_ = listener.Close()
			return err
		}
		workerResult = make(chan error, 1)
		go func() {
			workerResult <- worker.Run(runCtx)
			cancel()
		}()
	}

	serveErr := serve(runCtx, server, listener, cfg.Server.ShutdownTimeout)
	cancel()
	if workerResult != nil {
		workerErr := <-workerResult
		if workerErr != nil {
			return workerErr
		}
	}
	return serveErr
}
