package staff

import (
	"context"
	"crypto/rand"
	"errors"
	"log/slog"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rdwh-tech/TelegramUserSupService/internal/auth"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/requestctx"
)

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

type ConnectionCode struct {
	ID, OperatorID uuid.UUID
	Code           string
	ExpiresAt      time.Time
	IsUsed         bool
	CreatedAt      time.Time
}
type Invitation struct {
	ID, CompanyID, OperatorID uuid.UUID
	CompanyName               string
	RoleToAssign              InvitationRole
	Status                    InvitationStatus
	CreatedAt                 time.Time
}
type Config struct {
	Window      time.Duration
	MaxFailures int
	Lock        time.Duration
}
type Service struct {
	repo     Repository
	users    UserReader
	cfg      Config
	now      func() time.Time
	generate func() (string, error)
	logger   *slog.Logger
}

func NewService(repo Repository, users UserReader, cfg Config, logger *slog.Logger) (*Service, error) {
	if repo == nil || users == nil || cfg.Window <= 0 || cfg.MaxFailures <= 0 || cfg.Lock <= 0 {
		return nil, auth.ErrValidation
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &Service{repo: repo, users: users, cfg: cfg, now: func() time.Time { return time.Now().UTC() }, generate: randomCode, logger: logger.With("layer", "service", "component", "staff")}, nil
}
func randomCode() (string, error) {
	b := make([]byte, 6)
	for i := range b {
		n, e := rand.Int(rand.Reader, big.NewInt(int64(len(codeAlphabet))))
		if e != nil {
			return "", e
		}
		b[i] = codeAlphabet[n.Int64()]
	}
	return string(b), nil
}
func codeExpiry(now time.Time) time.Time {
	loc, _ := time.LoadLocation("Europe/Moscow")
	local := now.In(loc)
	return time.Date(local.Year(), local.Month(), local.Day()+1, 0, 0, 0, 0, loc).UTC()
}
func (s *Service) ConnectionCode(ctx context.Context, p auth.Principal) (ConnectionCode, error) {
	if p.User.Role != auth.RoleUnassignedOperator || p.User.CompanyID != nil {
		return ConnectionCode{}, auth.ErrAccessDenied
	}
	now := s.now()
	for attempts := 0; attempts < 10; attempts++ {
		value, err := s.generate()
		if err != nil {
			return ConnectionCode{}, err
		}
		var result ConnectionCode
		err = s.repo.WithinTransaction(ctx, func(repo Repository) error {
			user, err := repo.LockUser(ctx, p.User.ID)
			if err != nil {
				return err
			}
			if user.CompanyID != nil || user.Role != auth.RoleUnassignedOperator {
				return auth.ErrAccessDenied
			}
			result, err = repo.ActiveCode(ctx, user.ID, now)
			if err == nil {
				return nil
			}
			if !errors.Is(err, errRepositoryNotFound) {
				return err
			}
			result = ConnectionCode{ID: uuid.New(), OperatorID: user.ID, Code: value, ExpiresAt: codeExpiry(now), CreatedAt: now}
			return repo.CreateCode(ctx, result)
		})
		if err == nil {
			s.logger.Info("connection code issued", "request_id", requestctx.RequestID(ctx), "operator_id", p.User.ID, "reused", result.Code != value)
			return result, nil
		}
		if !errors.Is(err, errRepositoryConflict) {
			return ConnectionCode{}, err
		}
	}
	return ConnectionCode{}, errors.New("connection code collision limit")
}
func (s *Service) CreateInvitation(ctx context.Context, p auth.Principal, code string, role InvitationRole) (Invitation, bool, error) {
	if p.User.Role != auth.RoleAdmin || p.User.CompanyID == nil {
		return Invitation{}, false, auth.ErrAccessDenied
	}
	if role != InvitationRoleL1 && role != InvitationRoleL2 {
		return Invitation{}, false, auth.ErrValidation
	}
	code = strings.TrimSpace(code)
	now := s.now()
	var out Invitation
	created, invalid := false, false
	var operatorID uuid.UUID
	err := s.repo.WithinTransaction(ctx, func(repo Repository) error {
		attempt, err := repo.AttemptForUpdate(ctx, p.User.ID)
		if err != nil && !errors.Is(err, errRepositoryNotFound) {
			return err
		}
		if err == nil && attempt.LockedUntil != nil && now.Before(*attempt.LockedUntil) {
			return auth.ErrTooManyAttempts
		}
		cc, err := repo.ActiveCodeByValue(ctx, code, now)
		if errors.Is(err, errRepositoryNotFound) {
			recordCodeFailure(&attempt, p.User.ID, now, s.cfg)
			if e := repo.SaveAttempt(ctx, attempt); e != nil {
				return e
			}
			invalid = true
			return nil
		}
		if err != nil {
			return err
		}
		operator, err := repo.LockUser(ctx, cc.OperatorID)
		if err != nil {
			return err
		}
		if operator.CompanyID != nil || operator.Role != auth.RoleUnassignedOperator {
			return auth.ErrOperatorAlreadyAssigned
		}
		operatorID = operator.ID
		existing, err := repo.PendingForCompanyOperator(ctx, *p.User.CompanyID, operator.ID)
		if err == nil {
			out = existing
			return nil
		}
		if !errors.Is(err, errRepositoryNotFound) {
			return err
		}
		out = Invitation{ID: uuid.New(), CompanyID: *p.User.CompanyID, OperatorID: operator.ID, RoleToAssign: role, Status: InvitationPending, CreatedAt: now}
		if err := repo.CreateInvitation(ctx, out, p.User.ID, &cc.Code, now); err != nil {
			return err
		}
		if err := repo.DeleteAttempt(ctx, p.User.ID); err != nil {
			return err
		}
		if err := repo.CreateAudit(ctx, p.User.CompanyID, p.User.ID, AuditInvitationSent, now); err != nil {
			return err
		}
		out, err = repo.InvitationByID(ctx, out.ID)
		created = true
		return err
	})
	if err == nil && invalid {
		return Invitation{}, false, auth.ErrInvalidConnectionCode
	}
	if errors.Is(err, errRepositoryConflict) && operatorID != uuid.Nil {
		var existing Invitation
		findErr := s.repo.WithinTransaction(ctx, func(repo Repository) error {
			var loadErr error
			existing, loadErr = repo.PendingForCompanyOperator(ctx, *p.User.CompanyID, operatorID)
			return loadErr
		})
		return existing, false, findErr
	}
	if err == nil {
		s.logger.Info("invitation prepared", "request_id", requestctx.RequestID(ctx), "invitation_id", out.ID, "company_id", out.CompanyID, "created", created)
	}
	return out, created, err
}
func recordCodeFailure(a *CodeAttempt, admin uuid.UUID, now time.Time, cfg Config) {
	if a.AdminID == uuid.Nil || now.Sub(a.WindowStartedAt) >= cfg.Window {
		*a = CodeAttempt{AdminID: admin, WindowStartedAt: now, FailureCount: 1}
	} else {
		a.FailureCount++
	}
	if a.FailureCount >= cfg.MaxFailures {
		locked := now.Add(cfg.Lock)
		a.LockedUntil = &locked
	}
}
func (s *Service) Pending(ctx context.Context, p auth.Principal) ([]Invitation, error) {
	if p.User.Role != auth.RoleUnassignedOperator || p.User.CompanyID != nil {
		return nil, auth.ErrAccessDenied
	}
	now := s.now()
	var invitations []Invitation
	err := s.repo.WithinTransaction(ctx, func(repo Repository) error {
		if err := repo.ExpireInvalid(ctx, p.User.ID, now); err != nil {
			return err
		}
		var loadErr error
		invitations, loadErr = repo.PendingList(ctx, p.User.ID)
		return loadErr
	})
	return invitations, err
}
func (s *Service) Accept(ctx context.Context, p auth.Principal, id uuid.UUID) (auth.User, error) {
	if p.User.Role != auth.RoleUnassignedOperator || p.User.CompanyID != nil {
		return auth.User{}, auth.ErrAccessDenied
	}
	now := s.now()
	err := s.repo.WithinTransaction(ctx, func(repo Repository) error {
		inv, codeValue, err := repo.InvitationForOwner(ctx, id, p.User.ID)
		if errors.Is(err, errRepositoryNotFound) {
			return auth.ErrInvitationNotFound
		}
		if err != nil {
			return err
		}
		if inv.Status != InvitationPending || codeValue == nil {
			return auth.ErrInvitationNotPending
		}
		user, err := repo.LockUser(ctx, p.User.ID)
		if err != nil {
			return err
		}
		if user.CompanyID != nil || user.Role != auth.RoleUnassignedOperator {
			return auth.ErrOperatorAlreadyAssigned
		}
		cc, err := repo.CodeByValue(ctx, *codeValue)
		if err != nil || cc.IsUsed || !now.Before(cc.ExpiresAt) {
			return auth.ErrInvitationNotPending
		}
		role := auth.Role(inv.RoleToAssign)
		if err := repo.AssignOperator(ctx, user.ID, inv.CompanyID, role, now); err != nil {
			return err
		}
		if err := repo.MarkCodeUsed(ctx, cc.ID, now); err != nil {
			return err
		}
		if err := repo.SetInvitationStatus(ctx, inv.ID, InvitationAccepted, now); err != nil {
			return err
		}
		if err := repo.ExpireOtherPending(ctx, user.ID, inv.ID, now); err != nil {
			return err
		}
		return repo.CreateAudit(ctx, &inv.CompanyID, user.ID, AuditInvitationAccepted, now)
	})
	if err != nil {
		return auth.User{}, err
	}
	user, err := s.users.Me(ctx, p.User.ID)
	if err == nil {
		s.logger.Info("invitation accepted", "request_id", requestctx.RequestID(ctx), "invitation_id", id, "user_id", p.User.ID)
	}
	return user, err
}
func (s *Service) Reject(ctx context.Context, p auth.Principal, id uuid.UUID) error {
	now := s.now()
	err := s.repo.WithinTransaction(ctx, func(repo Repository) error {
		inv, _, err := repo.InvitationForOwner(ctx, id, p.User.ID)
		if errors.Is(err, errRepositoryNotFound) {
			return auth.ErrInvitationNotFound
		}
		if err != nil {
			return err
		}
		if inv.Status == InvitationRejected {
			return nil
		}
		if inv.Status != InvitationPending {
			return auth.ErrInvitationNotPending
		}
		if err := repo.SetInvitationStatus(ctx, inv.ID, InvitationRejected, now); err != nil {
			return err
		}
		return repo.CreateAudit(ctx, &inv.CompanyID, p.User.ID, AuditInvitationRejected, now)
	})
	if err == nil {
		s.logger.Info("invitation rejected", "request_id", requestctx.RequestID(ctx), "invitation_id", id, "user_id", p.User.ID)
	}
	return err
}
