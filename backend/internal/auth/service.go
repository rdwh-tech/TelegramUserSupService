package auth

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Service struct {
	db        *gorm.DB
	cfg       Config
	tokens    *TokenManager
	now       func() time.Time
	dummyHash string
}

func NewService(db *gorm.DB, cfg Config) (*Service, error) {
	if db == nil || cfg.RefreshTTL <= 0 || cfg.IdleTTL <= 0 || cfg.LoginWindow <= 0 || cfg.LoginMaxFailures <= 0 || cfg.LoginLock <= 0 || cfg.CodeWindow <= 0 || cfg.CodeMaxFailures <= 0 || cfg.CodeLock <= 0 {
		return nil, ErrValidation
	}
	tokens, err := NewTokenManager(cfg.Secret, cfg.Issuer, cfg.Audience, cfg.AccessTTL)
	if err != nil {
		return nil, err
	}
	dummy, err := HashPassword("dummy-password-for-unknown-users")
	if err != nil {
		return nil, err
	}
	return &Service{db: db, cfg: cfg, tokens: tokens, now: func() time.Time { return time.Now().UTC() }, dummyHash: dummy}, nil
}

func (s *Service) SetClock(clock func() time.Time) {
	if clock != nil {
		s.now = clock
	}
}

func normalizeLogin(login string) string { return strings.ToLower(strings.TrimSpace(login)) }

func validateRegistration(login, password, fullName, role string) (models.UserRole, error) {
	if utf8.RuneCountInString(login) < 3 || utf8.RuneCountInString(login) > 100 || strings.TrimSpace(fullName) == "" || utf8.RuneCountInString(strings.TrimSpace(fullName)) > 255 || ValidatePassword(password) != nil {
		return "", ErrValidation
	}
	switch role {
	case "admin":
		return models.UserRoleAdmin, nil
	case "operator":
		return models.UserRoleUnassignedOperator, nil
	default:
		return "", ErrValidation
	}
}

func (s *Service) Register(ctx context.Context, login, password, fullName, role string) (AuthResult, error) {
	login = normalizeLogin(login)
	fullName = strings.TrimSpace(fullName)
	dbRole, err := validateRegistration(login, password, fullName, role)
	if err != nil {
		return AuthResult{}, err
	}
	hash, err := HashPassword(password)
	if err != nil {
		return AuthResult{}, err
	}
	refresh, refreshHash, err := NewRefreshToken()
	if err != nil {
		return AuthResult{}, err
	}
	now := s.now()
	user := models.User{ID: uuid.New(), Login: login, PasswordHash: hash, FullName: fullName, Role: dbRole, CreatedAt: now, UpdatedAt: now}
	session := models.UserSession{ID: uuid.New(), UserID: user.ID, RefreshTokenHash: refreshHash, ExpiresAt: now.Add(s.cfg.RefreshTTL), CreatedAt: now, LastActivityAt: now}
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&user).Error; err != nil {
			if isUnique(err) {
				return ErrLoginExists
			}
			return err
		}
		if err := tx.Create(&session).Error; err != nil {
			return err
		}
		return tx.Create(&models.AuditLog{UserID: &user.ID, ActionType: models.AuditUserRegistered, CreatedAt: now}).Error
	})
	if err != nil {
		return AuthResult{}, err
	}
	access, err := s.tokens.Sign(user.ID, session.ID, now, session.ExpiresAt)
	if err != nil {
		return AuthResult{}, err
	}
	return AuthResult{AccessToken: access, RefreshToken: refresh, User: mapUser(user, nil)}, nil
}

func (s *Service) Login(ctx context.Context, login, password string) (AuthResult, error) {
	login = normalizeLogin(login)
	now := s.now()
	var result AuthResult
	invalid := false
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var user models.User
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("lower(btrim(login)) = ?", login).First(&user).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			_ = VerifyPassword(s.dummyHash, password)
			invalid = true
			return nil
		}
		if err != nil {
			return err
		}
		passwordOK := VerifyPassword(user.PasswordHash, password)
		locked := user.LoginLockedUntil != nil && now.Before(*user.LoginLockedUntil)
		if user.IsBlocked || locked || !passwordOK {
			if !user.IsBlocked && !locked {
				recordLoginFailure(&user, now, s.cfg)
				if err := tx.Save(&user).Error; err != nil {
					return err
				}
			}
			invalid = true
			return nil
		}
		user.FailedLoginCount = 0
		user.FailedLoginWindowStartedAt = nil
		user.LoginLockedUntil = nil
		if err := tx.Save(&user).Error; err != nil {
			return err
		}
		refresh, refreshHash, err := NewRefreshToken()
		if err != nil {
			return err
		}
		session := models.UserSession{ID: uuid.New(), UserID: user.ID, RefreshTokenHash: refreshHash, ExpiresAt: now.Add(s.cfg.RefreshTTL), CreatedAt: now, LastActivityAt: now}
		if err := tx.Create(&session).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.AuditLog{CompanyID: user.CompanyID, UserID: &user.ID, ActionType: models.AuditLogin, CreatedAt: now}).Error; err != nil {
			return err
		}
		access, err := s.tokens.Sign(user.ID, session.ID, now, session.ExpiresAt)
		if err != nil {
			return err
		}
		view, err := loadUser(tx, user.ID)
		if err != nil {
			return err
		}
		result = AuthResult{AccessToken: access, RefreshToken: refresh, User: view}
		return nil
	})
	if err == nil && invalid {
		return AuthResult{}, ErrInvalidCredentials
	}
	return result, err
}

func recordLoginFailure(user *models.User, now time.Time, cfg Config) {
	if user.FailedLoginWindowStartedAt == nil || now.Sub(*user.FailedLoginWindowStartedAt) >= cfg.LoginWindow {
		user.FailedLoginWindowStartedAt = &now
		user.FailedLoginCount = 1
	} else {
		user.FailedLoginCount++
	}
	if user.FailedLoginCount >= cfg.LoginMaxFailures {
		locked := now.Add(cfg.LoginLock)
		user.LoginLockedUntil = &locked
	}
}

func (s *Service) Authenticate(ctx context.Context, authorization string, publicActivity bool) (Principal, error) {
	token, err := bearer(authorization)
	if err != nil {
		return Principal{}, ErrUnauthorized
	}
	claims, err := s.tokens.Validate(token, s.now())
	if err != nil {
		return Principal{}, ErrUnauthorized
	}
	userID, _ := uuid.Parse(claims.Subject)
	sessionID, _ := uuid.Parse(claims.SessionID)
	now := s.now()
	var session models.UserSession
	if err := s.db.WithContext(ctx).Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return Principal{}, ErrUnauthorized
		}
		return Principal{}, err
	}
	if session.IsRevoked || session.RevokedAt != nil || !now.Before(session.ExpiresAt) || !now.Before(session.LastActivityAt.Add(s.cfg.IdleTTL)) {
		return Principal{}, ErrUnauthorized
	}
	user, err := loadUser(s.db.WithContext(ctx), userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return Principal{}, ErrUnauthorized
		}
		return Principal{}, err
	}
	if user.IsBlocked || !validCurrentRole(user.Role) {
		return Principal{}, ErrUnauthorized
	}
	_ = publicActivity // Activity is recorded by the transport only after a successful response.
	return Principal{User: user, SessionID: session.ID, AccessExpiresAt: time.Unix(claims.ExpiresAt, 0).UTC(), SessionExpiresAt: session.ExpiresAt, LastActivityAt: session.LastActivityAt}, nil
}

func (s *Service) TouchActivity(ctx context.Context, p Principal) error {
	now := s.now()
	if now.Sub(p.LastActivityAt) < time.Minute {
		return nil
	}
	return s.db.WithContext(ctx).Model(&models.UserSession{}).Where("id=? AND user_id=? AND is_revoked=false AND last_activity_at < ?", p.SessionID, p.User.ID, now.Add(-time.Minute)).Update("last_activity_at", now).Error
}

func validCurrentRole(role models.UserRole) bool {
	return role == models.UserRoleAdmin || role == models.UserRoleOperatorL1 || role == models.UserRoleOperatorL2 || role == models.UserRoleUnassignedOperator
}

func (s *Service) Refresh(ctx context.Context, refresh string) (string, error) {
	if refresh == "" {
		return "", ErrUnauthorized
	}
	now := s.now()
	var session models.UserSession
	if err := s.db.WithContext(ctx).Where("refresh_token_hash = ?", HashRefreshToken(refresh)).First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", ErrUnauthorized
		}
		return "", err
	}
	if session.IsRevoked || session.RevokedAt != nil || !now.Before(session.ExpiresAt) || !now.Before(session.LastActivityAt.Add(s.cfg.IdleTTL)) {
		return "", ErrUnauthorized
	}
	user, err := loadUser(s.db.WithContext(ctx), session.UserID)
	if err != nil || user.IsBlocked || !validCurrentRole(user.Role) {
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return "", err
		}
		return "", ErrUnauthorized
	}
	if err := s.db.WithContext(ctx).Model(&models.UserSession{}).Where("id = ? AND is_revoked = false", session.ID).Update("last_activity_at", now).Error; err != nil {
		return "", err
	}
	return s.tokens.Sign(user.ID, session.ID, now, session.ExpiresAt)
}

func (s *Service) Logout(ctx context.Context, principal Principal) error {
	now := s.now()
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.UserSession{}).Where("id = ?", principal.SessionID).Updates(map[string]any{"is_revoked": true, "revoked_at": now}).Error; err != nil {
			return err
		}
		return tx.Create(&models.AuditLog{CompanyID: principal.User.CompanyID, UserID: &principal.User.ID, ActionType: models.AuditLogout, CreatedAt: now}).Error
	})
}

// LogoutAuthorization is intentionally idempotent: an otherwise valid access
// token may revoke its session again, while no other session is affected.
func (s *Service) LogoutAuthorization(ctx context.Context, authorization string) error {
	token, err := bearer(authorization)
	if err != nil {
		return ErrUnauthorized
	}
	claims, err := s.tokens.Validate(token, s.now())
	if err != nil {
		return ErrUnauthorized
	}
	userID, _ := uuid.Parse(claims.Subject)
	sessionID, _ := uuid.Parse(claims.SessionID)
	now := s.now()
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var session models.UserSession
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id=? AND user_id=?", sessionID, userID).First(&session).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrUnauthorized
			}
			return err
		}
		if session.IsRevoked {
			return nil
		}
		var user models.User
		if err := tx.First(&user, "id=?", userID).Error; err != nil {
			return ErrUnauthorized
		}
		if err := tx.Model(&session).Updates(map[string]any{"is_revoked": true, "revoked_at": now}).Error; err != nil {
			return err
		}
		return tx.Create(&models.AuditLog{CompanyID: user.CompanyID, UserID: &user.ID, ActionType: models.AuditLogout, CreatedAt: now}).Error
	})
}

func (s *Service) EffectiveExpiry(p Principal) time.Time {
	expires := p.AccessExpiresAt
	if p.SessionExpiresAt.Before(expires) {
		expires = p.SessionExpiresAt
	}
	idle := p.LastActivityAt.Add(s.cfg.IdleTTL)
	if idle.Before(expires) {
		expires = idle
	}
	return expires
}

func (s *Service) Me(ctx context.Context, userID uuid.UUID) (User, error) {
	return loadUser(s.db.WithContext(ctx), userID)
}

func (s *Service) UpdateProfile(ctx context.Context, principal Principal, fullName string) (User, error) {
	fullName = strings.TrimSpace(fullName)
	if fullName == "" || utf8.RuneCountInString(fullName) > 255 {
		return User{}, ErrValidation
	}
	now := s.now()
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.User{}).Where("id = ?", principal.User.ID).Updates(map[string]any{"full_name": fullName, "updated_at": now}).Error; err != nil {
			return err
		}
		return tx.Create(&models.AuditLog{CompanyID: principal.User.CompanyID, UserID: &principal.User.ID, ActionType: models.AuditProfileUpdated, CreatedAt: now}).Error
	})
	if err != nil {
		return User{}, err
	}
	return loadUser(s.db.WithContext(ctx), principal.User.ID)
}

func loadUser(db *gorm.DB, id uuid.UUID) (User, error) {
	var row struct {
		models.User
		CompanyName *string
	}
	err := db.Table("users").Select("users.*, companies.name AS company_name").Joins("LEFT JOIN companies ON companies.id = users.company_id").Where("users.id = ?", id).Scan(&row).Error
	if err != nil {
		return User{}, err
	}
	if row.ID == uuid.Nil {
		return User{}, gorm.ErrRecordNotFound
	}
	return mapUser(row.User, row.CompanyName), nil
}

func mapUser(user models.User, companyName *string) User {
	return User{ID: user.ID, CompanyID: user.CompanyID, CompanyName: companyName, Login: user.Login, FullName: user.FullName, Role: user.Role, IsBlocked: user.IsBlocked, CreatedAt: user.CreatedAt, UpdatedAt: user.UpdatedAt}
}
func isUnique(err error) bool {
	text := strings.ToLower(err.Error())
	return strings.Contains(text, "duplicate key") || strings.Contains(text, "unique constraint")
}
