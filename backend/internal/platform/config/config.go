package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Db     DbConfig
	Auth   AuthConfig
	Server HttpServerConfig
}

type DbConfig struct {
	Dsn             string
	ConnectTimeout  time.Duration
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

type AuthConfig struct {
	Secret           string
	JWTIssuer        string
	JWTAudience      string
	AccessTTL        time.Duration
	RefreshTTL       time.Duration
	IdleTTL          time.Duration
	LoginWindow      time.Duration
	LoginMaxFailures int
	LoginLock        time.Duration
	CodeWindow       time.Duration
	CodeMaxFailures  int
	CodeLock         time.Duration
}

type HttpServerConfig struct {
	HTTPAddr          string
	ReadHeaderTimeout time.Duration
	IdleTimeout       time.Duration
	ShutdownTimeout   time.Duration
	ReadinessTimeout  time.Duration
}

func Load() (*Config, error) {
	dotenv := map[string]string{}
	if _, err := os.Stat(".env"); err == nil {
		parsed, err := godotenv.Read(".env")
		if err != nil {
			return nil, errors.New("load .env: invalid format")
		}
		dotenv = parsed
	} else if !errors.Is(err, os.ErrNotExist) {
		return nil, fmt.Errorf("inspect .env: %w", err)
	}

	value := func(name, fallback string) string {
		if current, ok := os.LookupEnv(name); ok {
			return current
		}
		if current, ok := dotenv[name]; ok {
			return current
		}
		return fallback
	}

	parseDuration := func(name, fallback string) (time.Duration, error) {
		result, err := time.ParseDuration(value(name, fallback))
		if err != nil || result <= 0 {
			return 0, fmt.Errorf("%s must be a positive duration", name)
		}
		return result, nil
	}
	parseInt := func(name, fallback string) (int, error) {
		result, err := strconv.Atoi(value(name, fallback))
		if err != nil {
			return 0, fmt.Errorf("%s must be an integer", name)
		}
		return result, nil
	}

	dsn := value("DSN", "")
	if strings.TrimSpace(dsn) == "" {
		return nil, fmt.Errorf("DSN is required")
	}
	secret := value("SECRET", "")
	if strings.TrimSpace(secret) == "" {
		return nil, fmt.Errorf("SECRET is required")
	}

	connectTimeout, err := parseDuration("DB_CONNECT_TIMEOUT", "5s")
	if err != nil {
		return nil, err
	}
	maxOpen, err := parseInt("DB_MAX_OPEN_CONNS", "10")
	if err != nil || maxOpen <= 0 {
		return nil, fmt.Errorf("DB_MAX_OPEN_CONNS must be a positive integer")
	}
	maxIdle, err := parseInt("DB_MAX_IDLE_CONNS", "5")
	if err != nil || maxIdle < 0 {
		return nil, fmt.Errorf("DB_MAX_IDLE_CONNS must be a non-negative integer")
	}
	if maxIdle > maxOpen {
		return nil, fmt.Errorf("DB_MAX_IDLE_CONNS must not exceed DB_MAX_OPEN_CONNS")
	}
	connMaxLifetime, err := parseDuration("DB_CONN_MAX_LIFETIME", "30m")
	if err != nil {
		return nil, err
	}
	readHeaderTimeout, err := parseDuration("HTTP_READ_HEADER_TIMEOUT", "5s")
	if err != nil {
		return nil, err
	}
	idleTimeout, err := parseDuration("HTTP_IDLE_TIMEOUT", "60s")
	if err != nil {
		return nil, err
	}
	shutdownTimeout, err := parseDuration("HTTP_SHUTDOWN_TIMEOUT", "10s")
	if err != nil {
		return nil, err
	}
	readinessTimeout, err := parseDuration("HTTP_READINESS_TIMEOUT", "1s")
	if err != nil {
		return nil, err
	}
	accessTTL, err := parseDuration("AUTH_ACCESS_TTL", "24h")
	if err != nil {
		return nil, err
	}
	if accessTTL > 24*time.Hour {
		return nil, fmt.Errorf("AUTH_ACCESS_TTL must not exceed 24h")
	}
	refreshTTL, err := parseDuration("AUTH_REFRESH_TTL", "168h")
	if err != nil {
		return nil, err
	}
	idleTTL, err := parseDuration("AUTH_IDLE_TTL", "24h")
	if err != nil {
		return nil, err
	}
	loginWindow, err := parseDuration("AUTH_LOGIN_WINDOW", "10m")
	if err != nil {
		return nil, err
	}
	loginMax, err := parseInt("AUTH_LOGIN_MAX_FAILURES", "5")
	if err != nil || loginMax <= 0 {
		return nil, fmt.Errorf("AUTH_LOGIN_MAX_FAILURES must be a positive integer")
	}
	loginLock, err := parseDuration("AUTH_LOGIN_LOCK_DURATION", "15m")
	if err != nil {
		return nil, err
	}
	codeWindow, err := parseDuration("AUTH_CODE_WINDOW", "10m")
	if err != nil {
		return nil, err
	}
	codeMax, err := parseInt("AUTH_CODE_MAX_FAILURES", "5")
	if err != nil || codeMax <= 0 {
		return nil, fmt.Errorf("AUTH_CODE_MAX_FAILURES must be a positive integer")
	}
	codeLock, err := parseDuration("AUTH_CODE_LOCK_DURATION", "15m")
	if err != nil {
		return nil, err
	}

	issuer := strings.TrimSpace(value("AUTH_JWT_ISSUER", "tuss-api"))
	audience := strings.TrimSpace(value("AUTH_JWT_AUDIENCE", "tuss-web"))
	if issuer == "" {
		return nil, fmt.Errorf("AUTH_JWT_ISSUER is required")
	}
	if audience == "" {
		return nil, fmt.Errorf("AUTH_JWT_AUDIENCE is required")
	}
	cfg := Config{
		Db: DbConfig{
			Dsn:             dsn,
			ConnectTimeout:  connectTimeout,
			MaxOpenConns:    maxOpen,
			MaxIdleConns:    maxIdle,
			ConnMaxLifetime: connMaxLifetime,
		},
		Auth: AuthConfig{
			Secret: secret, JWTIssuer: issuer, JWTAudience: audience,
			AccessTTL: accessTTL, RefreshTTL: refreshTTL, IdleTTL: idleTTL,
			LoginWindow: loginWindow, LoginMaxFailures: loginMax, LoginLock: loginLock,
			CodeWindow: codeWindow, CodeMaxFailures: codeMax, CodeLock: codeLock,
		},
		Server: HttpServerConfig{
			HTTPAddr:          value("HTTPAddr", ":8080"),
			ReadHeaderTimeout: readHeaderTimeout,
			IdleTimeout:       idleTimeout,
			ShutdownTimeout:   shutdownTimeout,
			ReadinessTimeout:  readinessTimeout,
		},
	}

	return &cfg, nil
}
