package app

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func testLogger(output io.Writer) *slog.Logger {
	return slog.New(slog.NewJSONHandler(output, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

func TestHealth(t *testing.T) {
	readyCalled := false
	router := NewRouter(func(context.Context) error {
		readyCalled = true
		return errors.New("must not be called")
	}, time.Second, testLogger(io.Discard))
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/health", nil))
	if response.Code != http.StatusOK {
		t.Fatal(response.Code)
	}
	if got := response.Header().Get("Content-Type"); !strings.HasPrefix(got, "application/json") {
		t.Fatalf("content type %q", got)
	}
	if strings.TrimSpace(response.Body.String()) != `{"status":"ok"}` {
		t.Fatalf("body %q", response.Body.String())
	}
	if readyCalled {
		t.Fatal("health accessed readiness dependency")
	}
}

func TestReadinessFailure(t *testing.T) {
	databaseErrorText := "password authentication failed for private-user"
	router := NewRouter(func(context.Context) error { return errors.New(databaseErrorText) }, time.Second, testLogger(io.Discard))
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/ready", nil))
	if response.Code != http.StatusServiceUnavailable {
		t.Fatal(response.Code)
	}
	var body struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Error.Code != "SERVICE_UNAVAILABLE" {
		t.Fatal(body.Error.Code)
	}
	if strings.Contains(response.Body.String(), databaseErrorText) {
		t.Fatal("driver error leaked")
	}
}

func TestReadinessDeadline(t *testing.T) {
	timeout := 25 * time.Millisecond
	router := NewRouter(func(ctx context.Context) error {
		<-ctx.Done()
		return ctx.Err()
	}, timeout, testLogger(io.Discard))
	request := httptest.NewRequest(http.MethodGet, "/ready", nil)
	response := httptest.NewRecorder()
	started := time.Now()
	router.ServeHTTP(response, request)
	if elapsed := time.Since(started); elapsed < timeout || elapsed > 500*time.Millisecond {
		t.Fatalf("readiness elapsed %s", elapsed)
	}
	if response.Code != http.StatusServiceUnavailable {
		t.Fatal(response.Code)
	}
}

func TestNotFoundAndMethodNotAllowedAreJSON(t *testing.T) {
	router := NewRouter(func(context.Context) error { return nil }, time.Second, testLogger(io.Discard))
	for _, test := range []struct {
		method string
		path   string
		status int
	}{
		{http.MethodGet, "/missing", http.StatusNotFound},
		{http.MethodPost, "/health", http.StatusMethodNotAllowed},
	} {
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest(test.method, test.path, nil))
		if response.Code != test.status || !strings.HasPrefix(response.Header().Get("Content-Type"), "application/json") {
			t.Errorf("%s %s: status=%d content-type=%q", test.method, test.path, response.Code, response.Header().Get("Content-Type"))
		}
	}
}

func TestRouterUsesDefaultLoggerWhenNoneProvided(t *testing.T) {
	router := NewRouter(func(context.Context) error { return nil }, time.Second, nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/health", nil))
	if response.Code != http.StatusOK {
		t.Fatalf("health status = %d, want 200", response.Code)
	}
}
