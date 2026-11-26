package auth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
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
		return nil, errors.New("auth repository: db is nil")
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &PostgresRepository{db: db, logger: logger.With("layer", "repository", "component", "auth")}, nil
}

func (r *PostgresRepository) withDB(db *gorm.DB) *PostgresRepository {
	return &PostgresRepository{db: db, logger: r.logger}
}
func (r *PostgresRepository) WithinTransaction(ctx context.Context, fn func(Repository) error) error {
	if fn == nil {
		return errors.New("auth repository: transaction callback is nil")
	}
	return database.WithinAuth(ctx, r.db, func(tx *gorm.DB) error { return fn(r.withDB(tx)) })
}

func (r *PostgresRepository) CreateAccount(ctx context.Context, a Account) error {
	row := accountRow(a)
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return r.dbError(ctx, "create account", err)
	}
	return nil
}
func (r *PostgresRepository) AccountForLogin(ctx context.Context, login string) (Account, error) {
	var row models.User
	err := r.db.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).Where("lower(btrim(login)) = ?", login).First(&row).Error
	if err != nil {
		return Account{}, r.dbError(ctx, "find account for login", err)
	}
	return mapAccount(row), nil
}
func (r *PostgresRepository) SaveLoginState(ctx context.Context, a Account) error {
	updates := map[string]any{"failed_login_count": a.FailedLoginCount, "failed_login_window_started_at": a.FailedLoginWindowStartedAt, "login_locked_until": a.LoginLockedUntil}
	if err := r.db.WithContext(ctx).Model(&models.User{}).Where("id=?", a.ID).Updates(updates).Error; err != nil {
		return r.dbError(ctx, "save login state", err)
	}
	return nil
}
func (r *PostgresRepository) UserByID(ctx context.Context, id uuid.UUID) (User, error) {
	var row struct {
		models.User
		CompanyName *string
	}
	err := r.db.WithContext(ctx).Table("users").Select("users.*, companies.name AS company_name").Joins("LEFT JOIN companies ON companies.id=users.company_id").Where("users.id=?", id).Scan(&row).Error
	if err != nil {
		return User{}, r.dbError(ctx, "load user", err)
	}
	if row.ID == uuid.Nil {
		return User{}, errRepositoryNotFound
	}
	return mapUserRow(row.User, row.CompanyName), nil
}
func (r *PostgresRepository) CreateSession(ctx context.Context, s Session) error {
	row := sessionRow(s)
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return r.dbError(ctx, "create session", err)
	}
	return nil
}
func (r *PostgresRepository) SessionByID(ctx context.Context, id, userID uuid.UUID, lock bool) (Session, error) {
	var row models.UserSession
	q := r.db.WithContext(ctx)
	if lock {
		q = q.Clauses(clause.Locking{Strength: "UPDATE"})
	}
	if err := q.Where("id=? AND user_id=?", id, userID).First(&row).Error; err != nil {
		return Session{}, r.dbError(ctx, "load session", err)
	}
	return mapSession(row), nil
}
func (r *PostgresRepository) SessionByRefreshHash(ctx context.Context, hash string) (Session, error) {
	var row models.UserSession
	if err := r.db.WithContext(ctx).Where("refresh_token_hash=?", hash).First(&row).Error; err != nil {
		return Session{}, r.dbError(ctx, "load refresh session", err)
	}
	return mapSession(row), nil
}
func (r *PostgresRepository) TouchSession(ctx context.Context, id, userID uuid.UUID, now, olderThan time.Time) error {
	if err := r.db.WithContext(ctx).Model(&models.UserSession{}).Where("id=? AND user_id=? AND is_revoked=false AND last_activity_at < ?", id, userID, olderThan).Update("last_activity_at", now).Error; err != nil {
		return r.dbError(ctx, "touch session", err)
	}
	return nil
}
func (r *PostgresRepository) RevokeSession(ctx context.Context, id uuid.UUID, now time.Time) error {
	if err := r.db.WithContext(ctx).Model(&models.UserSession{}).Where("id=?", id).Updates(map[string]any{"is_revoked": true, "revoked_at": now}).Error; err != nil {
		return r.dbError(ctx, "revoke session", err)
	}
	return nil
}
func (r *PostgresRepository) UpdateFullName(ctx context.Context, id uuid.UUID, name string, now time.Time) error {
	if err := r.db.WithContext(ctx).Model(&models.User{}).Where("id=?", id).Updates(map[string]any{"full_name": name, "updated_at": now}).Error; err != nil {
		return r.dbError(ctx, "update profile", err)
	}
	return nil
}
func (r *PostgresRepository) CreateAudit(ctx context.Context, event AuditEvent) error {
	row := models.AuditLog{CompanyID: event.CompanyID, UserID: event.UserID, ActionType: models.AuditActionType(event.Action), CreatedAt: event.CreatedAt}
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return r.dbError(ctx, "create audit", err)
	}
	return nil
}

func (r *PostgresRepository) dbError(ctx context.Context, operation string, err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errRepositoryNotFound
	}
	if isUniqueDBError(err) {
		return errRepositoryConflict
	}
	r.logger.Error("database operation failed", "operation", operation, "request_id", requestctx.RequestID(ctx), "error", err)
	return fmt.Errorf("auth repository: %s: %w", operation, err)
}
func isUniqueDBError(err error) bool {
	v := strings.ToLower(err.Error())
	return strings.Contains(v, "duplicate key") || strings.Contains(v, "unique constraint")
}
func accountRow(a Account) models.User {
	return models.User{ID: a.ID, CompanyID: a.CompanyID, Login: a.Login, PasswordHash: a.PasswordHash, FullName: a.FullName, Role: models.UserRole(a.Role), IsBlocked: a.IsBlocked, CreatedAt: a.CreatedAt, UpdatedAt: a.UpdatedAt, FailedLoginCount: a.FailedLoginCount, FailedLoginWindowStartedAt: a.FailedLoginWindowStartedAt, LoginLockedUntil: a.LoginLockedUntil}
}
func mapAccount(row models.User) Account {
	return Account{User: mapUserRow(row, nil), PasswordHash: row.PasswordHash, FailedLoginCount: row.FailedLoginCount, FailedLoginWindowStartedAt: row.FailedLoginWindowStartedAt, LoginLockedUntil: row.LoginLockedUntil}
}
func mapUserRow(row models.User, name *string) User {
	return User{ID: row.ID, CompanyID: row.CompanyID, CompanyName: name, Login: row.Login, FullName: row.FullName, Role: Role(row.Role), IsBlocked: row.IsBlocked, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
}
func sessionRow(s Session) models.UserSession {
	return models.UserSession{ID: s.ID, UserID: s.UserID, RefreshTokenHash: s.RefreshTokenHash, ExpiresAt: s.ExpiresAt, IsRevoked: s.IsRevoked, CreatedAt: s.CreatedAt, LastActivityAt: s.LastActivityAt, RevokedAt: s.RevokedAt}
}
func mapSession(row models.UserSession) Session {
	return Session{ID: row.ID, UserID: row.UserID, RefreshTokenHash: row.RefreshTokenHash, ExpiresAt: row.ExpiresAt, IsRevoked: row.IsRevoked, CreatedAt: row.CreatedAt, LastActivityAt: row.LastActivityAt, RevokedAt: row.RevokedAt}
}
