package database

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WithinCompany starts a transaction and sets the PostgreSQL tenant context
// locally. Repositories must additionally include an explicit company_id
// predicate; RLS is the final isolation boundary, not a replacement for scope.
func WithinCompany(ctx context.Context, db *gorm.DB, companyID uuid.UUID, fn func(*gorm.DB) error) error {
	if db == nil || companyID == uuid.Nil || fn == nil {
		return errors.New("database: company transaction requires db, company id and callback")
	}
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(`SET LOCAL ROLE support_api_svc`).Error; err != nil {
			return fmt.Errorf("database: assume tenant role: %w", err)
		}
		if err := tx.Exec(`SELECT set_config('app.current_company_id', ?, true)`, companyID.String()).Error; err != nil {
			return fmt.Errorf("database: set company context: %w", err)
		}
		return fn(tx)
	})
}

// ForCompany adds the mandatory explicit tenant predicate for tables that own
// a company_id column.
func ForCompany(db *gorm.DB, companyID uuid.UUID) *gorm.DB {
	return db.Where("company_id = ?", companyID)
}

// WithinAuth runs authentication and onboarding work under the narrow auth
// database role while preserving a service-owned transaction boundary.
func WithinAuth(ctx context.Context, db *gorm.DB, fn func(*gorm.DB) error) error {
	if db == nil || fn == nil {
		return errors.New("database: auth transaction requires db and callback")
	}
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(`SET LOCAL ROLE auth_api_svc`).Error; err != nil {
			return fmt.Errorf("database: assume auth role: %w", err)
		}
		return fn(tx)
	})
}
