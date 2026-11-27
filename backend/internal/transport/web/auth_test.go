package web_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rdwh-tech/TelegramUserSupService/internal/app"
	"github.com/rdwh-tech/TelegramUserSupService/internal/auth"
	webtransport "github.com/rdwh-tech/TelegramUserSupService/internal/transport/web"
)

func TestInternalSessionRejectsMissingOrInvalidRequestIDBeforeAuth(t *testing.T) {
	handler := webtransport.NewHandler(nil, nil, nil, nil)
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

type authStub struct {
	registered                  bool
	login, password, name, role string
}

func (s *authStub) Register(_ context.Context, login, password, name, role string) (auth.AuthResult, error) {
	s.registered = true
	s.login, s.password, s.name, s.role = login, password, name, role
	return auth.AuthResult{AccessToken: "access", RefreshToken: "refresh", User: auth.User{ID: uuid.MustParse("8cb36d3a-ac56-4ef6-aa74-b3fca6184fd4"), Login: login, FullName: name, Role: auth.RoleAdmin}}, nil
}
func (*authStub) Login(context.Context, string, string) (auth.AuthResult, error) {
	return auth.AuthResult{}, nil
}
func (*authStub) Refresh(context.Context, string) (string, error)   { return "", nil }
func (*authStub) LogoutAuthorization(context.Context, string) error { return nil }
func (*authStub) Authenticate(context.Context, string, bool) (auth.Principal, error) {
	return auth.Principal{}, nil
}
func (*authStub) TouchActivity(context.Context, auth.Principal) error { return nil }
func (*authStub) Me(context.Context, uuid.UUID) (auth.User, error)    { return auth.User{}, nil }
func (*authStub) UpdateProfile(context.Context, auth.Principal, string) (auth.User, error) {
	return auth.User{}, nil
}
func (*authStub) EffectiveExpiry(auth.Principal) time.Time { return time.Time{} }

func TestRegisterHandlerMapsDTOToService(t *testing.T) {
	service := &authStub{}
	handler := webtransport.NewHandler(service, nil, nil, nil)
	router := app.NewRouterWithAuth(func(context.Context) error { return nil }, time.Second, slog.New(slog.NewTextHandler(io.Discard, nil)), handler)
	request := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(`{"login":"admin_1","password":"strong password","fullName":"Admin","role":"admin"}`))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusCreated || !service.registered {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	if service.login != "admin_1" || service.password != "strong password" || service.name != "Admin" || service.role != "admin" {
		t.Fatalf("service input=%+v", service)
	}
	var body struct {
		AccessToken, RefreshToken string
		User                      struct {
			Role string `json:"role"`
		} `json:"user"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.AccessToken != "access" || body.RefreshToken != "refresh" || body.User.Role != "admin" {
		t.Fatalf("body=%s", response.Body.String())
	}
}
