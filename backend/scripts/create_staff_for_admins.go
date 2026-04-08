package main

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type User struct {
	ID       uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	SchoolID *uuid.UUID `gorm:"type:uuid"`
	Email    string
	FullName string
	Role     string
	IsActive bool
}

type Staff struct {
	ID         uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	SchoolID   uuid.UUID  `gorm:"type:uuid;not null"`
	UserID     *uuid.UUID `gorm:"type:uuid"`
	EmployeeID string     `gorm:"size:50;not null"`
	FirstName  string     `gorm:"size:100;not null"`
	MiddleName string     `gorm:"size:100"`
	LastName   string     `gorm:"size:100;not null"`
	Email      string     `gorm:"size:255"`
	Phone      string     `gorm:"size:20"`
	Role       string     `gorm:"size:50;not null"`
	Status     string     `gorm:"size:20;default:'active'"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type School struct {
	ID   uuid.UUID `gorm:"type:uuid;primary_key"`
	Name string
}

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to database
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Build DSN from individual env vars
		host := os.Getenv("DB_HOST")
		port := os.Getenv("DB_PORT")
		user := os.Getenv("DB_USER")
		password := os.Getenv("DB_PASSWORD")
		dbname := os.Getenv("DB_NAME")
		dsn = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			host, port, user, password, dbname)
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Find all school admins without staff records
	var admins []User
	if err := db.Where("role = ?", "school_admin").Find(&admins).Error; err != nil {
		log.Fatal("Failed to fetch school admins:", err)
	}

	log.Printf("Found %d school admin(s)\n", len(admins))

	created := 0
	skipped := 0

	for _, admin := range admins {
		// Check if staff record already exists
		var existingStaff Staff
		if err := db.Where("user_id = ?", admin.ID).First(&existingStaff).Error; err == nil {
			log.Printf("✓ Staff record already exists for %s (Employee ID: %s)\n", admin.Email, existingStaff.EmployeeID)
			skipped++
			continue
		}

		if admin.SchoolID == nil {
			log.Printf("✗ Skipping %s - no school assigned\n", admin.Email)
			skipped++
			continue
		}

		// Get school details
		var school School
		if err := db.First(&school, "id = ?", admin.SchoolID).Error; err != nil {
			log.Printf("✗ Failed to fetch school for %s: %v\n", admin.Email, err)
			skipped++
			continue
		}

		// Generate school initials
		var schoolInitials string
		for _, word := range strings.Fields(school.Name) {
			if len(word) > 0 {
				schoolInitials += strings.ToUpper(string(word[0]))
			}
		}
		if schoolInitials == "" {
			schoolInitials = "SCH"
		}

		// Generate employee ID
		currentYear := time.Now().Year()
		pattern := fmt.Sprintf("%s/STF/%d/%%", schoolInitials, currentYear)

		var lastStaff Staff
		var sequence int = 0
		if err := db.Where("school_id = ? AND employee_id LIKE ?", admin.SchoolID, pattern).
			Order("employee_id DESC").First(&lastStaff).Error; err == nil {
			parts := strings.Split(lastStaff.EmployeeID, "/")
			if len(parts) == 4 {
				var num int
				if _, scanErr := fmt.Sscanf(parts[3], "%d", &num); scanErr == nil {
					sequence = num
				}
			}
		}
		sequence++
		employeeID := fmt.Sprintf("%s/STF/%d/%03d", schoolInitials, currentYear, sequence)

		// Parse full name
		nameParts := strings.Fields(admin.FullName)
		firstName := ""
		middleName := ""
		lastName := ""
		if len(nameParts) > 0 {
			firstName = nameParts[0]
		}
		if len(nameParts) > 2 {
			middleName = nameParts[1]
			lastName = strings.Join(nameParts[2:], " ")
		} else if len(nameParts) > 1 {
			lastName = strings.Join(nameParts[1:], " ")
		}

		// Create staff record
		staff := Staff{
			SchoolID:   *admin.SchoolID,
			UserID:     &admin.ID,
			EmployeeID: employeeID,
			FirstName:  firstName,
			MiddleName: middleName,
			LastName:   lastName,
			Email:      admin.Email,
			Role:       "School Admin",
			Status:     "active",
		}

		if err := db.Create(&staff).Error; err != nil {
			log.Printf("✗ Failed to create staff record for %s: %v\n", admin.Email, err)
			continue
		}

		log.Printf("✓ Created staff record for %s - Employee ID: %s\n", admin.Email, employeeID)
		created++
	}

	log.Printf("\n=== Summary ===\n")
	log.Printf("Total school admins: %d\n", len(admins))
	log.Printf("Staff records created: %d\n", created)
	log.Printf("Skipped (already exists or no school): %d\n", skipped)
}
