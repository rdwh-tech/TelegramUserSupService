package app

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/rdwh-tech/TelegramUserSupService/internal/transport/httpjson"
)

func NewRouter(checkReady func(context.Context) error, readinessTimeout time.Duration, logger *slog.Logger) http.Handler {
	r := chi.NewRouter()
	r.Use(RequestID)
	r.Use(AccessLog(logger))
	r.Use(RecoverJSON(logger))
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		httpjson.Error(w, http.StatusNotFound, "NOT_FOUND", "Resource not found", RequestIDFromContext(r.Context()), nil)
	})
	r.MethodNotAllowed(func(w http.ResponseWriter, r *http.Request) {
		httpjson.Error(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", RequestIDFromContext(r.Context()), nil)
	})
	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		httpjson.Write(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	r.Get("/ready", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), readinessTimeout)
		defer cancel()
		if checkReady == nil {
			httpjson.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Service is not ready", RequestIDFromContext(r.Context()), nil)
			return
		}
		if err := checkReady(ctx); err != nil || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			httpjson.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Service is not ready", RequestIDFromContext(r.Context()), nil)
			return
		}
		httpjson.Write(w, http.StatusOK, map[string]string{"status": "ready"})
	})
	return r
}
