package auth

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/requestctx"
)

type fakeRepository struct {
	transactions int
	account      Account
	session      Session
	audits       []AuditEvent
}

func (f *fakeRepository) WithinTransaction(ctx context.Context, fn func(Repository) error) error {
	f.transactions++
	return fn(f)
}
func (f *fakeRepository) CreateAccount(_ context.Context, a Account) error { f.account = a; return nil }
func (f *fakeRepository) AccountForLogin(context.Context, string) (Account, error) {
	return Account{}, errRepositoryNotFound
}
func (f *fakeRepository) SaveLoginState(context.Context, Account) error { return nil }
func (f *fakeRepository) UserByID(_ context.Context, id uuid.UUID) (User, error) {
	if f.account.ID != id {
		return User{}, errRepositoryNotFound
	}
	return f.account.User, nil
}
func (f *fakeRepository) CreateSession(_ context.Context, s Session) error { f.session = s; return nil }
func (f *fakeRepository) SessionByID(context.Context, uuid.UUID, uuid.UUID, bool) (Session, error) {
	return Session{}, errRepositoryNotFound
}
func (f *fakeRepository) SessionByRefreshHash(context.Context, string) (Session, error) {
	return Session{}, errRepositoryNotFound
}
func (f *fakeRepository) TouchSession(context.Context, uuid.UUID, uuid.UUID, time.Time, time.Time) error {
	return nil
}
func (f *fakeRepository) RevokeSession(context.Context, uuid.UUID, time.Time) error { return nil }
func (f *fakeRepository) UpdateFullName(context.Context, uuid.UUID, string, time.Time) error {
	return nil
}
func (f *fakeRepository) CreateAudit(_ context.Context, a AuditEvent) error {
	f.audits = append(f.audits, a)
	return nil
}

func TestRegisterOrchestratesRepositoryTransactionAndSafeLogging(t *testing.T) {
	repo := &fakeRepository{}
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))
	service, err := NewService(repo, DefaultConfig("01234567890123456789012345678901"), logger)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, 11, 26, 10, 0, 0, 0, time.UTC)
	service.SetClock(func() time.Time { return now })
	ctx := requestctx.WithRequestID(context.Background(), "5979691d-f67a-4c85-92de-203fcb4a94bc", true)
	result, err := service.Register(ctx, "  ADMIN_1  ", "strong password", " Иван Иванов ", "admin")
	if err != nil {
		t.Fatal(err)
	}
	if repo.transactions != 1 || repo.account.Login != "admin_1" || repo.account.Role != RoleAdmin {
		t.Fatalf("unexpected repository calls: %+v", repo)
	}
	if repo.session.UserID != repo.account.ID || repo.session.RefreshTokenHash == result.RefreshToken {
		t.Fatal("session did not store only the refresh hash")
	}
	if len(repo.audits) != 1 || repo.audits[0].Action != AuditUserRegistered {
		t.Fatalf("audit=%+v", repo.audits)
	}
	text := logs.String()
	if !strings.Contains(text, "5979691d-f67a-4c85-92de-203fcb4a94bc") || strings.Contains(text, "strong password") || strings.Contains(text, result.RefreshToken) {
		t.Fatalf("unsafe or uncorrelated log: %s", text)
	}
}
func TestRegisterMapsRepositoryConflict(t *testing.T) {
	repo := &conflictRepository{fakeRepository: fakeRepository{}}
	service, _ := NewService(repo, DefaultConfig("01234567890123456789012345678901"), slog.New(slog.NewTextHandler(&bytes.Buffer{}, nil)))
	_, err := service.Register(context.Background(), "admin_1", "strong password", "Admin", "admin")
	if !errors.Is(err, ErrLoginExists) {
		t.Fatalf("error=%v", err)
	}
}

type conflictRepository struct{ fakeRepository }

func (f *conflictRepository) WithinTransaction(_ context.Context, fn func(Repository) error) error {
	return fn(f)
}

func (f *conflictRepository) CreateAccount(context.Context, Account) error {
	return errRepositoryConflict
}
