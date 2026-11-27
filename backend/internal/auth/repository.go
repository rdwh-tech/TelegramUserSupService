package auth

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	errRepositoryNotFound = errors.New("auth repository: not found")
	errRepositoryConflict = errors.New("auth repository: conflict")
)

type Repository interface {
	WithinTransaction(context.Context, func(Repository) error) error
	CreateAccount(context.Context, Account) error
	AccountForLogin(context.Context, string) (Account, error)
	SaveLoginState(context.Context, Account) error
	UserByID(context.Context, uuid.UUID) (User, error)
	CreateSession(context.Context, Session) error
	SessionByID(context.Context, uuid.UUID, uuid.UUID, bool) (Session, error)
	SessionByRefreshHash(context.Context, string) (Session, error)
	TouchSession(context.Context, uuid.UUID, uuid.UUID, time.Time, time.Time) error
	RevokeSession(context.Context, uuid.UUID, time.Time) error
	UpdateFullName(context.Context, uuid.UUID, string, time.Time) error
	CreateAudit(context.Context, AuditEvent) error
}
