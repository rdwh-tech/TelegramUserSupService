package models

import (
	"fmt"
	"gorm.io/gorm"
)

// MigrateUp creates PostgreSQL enum types, tables, constraints and indexes.
// Run this against an empty database or an existing database managed by this schema.
// The SQL migrations remain explicit; this function uses the existing GORM models.
func MigrateUp(db *gorm.DB) error {
	if db == nil {
		return fmt.Errorf("db is nil")
	}

	// PostgreSQL enum types must exist before AutoMigrate creates columns using them.
	enumSQL := []string{
		`DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin','operator_l1','operator_l2','unassigned_operator'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
		`DO $$ BEGIN CREATE TYPE invitation_role AS ENUM ('operator_l1','operator_l2'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
		`DO $$ BEGIN CREATE TYPE invitation_status AS ENUM ('pending','accepted','rejected','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
		`DO $$ BEGIN CREATE TYPE ticket_status AS ENUM ('new','in_progress','waiting_client','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
		`DO $$ BEGIN CREATE TYPE escalation_level AS ENUM ('l1','l2'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
		`DO $$ BEGIN CREATE TYPE status_trigger_type AS ENUM ('operator_take','operator_escalate','operator_wait_client','client_message','operator_close','operator_reopen','system_reassign'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
		`DO $$ BEGIN CREATE TYPE message_sender_type AS ENUM ('client','operator','system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
		`DO $$ BEGIN CREATE TYPE attachment_file_type AS ENUM ('photo','document'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
		`DO $$ BEGIN CREATE TYPE sla_status AS ENUM ('ok','warning','breached','paused'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
		`DO $$ BEGIN CREATE TYPE broadcast_status AS ENUM ('draft','in_progress','completed','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
		`DO $$ BEGIN CREATE TYPE audit_action_type AS ENUM ('login','logout','user_blocked','user_unblocked','user_expelled','role_changed','invitation_sent','invitation_accepted','invitation_rejected','company_settings_updated','sla_settings_updated','bot_settings_updated','schedule_updated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
	}

	for _, stmt := range enumSQL {
		if err := db.Exec(stmt).Error; err != nil {
			return fmt.Errorf("create enum type: %w", err)
		}
	}

	// AutoMigrate creates the tables and the ordinary indexes declared in model tags.
	// The order is parent tables first, then dependent tables.
	if err := db.AutoMigrate(
		&Company{},
		&BotConfig{},
		&CompanySchedule{},
		&CompanySLAPolicy{},
		&CompanyFAQ{},
		&User{},
		&UserSession{},
		&OperatorConnectionCode{},
		&CompanyInvitation{},
		&Client{},
		&Ticket{},
		&TicketStatusHistory{},
		&TicketMessage{},
		&MessageAttachment{},
		&TicketRating{},
		&TicketSLAMetric{},
		&BroadcastCampaign{},
		&AuditLog{},
	); err != nil {
		return fmt.Errorf("gorm automigrate: %w", err)
	}

	// Add explicit foreign keys and database-level checks that are not fully
	// represented by the model tags. Every statement is safe to rerun.
	constraints := []string{
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bot_configs_company') THEN
				ALTER TABLE bot_configs ADD CONSTRAINT fk_bot_configs_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_company_schedules_company') THEN
				ALTER TABLE company_schedules ADD CONSTRAINT fk_company_schedules_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_company_sla_policies_company') THEN
				ALTER TABLE company_sla_policies ADD CONSTRAINT fk_company_sla_policies_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_company_faqs_company') THEN
				ALTER TABLE company_faqs ADD CONSTRAINT fk_company_faqs_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_company') THEN
				ALTER TABLE users ADD CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_sessions_user') THEN
				ALTER TABLE user_sessions ADD CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_operator_connection_codes_operator') THEN
				ALTER TABLE operator_connection_codes ADD CONSTRAINT fk_operator_connection_codes_operator FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE CASCADE;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_company_invitations_company') THEN
				ALTER TABLE company_invitations ADD CONSTRAINT fk_company_invitations_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_company_invitations_operator') THEN
				ALTER TABLE company_invitations ADD CONSTRAINT fk_company_invitations_operator FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE CASCADE;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_company_invitations_invited_by') THEN
				ALTER TABLE company_invitations ADD CONSTRAINT fk_company_invitations_invited_by FOREIGN KEY (invited_by_user_id) REFERENCES users(id);
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_clients_company') THEN
				ALTER TABLE clients ADD CONSTRAINT fk_clients_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_company') THEN
				ALTER TABLE tickets ADD CONSTRAINT fk_tickets_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_client') THEN
				ALTER TABLE tickets ADD CONSTRAINT fk_tickets_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_assigned_operator') THEN
				ALTER TABLE tickets ADD CONSTRAINT fk_tickets_assigned_operator FOREIGN KEY (assigned_operator_id) REFERENCES users(id) ON DELETE SET NULL;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_sla_policy') THEN
				ALTER TABLE tickets ADD CONSTRAINT fk_tickets_sla_policy FOREIGN KEY (sla_policy_id) REFERENCES company_sla_policies(id);
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_escalated_by') THEN
				ALTER TABLE tickets ADD CONSTRAINT fk_tickets_escalated_by FOREIGN KEY (escalated_by_user_id) REFERENCES users(id);
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ticket_status_history_ticket') THEN
				ALTER TABLE ticket_status_history ADD CONSTRAINT fk_ticket_status_history_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ticket_status_history_user') THEN
				ALTER TABLE ticket_status_history ADD CONSTRAINT fk_ticket_status_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id);
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ticket_messages_ticket') THEN
				ALTER TABLE ticket_messages ADD CONSTRAINT fk_ticket_messages_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ticket_messages_sender_user') THEN
				ALTER TABLE ticket_messages ADD CONSTRAINT fk_ticket_messages_sender_user FOREIGN KEY (sender_user_id) REFERENCES users(id);
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_message_attachments_message') THEN
				ALTER TABLE message_attachments ADD CONSTRAINT fk_message_attachments_message FOREIGN KEY (message_id) REFERENCES ticket_messages(id) ON DELETE CASCADE;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ticket_ratings_ticket') THEN
				ALTER TABLE ticket_ratings ADD CONSTRAINT fk_ticket_ratings_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ticket_sla_metrics_ticket') THEN
				ALTER TABLE ticket_sla_metrics ADD CONSTRAINT fk_ticket_sla_metrics_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_broadcast_campaigns_company') THEN
				ALTER TABLE broadcast_campaigns ADD CONSTRAINT fk_broadcast_campaigns_company FOREIGN KEY (company_id) REFERENCES companies(id);
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_broadcast_campaigns_created_by') THEN
				ALTER TABLE broadcast_campaigns ADD CONSTRAINT fk_broadcast_campaigns_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id);
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_logs_company') THEN
				ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_logs_user') THEN
				ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
			END IF;
		END $$`,

		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_company_schedule_hours') THEN
				ALTER TABLE company_schedules ADD CONSTRAINT chk_company_schedule_hours CHECK (
					is_working_day = FALSE OR
					(start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
				);
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_company_role') THEN
				ALTER TABLE users ADD CONSTRAINT chk_user_company_role CHECK (
					(company_id IS NULL AND role = 'unassigned_operator') OR
					(company_id IS NOT NULL AND role <> 'unassigned_operator')
				);
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_message_attachment_size') THEN
				ALTER TABLE message_attachments ADD CONSTRAINT chk_message_attachment_size
				CHECK (file_size_bytes > 0 AND file_size_bytes <= 20971520);
			END IF;
		END $$`,
		`DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ticket_rating_score') THEN
				ALTER TABLE ticket_ratings ADD CONSTRAINT chk_ticket_rating_score CHECK (score BETWEEN 1 AND 5);
			END IF;
		END $$`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_active_ticket_per_client
			ON tickets(company_id, client_id) WHERE status <> 'closed'`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_active_ticket_per_operator
			ON tickets(assigned_operator_id) WHERE status = 'in_progress' AND assigned_operator_id IS NOT NULL`,
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`,
	}

	for _, stmt := range constraints {
		if err := db.Exec(stmt).Error; err != nil {
			return fmt.Errorf("apply constraint/index: %w", err)
		}
	}

	return nil
}

// MigrateDown drops all tables created by MigrateUp and then drops enum types.
// WARNING: this permanently deletes all data in these tables.
func MigrateDown(db *gorm.DB) error {
	if db == nil {
		return fmt.Errorf("db is nil")
	}

	dropSQL := []string{
		`DROP TABLE IF EXISTS audit_logs CASCADE`,
		`DROP TABLE IF EXISTS broadcast_campaigns CASCADE`,
		`DROP TABLE IF EXISTS ticket_sla_metrics CASCADE`,
		`DROP TABLE IF EXISTS ticket_ratings CASCADE`,
		`DROP TABLE IF EXISTS message_attachments CASCADE`,
		`DROP TABLE IF EXISTS ticket_messages CASCADE`,
		`DROP TABLE IF EXISTS ticket_status_history CASCADE`,
		`DROP TABLE IF EXISTS tickets CASCADE`,
		`DROP TABLE IF EXISTS clients CASCADE`,
		`DROP TABLE IF EXISTS company_invitations CASCADE`,
		`DROP TABLE IF EXISTS operator_connection_codes CASCADE`,
		`DROP TABLE IF EXISTS user_sessions CASCADE`,
		`DROP TABLE IF EXISTS users CASCADE`,
		`DROP TABLE IF EXISTS company_faqs CASCADE`,
		`DROP TABLE IF EXISTS company_sla_policies CASCADE`,
		`DROP TABLE IF EXISTS company_schedules CASCADE`,
		`DROP TABLE IF EXISTS bot_configs CASCADE`,
		`DROP TABLE IF EXISTS companies CASCADE`,
		`DROP TYPE IF EXISTS audit_action_type`,
		`DROP TYPE IF EXISTS broadcast_status`,
		`DROP TYPE IF EXISTS sla_status`,
		`DROP TYPE IF EXISTS attachment_file_type`,
		`DROP TYPE IF EXISTS message_sender_type`,
		`DROP TYPE IF EXISTS status_trigger_type`,
		`DROP TYPE IF EXISTS escalation_level`,
		`DROP TYPE IF EXISTS ticket_status`,
		`DROP TYPE IF EXISTS invitation_status`,
		`DROP TYPE IF EXISTS invitation_role`,
		`DROP TYPE IF EXISTS user_role`,
	}
	for _, stmt := range dropSQL {
		if err := db.Exec(stmt).Error; err != nil {
			return fmt.Errorf("drop schema: %w", err)
		}
	}
	return nil
}
