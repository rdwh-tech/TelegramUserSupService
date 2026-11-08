package app

import (
	"context"
	"net/http"
	"time"

	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/config"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/database"
)

func Run(ctx context.Context, cfg *config.Config) error {
	db, err := database.NewDatabase(cfg.Db.Dsn)
	if err != nil {
		return err
	}
	sqlDb, err := db.DB.DB()
	if err != nil {
		return err
	}
	defer sqlDb.Close()

	server := &http.Server {
		Addr: cfg.Server.HTTPAddr,
		Handler: NewRouter(),
	}

	err = server.ListenAndServe()
	if err != nil {
		return err
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10 * time.Second)
	defer cancel()
	return server.Shutdown(shutdownCtx)
}