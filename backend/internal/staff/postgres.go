package staff

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
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
		return nil, errors.New("staff repository: db is nil")
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &PostgresRepository{db, logger.With("layer", "repository", "component", "staff")}, nil
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
func (r *PostgresRepository) ActiveCode(ctx context.Context, operatorID uuid.UUID, now time.Time) (ConnectionCode, error) {
	var row models.OperatorConnectionCode
	if err := r.db.WithContext(ctx).Where("operator_id=? AND is_used=false AND expires_at>?", operatorID, now).Order("created_at DESC").First(&row).Error; err != nil {
		return ConnectionCode{}, r.fail(ctx, "load active code", err)
	}
	return mapCodeRow(row), nil
}
func (r *PostgresRepository) CreateCode(ctx context.Context, c ConnectionCode) error {
	row := models.OperatorConnectionCode{ID: c.ID, OperatorID: c.OperatorID, Code: c.Code, ExpiresAt: c.ExpiresAt, IsUsed: c.IsUsed, CreatedAt: c.CreatedAt}
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return r.fail(ctx, "create code", err)
	}
	return nil
}
func (r *PostgresRepository) AttemptForUpdate(ctx context.Context, id uuid.UUID) (CodeAttempt, error) {
	var row models.ConnectionCodeAttempt
	if err := r.db.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).First(&row, "admin_id=?", id).Error; err != nil {
		return CodeAttempt{}, r.fail(ctx, "load code attempt", err)
	}
	return CodeAttempt{row.AdminID, row.WindowStartedAt, row.FailureCount, row.LockedUntil}, nil
}
func (r *PostgresRepository) SaveAttempt(ctx context.Context, a CodeAttempt) error {
	row := models.ConnectionCodeAttempt{AdminID: a.AdminID, WindowStartedAt: a.WindowStartedAt, FailureCount: a.FailureCount, LockedUntil: a.LockedUntil}
	if err := r.db.WithContext(ctx).Save(&row).Error; err != nil {
		return r.fail(ctx, "save code attempt", err)
	}
	return nil
}
func (r *PostgresRepository) DeleteAttempt(ctx context.Context, id uuid.UUID) error {
	if err := r.db.WithContext(ctx).Delete(&models.ConnectionCodeAttempt{}, "admin_id=?", id).Error; err != nil {
		return r.fail(ctx, "delete code attempt", err)
	}
	return nil
}
func (r *PostgresRepository) ActiveCodeByValue(ctx context.Context, code string, now time.Time) (ConnectionCode, error) {
	var row models.OperatorConnectionCode
	if err := r.db.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).Where("code=? AND is_used=false AND expires_at>?", code, now).First(&row).Error; err != nil {
		return ConnectionCode{}, r.fail(ctx, "load code by value", err)
	}
	return mapCodeRow(row), nil
}
func (r *PostgresRepository) PendingForCompanyOperator(ctx context.Context, companyID, operatorID uuid.UUID) (Invitation, error) {
	var row struct {
		models.CompanyInvitation
		CompanyName string
	}
	if err := r.db.WithContext(ctx).Table("company_invitations").Select("company_invitations.*,companies.name company_name").Joins("JOIN companies ON companies.id=company_invitations.company_id").Where("company_invitations.company_id=? AND operator_id=? AND status='pending'", companyID, operatorID).First(&row).Error; err != nil {
		return Invitation{}, r.fail(ctx, "load pending invitation", err)
	}
	return mapInvitationRow(row.CompanyInvitation, row.CompanyName), nil
}
func (r *PostgresRepository) CreateInvitation(ctx context.Context, i Invitation, invitedBy uuid.UUID, code *string, now time.Time) error {
	row := models.CompanyInvitation{ID: i.ID, CompanyID: i.CompanyID, OperatorID: i.OperatorID, InvitedByUserID: invitedBy, RoleToAssign: models.InvitationRole(i.RoleToAssign), Status: models.InvitationStatus(i.Status), ConnectionCodeUsed: code, CreatedAt: now, UpdatedAt: now}
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return r.fail(ctx, "create invitation", err)
	}
	return nil
}
func (r *PostgresRepository) InvitationByID(ctx context.Context, id uuid.UUID) (Invitation, error) {
	var row struct {
		models.CompanyInvitation
		CompanyName string
	}
	if err := r.db.WithContext(ctx).Table("company_invitations").Select("company_invitations.*,companies.name company_name").Joins("JOIN companies ON companies.id=company_invitations.company_id").Where("company_invitations.id=?", id).First(&row).Error; err != nil {
		return Invitation{}, r.fail(ctx, "load invitation", err)
	}
	return mapInvitationRow(row.CompanyInvitation, row.CompanyName), nil
}
func (r *PostgresRepository) ExpireInvalid(ctx context.Context, operatorID uuid.UUID, now time.Time) error {
	if err := r.db.WithContext(ctx).Model(&models.CompanyInvitation{}).Where("operator_id=? AND status='pending' AND connection_code_used IN (SELECT code FROM operator_connection_codes WHERE expires_at<=? OR is_used=true)", operatorID, now).Updates(map[string]any{"status": models.InvitationExpired, "updated_at": now, "decided_at": now}).Error; err != nil {
		return r.fail(ctx, "expire invalid invitations", err)
	}
	return nil
}
func (r *PostgresRepository) PendingList(ctx context.Context, operatorID uuid.UUID) ([]Invitation, error) {
	var rows []struct {
		models.CompanyInvitation
		CompanyName string
	}
	if err := r.db.WithContext(ctx).Table("company_invitations").Select("company_invitations.*,companies.name company_name").Joins("JOIN companies ON companies.id=company_invitations.company_id").Where("operator_id=? AND status='pending'", operatorID).Order("company_invitations.created_at,company_invitations.id").Scan(&rows).Error; err != nil {
		return nil, r.fail(ctx, "list invitations", err)
	}
	out := make([]Invitation, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapInvitationRow(row.CompanyInvitation, row.CompanyName))
	}
	return out, nil
}
func (r *PostgresRepository) InvitationForOwner(ctx context.Context, id, operatorID uuid.UUID) (Invitation, *string, error) {
	var row models.CompanyInvitation
	if err := r.db.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).Where("id=? AND operator_id=?", id, operatorID).First(&row).Error; err != nil {
		return Invitation{}, nil, r.fail(ctx, "lock invitation", err)
	}
	inv := mapInvitationRow(row, "")
	return inv, row.ConnectionCodeUsed, nil
}
func (r *PostgresRepository) CodeByValue(ctx context.Context, code string) (ConnectionCode, error) {
	var row models.OperatorConnectionCode
	if err := r.db.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).First(&row, "code=?", code).Error; err != nil {
		return ConnectionCode{}, r.fail(ctx, "lock connection code", err)
	}
	return mapCodeRow(row), nil
}
func (r *PostgresRepository) AssignOperator(ctx context.Context, id, companyID uuid.UUID, role auth.Role, now time.Time) error {
	if err := r.db.WithContext(ctx).Model(&models.User{}).Where("id=?", id).Updates(map[string]any{"company_id": companyID, "role": models.UserRole(role), "updated_at": now}).Error; err != nil {
		return r.fail(ctx, "assign operator", err)
	}
	return nil
}
func (r *PostgresRepository) MarkCodeUsed(ctx context.Context, id uuid.UUID, now time.Time) error {
	if err := r.db.WithContext(ctx).Model(&models.OperatorConnectionCode{}).Where("id=?", id).Updates(map[string]any{"is_used": true, "used_at": now}).Error; err != nil {
		return r.fail(ctx, "mark code used", err)
	}
	return nil
}
func (r *PostgresRepository) SetInvitationStatus(ctx context.Context, id uuid.UUID, status InvitationStatus, now time.Time) error {
	if err := r.db.WithContext(ctx).Model(&models.CompanyInvitation{}).Where("id=?", id).Updates(map[string]any{"status": models.InvitationStatus(status), "updated_at": now, "decided_at": now}).Error; err != nil {
		return r.fail(ctx, "update invitation", err)
	}
	return nil
}
func (r *PostgresRepository) ExpireOtherPending(ctx context.Context, operatorID, exceptID uuid.UUID, now time.Time) error {
	if err := r.db.WithContext(ctx).Model(&models.CompanyInvitation{}).Where("operator_id=? AND id<>? AND status='pending'", operatorID, exceptID).Updates(map[string]any{"status": models.InvitationExpired, "updated_at": now, "decided_at": now}).Error; err != nil {
		return r.fail(ctx, "expire other invitations", err)
	}
	return nil
}
func (r *PostgresRepository) CreateAudit(ctx context.Context, companyID *uuid.UUID, userID uuid.UUID, action AuditAction, now time.Time) error {
	row := models.AuditLog{CompanyID: companyID, UserID: &userID, ActionType: models.AuditActionType(action), CreatedAt: now}
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return r.fail(ctx, "create invitation audit", err)
	}
	return nil
}
func (r *PostgresRepository) fail(ctx context.Context, op string, err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errRepositoryNotFound
	}
	v := strings.ToLower(err.Error())
	if strings.Contains(v, "duplicate key") || strings.Contains(v, "unique constraint") {
		return errRepositoryConflict
	}
	r.logger.Error("database operation failed", "operation", op, "request_id", requestctx.RequestID(ctx), "error", err)
	return fmt.Errorf("staff repository: %s: %w", op, err)
}
func mapCodeRow(r models.OperatorConnectionCode) ConnectionCode {
	return ConnectionCode{ID: r.ID, OperatorID: r.OperatorID, Code: r.Code, ExpiresAt: r.ExpiresAt, IsUsed: r.IsUsed, CreatedAt: r.CreatedAt}
}
func mapInvitationRow(i models.CompanyInvitation, n string) Invitation {
	return Invitation{ID: i.ID, CompanyID: i.CompanyID, OperatorID: i.OperatorID, CompanyName: n, RoleToAssign: InvitationRole(i.RoleToAssign), Status: InvitationStatus(i.Status), CreatedAt: i.CreatedAt}
}
