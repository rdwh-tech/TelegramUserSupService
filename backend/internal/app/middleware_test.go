package app

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestRequestID(t *testing.T) {
	valid := "5979691d-f67a-4c85-92de-203fcb4a94bc"
	for _, input := range []string{valid, "", "not-a-uuid", "{" + valid + "}", "urn:uuid:" + valid} {
		request := httptest.NewRequest(http.MethodGet, "/", nil)
		if input != "" {
			request.Header.Set("X-Request-Id", input)
		}
		response := httptest.NewRecorder()
		RequestID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, _ = io.WriteString(w, RequestIDFromContext(r.Context()))
		})).ServeHTTP(response, request)
		got := response.Header().Get("X-Request-Id")
		if _, err := uuid.Parse(got); err != nil {
			t.Fatalf("generated request ID %q: %v", got, err)
		}
		if response.Body.String() != got {
			t.Fatalf("context=%q header=%q", response.Body.String(), got)
		}
		if input == valid && got != valid {
			t.Fatalf("valid request ID changed to %q", got)
		}
		if input != valid && got == input {
			t.Fatalf("invalid request ID preserved: %q", got)
		}
	}
}

func TestPanicIsJSON(t *testing.T) {
	var logs bytes.Buffer
	handler := RequestID(RecoverJSON(testLogger(&logs))(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("private panic value")
	})))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/", nil))
	if response.Code != http.StatusInternalServerError {
		t.Fatal(response.Code)
	}
	var body struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Error.Code != "INTERNAL_ERROR" || body.Error.Message != "Internal server error" {
		t.Fatalf("unsafe response %#v", body)
	}
	if strings.Contains(response.Body.String(), "private panic value") || strings.Contains(logs.String(), "private panic value") {
		t.Fatal("panic value leaked")
	}
}

func TestAccessLogExcludesSecrets(t *testing.T) {
	const secret = "do-not-log-this-secret"
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))
	handler := RequestID(AccessLog(logger)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})))
	request := httptest.NewRequest(http.MethodPost, "/safe?query="+secret, strings.NewReader(`{"password":"`+secret+`"}`))
	request.Header.Set("Authorization", "Bearer "+secret)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusNoContent {
		t.Fatal(response.Code)
	}
	if strings.Contains(logs.String(), secret) {
		t.Fatalf("secret leaked in log: %s", logs.String())
	}
	for _, field := range []string{"method", "route", "status", "duration_ms", "request_id"} {
		if !strings.Contains(logs.String(), `"`+field+`"`) {
			t.Errorf("missing log field %s: %s", field, logs.String())
		}
	}
}
