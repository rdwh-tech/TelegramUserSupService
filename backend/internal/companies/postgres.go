package companies

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/rdwh-tech/TelegramUserSupService/internal/auth"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/database"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/models"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/requestctx"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PostgresRepository struct {
	db     *gorm.DB
	logger *slog.Logger
}

func NewPostgresRepository(db *gorm.DB, logger *slog.Logger) (*PostgresRepository, error) {
	if db == nil {
		return nil, errors.New("companies repository: db is nil")
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &PostgresRepository{db, logger.With("layer", "repository", "component", "companies")}, nil
}
func (r *PostgresRepository) withDB(db *gorm.DB) *PostgresRepository {
	return &PostgresRepository{db, r.logger}
}
func (r *PostgresRepository) WithinTransaction(ctx context.Context, fn func(Repository) error) error {
	return database.WithinAuth(ctx, r.db, func(tx *gorm.DB) error { return fn(r.withDB(tx)) })
}
func (r *PostgresRepository) LockUser(ctx context.Context, id uuid.UUID) (auth.User, error) {
	var row models.User
	if err := r.db.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).First(&row, "id=?", id).Error; err != nil {
		return auth.User{}, r.fail(ctx, "lock user", err)
	}
	return auth.User{ID: row.ID, CompanyID: row.CompanyID, Login: row.Login, FullName: row.FullName, Role: auth.Role(row.Role), IsBlocked: row.IsBlocked, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}, nil
}
func (r *PostgresRepository) CreateCompany(ctx context.Context, c Company) error {
	row := models.Company{ID: c.ID, Name: c.Name, Description: c.Description, IsActive: c.IsActive, CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt}
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return r.fail(ctx, "create company", err)
	}
	return nil
}
func (r *PostgresRepository) AttachAdmin(ctx context.Context, userID, companyID uuid.UUID, now time.Time) error {
	if err := r.db.WithContext(ctx).Model(&models.User{}).Where("id=?", userID).Updates(map[string]any{"company_id": companyID, "updated_at": now}).Error; err != nil {
		return r.fail(ctx, "attach admin", err)
	}
	return nil
}
func (r *PostgresRepository) CreateSchedule(ctx context.Context, companyID uuid.UUID, days []ScheduleDay) error {
	rows := make([]models.CompanySchedule, 0, len(days))
	for _, d := range days {
		rows = append(rows, models.CompanySchedule{ID: uuid.New(), CompanyID: companyID, DayOfWeek: d.Day, IsWorkingDay: d.Working, StartTime: d.Start, EndTime: d.End, Timezone: d.Timezone})
	}
	if err := r.db.WithContext(ctx).Create(&rows).Error; err != nil {
		return r.fail(ctx, "create schedule", err)
	}
	return nil
}
func (r *PostgresRepository) CreateSLAPolicy(ctx context.Context, companyID uuid.UUID, p SLAPolicy) error {
	row := models.CompanySLAPolicy{ID: uuid.New(), CompanyID: companyID, Version: 1, FRTLimitMinutesL1: &p.FRTL1, TTRLimitMinutesL1: &p.TTRL1, ARTLimitMinutesL1: &p.ARTL1, FRTLimitMinutesL2: &p.FRTL2, TTRLimitMinutesL2: &p.TTRL2, ARTLimitMinutesL2: &p.ARTL2, IsActive: true}
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return r.fail(ctx, "create SLA policy", err)
	}
	return nil
}
func (r *PostgresRepository) CreateCompanyAudit(ctx context.Context, companyID, userID uuid.UUID, now time.Time) error {
	row := models.AuditLog{CompanyID: &companyID, UserID: &userID, ActionType: models.AuditCompanyCreated, CreatedAt: now}
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return r.fail(ctx, "create company audit", err)
	}
	return nil
}
func (r *PostgresRepository) fail(ctx context.Context, op string, err error) error {
	r.logger.Error("database operation failed", "operation", op, "request_id", requestctx.RequestID(ctx), "error", err)
	return fmt.Errorf("companies repository: %s: %w", op, err)
}
