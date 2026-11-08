package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Db DbConfig
	Auth AuthConfig
}

type DbConfig struct {
	Dsn string
}

type AuthConfig struct {
	Secret string
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
	}

	return &cfg, nil
}

