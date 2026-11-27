package companies

import (
	"context"
	"log/slog"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/rdwh-tech/TelegramUserSupService/internal/auth"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/requestctx"
)

type Company struct {
	ID                   uuid.UUID
	Name                 string
	Description          *string
	IsActive             bool
	CreatedAt, UpdatedAt time.Time
}
type Result struct {
	Company Company
	User    auth.User
}
type Service struct {
	repo   Repository
	users  UserReader
	now    func() time.Time
	logger *slog.Logger
}

func NewService(repo Repository, users UserReader, logger *slog.Logger) (*Service, error) {
	if repo == nil || users == nil {
		return nil, auth.ErrValidation
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &Service{repo: repo, users: users, now: func() time.Time { return time.Now().UTC() }, logger: logger.With("layer", "service", "component", "companies")}, nil
}
func (s *Service) Create(ctx context.Context, p auth.Principal, name string, description *string, timezone string) (Result, error) {
	if p.User.Role != auth.RoleAdmin {
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
	company := Company{ID: uuid.New(), Name: name, Description: description, IsActive: true, CreatedAt: now, UpdatedAt: now}
	days := defaultSchedule(timezone)
	policy := SLAPolicy{15, 120, 10, 5, 60, 5}
	err := s.repo.WithinTransaction(ctx, func(repo Repository) error {
		user, err := repo.LockUser(ctx, p.User.ID)
		if err != nil {
			return err
		}
		if user.Role != auth.RoleAdmin {
			return auth.ErrAccessDenied
		}
		if user.CompanyID != nil {
			return auth.ErrCompanyAlreadyCreated
		}
		if err := repo.CreateCompany(ctx, company); err != nil {
			return err
		}
		if err := repo.AttachAdmin(ctx, user.ID, company.ID, now); err != nil {
			return err
		}
		if err := repo.CreateSchedule(ctx, company.ID, days); err != nil {
			return err
		}
		if err := repo.CreateSLAPolicy(ctx, company.ID, policy); err != nil {
			return err
		}
		return repo.CreateCompanyAudit(ctx, company.ID, user.ID, now)
	})
	if err != nil {
		return Result{}, err
	}
	user, err := s.users.Me(ctx, p.User.ID)
	if err != nil {
		return Result{}, err
	}
	s.logger.Info("company created", "request_id", requestctx.RequestID(ctx), "company_id", company.ID, "user_id", p.User.ID)
	return Result{company, user}, nil
}
func defaultSchedule(timezone string) []ScheduleDay {
	days := make([]ScheduleDay, 0, 7)
	for day := 1; day <= 7; day++ {
		working := day <= 5
		var start, end *string
		if working {
			a, b := "09:00", "18:00"
			start, end = &a, &b
		}
		days = append(days, ScheduleDay{int16(day), working, start, end, timezone})
	}
	return days
}
