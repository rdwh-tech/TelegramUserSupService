package database

import (
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Db struct {
	*gorm.DB
}

func NewDatabase(dsn string) (*Db, error) {
	gormDb, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	return &Db{
		gormDb,
	}, err
}