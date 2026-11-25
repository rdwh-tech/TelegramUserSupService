package auth

import (
	"time"

	"github.com/google/uuid"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/models"
)

type User struct {
	ID          uuid.UUID
	CompanyID   *uuid.UUID
	CompanyName *string
	Login       string
	FullName    string
	Role        models.UserRole
	IsBlocked   bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Principal struct {
	User             User
	SessionID        uuid.UUID
	AccessExpiresAt  time.Time
	SessionExpiresAt time.Time
	LastActivityAt   time.Time
}

type AuthResult struct {
	AccessToken  string
	RefreshToken string
	User         User
}

type Config struct {
	Secret           []byte
	Issuer           string
	Audience         string
	AccessTTL        time.Duration
	RefreshTTL       time.Duration
	IdleTTL          time.Duration
	LoginWindow      time.Duration
	LoginMaxFailures int
	LoginLock        time.Duration
	CodeWindow       time.Duration
	CodeMaxFailures  int
	CodeLock         time.Duration
}

func DefaultConfig(secret string) Config {
	return Config{Secret: []byte(secret), Issuer: "tuss-api", Audience: "tuss-web", AccessTTL: 24 * time.Hour,
		RefreshTTL: 7 * 24 * time.Hour, IdleTTL: 24 * time.Hour, LoginWindow: 10 * time.Minute,
		LoginMaxFailures: 5, LoginLock: 15 * time.Minute, CodeWindow: 10 * time.Minute,
		CodeMaxFailures: 5, CodeLock: 15 * time.Minute}
}
