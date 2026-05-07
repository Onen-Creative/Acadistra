package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/database"
	"github.com/school-system/backend/internal/handlers"
	"github.com/school-system/backend/internal/repositories"
	"github.com/school-system/backend/internal/services"
	ginSwagger "github.com/swaggo/gin-swagger"
	swaggerFiles "github.com/swaggo/files"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func setupPublicRoutes(r *gin.Engine, deps *Dependencies) {
	// Socket.IO endpoint (must be before other routes)
	if deps.SocketServer != nil {
		r.GET("/socket.io/*any", gin.WrapH(deps.SocketServer))
		r.POST("/socket.io/*any", gin.WrapH(deps.SocketServer))
	}

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.Header("Cache-Control", "no-cache")
		c.JSON(200, gin.H{"status": "ok", "service": "school-system-api"})
	})

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "School Management System API", "status": "running"})
	})

	// Setup endpoints (GET for browser access)
	r.GET("/setup/migrate", func(c *gin.Context) {
		if err := database.Migrate(deps.DB); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"message": "Migration completed successfully"})
	})

	r.GET("/setup/seed-admin", func(c *gin.Context) {
		seedAdmin(deps.DB, deps.Config)
		c.JSON(200, gin.H{"message": "Admin users seeded successfully"})
	})

	r.GET("/setup/seed-subjects", func(c *gin.Context) {
		seedStandardSubjects(deps.DB)
		c.JSON(200, gin.H{"message": "Standard subjects seeded successfully"})
	})

	r.GET("/setup/seed-fee-types", func(c *gin.Context) {
		seedStandardFeeTypes(deps.DB)
		c.JSON(200, gin.H{"message": "Standard fee types seeded successfully"})
	})

	// Password reset endpoints (public)
	passwordResetHandler := handlers.NewPasswordResetHandler(newPasswordResetService(deps))
	r.POST("/api/v1/auth/password-reset/request", passwordResetHandler.RequestPasswordReset)
	r.POST("/api/v1/auth/password-reset/confirm", passwordResetHandler.ConfirmPasswordReset)

	// SchoolPay webhook (public)
	schoolPayHandler := handlers.NewSchoolPayHandler(services.NewSchoolPayService(deps.DB))
	r.POST("/api/v1/webhooks/schoolpay/:school_id", schoolPayHandler.HandleWebhook)

	// Public schools endpoint for landing page
	publicGroup := r.Group("/api/public")
	{
		schoolService := services.NewSchoolService(
			repositories.NewSchoolRepository(deps.DB),
			deps.DB,
		)
		schoolSetupService := services.NewSchoolSetupService(deps.DB)
		auditService := services.NewAuditService(repositories.NewAuditRepository(deps.DB))
		schoolHandler := handlers.NewSchoolHandler(schoolService, schoolSetupService, auditService)
		publicGroup.GET("/schools", schoolHandler.List)
	}

	// Metrics
	if deps.Config.Monitoring.PrometheusEnabled {
		r.GET("/metrics", gin.WrapH(promhttp.Handler()))
	}

	// Swagger
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
}
