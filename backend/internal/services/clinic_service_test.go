package services_test

import (
	"testing"

	"github.com/school-system/backend/internal/services"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	// Use postgres for testing to match production
	dsn := "host=localhost user=postgres password=postgres dbname=test_db port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Skip("Postgres not available for testing")
	}
	return db
}

func TestNewClinicService(t *testing.T) {
	db := setupTestDB(t)
	
	service := services.NewClinicService(db, nil)
	
	assert.NotNil(t, service)
}
