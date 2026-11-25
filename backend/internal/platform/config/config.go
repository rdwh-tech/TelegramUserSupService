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
	Secret string
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

	cfg := Config{
		Db: DbConfig{
			Dsn:             dsn,
			ConnectTimeout:  connectTimeout,
			MaxOpenConns:    maxOpen,
			MaxIdleConns:    maxIdle,
			ConnMaxLifetime: connMaxLifetime,
		},
		Auth: AuthConfig{Secret: secret},
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
