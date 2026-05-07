package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/config"
	"github.com/school-system/backend/internal/database"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"gorm.io/gorm"
)

// Helper handlers for inline route functions

func getAuditLogsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		_ = c.DefaultQuery("page", "1")
		actionFilter := c.Query("action")

		type ActivityWithUser struct {
			models.AuditLog
			UserEmail string `json:"user_email"`
		}

		var activities []ActivityWithUser
		query := db.Table("audit_logs").
			Select("audit_logs.*, users.email as user_email").
			Joins("LEFT JOIN users ON audit_logs.actor_user_id = users.id").
			Order("audit_logs.timestamp DESC")

		if actionFilter != "" {
			query = query.Where("audit_logs.action = ?", actionFilter)
		}

		if err := query.Limit(50).Scan(&activities).Error; err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, gin.H{"logs": activities})
	}
}

func migrateHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := database.Migrate(db); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"message": "Migration completed successfully"})
	}
}

func seedAdminHandler(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		seedAdmin(db, cfg)
		c.JSON(200, gin.H{"message": "Admin users seeded successfully"})
	}
}

func seedSubjectsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		seedStandardSubjects(db)
		c.JSON(200, gin.H{"message": "Standard subjects seeded successfully"})
	}
}

func seedFeeTypesHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		seedStandardFeeTypes(db)
		c.JSON(200, gin.H{"message": "Standard fee types seeded successfully"})
	}
}

// Seed functions - these will be imported from main.go or moved to a seeds package
func seedAdmin(db *gorm.DB, cfg *config.Config) {
	authService := services.NewAuthService(db, cfg)

	var count int64
	db.Model(&models.User{}).Where("role = ?", "system_admin").Count(&count)
	if count > 0 {
		return
	}

	sysAdmin := &models.User{
		SchoolID: nil,
		Email:    "sysadmin@acadistra.com",
		FullName: "System Administrator",
		Role:     "system_admin",
		IsActive: true,
	}

	authService.CreateUser(sysAdmin, "Admin@123")
}

func seedStandardSubjects(db *gorm.DB) {
	var count int64
	db.Model(&models.StandardSubject{}).Count(&count)
	if count > 0 {
		return
	}
	// Subject seeding logic would go here
	// For now, just a placeholder
}

func seedStandardFeeTypes(db *gorm.DB) {
	feeTypeService := services.NewStandardFeeTypeService(db)
	feeTypeService.SeedStandardFeeTypes()
}
