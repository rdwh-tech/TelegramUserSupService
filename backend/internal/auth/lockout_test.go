package auth

import (
	"testing"
	"time"

	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/models"
)

func TestLoginFailureWindowAndLockBoundaries(t *testing.T) {
	cfg := DefaultConfig("secret")
	start := time.Date(2026, 11, 25, 10, 0, 0, 0, time.UTC)
	u := models.User{}
	for i := 0; i < 4; i++ {
		recordLoginFailure(&u, start.Add(time.Duration(i)*time.Minute), cfg)
	}
	if u.FailedLoginCount != 4 || u.LoginLockedUntil != nil {
		t.Fatalf("premature lock: %+v", u)
	}
	recordLoginFailure(&u, start.Add(4*time.Minute), cfg)
	if u.FailedLoginCount != 5 || u.LoginLockedUntil == nil || !u.LoginLockedUntil.Equal(start.Add(19*time.Minute)) {
		t.Fatalf("missing lock: %+v", u)
	}
	v := models.User{}
	recordLoginFailure(&v, start, cfg)
	recordLoginFailure(&v, start.Add(cfg.LoginWindow), cfg)
	if v.FailedLoginCount != 1 || !v.FailedLoginWindowStartedAt.Equal(start.Add(cfg.LoginWindow)) {
		t.Fatalf("window boundary did not reset: %+v", v)
	}
}
