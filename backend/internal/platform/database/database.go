package database

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/rdwh-tech/TelegramUserSupService/internal/platform/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Db struct {
	*gorm.DB
}

func NewDatabase(dsn string) (*Db, error) {
	return NewDatabaseContext(context.Background(), dsn)
}

func NewDatabaseContext(ctx context.Context, dsn string) (*Db, error) {
	return Open(ctx, config.DbConfig{
		Dsn:             dsn,
		ConnectTimeout:  5 * time.Second,
		MaxOpenConns:    10,
		MaxIdleConns:    5,
		ConnMaxLifetime: 30 * time.Minute,
	})
}

func Open(ctx context.Context, cfg config.DbConfig) (*Db, error) {
	if cfg.Dsn == "" {
		return nil, errors.New("open database: DSN is required")
	}
	if cfg.ConnectTimeout <= 0 || cfg.MaxOpenConns <= 0 || cfg.MaxIdleConns < 0 || cfg.MaxIdleConns > cfg.MaxOpenConns || cfg.ConnMaxLifetime <= 0 {
		return nil, errors.New("open database: invalid pool configuration")
	}
	gormDB, err := gorm.Open(postgres.Open(cfg.Dsn), &gorm.Config{
		DisableAutomaticPing: true,
		Logger:               logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, errors.New("open database: connection setup failed")
	}
	sqlDB, err := gormDB.DB()
	if err != nil {
		return nil, errors.New("open database: connection pool unavailable")
	}
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	connectCtx, cancel := context.WithTimeout(ctx, cfg.ConnectTimeout)
	defer cancel()
	if err := sqlDB.PingContext(connectCtx); err != nil {
		_ = sqlDB.Close()
		return nil, errors.New("open database: ping failed")
	}
	return &Db{DB: gormDB}, nil
}

var baselineTables = []string{
	"companies",
	"bot_configs",
	"company_schedules",
	"company_sla_policies",
	"company_faqs",
	"users",
	"user_sessions",
	"operator_connection_codes",
	"company_invitations",
	"clients",
	"tickets",
	"ticket_status_history",
	"ticket_messages",
	"message_attachments",
	"ticket_ratings",
	"ticket_sla_metrics",
	"broadcast_campaigns",
	"audit_logs",
}

func Ready(ctx context.Context, db *Db) error {
	if db == nil || db.DB == nil {
		return errors.New("database is not initialized")
	}
	sqlDB, err := db.DB.DB()
	if err != nil {
		return errors.New("database pool is unavailable")
	}
	if err := sqlDB.PingContext(ctx); err != nil {
		return errors.New("database ping failed")
	}
	var count int64
	if err := db.WithContext(ctx).Raw(
		`SELECT count(*)
		 FROM information_schema.tables
		 WHERE table_schema = current_schema()
		   AND table_type = 'BASE TABLE'
		   AND table_name IN ?
		   AND has_table_privilege(quote_ident(table_schema) || '.' || quote_ident(table_name), 'SELECT')`,
		baselineTables,
	).Scan(&count).Error; err != nil {
		return errors.New("database schema check failed")
	}
	if count != int64(len(baselineTables)) {
		return fmt.Errorf("database schema incomplete: %d of %d baseline tables", count, len(baselineTables))
	}
	return nil
}
