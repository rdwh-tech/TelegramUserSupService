package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Db DbConfig
	Auth AuthConfig
	Server HttpServerConfig
}

type DbConfig struct {
	Dsn string
}

type AuthConfig struct {
	Secret string
}

type HttpServerConfig struct {
	HTTPAddr string
}

func Load() (*Config, error) {
	err := godotenv.Load()
	if err != nil {
		return nil, err
	}

	var cfg Config
	cfg = Config {
		Db: DbConfig{Dsn: os.Getenv("DSN")},
		Auth: AuthConfig{Secret: os.Getenv("SECRET")},
		Server: HttpServerConfig{HTTPAddr: os.Getenv("HTTPAddr")},
	}

	return &cfg, nil
}

