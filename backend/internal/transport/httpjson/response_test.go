package httpjson

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWrite(t *testing.T) {
	recorder := httptest.NewRecorder()
	Write(recorder, http.StatusCreated, map[string]string{"status": "ok"})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("status %d", recorder.Code)
	}
	if got := recorder.Header().Get("Content-Type"); got != "application/json; charset=utf-8" {
		t.Fatalf("content type %q", got)
	}
	var body map[string]string
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["status"] != "ok" {
		t.Fatalf("body %#v", body)
	}
}

func TestError(t *testing.T) {
	recorder := httptest.NewRecorder()
	Error(recorder, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "invalid request", "5979691d-f67a-4c85-92de-203fcb4a94bc", map[string]any{"field": "name"})
	var body struct {
		Error struct {
			Code      string         `json:"code"`
			Message   string         `json:"message"`
			Details   map[string]any `json:"details"`
			RequestID string         `json:"request_id"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Error.Code != "VALIDATION_ERROR" || body.Error.RequestID == "" || body.Error.Details["field"] != "name" {
		t.Fatalf("body %#v", body)
	}
}
