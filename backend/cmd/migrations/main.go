package main

import (
	"github.com/joho/godotenv"
	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"os"
)

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		panic(err)
	}
	db, err := gorm.Open(postgres.Open(os.Getenv("DSN")), &gorm.Config{})
	if err != nil {
		panic(err)
	}

	if err = models.MigrateUp(db); err != nil {
		panic(err)
	}

}
