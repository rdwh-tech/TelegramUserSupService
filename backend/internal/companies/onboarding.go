package companies

import (
	"context"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/rdwh-tech/TelegramUserSupService/internal/auth"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Company struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	IsActive    bool      `json:"isActive"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
type Result struct {
	Company Company
	User    auth.User
}
type Service struct {
	db    *gorm.DB
	users *auth.Service
	now   func() time.Time
}

func NewService(db *gorm.DB, users *auth.Service) *Service {
	return &Service{db: db, users: users, now: func() time.Time { return time.Now().UTC() }}
}

func (s *Service) Create(ctx context.Context, principal auth.Principal, name string, description *string, timezone string) (Result, error) {
	if principal.User.Role != models.UserRoleAdmin {
		return Result{}, auth.ErrAccessDenied
	}
	name = strings.TrimSpace(name)
	if timezone == "" {
		timezone = "Europe/Moscow"
	}
	if name == "" || utf8.RuneCountInString(name) > 255 {
		return Result{}, auth.ErrValidation
	}
	if _, err := time.LoadLocation(timezone); err != nil {
		return Result{}, auth.ErrValidation
	}
	if description != nil {
		trimmed := strings.TrimSpace(*description)
		if trimmed == "" {
			description = nil
		} else {
			description = &trimmed
		}
	}
	now := s.now()
	company := models.Company{ID: uuid.New(), Name: name, Description: description, IsActive: true, CreatedAt: now, UpdatedAt: now}
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var user models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, "id = ?", principal.User.ID).Error; err != nil {
			return err
		}
		if user.Role != models.UserRoleAdmin {
			return auth.ErrAccessDenied
		}
		if user.CompanyID != nil {
			return auth.ErrCompanyAlreadyCreated
		}
		if err := tx.Create(&company).Error; err != nil {
			return err
		}
		if err := tx.Model(&user).Updates(map[string]any{"company_id": company.ID, "updated_at": now}).Error; err != nil {
			return err
		}
		for day := 1; day <= 7; day++ {
			working := day <= 5
			var start, end *string
			if working {
				a, b := "09:00", "18:00"
				start, end = &a, &b
			}
			schedule := models.CompanySchedule{ID: uuid.New(), CompanyID: company.ID, DayOfWeek: int16(day), IsWorkingDay: working, StartTime: start, EndTime: end, Timezone: timezone}
			if err := tx.Create(&schedule).Error; err != nil {
				return err
			}
		}
		l1frt, l1ttr, l1art, l2frt, l2ttr, l2art := 15, 120, 10, 5, 60, 5
		policy := models.CompanySLAPolicy{ID: uuid.New(), CompanyID: company.ID, Version: 1, FRTLimitMinutesL1: &l1frt, TTRLimitMinutesL1: &l1ttr, ARTLimitMinutesL1: &l1art, FRTLimitMinutesL2: &l2frt, TTRLimitMinutesL2: &l2ttr, ARTLimitMinutesL2: &l2art, IsActive: true}
		if err := tx.Create(&policy).Error; err != nil {
			return err
		}
		return tx.Create(&models.AuditLog{CompanyID: &company.ID, UserID: &user.ID, ActionType: models.AuditCompanyCreated, CreatedAt: now}).Error
	})
	if err != nil {
		return Result{}, err
	}
	user, err := s.users.Me(ctx, principal.User.ID)
	if err != nil {
		return Result{}, err
	}
	return Result{Company: Company{company.ID, company.Name, company.Description, company.IsActive, company.CreatedAt, company.UpdatedAt}, User: user}, nil
}
