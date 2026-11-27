package auth

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/requestctx"
)

type Service struct {
	repo      Repository
	cfg       Config
	tokens    *TokenManager
	now       func() time.Time
	dummyHash string
	logger    *slog.Logger
}

func NewService(repo Repository, cfg Config, logger *slog.Logger) (*Service, error) {
	if repo == nil || cfg.RefreshTTL <= 0 || cfg.IdleTTL <= 0 || cfg.LoginWindow <= 0 || cfg.LoginMaxFailures <= 0 || cfg.LoginLock <= 0 || cfg.CodeWindow <= 0 || cfg.CodeMaxFailures <= 0 || cfg.CodeLock <= 0 {
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
	if logger == nil {
		logger = slog.Default()
	}
	return &Service{repo: repo, cfg: cfg, tokens: tokens, now: func() time.Time { return time.Now().UTC() }, dummyHash: dummy, logger: logger.With("layer", "service", "component", "auth")}, nil
}
func (s *Service) SetClock(clock func() time.Time) {
	if clock != nil {
		s.now = clock
	}
}
func (s *Service) log(ctx context.Context) *slog.Logger {
	return s.logger.With("request_id", requestctx.RequestID(ctx))
}
func normalizeLogin(login string) string { return strings.ToLower(strings.TrimSpace(login)) }
func validateRegistration(login, password, fullName, role string) (Role, error) {
	if utf8.RuneCountInString(login) < 3 || utf8.RuneCountInString(login) > 100 || strings.TrimSpace(fullName) == "" || utf8.RuneCountInString(strings.TrimSpace(fullName)) > 255 || ValidatePassword(password) != nil {
		return "", ErrValidation
	}
	switch role {
	case "admin":
		return RoleAdmin, nil
	case "operator":
		return RoleUnassignedOperator, nil
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
	account := Account{User: User{ID: uuid.New(), Login: login, FullName: fullName, Role: dbRole, CreatedAt: now, UpdatedAt: now}, PasswordHash: hash}
	session := Session{ID: uuid.New(), UserID: account.ID, RefreshTokenHash: refreshHash, ExpiresAt: now.Add(s.cfg.RefreshTTL), CreatedAt: now, LastActivityAt: now}
	err = s.repo.WithinTransaction(ctx, func(repo Repository) error {
		if err := repo.CreateAccount(ctx, account); err != nil {
			if errors.Is(err, errRepositoryConflict) {
				return ErrLoginExists
			}
			return err
		}
		if err := repo.CreateSession(ctx, session); err != nil {
			return err
		}
		return repo.CreateAudit(ctx, AuditEvent{UserID: &account.ID, Action: AuditUserRegistered, CreatedAt: now})
	})
	if err != nil {
		return AuthResult{}, err
	}
	access, err := s.tokens.Sign(account.ID, session.ID, now, session.ExpiresAt)
	if err != nil {
		return AuthResult{}, err
	}
	s.log(ctx).Info("user registered", "user_id", account.ID, "role", account.Role)
	return AuthResult{AccessToken: access, RefreshToken: refresh, User: account.User}, nil
}

func (s *Service) Login(ctx context.Context, login, password string) (AuthResult, error) {
	login = normalizeLogin(login)
	now := s.now()
	var result AuthResult
	invalid := false
	err := s.repo.WithinTransaction(ctx, func(repo Repository) error {
		account, err := repo.AccountForLogin(ctx, login)
		if errors.Is(err, errRepositoryNotFound) {
			_ = VerifyPassword(s.dummyHash, password)
			invalid = true
			return nil
		}
		if err != nil {
			return err
		}
		passwordOK := VerifyPassword(account.PasswordHash, password)
		locked := account.LoginLockedUntil != nil && now.Before(*account.LoginLockedUntil)
		if account.IsBlocked || locked || !passwordOK {
			if !account.IsBlocked && !locked {
				recordLoginFailure(&account, now, s.cfg)
				if err := repo.SaveLoginState(ctx, account); err != nil {
					return err
				}
			}
			invalid = true
			return nil
		}
		account.FailedLoginCount = 0
		account.FailedLoginWindowStartedAt = nil
		account.LoginLockedUntil = nil
		if err := repo.SaveLoginState(ctx, account); err != nil {
			return err
		}
		refresh, refreshHash, err := NewRefreshToken()
		if err != nil {
			return err
		}
		session := Session{ID: uuid.New(), UserID: account.ID, RefreshTokenHash: refreshHash, ExpiresAt: now.Add(s.cfg.RefreshTTL), CreatedAt: now, LastActivityAt: now}
		if err := repo.CreateSession(ctx, session); err != nil {
			return err
		}
		if err := repo.CreateAudit(ctx, AuditEvent{CompanyID: account.CompanyID, UserID: &account.ID, Action: AuditLogin, CreatedAt: now}); err != nil {
			return err
		}
		access, err := s.tokens.Sign(account.ID, session.ID, now, session.ExpiresAt)
		if err != nil {
			return err
		}
		view, err := repo.UserByID(ctx, account.ID)
		if err != nil {
			return err
		}
		result = AuthResult{AccessToken: access, RefreshToken: refresh, User: view}
		return nil
	})
	if err == nil && invalid {
		s.log(ctx).Warn("login rejected", "login_present", login != "")
		return AuthResult{}, ErrInvalidCredentials
	}
	if err == nil {
		s.log(ctx).Info("login succeeded", "user_id", result.User.ID)
	}
	return result, err
}

func recordLoginFailure(user *Account, now time.Time, cfg Config) {
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
	var session Session
	err = s.repo.WithinTransaction(ctx, func(repo Repository) error {
		var loadErr error
		session, loadErr = repo.SessionByID(ctx, sessionID, userID, false)
		return loadErr
	})
	if errors.Is(err, errRepositoryNotFound) {
		return Principal{}, ErrUnauthorized
	}
	if err != nil {
		return Principal{}, err
	}
	if session.IsRevoked || session.RevokedAt != nil || !now.Before(session.ExpiresAt) || !now.Before(session.LastActivityAt.Add(s.cfg.IdleTTL)) {
		return Principal{}, ErrUnauthorized
	}
	var user User
	err = s.repo.WithinTransaction(ctx, func(repo Repository) error {
		var loadErr error
		user, loadErr = repo.UserByID(ctx, userID)
		return loadErr
	})
	if errors.Is(err, errRepositoryNotFound) {
		return Principal{}, ErrUnauthorized
	}
	if err != nil {
		return Principal{}, err
	}
	if user.IsBlocked || !validCurrentRole(user.Role) {
		return Principal{}, ErrUnauthorized
	}
	_ = publicActivity
	return Principal{User: user, SessionID: session.ID, AccessExpiresAt: time.Unix(claims.ExpiresAt, 0).UTC(), SessionExpiresAt: session.ExpiresAt, LastActivityAt: session.LastActivityAt}, nil
}
func (s *Service) TouchActivity(ctx context.Context, p Principal) error {
	now := s.now()
	if now.Sub(p.LastActivityAt) < time.Minute {
		return nil
	}
	return s.repo.WithinTransaction(ctx, func(repo Repository) error {
		return repo.TouchSession(ctx, p.SessionID, p.User.ID, now, now.Add(-time.Minute))
	})
}
func validCurrentRole(role Role) bool {
	return role == RoleAdmin || role == RoleOperatorL1 || role == RoleOperatorL2 || role == RoleUnassignedOperator
}
func (s *Service) Refresh(ctx context.Context, refresh string) (string, error) {
	if refresh == "" {
		return "", ErrUnauthorized
	}
	now := s.now()
	var session Session
	err := s.repo.WithinTransaction(ctx, func(repo Repository) error {
		var loadErr error
		session, loadErr = repo.SessionByRefreshHash(ctx, HashRefreshToken(refresh))
		return loadErr
	})
	if errors.Is(err, errRepositoryNotFound) {
		return "", ErrUnauthorized
	}
	if err != nil {
		return "", err
	}
	if session.IsRevoked || session.RevokedAt != nil || !now.Before(session.ExpiresAt) || !now.Before(session.LastActivityAt.Add(s.cfg.IdleTTL)) {
		return "", ErrUnauthorized
	}
	var user User
	err = s.repo.WithinTransaction(ctx, func(repo Repository) error {
		var loadErr error
		user, loadErr = repo.UserByID(ctx, session.UserID)
		return loadErr
	})
	if errors.Is(err, errRepositoryNotFound) {
		return "", ErrUnauthorized
	}
	if err != nil {
		return "", err
	}
	if user.IsBlocked || !validCurrentRole(user.Role) {
		return "", ErrUnauthorized
	}
	if err := s.repo.WithinTransaction(ctx, func(repo Repository) error {
		return repo.TouchSession(ctx, session.ID, user.ID, now, now.Add(time.Nanosecond))
	}); err != nil {
		return "", err
	}
	token, err := s.tokens.Sign(user.ID, session.ID, now, session.ExpiresAt)
	if err == nil {
		s.log(ctx).Info("session refreshed", "user_id", user.ID, "session_id", session.ID)
	}
	return token, err
}
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
	err = s.repo.WithinTransaction(ctx, func(repo Repository) error {
		session, err := repo.SessionByID(ctx, sessionID, userID, true)
		if errors.Is(err, errRepositoryNotFound) {
			return ErrUnauthorized
		}
		if err != nil {
			return err
		}
		if session.IsRevoked {
			return nil
		}
		user, err := repo.UserByID(ctx, userID)
		if err != nil {
			return ErrUnauthorized
		}
		if err := repo.RevokeSession(ctx, session.ID, now); err != nil {
			return err
		}
		return repo.CreateAudit(ctx, AuditEvent{CompanyID: user.CompanyID, UserID: &user.ID, Action: AuditLogout, CreatedAt: now})
	})
	if err == nil {
		s.log(ctx).Info("session logged out", "user_id", userID, "session_id", sessionID)
	}
	return err
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
	var user User
	err := s.repo.WithinTransaction(ctx, func(repo Repository) error {
		var loadErr error
		user, loadErr = repo.UserByID(ctx, userID)
		return loadErr
	})
	return user, err
}
func (s *Service) UpdateProfile(ctx context.Context, p Principal, fullName string) (User, error) {
	fullName = strings.TrimSpace(fullName)
	if fullName == "" || utf8.RuneCountInString(fullName) > 255 {
		return User{}, ErrValidation
	}
	now := s.now()
	err := s.repo.WithinTransaction(ctx, func(repo Repository) error {
		if err := repo.UpdateFullName(ctx, p.User.ID, fullName, now); err != nil {
			return err
		}
		return repo.CreateAudit(ctx, AuditEvent{CompanyID: p.User.CompanyID, UserID: &p.User.ID, Action: AuditProfileUpdated, CreatedAt: now})
	})
	if err != nil {
		return User{}, err
	}
	user, err := s.Me(ctx, p.User.ID)
	if err == nil {
		s.log(ctx).Info("profile updated", "user_id", p.User.ID)
	}
	return user, err
}
