package main

import (
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"os"
)

func main() {
	dsn := os.Getenv("DSN")
	if dsn == "" {
		panic("DSN is not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(err)
	}

	if err = models.MigrateUp(db); err != nil {
		panic(err)
	}

}
