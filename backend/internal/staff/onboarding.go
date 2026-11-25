package staff

import (
	"context"
	"crypto/rand"
	"errors"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rdwh-tech/TelegramUserSupService/internal/auth"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

type ConnectionCode struct {
	ID, OperatorID uuid.UUID
	Code           string
	ExpiresAt      time.Time
	IsUsed         bool
}
type Invitation struct {
	ID, CompanyID, OperatorID uuid.UUID
	CompanyName               string
	RoleToAssign              models.InvitationRole
	Status                    models.InvitationStatus
	CreatedAt                 time.Time
}
type Config struct {
	Window      time.Duration
	MaxFailures int
	Lock        time.Duration
}
type Service struct {
	db       *gorm.DB
	users    *auth.Service
	cfg      Config
	now      func() time.Time
	generate func() (string, error)
}

func NewService(db *gorm.DB, users *auth.Service, cfg Config) *Service {
	return &Service{db: db, users: users, cfg: cfg, now: func() time.Time { return time.Now().UTC() }, generate: randomCode}
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
	if p.User.Role != models.UserRoleUnassignedOperator || p.User.CompanyID != nil {
		return ConnectionCode{}, auth.ErrAccessDenied
	}
	now := s.now()
	for attempts := 0; attempts < 10; attempts++ {
		code, e := s.generate()
		if e != nil {
			return ConnectionCode{}, e
		}
		var row models.OperatorConnectionCode
		e = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			var user models.User
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, "id=?", p.User.ID).Error; err != nil {
				return err
			}
			if user.CompanyID != nil || user.Role != models.UserRoleUnassignedOperator {
				return auth.ErrAccessDenied
			}
			err := tx.Where("operator_id = ? AND is_used = false AND expires_at > ?", p.User.ID, now).Order("created_at DESC").First(&row).Error
			if err == nil {
				return nil
			}
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			row = models.OperatorConnectionCode{ID: uuid.New(), OperatorID: p.User.ID, Code: code, ExpiresAt: codeExpiry(now), CreatedAt: now}
			return tx.Create(&row).Error
		})
		if e == nil {
			return mapCode(row), nil
		}
		if !isUnique(e) {
			return ConnectionCode{}, e
		}
	}
	return ConnectionCode{}, errors.New("connection code collision limit")
}
func mapCode(r models.OperatorConnectionCode) ConnectionCode {
	return ConnectionCode{r.ID, r.OperatorID, r.Code, r.ExpiresAt, r.IsUsed}
}

func (s *Service) CreateInvitation(ctx context.Context, p auth.Principal, code string, role models.InvitationRole) (Invitation, bool, error) {
	if p.User.Role != models.UserRoleAdmin || p.User.CompanyID == nil {
		return Invitation{}, false, auth.ErrAccessDenied
	}
	if role != models.InvitationRoleOperatorL1 && role != models.InvitationRoleOperatorL2 {
		return Invitation{}, false, auth.ErrValidation
	}
	code = strings.TrimSpace(code)
	now := s.now()
	var out Invitation
	created := false
	invalidCode := false
	var operatorID uuid.UUID
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var attempt models.ConnectionCodeAttempt
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&attempt, "admin_id = ?", p.User.ID).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err == nil && attempt.LockedUntil != nil && now.Before(*attempt.LockedUntil) {
			return auth.ErrTooManyAttempts
		}
		var cc models.OperatorConnectionCode
		err = tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("code = ? AND is_used = false AND expires_at > ?", code, now).First(&cc).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if e := recordCodeFailure(tx, p.User.ID, attempt, now, s.cfg); e != nil {
				return e
			}
			invalidCode = true
			return nil
		}
		if err != nil {
			return err
		}
		var operator models.User
		if err = tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&operator, "id = ?", cc.OperatorID).Error; err != nil {
			return err
		}
		if operator.CompanyID != nil || operator.Role != models.UserRoleUnassignedOperator {
			return auth.ErrOperatorAlreadyAssigned
		}
		operatorID = operator.ID
		var existing models.CompanyInvitation
		err = tx.Where("company_id = ? AND operator_id = ? AND status = 'pending'", *p.User.CompanyID, operator.ID).First(&existing).Error
		if err == nil {
			out, err = loadInvitation(tx, existing.ID)
			return err
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		inv := models.CompanyInvitation{ID: uuid.New(), CompanyID: *p.User.CompanyID, OperatorID: operator.ID, InvitedByUserID: p.User.ID, RoleToAssign: role, Status: models.InvitationPending, ConnectionCodeUsed: &cc.Code, CreatedAt: now, UpdatedAt: now}
		if err = tx.Create(&inv).Error; err != nil {
			return err
		}
		_ = tx.Delete(&models.ConnectionCodeAttempt{}, "admin_id = ?", p.User.ID).Error
		if err = tx.Create(&models.AuditLog{CompanyID: p.User.CompanyID, UserID: &p.User.ID, ActionType: models.AuditInvitationSent, CreatedAt: now}).Error; err != nil {
			return err
		}
		out, err = loadInvitation(tx, inv.ID)
		created = true
		return err
	})
	if err == nil && invalidCode {
		return Invitation{}, false, auth.ErrInvalidConnectionCode
	}
	if err != nil && isUnique(err) && operatorID != uuid.Nil {
		var existing models.CompanyInvitation
		if findErr := s.db.WithContext(ctx).Where("company_id=? AND operator_id=? AND status='pending'", *p.User.CompanyID, operatorID).First(&existing).Error; findErr == nil {
			out, findErr = loadInvitation(s.db.WithContext(ctx), existing.ID)
			return out, false, findErr
		}
	}
	return out, created, err
}

func recordCodeFailure(tx *gorm.DB, admin uuid.UUID, a models.ConnectionCodeAttempt, now time.Time, cfg Config) error {
	if a.AdminID == uuid.Nil || now.Sub(a.WindowStartedAt) >= cfg.Window {
		a = models.ConnectionCodeAttempt{AdminID: admin, WindowStartedAt: now, FailureCount: 1}
	} else {
		a.FailureCount++
	}
	if a.FailureCount >= cfg.MaxFailures {
		v := now.Add(cfg.Lock)
		a.LockedUntil = &v
	}
	return tx.Save(&a).Error
}

func (s *Service) Pending(ctx context.Context, p auth.Principal) ([]Invitation, error) {
	if p.User.Role != models.UserRoleUnassignedOperator || p.User.CompanyID != nil {
		return nil, auth.ErrAccessDenied
	}
	now := s.now()
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return tx.Model(&models.CompanyInvitation{}).Where("operator_id = ? AND status = 'pending' AND connection_code_used IN (SELECT code FROM operator_connection_codes WHERE expires_at <= ? OR is_used = true)", p.User.ID, now).Updates(map[string]any{"status": models.InvitationExpired, "updated_at": now, "decided_at": now}).Error
	})
	if err != nil {
		return nil, err
	}
	var rows []struct {
		models.CompanyInvitation
		CompanyName string
	}
	if err = s.db.WithContext(ctx).Table("company_invitations").Select("company_invitations.*, companies.name company_name").Joins("JOIN companies ON companies.id=company_invitations.company_id").Where("operator_id=? AND status='pending'", p.User.ID).Order("company_invitations.created_at, company_invitations.id").Scan(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]Invitation, 0, len(rows))
	for _, r := range rows {
		out = append(out, mapInvitation(r.CompanyInvitation, r.CompanyName))
	}
	return out, nil
}

func (s *Service) Accept(ctx context.Context, p auth.Principal, id uuid.UUID) (auth.User, error) {
	if p.User.Role != models.UserRoleUnassignedOperator || p.User.CompanyID != nil {
		return auth.User{}, auth.ErrAccessDenied
	}
	now := s.now()
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var inv models.CompanyInvitation
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id=? AND operator_id=?", id, p.User.ID).First(&inv).Error; errors.Is(err, gorm.ErrRecordNotFound) {
			return auth.ErrInvitationNotFound
		} else if err != nil {
			return err
		}
		if inv.Status != models.InvitationPending {
			return auth.ErrInvitationNotPending
		}
		if inv.ConnectionCodeUsed == nil {
			return auth.ErrInvitationNotPending
		}
		var user models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, "id=?", p.User.ID).Error; err != nil {
			return err
		}
		if user.CompanyID != nil || user.Role != models.UserRoleUnassignedOperator {
			return auth.ErrOperatorAlreadyAssigned
		}
		var cc models.OperatorConnectionCode
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&cc, "code=?", *inv.ConnectionCodeUsed).Error; err != nil {
			return auth.ErrInvitationNotPending
		}
		if cc.IsUsed || !now.Before(cc.ExpiresAt) {
			return auth.ErrInvitationNotPending
		}
		role := models.UserRole(inv.RoleToAssign)
		if err := tx.Model(&user).Updates(map[string]any{"company_id": inv.CompanyID, "role": role, "updated_at": now}).Error; err != nil {
			return err
		}
		if err := tx.Model(&cc).Updates(map[string]any{"is_used": true, "used_at": now}).Error; err != nil {
			return err
		}
		if err := tx.Model(&inv).Updates(map[string]any{"status": models.InvitationAccepted, "updated_at": now, "decided_at": now}).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.CompanyInvitation{}).Where("operator_id=? AND id<>? AND status='pending'", user.ID, inv.ID).Updates(map[string]any{"status": models.InvitationExpired, "updated_at": now, "decided_at": now}).Error; err != nil {
			return err
		}
		return tx.Create(&models.AuditLog{CompanyID: &inv.CompanyID, UserID: &user.ID, ActionType: models.AuditInvitationAccepted, CreatedAt: now}).Error
	})
	if err != nil {
		return auth.User{}, err
	}
	return s.users.Me(ctx, p.User.ID)
}

func (s *Service) Reject(ctx context.Context, p auth.Principal, id uuid.UUID) error {
	now := s.now()
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var inv models.CompanyInvitation
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id=? AND operator_id=?", id, p.User.ID).First(&inv).Error; errors.Is(err, gorm.ErrRecordNotFound) {
			return auth.ErrInvitationNotFound
		} else if err != nil {
			return err
		}
		if inv.Status == models.InvitationRejected {
			return nil
		}
		if inv.Status != models.InvitationPending {
			return auth.ErrInvitationNotPending
		}
		if err := tx.Model(&inv).Updates(map[string]any{"status": models.InvitationRejected, "updated_at": now, "decided_at": now}).Error; err != nil {
			return err
		}
		return tx.Create(&models.AuditLog{CompanyID: &inv.CompanyID, UserID: &p.User.ID, ActionType: models.AuditInvitationRejected, CreatedAt: now}).Error
	})
}
func loadInvitation(db *gorm.DB, id uuid.UUID) (Invitation, error) {
	var r struct {
		models.CompanyInvitation
		CompanyName string
	}
	e := db.Table("company_invitations").Select("company_invitations.*,companies.name company_name").Joins("JOIN companies ON companies.id=company_invitations.company_id").Where("company_invitations.id=?", id).Scan(&r).Error
	return mapInvitation(r.CompanyInvitation, r.CompanyName), e
}
func mapInvitation(i models.CompanyInvitation, n string) Invitation {
	return Invitation{i.ID, i.CompanyID, i.OperatorID, n, i.RoleToAssign, i.Status, i.CreatedAt}
}
func isUnique(err error) bool {
	v := strings.ToLower(err.Error())
	return strings.Contains(v, "duplicate key") || strings.Contains(v, "unique constraint")
}
