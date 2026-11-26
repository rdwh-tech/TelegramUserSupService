package staff

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/rdwh-tech/TelegramUserSupService/internal/auth"
)

var (
	errRepositoryNotFound = errors.New("staff repository: not found")
	errRepositoryConflict = errors.New("staff repository: conflict")
)

type InvitationRole string

const (
	InvitationRoleL1 InvitationRole = "operator_l1"
	InvitationRoleL2 InvitationRole = "operator_l2"
)

type InvitationStatus string

const (
	InvitationPending  InvitationStatus = "pending"
	InvitationAccepted InvitationStatus = "accepted"
	InvitationRejected InvitationStatus = "rejected"
	InvitationExpired  InvitationStatus = "expired"
)

type CodeAttempt struct {
	AdminID         uuid.UUID
	WindowStartedAt time.Time
	FailureCount    int
	LockedUntil     *time.Time
}
type AuditAction string

const (
	AuditInvitationSent     AuditAction = "invitation_sent"
	AuditInvitationAccepted AuditAction = "invitation_accepted"
	AuditInvitationRejected AuditAction = "invitation_rejected"
)

type Repository interface {
	WithinTransaction(context.Context, func(Repository) error) error
	LockUser(context.Context, uuid.UUID) (auth.User, error)
	ActiveCode(context.Context, uuid.UUID, time.Time) (ConnectionCode, error)
	CreateCode(context.Context, ConnectionCode) error
	AttemptForUpdate(context.Context, uuid.UUID) (CodeAttempt, error)
	SaveAttempt(context.Context, CodeAttempt) error
	DeleteAttempt(context.Context, uuid.UUID) error
	ActiveCodeByValue(context.Context, string, time.Time) (ConnectionCode, error)
	PendingForCompanyOperator(context.Context, uuid.UUID, uuid.UUID) (Invitation, error)
	CreateInvitation(context.Context, Invitation, uuid.UUID, *string, time.Time) error
	InvitationByID(context.Context, uuid.UUID) (Invitation, error)
	ExpireInvalid(context.Context, uuid.UUID, time.Time) error
	PendingList(context.Context, uuid.UUID) ([]Invitation, error)
	InvitationForOwner(context.Context, uuid.UUID, uuid.UUID) (Invitation, *string, error)
	CodeByValue(context.Context, string) (ConnectionCode, error)
	AssignOperator(context.Context, uuid.UUID, uuid.UUID, auth.Role, time.Time) error
	MarkCodeUsed(context.Context, uuid.UUID, time.Time) error
	SetInvitationStatus(context.Context, uuid.UUID, InvitationStatus, time.Time) error
	ExpireOtherPending(context.Context, uuid.UUID, uuid.UUID, time.Time) error
	CreateAudit(context.Context, *uuid.UUID, uuid.UUID, AuditAction, time.Time) error
}
type UserReader interface {
	Me(context.Context, uuid.UUID) (auth.User, error)
}
