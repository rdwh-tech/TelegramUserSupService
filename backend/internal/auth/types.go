package auth

import (
	"time"

	"github.com/google/uuid"
)

type Role string

const (
	RoleAdmin              Role = "admin"
	RoleOperatorL1         Role = "operator_l1"
	RoleOperatorL2         Role = "operator_l2"
	RoleUnassignedOperator Role = "unassigned_operator"
)

type User struct {
	ID          uuid.UUID
	CompanyID   *uuid.UUID
	CompanyName *string
	Login       string
	FullName    string
	Role        Role
	IsBlocked   bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Account struct {
	User
	PasswordHash               string
	FailedLoginCount           int
	FailedLoginWindowStartedAt *time.Time
	LoginLockedUntil           *time.Time
}

type Session struct {
	ID               uuid.UUID
	UserID           uuid.UUID
	RefreshTokenHash string
	ExpiresAt        time.Time
	IsRevoked        bool
	CreatedAt        time.Time
	LastActivityAt   time.Time
	RevokedAt        *time.Time
}

type AuditAction string

const (
	AuditUserRegistered AuditAction = "user_registered"
	AuditLogin          AuditAction = "login"
	AuditLogout         AuditAction = "logout"
	AuditProfileUpdated AuditAction = "profile_updated"
)

type AuditEvent struct {
	CompanyID *uuid.UUID
	UserID    *uuid.UUID
	Action    AuditAction
	CreatedAt time.Time
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
