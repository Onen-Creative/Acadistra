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
	// Load .env
	godotenv.Load("../.env")

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect:", err)
	}

	tables := []string{
		"sms_providers",
		"sms_templates",
		"sms_queues",
		"sms_batches",
		"sms_logs",
	}

	fmt.Println("Checking SMS tables...")
	for _, table := range tables {
		if db.Migrator().HasTable(table) {
			fmt.Printf("✓ %s exists\n", table)
		} else {
			fmt.Printf("✗ %s NOT FOUND\n", table)
		}
	}
}
