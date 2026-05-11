package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Load environment variables
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Connected to database successfully")

	// Run SMS tables migration
	sqlFile := `
-- SMS Provider Configuration
CREATE TABLE IF NOT EXISTS sms_providers (
    id CHAR(36) PRIMARY KEY,
    school_id CHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'africastalking',
    api_key VARCHAR(255) NOT NULL,
    api_secret VARCHAR(255),
    username VARCHAR(100) NOT NULL,
    sender_id VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    balance DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_sms_provider_school ON sms_providers(school_id);
CREATE INDEX IF NOT EXISTS idx_sms_provider_active ON sms_providers(is_active);

-- SMS Templates
CREATE TABLE IF NOT EXISTS sms_templates (
    id CHAR(36) PRIMARY KEY,
    school_id CHAR(36) REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    template TEXT NOT NULL,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_sms_template_school ON sms_templates(school_id);
CREATE INDEX IF NOT EXISTS idx_sms_template_category ON sms_templates(category);
CREATE INDEX IF NOT EXISTS idx_sms_template_active ON sms_templates(is_active);

-- SMS Batches (must be created before queues due to foreign key)
CREATE TABLE IF NOT EXISTS sms_batches (
    id CHAR(36) PRIMARY KEY,
    school_id CHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    total_count INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    pending_count INT DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_cost DECIMAL(10,2) DEFAULT 0,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_by CHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_sms_batch_school ON sms_batches(school_id);
CREATE INDEX IF NOT EXISTS idx_sms_batch_status ON sms_batches(status);
CREATE INDEX IF NOT EXISTS idx_sms_batch_created ON sms_batches(created_at);

-- SMS Queue
CREATE TABLE IF NOT EXISTS sms_queues (
    id CHAR(36) PRIMARY KEY,
    school_id CHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    batch_id CHAR(36) REFERENCES sms_batches(id) ON DELETE CASCADE,
    recipient_id CHAR(36),
    recipient_type VARCHAR(20) NOT NULL DEFAULT 'manual',
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    priority INT DEFAULT 5,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    scheduled_for TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    cost DECIMAL(10,4) DEFAULT 0,
    provider_message_id VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_sms_queue_school ON sms_queues(school_id);
CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON sms_queues(status);
CREATE INDEX IF NOT EXISTS idx_sms_queue_scheduled ON sms_queues(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_sms_queue_batch ON sms_queues(batch_id);
CREATE INDEX IF NOT EXISTS idx_sms_queue_recipient ON sms_queues(recipient_id, recipient_type);

-- SMS Logs
CREATE TABLE IF NOT EXISTS sms_logs (
    id CHAR(36) PRIMARY KEY,
    school_id CHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    batch_id CHAR(36) REFERENCES sms_batches(id) ON DELETE SET NULL,
    queue_id CHAR(36) REFERENCES sms_queues(id) ON DELETE SET NULL,
    recipient VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    sms_type VARCHAR(50) NOT NULL DEFAULT 'general',
    cost DECIMAL(10,4) DEFAULT 0,
    provider VARCHAR(50),
    provider_message_id VARCHAR(100),
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_sms_log_school ON sms_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_sms_log_batch ON sms_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_sms_log_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_log_sent ON sms_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_sms_log_type ON sms_logs(sms_type);
`

	if err := db.Exec(sqlFile).Error; err != nil {
		log.Fatal("Failed to run migration:", err)
	}

	log.Println("✅ SMS tables migration completed successfully!")
	
	// Verify tables were created
	tables := []string{"sms_providers", "sms_templates", "sms_batches", "sms_queues", "sms_logs"}
	for _, table := range tables {
		if db.Migrator().HasTable(table) {
			fmt.Printf("✓ %s table exists\n", table)
		} else {
			fmt.Printf("✗ %s table NOT FOUND\n", table)
		}
	}
}
