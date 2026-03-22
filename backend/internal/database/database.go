package database

import (
	"fmt"
	"log"
	"strings"

	"github.com/school-system/backend/internal/config"
	"github.com/school-system/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(cfg *config.Config) (*gorm.DB, error) {
	var logLevel logger.LogLevel
	if cfg.Server.Env == "development" {
		logLevel = logger.Info
	} else {
		logLevel = logger.Silent
	}

	// Debug: Log connection attempt (without password)
	log.Printf("Attempting database connection with DSN: %s", maskPassword(cfg.Database.DSN))

	db, err := gorm.Open(postgres.Open(cfg.Database.DSN), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("Database connection successful")
	return db, nil
}

func maskPassword(dsn string) string {
	// Simple password masking for logging
	if len(dsn) > 20 {
		return dsn[:20] + "...***..."
	}
	return "***"
}

func Migrate(db *gorm.DB) error {
	log.Println("Running migrations...")
	
	// LEGACY CLEANUP: Remove old uni_staff_email constraint if it exists
	// This constraint was removed from the Staff model but may exist in older databases
	// The DO block safely drops it only if it exists
	db.Exec(`
		DO $$ 
		BEGIN
			IF EXISTS (
				SELECT 1 FROM information_schema.table_constraints 
				WHERE constraint_name = 'uni_staff_email' AND table_name = 'staff'
			) THEN
				ALTER TABLE staff DROP CONSTRAINT uni_staff_email;
			END IF;
		END $$;
	`)
	
	// Migrate Staff-related tables separately to handle legacy constraint issues gracefully
	// This approach ensures that if GORM tries to drop the old constraint and fails,
	// we can catch and ignore that specific error without affecting other migrations
	if !db.Migrator().HasTable(&models.Staff{}) {
		// Table doesn't exist, let GORM create it
		if err := db.Migrator().CreateTable(&models.Staff{}, &models.StaffLeave{}, &models.StaffAttendance{}, &models.StaffDocument{}); err != nil {
			return fmt.Errorf("failed to create staff tables: %w", err)
		}
	} else {
		// Table exists, only add missing columns (don't manage constraints)
		if err := db.Migrator().AutoMigrate(&models.Staff{}, &models.StaffLeave{}, &models.StaffAttendance{}, &models.StaffDocument{}); err != nil {
			// If error is about uni_staff_email constraint, ignore it (legacy issue)
			if !strings.Contains(err.Error(), "uni_staff_email") {
				return fmt.Errorf("failed to migrate staff tables: %w", err)
			}
			log.Println("Ignored legacy uni_staff_email constraint error")
		}
	}
	
	err := db.AutoMigrate(
		&models.School{},
		&models.User{},
		// &models.Staff{}, // Migrated separately above
		&models.TeacherProfile{},
		&models.Class{},
		&models.Student{},
		&models.Guardian{},
		&models.Enrollment{},
		&models.StandardSubject{},
		&models.Assessment{},
		&models.Mark{},
		&models.SubjectResult{},
		&models.ReportCard{},
		&models.AuditLog{},
		&models.Job{},
		&models.GradingRule{},
		&models.RefreshToken{},
		&models.FeesStructure{},
		&models.StudentFees{},
		&models.FeesPayment{},
		&models.Book{},
		&models.BookIssue{},
		&models.BulkIssue{},
		&models.BulkIssueItem{},
		// Staff models migrated separately above
		// &models.StaffLeave{},
		// &models.StaffAttendance{},
		// &models.StaffDocument{},
		&models.TeacherSubject{},
		&models.StudentHealthProfile{},
		&models.ClinicVisit{},
		&models.MedicalTest{},
		&models.Medicine{},
		&models.MedicationAdministration{},
		&models.ClinicConsumable{},
		&models.ConsumableUsage{},
		&models.EmergencyIncident{},
		&models.Income{},
		&models.Expenditure{},
		&models.TermDates{},
		&models.Attendance{},
		&models.SMSLog{},
		&models.Notification{},
		&models.Exam{},
		&models.ExamTimetable{},
		&models.ParentAccount{},
		&models.SchoolCalendar{},
		&models.MobileMoneyPayment{},
		&models.NotificationPreference{},
		&models.NotificationLog{},
		&models.PaymentWebhookLog{},
		&models.SchoolPaymentConfig{},
		&models.SalaryStructure{},
		&models.PayrollRun{},
		&models.PayrollPayment{},
		&models.MarksImport{},
		&models.IntegrationActivity{},
		&models.EmailQueue{},
		&models.PasswordReset{},
		&models.BulkImport{},
		&models.WebVital{},
		// Lesson Monitoring
		&models.LessonRecord{},
		// Budget & Requisitions
		&models.Budget{},
		&models.BudgetTransfer{},
		&models.Requisition{},
		&models.RequisitionItem{},
		&models.RequisitionApprovalFlow{},
		// Inventory
		&models.InventoryCategory{},
		&models.InventoryItem{},
		&models.InventoryTransaction{},
	)
	if err != nil {
		// Only ignore the uni_staff_email constraint error if it's about the constraint not existing
		// This is a legacy issue from older versions of the model
		if strings.Contains(err.Error(), "uni_staff_email") && strings.Contains(err.Error(), "does not exist") {
			log.Println("Info: Skipped legacy uni_staff_email constraint (already removed)")
		} else {
			return err
		}
	}

	log.Println("Migration completed successfully")

	// Add performance indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_classes_school_year ON classes(school_id, year)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_marks_student ON marks(student_id)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_standard_subjects_level ON standard_subjects(level)")
	
	return nil
}
