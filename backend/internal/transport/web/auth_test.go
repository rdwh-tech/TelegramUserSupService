package web_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/rdwh-tech/TelegramUserSupService/internal/app"
	webtransport "github.com/rdwh-tech/TelegramUserSupService/internal/transport/web"
)

func TestInternalSessionRejectsMissingOrInvalidRequestIDBeforeAuth(t *testing.T) {
	handler := webtransport.NewHandler(nil, nil, nil)
	router := app.NewRouterWithAuth(func(context.Context) error { return nil }, time.Second, slog.New(slog.NewTextHandler(io.Discard, nil)), handler)
	for _, requestID := range []string{"", "not-a-uuid", "5979691DF67A4C8592DE203FCB4A94BC"} {
		request := httptest.NewRequest(http.MethodGet, "/internal/auth/v1/session", nil)
		request.Header.Set("X-Request-Id", requestID)
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		if response.Code != http.StatusBadRequest {
			t.Fatalf("request id %q: status=%d", requestID, response.Code)
		}
		var body struct {
			Error struct {
				Code      string `json:"code"`
				RequestID string `json:"request_id"`
			} `json:"error"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		if body.Error.Code != "VALIDATION_ERROR" || body.Error.RequestID == "" {
			t.Fatalf("request id %q: body=%s", requestID, response.Body.String())
		}
	}
}
