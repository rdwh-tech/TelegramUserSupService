package app

import (
	"context"
	"errors"
	"log"
	"net"
	"net/http"

	"github.com/rdwh-tech/TelegramUserSupService/internal/auth"
	"github.com/rdwh-tech/TelegramUserSupService/internal/companies"
	platformamqp "github.com/rdwh-tech/TelegramUserSupService/internal/platform/amqp"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/config"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/database"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/outbox"
	"github.com/rdwh-tech/TelegramUserSupService/internal/staff"
	webtransport "github.com/rdwh-tech/TelegramUserSupService/internal/transport/web"
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
	var authHandler *webtransport.Handler
	if cfg.Auth.Secret != "" {
		authCfg := auth.DefaultConfig(cfg.Auth.Secret)
		if cfg.Auth.JWTIssuer != "" {
			authCfg.Issuer = cfg.Auth.JWTIssuer
		}
		if cfg.Auth.JWTAudience != "" {
			authCfg.Audience = cfg.Auth.JWTAudience
		}
		if cfg.Auth.AccessTTL > 0 {
			authCfg.AccessTTL = cfg.Auth.AccessTTL
		}
		if cfg.Auth.RefreshTTL > 0 {
			authCfg.RefreshTTL = cfg.Auth.RefreshTTL
		}
		if cfg.Auth.IdleTTL > 0 {
			authCfg.IdleTTL = cfg.Auth.IdleTTL
		}
		if cfg.Auth.LoginWindow > 0 {
			authCfg.LoginWindow = cfg.Auth.LoginWindow
		}
		if cfg.Auth.LoginMaxFailures > 0 {
			authCfg.LoginMaxFailures = cfg.Auth.LoginMaxFailures
		}
		if cfg.Auth.LoginLock > 0 {
			authCfg.LoginLock = cfg.Auth.LoginLock
		}
		if cfg.Auth.CodeWindow > 0 {
			authCfg.CodeWindow = cfg.Auth.CodeWindow
		}
		if cfg.Auth.CodeMaxFailures > 0 {
			authCfg.CodeMaxFailures = cfg.Auth.CodeMaxFailures
		}
		if cfg.Auth.CodeLock > 0 {
			authCfg.CodeLock = cfg.Auth.CodeLock
		}
		authService, initErr := auth.NewService(db.DB, authCfg)
		if initErr != nil {
			return errors.New("initialize auth service: invalid configuration")
		}
		companyService := companies.NewService(db.DB, authService)
		staffService := staff.NewService(db.DB, authService, staff.Config{Window: authCfg.CodeWindow, MaxFailures: authCfg.CodeMaxFailures, Lock: authCfg.CodeLock})
		authHandler = webtransport.NewHandler(authService, companyService, staffService)
	}

	listener, err := net.Listen("tcp", cfg.Server.HTTPAddr)
	if err != nil {
		return errors.New("listen: address unavailable")
	}
	server := &http.Server{
		Handler: NewRouterWithAuth(func(readyCtx context.Context) error {
			return database.Ready(readyCtx, db)
		}, cfg.Server.ReadinessTimeout, nil, authHandler),
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
