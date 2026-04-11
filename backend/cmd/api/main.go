package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/school-system/backend/internal/config"
	"github.com/school-system/backend/internal/database"
	"github.com/school-system/backend/internal/handlers"
	"github.com/school-system/backend/internal/middleware"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"github.com/school-system/backend/internal/socketio"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"gorm.io/gorm"
)

// @title School Management System API
// @version 1.0
// @description Production-ready School Management & Report Card System for Ugandan schools
// @host localhost:8080
// @BasePath /
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	if len(os.Args) > 1 {
		handleCommand(os.Args[1])
		return
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Initialize Socket.IO
	socketServer, err := socketio.InitSocketIO()
	if err != nil {
		log.Fatal("Failed to initialize Socket.IO:", err)
	}
	go socketServer.Serve()
	defer socketServer.Close()

	if cfg.Server.Env == "development" {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.Logger())

	// CORS
	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		// Allow localhost and local network IPs
		c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Static files
	r.Static("/logos", "./public/logos")
	r.Static("/photos", "./public/photos")

	// Health check - simple endpoint that doesn't require DB
	r.GET("/health", func(c *gin.Context) {
		c.Header("Cache-Control", "no-cache")
		c.JSON(200, gin.H{"status": "ok", "service": "school-system-api"})
	})
	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "School Management System API", "status": "running"})
	})

	// Public setup endpoints for initial deployment (GET for browser access)
	r.GET("/setup/migrate", func(c *gin.Context) {
		if err := database.Migrate(db); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"message": "Migration completed successfully"})
	})

	r.GET("/setup/seed-admin", func(c *gin.Context) {
		seedAdmin(db, cfg)
		c.JSON(200, gin.H{"message": "Admin users seeded successfully"})
	})

	r.GET("/setup/seed-subjects", func(c *gin.Context) {
		seedStandardSubjects(db)
		c.JSON(200, gin.H{"message": "Standard subjects seeded successfully"})
	})

	r.GET("/setup/seed-fee-types", func(c *gin.Context) {
		seedStandardFeeTypes(db)
		c.JSON(200, gin.H{"message": "Standard fee types seeded successfully"})
	})

	// Services
	authService := services.NewAuthService(db, cfg)
	emailService := services.NewEmailService(
		os.Getenv("SMTP_HOST"),
		587,
		os.Getenv("SMTP_USER"),
		os.Getenv("SMTP_PASSWORD"),
		os.Getenv("SMTP_FROM"),
		db,
	)
	
	// Start email queue processor in background
	go emailService.ProcessEmailQueue()

	// Password reset endpoints (public)
	passwordResetHandler := handlers.NewPasswordResetHandler(db, emailService, authService)
	r.POST("/api/v1/auth/password-reset/request", passwordResetHandler.RequestPasswordReset)
	r.POST("/api/v1/auth/password-reset/confirm", passwordResetHandler.ConfirmPasswordReset)

	// Metrics
	if cfg.Monitoring.PrometheusEnabled {
		r.GET("/metrics", gin.WrapH(promhttp.Handler()))
	}

	// Swagger
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Socket.IO endpoint (must be before other routes)
	r.GET("/socket.io/*any", gin.WrapH(socketServer))
	r.POST("/socket.io/*any", gin.WrapH(socketServer))

	// Handlers
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandlerWithEmail(db, authService, emailService)
	schoolHandler := handlers.NewSchoolHandler(db)
	classHandler := handlers.NewClassHandler(db)
	studentHandler := handlers.NewStudentHandler(db)
	guardianHandler := handlers.NewGuardianHandler(db)
	registrationHandler := handlers.NewRegistrationHandler(db, emailService)
	subjectHandler := handlers.NewSubjectHandler(db)
	resultHandler := handlers.NewResultHandler(db, emailService)
	uploadHandler := handlers.NewUploadHandler(db)
	auditHandler := handlers.NewAuditHandler(db)
	feesHandler := handlers.NewFeesHandler(db, emailService)
	libraryHandler := handlers.NewLibraryHandler(db)
	staffHandler := handlers.NewStaffHandler(db, cfg, emailService)
	websocketHandler := handlers.NewWebSocketHandler(authService)
	attendanceHandler := handlers.NewAttendanceHandler(db, emailService)
	termDatesHandler := handlers.NewTermDatesHandler(db)
	bulkImportXLSXHandler := handlers.NewBulkImportXLSXHandler(db)
	financeHandler := handlers.NewFinanceHandler(db)
	inventoryHandler := handlers.NewInventoryHandler(db)
	payrollService := services.NewPayrollService(db)
	payrollHandler := handlers.NewPayrollHandler(payrollService, emailService)
	marksExportHandler := handlers.NewMarksExportHandler(db)
	systemReportsHandler := handlers.NewSystemReportsHandler(db)
	settingsHandler := handlers.NewSettingsHandler(db)
	notificationHandler := handlers.NewNotificationHandler(db)
	integrationActivityHandler := handlers.NewIntegrationActivityHandler(db)
	analyticsHandler := handlers.NewAnalyticsHandler(db)
	webVitalsHandler := handlers.NewWebVitalsHandler(db)
	classRankingHandler := handlers.NewClassRankingHandler(db)
	
	// Initialize SMS and Email services
	smsService := services.NewSMSService(
		os.Getenv("AFRICASTALKING_API_KEY"),
		os.Getenv("AFRICASTALKING_USERNAME"),
		os.Getenv("AFRICASTALKING_SENDER_ID"),
	)
	notificationService := services.NewNotificationService(db, smsService, emailService)
	_ = notificationService // Will be used for creating notifications
	parentHandler := handlers.NewParentHandler(db)

	// Routes
	v1 := r.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.Refresh)
			auth.POST("/logout", authHandler.Logout)
		}

		// Protected routes
		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware(authService))
		protected.Use(middleware.AuditLogger(db))
		protected.Use(middleware.TenantMiddleware())
		{
			// System Admin only routes
			sysAdmin := protected.Group("")
			sysAdmin.Use(middleware.RequireSystemAdmin())
			{
				sysAdmin.GET("/users", userHandler.List)
				sysAdmin.POST("/users", userHandler.Create)
				sysAdmin.GET("/users/:id", userHandler.Get)
				sysAdmin.PUT("/users/:id", userHandler.Update)
				sysAdmin.DELETE("/users/:id", userHandler.Delete)

				sysAdmin.POST("/schools", schoolHandler.Create)
				sysAdmin.GET("/schools", schoolHandler.List)
				sysAdmin.GET("/schools/:id", schoolHandler.Get)
				sysAdmin.PUT("/schools/:id", schoolHandler.Update)
				sysAdmin.PATCH("/schools/:id/toggle-active", schoolHandler.ToggleActive)
				sysAdmin.DELETE("/schools/:id", schoolHandler.Delete)
				sysAdmin.GET("/stats", schoolHandler.GetStats)

				// Standard subject management
				sysAdmin.GET("/standard-subjects", subjectHandler.ListStandardSubjects)
				sysAdmin.POST("/standard-subjects", subjectHandler.CreateStandardSubject)
				sysAdmin.PUT("/standard-subjects/:id", subjectHandler.UpdateStandardSubject)
				sysAdmin.DELETE("/standard-subjects/:id", subjectHandler.DeleteStandardSubject)

				// Standard fee types management
				standardFeeTypeHandler := handlers.NewStandardFeeTypeHandler(db)
				sysAdmin.GET("/standard-fee-types", standardFeeTypeHandler.GetAllFeeTypes)
				sysAdmin.GET("/standard-fee-types/by-level", standardFeeTypeHandler.GetFeeTypesByLevel)
				sysAdmin.GET("/standard-fee-types/by-category", standardFeeTypeHandler.GetFeeTypesByCategory)
				sysAdmin.GET("/standard-fee-types/compulsory", standardFeeTypeHandler.GetCompulsoryFeeTypes)
				sysAdmin.GET("/standard-fee-types/categories", standardFeeTypeHandler.GetFeeTypeCategories)

				// Audit logs
				sysAdmin.GET("/audit/recent", auditHandler.GetRecentActivity)
				sysAdmin.GET("/audit-logs", func(c *gin.Context) {
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
				})

				// Migration and seeding endpoints
				sysAdmin.POST("/migrate", func(c *gin.Context) {
					if err := database.Migrate(db); err != nil {
						c.JSON(500, gin.H{"error": err.Error()})
						return
					}
					c.JSON(200, gin.H{"message": "Migration completed successfully"})
				})

				sysAdmin.POST("/seed-admin", func(c *gin.Context) {
					seedAdmin(db, cfg)
					c.JSON(200, gin.H{"message": "Admin users seeded successfully"})
				})

				sysAdmin.POST("/seed-subjects", func(c *gin.Context) {
					seedStandardSubjects(db)
					c.JSON(200, gin.H{"message": "Standard subjects seeded successfully"})
				})

				sysAdmin.POST("/seed-fee-types", func(c *gin.Context) {
					seedStandardFeeTypes(db)
					c.JSON(200, gin.H{"message": "Standard fee types seeded successfully"})
				})

				// System settings
				sysAdmin.GET("/settings", settingsHandler.GetSettings)
				sysAdmin.PUT("/settings", settingsHandler.UpdateSettings)
				
				// Email monitoring
				emailMonitorHandler := handlers.NewEmailMonitorHandler(db, emailService)
				sysAdmin.GET("/email-queue/stats", emailMonitorHandler.GetEmailQueueStats)
				sysAdmin.GET("/email-queue", emailMonitorHandler.ListQueuedEmails)
				sysAdmin.GET("/email-queue/:id", emailMonitorHandler.GetEmailDetails)
				sysAdmin.POST("/email-queue/:id/retry", emailMonitorHandler.RetryFailedEmail)
				sysAdmin.POST("/email-queue/:id/cancel", emailMonitorHandler.CancelQueuedEmail)
				
				// System reports
				sysAdmin.GET("/reports/system/schools", systemReportsHandler.GenerateSchoolsReport)
				sysAdmin.GET("/reports/system/users", systemReportsHandler.GenerateUsersReport)
				sysAdmin.GET("/reports/system/students", systemReportsHandler.GenerateStudentsReport)
				sysAdmin.GET("/reports/system/activity", systemReportsHandler.GenerateActivityReport)
				sysAdmin.GET("/reports/system/performance", systemReportsHandler.GeneratePerformanceReport)
				
				// Grade recalculation
				sysAdmin.POST("/recalculate-grades", resultHandler.RecalculateGrades)
			}

			// Shared routes for school_admin, teacher, librarian, nurse, bursar, dos, director_of_studies, and parent
			shared := protected.Group("")
			shared.Use(func(c *gin.Context) {
				userRole := c.GetString("user_role")
				if userRole != "school_admin" && userRole != "teacher" && userRole != "librarian" && userRole != "nurse" && userRole != "bursar" && userRole != "dos" && userRole != "director_of_studies" && userRole != "parent" && userRole != "system_admin" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
					c.Abort()
					return
				}
				c.Next()
			})
			{
				shared.GET("/students", studentHandler.List)
				shared.GET("/staff", staffHandler.GetAllStaff)
				shared.GET("/school", schoolHandler.GetMySchool)
			}

			// Parent-only routes
			parent := protected.Group("/parent")
			parent.Use(func(c *gin.Context) {
				userRole := c.GetString("user_role")
				if userRole != "parent" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
					c.Abort()
					return
				}
				c.Next()
			})
			{
				parent.GET("/dashboard", parentHandler.GetDashboardSummary)
				parent.GET("/children/:student_id", parentHandler.GetChildDetails)
				parent.GET("/children/:student_id/attendance", parentHandler.GetChildAttendance)
				parent.GET("/children/:student_id/results", parentHandler.GetChildResults)
				parent.GET("/children/:student_id/fees", parentHandler.GetChildFees)
				parent.GET("/children/:student_id/health", parentHandler.GetChildHealth)
				parent.GET("/children/:student_id/report-card", parentHandler.GetChildReportCard)
				parent.GET("/children/:student_id/timetable", parentHandler.GetChildTimetable)
			}

			// Payment routes
			paymentHandler := handlers.NewPaymentHandler(db, 
				services.NewMobileMoneyService(db),
				notificationService,
			)
			payments := v1.Group("/payments")
			{
				payments.POST("/mobile-money", middleware.AuthMiddleware(authService), paymentHandler.InitiateMobileMoneyPayment)
				payments.GET("/:id/verify", middleware.AuthMiddleware(authService), paymentHandler.VerifyPayment)
				payments.GET("/student/:student_id/history", middleware.AuthMiddleware(authService), paymentHandler.GetPaymentHistory)
				payments.GET("/stats", middleware.AuthMiddleware(authService), paymentHandler.GetPaymentStats)
				payments.POST("/webhook", paymentHandler.WebhookCallback) // No auth for webhooks
			}

			// Notifications endpoint - All authenticated users
			protected.GET("/notifications", notificationHandler.GetNotifications)
			protected.GET("/notifications/unread-count", notificationHandler.GetUnreadCount)
			protected.GET("/notifications/preferences", notificationHandler.GetPreferences)
			protected.PUT("/notifications/preferences", notificationHandler.UpdatePreferences)
			protected.PUT("/notifications/:id/read", notificationHandler.MarkAsRead)
			protected.PUT("/notifications/mark-all-read", notificationHandler.MarkAllAsRead)
			protected.DELETE("/notifications/:id", notificationHandler.DeleteNotification)
			// School Admin routes
			schoolAdmin := protected.Group("")
			schoolAdmin.Use(middleware.RequireSchoolAdmin())
			{
				// Marks import approval
				bulkMarksHandler := handlers.NewBulkMarksImportHandler(db)
				schoolAdmin.POST("/marks/imports/:id/approve", bulkMarksHandler.ApproveImport)
				schoolAdmin.POST("/marks/imports/:id/reject", bulkMarksHandler.RejectImport)
				
				// User management - School admin can create all users except system_admin
				schoolAdmin.POST("/school-users", userHandler.CreateSchoolUser)
				schoolAdmin.GET("/school-users", userHandler.ListSchoolUsers)
				schoolAdmin.GET("/school-users/:id", userHandler.GetSchoolUser)
				schoolAdmin.PUT("/school-users/:id", userHandler.UpdateSchoolUser)
				schoolAdmin.DELETE("/school-users/:id", userHandler.DeleteSchoolUser)
				schoolAdmin.POST("/school-users/:id/reset-password", userHandler.ResetUserPassword)
				
				// Create specific user roles
				schoolUserHandler := handlers.NewSchoolUserHandler(db)
				schoolAdmin.POST("/schools/:id/teachers", schoolUserHandler.CreateTeacher)
				schoolAdmin.POST("/schools/:id/store-keepers", schoolUserHandler.CreateStoreKeeper)
				schoolAdmin.GET("/schools/:id/users", schoolUserHandler.GetSchoolUsers)
				
				// School dashboard summary
				schoolAdmin.GET("/dashboard/summary", schoolHandler.GetSchoolSummary)
				
				// School settings
				schoolAdmin.GET("/school-settings", settingsHandler.GetSchoolSettings)
				schoolAdmin.PUT("/school-settings", settingsHandler.UpdateSchoolSettings)
				
				// Student registration (comprehensive with guardians)
				schoolAdmin.POST("/students", registrationHandler.RegisterStudent)
				schoolAdmin.PUT("/students/:id", studentHandler.Update)
				schoolAdmin.DELETE("/students/:id", studentHandler.Delete)
				schoolAdmin.POST("/students/:id/promote", studentHandler.PromoteOrDemote)
				
				// Guardian management
				schoolAdmin.POST("/guardians", guardianHandler.Create)
				schoolAdmin.GET("/guardians", guardianHandler.List)
				schoolAdmin.GET("/guardians/:id", guardianHandler.Get)
				schoolAdmin.PUT("/guardians/:id", guardianHandler.Update)
				schoolAdmin.DELETE("/guardians/:id", guardianHandler.Delete)
				
				// Staff management (includes teachers)
				schoolAdmin.POST("/staff", staffHandler.CreateStaff)
				schoolAdmin.GET("/staff/:id", staffHandler.GetStaffByID)
				schoolAdmin.PUT("/staff/:id", staffHandler.UpdateStaff)
				schoolAdmin.DELETE("/staff/:id", staffHandler.DeleteStaff)
				schoolAdmin.GET("/staff/stats", staffHandler.GetStaffStats)
				schoolAdmin.POST("/staff/leave", staffHandler.CreateLeaveRequest)
				schoolAdmin.GET("/staff/leave", staffHandler.GetLeaveRequests)
				schoolAdmin.PUT("/staff/leave/:id/approve", staffHandler.ApproveLeave)
				schoolAdmin.POST("/staff/attendance", staffHandler.MarkStaffAttendance)
				schoolAdmin.GET("/staff/attendance", staffHandler.GetStaffAttendance)
				schoolAdmin.POST("/staff/:id/documents", staffHandler.UploadStaffDocument)
				schoolAdmin.GET("/staff/:id/documents", staffHandler.GetStaffDocuments)
				
				// Payroll management
				schoolAdmin.POST("/payroll/salary-structures", payrollHandler.CreateSalaryStructure)
				schoolAdmin.PUT("/payroll/salary-structures/:id", payrollHandler.UpdateSalaryStructure)
				schoolAdmin.DELETE("/payroll/salary-structures/:id", payrollHandler.DeleteSalaryStructure)
				schoolAdmin.GET("/payroll/salary-structures", payrollHandler.ListSalaryStructures)
				schoolAdmin.GET("/payroll/salary-structures/user/:user_id", payrollHandler.GetSalaryStructure)
				schoolAdmin.POST("/payroll/process", payrollHandler.ProcessPayroll)
				schoolAdmin.GET("/payroll/runs", payrollHandler.ListPayrollRuns)
				schoolAdmin.GET("/payroll/runs/:id", payrollHandler.GetPayrollRun)
				schoolAdmin.POST("/payroll/payments/:id/mark-paid", payrollHandler.MarkPaymentPaid)
				schoolAdmin.GET("/payroll/payslip/:payment_id", payrollHandler.GetPayslip)
				schoolAdmin.GET("/payroll/summary/:year", payrollHandler.GetPayrollSummary)
				
				// Results management
				schoolAdmin.DELETE("/results/:id", resultHandler.Delete)
				
				// School Admin and DOS routes
				schoolAdminOrDOS := protected.Group("")
				schoolAdminOrDOS.Use(middleware.RequireDOS())
				{
					// Lesson Monitoring - School Admin and DOS
					lessonHandler := handlers.NewLessonHandler(db)
					schoolAdminOrDOS.POST("/lessons", lessonHandler.CreateLesson)
					schoolAdminOrDOS.GET("/lessons", lessonHandler.ListLessons)
					schoolAdminOrDOS.GET("/lessons/:id", lessonHandler.GetLesson)
					schoolAdminOrDOS.PUT("/lessons/:id", lessonHandler.UpdateLesson)
					schoolAdminOrDOS.DELETE("/lessons/:id", lessonHandler.DeleteLesson)
					schoolAdminOrDOS.GET("/lessons/stats", lessonHandler.GetStats)
					schoolAdminOrDOS.GET("/lessons/export", lessonHandler.ExportReport)
					schoolAdminOrDOS.GET("/lessons/subjects", lessonHandler.GetSchoolSubjects)
					schoolAdminOrDOS.GET("/lessons/teachers", lessonHandler.GetSchoolTeachers)
					
					// Student import - School Admin and DOS
					schoolAdminOrDOS.POST("/import/students/upload", bulkImportXLSXHandler.UploadStudents)
					
					// Import management - School Admin and DOS
					schoolAdminOrDOS.GET("/import/list", bulkImportXLSXHandler.ListImports)
					schoolAdminOrDOS.GET("/import/:id", bulkImportXLSXHandler.GetImportDetails)
					schoolAdminOrDOS.POST("/import/:id/approve", bulkImportXLSXHandler.ApproveImport)
					schoolAdminOrDOS.POST("/import/:id/reject", bulkImportXLSXHandler.RejectImport)
				}
			}
			
			// Template downloads - School Admin and Teachers (with query token support)
			templateDL := v1.Group("/import/templates")
			templateDL.Use(middleware.AllowQueryToken())
			templateDL.Use(middleware.AuthMiddleware(authService))
			templateDL.Use(middleware.TenantMiddleware())
			templateDL.Use(func(c *gin.Context) {
				userRole := c.GetString("user_role")
				if userRole != "teacher" && userRole != "school_admin" && userRole != "system_admin" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
					c.Abort()
					return
				}
				c.Next()
			})
			{
				templateDL.GET("/students", bulkImportXLSXHandler.DownloadStudentTemplate)
				templateDL.GET("/marks", bulkImportXLSXHandler.DownloadMarksTemplate)
			}
			
			// Marks import - Teachers and School Admins
			teacherOrAdmin := protected.Group("")
			teacherOrAdmin.Use(func(c *gin.Context) {
				userRole := c.GetString("user_role")
				if userRole != "teacher" && userRole != "school_admin" && userRole != "system_admin" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
					c.Abort()
					return
				}
				c.Next()
			})
			{
				bulkMarksHandler := handlers.NewBulkMarksImportHandler(db)
				teacherOrAdmin.POST("/marks/bulk-import", bulkMarksHandler.UploadMarksForApproval)
				teacherOrAdmin.GET("/marks/imports", bulkMarksHandler.ListImports)
				teacherOrAdmin.GET("/marks/imports/:id", bulkMarksHandler.GetImportDetails)
				teacherOrAdmin.GET("/marks/import-template", bulkMarksHandler.DownloadTemplate)
				teacherOrAdmin.GET("/export/marks", marksExportHandler.ExportClassMarks)
			}

			// Bursar routes (including parent read-only access to fees)
			bursar := protected.Group("")
			bursar.Use(func(c *gin.Context) {
				userRole := c.GetString("user_role")
				if userRole != "bursar" && userRole != "school_admin" && userRole != "parent" && userRole != "system_admin" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
					c.Abort()
					return
				}
				c.Next()
			})
			{
				bursar.GET("/fees", feesHandler.ListStudentFees)
				bursar.POST("/fees", feesHandler.CreateOrUpdateStudentFees)
				bursar.PUT("/fees/:id", feesHandler.UpdateStudentFees)
				bursar.GET("/fees/:id", feesHandler.GetStudentFeesDetails)
				bursar.DELETE("/fees/:id", feesHandler.DeleteStudentFees)
				bursar.POST("/fees/payment", feesHandler.RecordPayment)
				bursar.GET("/fees/reports", feesHandler.GetReportData)
				
				// Finance routes
				bursar.POST("/finance/income", financeHandler.CreateIncome)
				bursar.GET("/finance/income", financeHandler.ListIncome)
				bursar.GET("/finance/income/:id", financeHandler.GetIncome)
				bursar.PUT("/finance/income/:id", financeHandler.UpdateIncome)
				bursar.DELETE("/finance/income/:id", financeHandler.DeleteIncome)
				bursar.POST("/finance/expenditure", financeHandler.CreateExpenditure)
				bursar.GET("/finance/expenditure", financeHandler.ListExpenditure)
				bursar.GET("/finance/expenditure/:id", financeHandler.GetExpenditure)
				bursar.PUT("/finance/expenditure/:id", financeHandler.UpdateExpenditure)
				bursar.DELETE("/finance/expenditure/:id", financeHandler.DeleteExpenditure)
				bursar.GET("/finance/summary", financeHandler.GetFinancialSummary)
				bursar.GET("/finance/export", financeHandler.ExportFinanceReport)
				bursar.GET("/fees/export", financeHandler.ExportFeesReport)
			}

			// Budget & Requisitions routes (bursar and school_admin)
			budget := protected.Group("")
			budget.Use(func(c *gin.Context) {
				userRole := c.GetString("user_role")
				if userRole != "bursar" && userRole != "school_admin" && userRole != "system_admin" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
					c.Abort()
					return
				}
				c.Next()
			})
			{
				budgetHandler := handlers.NewBudgetHandler(db)
				requisitionHandler := handlers.NewRequisitionHandler(db, emailService)
				
				// Budget routes
				budget.POST("/budgets", budgetHandler.CreateBudget)
				budget.GET("/budgets", budgetHandler.ListBudgets)
				budget.GET("/budgets/:id", budgetHandler.GetBudget)
				budget.GET("/budgets/summary", budgetHandler.GetBudgetSummary)
				budget.PUT("/budgets/:id", budgetHandler.UpdateBudget)
				budget.DELETE("/budgets/:id", budgetHandler.DeleteBudget)
				
				// Requisition approval/payment routes (bursar/admin only)
				budget.POST("/requisitions/:id/approve", requisitionHandler.ApproveRequisition)
				budget.POST("/requisitions/:id/reject", requisitionHandler.RejectRequisition)
				budget.POST("/requisitions/:id/mark-paid", requisitionHandler.MarkRequisitionPaid)
			}

			// Requisition routes (all staff can create/view)
			requisitions := protected.Group("")
			requisitions.Use(func(c *gin.Context) {
				userRole := c.GetString("user_role")
				if userRole != "bursar" && userRole != "school_admin" && userRole != "teacher" && userRole != "librarian" && userRole != "nurse" && userRole != "dos" && userRole != "director_of_studies" && userRole != "system_admin" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
					c.Abort()
					return
				}
				c.Next()
			})
			{
				requisitionHandler := handlers.NewRequisitionHandler(db, emailService)
				requisitions.POST("/requisitions", requisitionHandler.CreateRequisition)
				requisitions.GET("/requisitions", requisitionHandler.ListRequisitions)
				requisitions.GET("/requisitions/:id", requisitionHandler.GetRequisition)
				requisitions.GET("/requisitions/stats", requisitionHandler.GetRequisitionStats)
				requisitions.PUT("/requisitions/:id", requisitionHandler.UpdateRequisition)
				requisitions.DELETE("/requisitions/:id", requisitionHandler.DeleteRequisition)
			}

			// Inventory routes (school admin, bursar, store keeper, and system admin)
			inventory := protected.Group("/inventory")
			inventory.Use(func(c *gin.Context) {
				userRole := c.GetString("user_role")
				if userRole != "school_admin" && userRole != "bursar" && userRole != "storekeeper" && userRole != "system_admin" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
					c.Abort()
					return
				}
				c.Next()
			})
			{
				inventory.GET("/categories", inventoryHandler.ListCategories)
				inventory.GET("/items", inventoryHandler.ListItems)
				inventory.POST("/items", inventoryHandler.CreateItem)
				inventory.PUT("/items/:id", inventoryHandler.UpdateItem)
				inventory.DELETE("/items/:id", inventoryHandler.DeleteItem)
				inventory.POST("/transactions", inventoryHandler.RecordTransaction)
				inventory.GET("/transactions", inventoryHandler.ListTransactions)
				inventory.GET("/transactions/:id/receipt", inventoryHandler.GetPurchaseReceipt)
				inventory.GET("/stats", inventoryHandler.GetStats)
			}

			// Librarian routes
			librarian := protected.Group("")
			librarian.Use(func(c *gin.Context) {
				userRole := c.GetString("user_role")
				if userRole != "librarian" && userRole != "school_admin" && userRole != "system_admin" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
					c.Abort()
					return
				}
				c.Next()
			})
			{
				librarian.GET("/library/books", libraryHandler.ListBooks)
				librarian.POST("/library/books", libraryHandler.CreateBook)
				librarian.PUT("/library/books/:id", libraryHandler.UpdateBook)
				librarian.DELETE("/library/books/:id", libraryHandler.DeleteBook)
				librarian.GET("/library/books/:id/history", libraryHandler.GetCopyHistory)
				librarian.GET("/library/books/:id/available-copies", libraryHandler.GetAvailableCopies)
				librarian.GET("/library/search-copy", libraryHandler.SearchByCopyNumber)
				librarian.GET("/library/issues", libraryHandler.ListIssues)
				librarian.POST("/library/issue", libraryHandler.IssueBook)
				librarian.POST("/library/bulk-issue", libraryHandler.BulkIssueBooks)
				librarian.PUT("/library/return/:id", libraryHandler.ReturnBook)
				librarian.GET("/library/stats", libraryHandler.GetStats)
				librarian.GET("/library/stats/subjects", libraryHandler.GetStatsBySubject)
				librarian.GET("/library/reports", libraryHandler.GetReportData)
			}

			// Nurse routes (including parent read-only access to health profiles)
			nurse := protected.Group("/clinic")
			nurse.Use(func(c *gin.Context) {
				userRole := c.GetString("user_role")
				if userRole != "nurse" && userRole != "school_admin" && userRole != "parent" && userRole != "system_admin" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
					c.Abort()
					return
				}
				c.Next()
			})
			{
				clinicHandler := handlers.NewClinicHandler(db, emailService)
				
				// Health Profiles
				nurse.POST("/health-profiles", clinicHandler.CreateHealthProfile)
				nurse.GET("/health-profiles/:student_id", clinicHandler.GetHealthProfile)
				nurse.GET("/students/:student_id/health-data", clinicHandler.GetStudentHealthData)
				nurse.GET("/health-profiles/detail/:id", clinicHandler.GetHealthProfileByID)
				nurse.PUT("/health-profiles/:id", clinicHandler.UpdateHealthProfile)
				nurse.DELETE("/health-profiles/:id", clinicHandler.DeleteHealthProfile)
				
				// Clinic Visits
				nurse.POST("/visits", clinicHandler.CreateVisit)
				nurse.GET("/visits", clinicHandler.GetVisits)
				nurse.GET("/visits/:id", clinicHandler.GetVisit)
				nurse.PUT("/visits/:id", clinicHandler.UpdateVisit)
				nurse.DELETE("/visits/:id", clinicHandler.DeleteVisit)
				
				// Medical Tests
				nurse.POST("/tests", clinicHandler.CreateTest)
				nurse.GET("/tests", clinicHandler.GetTests)
				
				// Medicines
				nurse.POST("/medicines", clinicHandler.CreateMedicine)
				nurse.GET("/medicines", clinicHandler.ListMedicines)
				nurse.PUT("/medicines/:id", clinicHandler.UpdateMedicine)
				nurse.DELETE("/medicines/:id", clinicHandler.DeleteMedicine)
				
				// Medication Administration
				nurse.POST("/medication-admin", clinicHandler.AdministerMedication)
				nurse.GET("/medication-history", clinicHandler.GetMedicationHistory)
				
				// Consumables
				nurse.POST("/consumables", clinicHandler.CreateConsumable)
				nurse.GET("/consumables", clinicHandler.ListConsumables)
				nurse.PUT("/consumables/:id", clinicHandler.UpdateConsumable)
				nurse.DELETE("/consumables/:id", clinicHandler.DeleteConsumable)
				
				// Consumable Usage
				nurse.POST("/consumable-usage", clinicHandler.RecordConsumableUsage)
				nurse.GET("/consumable-usage", clinicHandler.GetConsumableUsage)
				
				// Emergency Incidents
				nurse.POST("/incidents", clinicHandler.CreateIncident)
				nurse.GET("/incidents", clinicHandler.GetIncidents)
				
				// Summary (both nurse and admin can access)
				nurse.GET("/summary", clinicHandler.GetAdminSummary)
				nurse.GET("/reports", clinicHandler.GetReportData)
			}

			// WebSocket endpoint (no auth middleware needed as it handles auth internally)
			v1.GET("/ws", websocketHandler.HandleWebSocket)
			
			// Attendance routes (teachers and admins)
			protected.POST("/attendance", attendanceHandler.MarkAttendance)
			protected.POST("/attendance/bulk", attendanceHandler.BulkMarkAttendance)
			protected.GET("/attendance", attendanceHandler.GetAttendance)
			protected.GET("/attendance/by-date", attendanceHandler.GetAttendanceByDate)
			protected.GET("/attendance/stats", attendanceHandler.GetAttendanceStats)
			protected.GET("/attendance/summary", attendanceHandler.GetClassAttendanceSummary)
			protected.GET("/attendance/class-summary", attendanceHandler.GetClassAttendanceSummary)
			protected.GET("/attendance/report", attendanceHandler.GetAttendanceReport)
			protected.GET("/attendance/student/:student_id/history", attendanceHandler.GetStudentAttendanceHistory)
			protected.DELETE("/attendance/:id", attendanceHandler.DeleteAttendance)
			
			// Calendar management (holidays/non-school days) - School Admin only
			schoolAdmin.POST("/calendar/holidays", attendanceHandler.AddHoliday)
			schoolAdmin.DELETE("/calendar/holidays/:id", attendanceHandler.DeleteHoliday)
			
			// Term dates management - School Admin only
			schoolAdmin.POST("/term-dates", termDatesHandler.CreateOrUpdate)
			schoolAdmin.DELETE("/term-dates/:id", termDatesHandler.Delete)
			
			// Calendar viewing - All authenticated users
			protected.GET("/calendar/holidays", attendanceHandler.GetHolidays)
			protected.GET("/term-dates", termDatesHandler.List)
			protected.GET("/term-dates/current", termDatesHandler.Get)
			
			protected.GET("/school/levels", schoolHandler.GetSchoolLevels)
			protected.GET("/classes", classHandler.List)
			protected.POST("/classes", classHandler.Create)
			protected.GET("/classes/:id", classHandler.Get)
			protected.PUT("/classes/:id", classHandler.Update)
			protected.DELETE("/classes/:id", classHandler.Delete)
			protected.GET("/classes/:id/students", classHandler.GetStudents)
			protected.GET("/students/:id", studentHandler.Get)
			protected.GET("/students/:id/results", resultHandler.GetByStudent)
			protected.GET("/results/performance-summary", resultHandler.GetPerformanceSummary)
			
			// Analytics routes
			protected.GET("/analytics/subject-trend", analyticsHandler.SubjectPerformanceTrend)
			protected.GET("/analytics/student-progress/:student_id", analyticsHandler.StudentProgressTracking)
			protected.GET("/analytics/class-comparison", analyticsHandler.ClassComparison)
			protected.GET("/analytics/subject-comparison", analyticsHandler.SubjectComparison)
			protected.GET("/analytics/term-comparison", analyticsHandler.TermComparison)
			
			// Class ranking routes
			protected.GET("/analytics/class-ranking/:class_id", classRankingHandler.GetClassRanking)
			protected.GET("/analytics/class-ranking/:class_id/export", classRankingHandler.ExportClassRanking)
			protected.GET("/analytics/class-ranking/:class_id/terms-years", classRankingHandler.GetAvailableTermsYears)
			
			// Web vitals (optional auth)
			protected.POST("/analytics/web-vitals", webVitalsHandler.RecordWebVital)
			protected.GET("/analytics/web-vitals/stats", webVitalsHandler.GetWebVitalsStats)
			
			protected.GET("/subjects", subjectHandler.ListStandardSubjects)
			protected.GET("/subjects/school", subjectHandler.GetSchoolSubjects)
			protected.GET("/subjects/levels", subjectHandler.GetLevels)
			
			// Standard fee types - All authenticated users can access
			standardFeeTypeHandler := handlers.NewStandardFeeTypeHandler(db)
			protected.GET("/fee-types", standardFeeTypeHandler.GetAllFeeTypes)
			protected.GET("/fee-types/by-level", standardFeeTypeHandler.GetFeeTypesByLevel)
			protected.GET("/fee-types/by-category", standardFeeTypeHandler.GetFeeTypesByCategory)
			protected.GET("/fee-types/compulsory", standardFeeTypeHandler.GetCompulsoryFeeTypes)
			protected.GET("/fee-types/categories", standardFeeTypeHandler.GetFeeTypeCategories)
			protected.POST("/results", resultHandler.CreateOrUpdate)
			protected.GET("/integration-activities", integrationActivityHandler.GetByClass)
			protected.POST("/integration-activities", integrationActivityHandler.CreateOrUpdate)
			protected.POST("/debug/results", func(c *gin.Context) {
				var body map[string]interface{}
				c.ShouldBindJSON(&body)
				c.JSON(200, gin.H{"received": body, "headers": c.Request.Header})
			})
			// Upload endpoints with query token support for file uploads
			upload := protected.Group("/upload")
			upload.Use(middleware.AllowQueryToken())
			{
				upload.POST("/logo", uploadHandler.UploadLogo)
				upload.POST("/student-photo", uploadHandler.UploadStudentPhoto)
			}
		}
	}

	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("Server starting on %s", addr)
	
	// Create custom HTTP server with longer timeouts for file uploads
	srv := &http.Server{
		Addr:           addr,
		Handler:        r,
		ReadTimeout:    5 * time.Minute,  // 5 minutes for large file uploads
		WriteTimeout:   5 * time.Minute,  // 5 minutes for processing
		IdleTimeout:    120 * time.Second, // 2 minutes idle
		MaxHeaderBytes: 1 << 20,          // 1 MB headers
	}
	
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func handleCommand(cmd string) {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	switch cmd {
	case "migrate":
		if err := database.Migrate(db); err != nil {
			log.Fatal("Migration failed:", err)
		}
		log.Println("Migration completed successfully")

	case "seed-admin":
		seedAdmin(db, cfg)

	case "seed-standard-subjects":
		seedStandardSubjects(db)

	case "add-missing-subjects":
		addMissingSubjects(db)

	case "seed-standard-fee-types":
		seedStandardFeeTypes(db)

	case "fix-constraints":
		// Drop old constraints that cause migration issues
		db.Exec("ALTER TABLE staff DROP CONSTRAINT IF EXISTS uni_staff_email")
		log.Println("Fixed database constraints")

	case "migrate-users-to-staff":
		migrateUsersToStaff(db)

	default:
	}
}

func seedAdmin(db *gorm.DB, cfg *config.Config) {
	authService := services.NewAuthService(db, cfg)

	var count int64
	db.Model(&models.User{}).Where("role = ?", "system_admin").Count(&count)
	if count > 0 {
		log.Println("System admin already exists")
		return
	}

	// Create system admin without school assignment
	sysAdmin := &models.User{
		SchoolID: nil,
		Email:    "sysadmin@acadistra.com",
		FullName: "System Administrator",
		Role:     "system_admin",
		IsActive: true,
	}

	if err := authService.CreateUser(sysAdmin, "Admin@123"); err != nil {
		log.Fatal("Failed to create system admin:", err)
	}

	log.Println("System Admin created: sysadmin@acadistra.com / Admin@123")
	log.Println("Other users (school admin, teachers, etc.) should be created through the school management interface")
}

func seedStandardSubjects(db *gorm.DB) {
	log.Println("Seeding standard subjects...")

	var count int64
	db.Model(&models.StandardSubject{}).Count(&count)
	if count > 0 {
		log.Println("Standard subjects already exist")
		return
	}

	// Pre-Primary (Nursery) Learning Domains
	nurseryDomains := []models.StandardSubject{
		{Name: "Mathematics", Code: "MATH", Level: "Baby", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Basic mathematical concepts and number recognition"},
		{Name: "English Language", Code: "ENG", Level: "Baby", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "English language development and communication"},
		{Name: "Spiritual and Moral Development", Code: "SMD", Level: "Baby", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Spiritual growth and moral values"},
		{Name: "Physical Health and Nutrition Development", Code: "PHND", Level: "Baby", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Physical health, nutrition awareness and development"},
		{Name: "Interacting with the Environment", Code: "IWE", Level: "Baby", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Environmental awareness and interaction"},
		{Name: "Personal and Social Development", Code: "PSD", Level: "Baby", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Personal growth and social skills development"},
		{Name: "Literacy and Communication Skills", Code: "LCS", Level: "Baby", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Early literacy and communication development"},
		{Name: "Reading", Code: "READ", Level: "Baby", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Reading skills and comprehension"},
		{Name: "Writing", Code: "WRITE", Level: "Baby", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Writing skills and expression"},
		
		{Name: "Mathematics", Code: "MATH", Level: "Middle", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Basic mathematical concepts and number recognition"},
		{Name: "English Language", Code: "ENG", Level: "Middle", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "English language development and communication"},
		{Name: "Spiritual and Moral Development", Code: "SMD", Level: "Middle", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Spiritual growth and moral values"},
		{Name: "Physical Health and Nutrition Development", Code: "PHND", Level: "Middle", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Physical health, nutrition awareness and development"},
		{Name: "Interacting with the Environment", Code: "IWE", Level: "Middle", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Environmental awareness and interaction"},
		{Name: "Personal and Social Development", Code: "PSD", Level: "Middle", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Personal growth and social skills development"},
		{Name: "Literacy and Communication Skills", Code: "LCS", Level: "Middle", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Early literacy and communication development"},
		{Name: "Reading", Code: "READ", Level: "Middle", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Reading skills and comprehension"},
		{Name: "Writing", Code: "WRITE", Level: "Middle", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Writing skills and expression"},
		
		{Name: "Mathematics", Code: "MATH", Level: "Top", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Basic mathematical concepts and number recognition"},
		{Name: "English Language", Code: "ENG", Level: "Top", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "English language development and communication"},
		{Name: "Spiritual and Moral Development", Code: "SMD", Level: "Top", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Spiritual growth and moral values"},
		{Name: "Physical Health and Nutrition Development", Code: "PHND", Level: "Top", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Physical health, nutrition awareness and development"},
		{Name: "Interacting with the Environment", Code: "IWE", Level: "Top", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Environmental awareness and interaction"},
		{Name: "Personal and Social Development", Code: "PSD", Level: "Top", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Personal growth and social skills development"},
		{Name: "Literacy and Communication Skills", Code: "LCS", Level: "Top", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Early literacy and communication development"},
		{Name: "Reading", Code: "READ", Level: "Top", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Reading skills and comprehension"},
		{Name: "Writing", Code: "WRITE", Level: "Top", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Writing skills and expression"},
	}

	// P1-P3 Subjects
	p13Subjects := []models.StandardSubject{
		// P1
		{Name: "Literacy One", Code: "LIT1", Level: "P1", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "First literacy component"},
		{Name: "Literacy Two", Code: "LIT2", Level: "P1", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Second literacy component"},
		{Name: "Mathematics", Code: "MATH", Level: "P1", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Mathematical concepts and problem solving"},
		{Name: "Religious Education", Code: "RE", Level: "P1", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Religious and moral education"},
		{Name: "Life Skills", Code: "LS", Level: "P1", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Personal and social life skills"},
		{Name: "Creative Arts", Code: "CA", Level: "P1", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Creative expression through arts"},
		{Name: "Environment", Code: "ENV", Level: "P1", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Environmental awareness and science concepts"},
		// P2
		{Name: "Literacy One", Code: "LIT1", Level: "P2", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "First literacy component"},
		{Name: "Literacy Two", Code: "LIT2", Level: "P2", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Second literacy component"},
		{Name: "Mathematics", Code: "MATH", Level: "P2", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Mathematical concepts and problem solving"},
		{Name: "Religious Education", Code: "RE", Level: "P2", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Religious and moral education"},
		{Name: "Life Skills", Code: "LS", Level: "P2", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Personal and social life skills"},
		{Name: "Creative Arts", Code: "CA", Level: "P2", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Creative expression through arts"},
		{Name: "Environment", Code: "ENV", Level: "P2", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Environmental awareness and science concepts"},
		// P3
		{Name: "Literacy One", Code: "LIT1", Level: "P3", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "First literacy component"},
		{Name: "Literacy Two", Code: "LIT2", Level: "P3", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Second literacy component"},
		{Name: "Mathematics", Code: "MATH", Level: "P3", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Mathematical concepts and problem solving"},
		{Name: "Religious Education", Code: "RE", Level: "P3", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Religious and moral education"},
		{Name: "Life Skills", Code: "LS", Level: "P3", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Personal and social life skills"},
		{Name: "Creative Arts", Code: "CA", Level: "P3", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Creative expression through arts"},
		{Name: "Environment", Code: "ENV", Level: "P3", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Environmental awareness and science concepts"},
	}

	// P4-P7 Subjects
	p47Subjects := []models.StandardSubject{
		{Name: "English Language", Code: "ENG", Level: "P4", IsCompulsory: true, Papers: 1, GradingType: "primary_upper", Description: "English language and communication"},
		{Name: "Mathematics", Code: "MATH", Level: "P4", IsCompulsory: true, Papers: 1, GradingType: "primary_upper", Description: "Mathematical concepts and problem solving"},
		{Name: "Integrated Science", Code: "SCI", Level: "P4", IsCompulsory: true, Papers: 1, GradingType: "primary_upper", Description: "Scientific concepts and practical work"},
		{Name: "Social Studies", Code: "SST", Level: "P4", IsCompulsory: true, Papers: 1, GradingType: "primary_upper", Description: "Social studies including CRE/IRE"},
		{Name: "Local Language", Code: "LL", Level: "P4", IsCompulsory: true, Papers: 1, GradingType: "primary_upper", Description: "Acoli, Luganda, Lango, or Lumasaba"},
		{Name: "Creative Arts", Code: "CA", Level: "P4", IsCompulsory: true, Papers: 1, GradingType: "primary_upper", Description: "Creative and performing arts"},
		{Name: "Physical Education", Code: "PE", Level: "P4", IsCompulsory: true, Papers: 1, GradingType: "primary_upper", Description: "Physical fitness and sports"},
		{Name: "Agriculture / Environmental Education", Code: "AGR", Level: "P4", IsCompulsory: true, Papers: 1, GradingType: "primary_upper", Description: "Agricultural practices and environmental education"},
		{Name: "ICT", Code: "ICT", Level: "P4", IsCompulsory: false, Papers: 1, GradingType: "primary_upper", Description: "Information and Communication Technology"},
	}

	// S1-S4 Compulsory Subjects (S1-S2)
	s12Compulsory := []models.StandardSubject{
		{Name: "English Language", Code: "ENG", Level: "S1", IsCompulsory: true, Papers: 1, GradingType: "ncdc", Description: "English language and communication"},
		{Name: "Mathematics", Code: "MATH", Level: "S1", IsCompulsory: true, Papers: 1, GradingType: "ncdc", Description: "Mathematical concepts and problem solving"},
		{Name: "Physics", Code: "PHY", Level: "S1", IsCompulsory: true, Papers: 1, GradingType: "ncdc", Description: "Physical science and physics concepts"},
		{Name: "Chemistry", Code: "CHEM", Level: "S1", IsCompulsory: true, Papers: 1, GradingType: "ncdc", Description: "Chemical science and laboratory work"},
		{Name: "Biology", Code: "BIO", Level: "S1", IsCompulsory: true, Papers: 1, GradingType: "ncdc", Description: "Biological science and life processes"},
		{Name: "Geography", Code: "GEO", Level: "S1", IsCompulsory: true, Papers: 1, GradingType: "ncdc", Description: "Physical and human geography"},
		{Name: "History & Political Education", Code: "HIST", Level: "S1", IsCompulsory: true, Papers: 1, GradingType: "ncdc", Description: "Historical studies and political education"},
		{Name: "Christian Religious Education", Code: "CRE", Level: "S1", IsCompulsory: true, Papers: 1, GradingType: "ncdc", Description: "Christian religious studies"},
		{Name: "Islamic Religious Education", Code: "IRE", Level: "S1", IsCompulsory: true, Papers: 1, GradingType: "ncdc", Description: "Islamic religious studies"},
		{Name: "Entrepreneurship Education", Code: "ENT", Level: "S1", IsCompulsory: true, Papers: 1, GradingType: "ncdc", Description: "Business and entrepreneurship skills"},
		{Name: "Kiswahili", Code: "KIS", Level: "S1", IsCompulsory: true, Papers: 1, GradingType: "ncdc", Description: "Kiswahili language"},
		{Name: "Physical Education", Code: "PE", Level: "S1", IsCompulsory: true, Papers: 1, GradingType: "ncdc", Description: "Physical fitness and sports"},
	}

	// S1-S4 Electives
	s14Electives := []models.StandardSubject{
		{Name: "ICT / Computer Studies", Code: "ICT", Level: "S1", IsCompulsory: false, Papers: 1, GradingType: "ncdc", Description: "Information and Communication Technology"},
		{Name: "Agriculture", Code: "AGR", Level: "S1", IsCompulsory: false, Papers: 1, GradingType: "ncdc", Description: "Agricultural science and practices"},
		{Name: "Literature in English", Code: "LIT", Level: "S1", IsCompulsory: false, Papers: 1, GradingType: "ncdc", Description: "English literature and literary analysis"},
		{Name: "Art and Design", Code: "AD", Level: "S1", IsCompulsory: false, Papers: 1, GradingType: "ncdc", Description: "Visual arts and design"},
	}

	// S5-S6 Principal Subjects
	s56Principal := []models.StandardSubject{
		{Name: "Mathematics", Code: "MATH", Level: "S5", IsCompulsory: false, Papers: 2, GradingType: "uneb", Description: "Advanced mathematics"},
		{Name: "Physics", Code: "PHY", Level: "S5", IsCompulsory: false, Papers: 3, GradingType: "uneb", Description: "Advanced physics"},
		{Name: "Chemistry", Code: "CHEM", Level: "S5", IsCompulsory: false, Papers: 3, GradingType: "uneb", Description: "Advanced chemistry"},
		{Name: "Biology", Code: "BIO", Level: "S5", IsCompulsory: false, Papers: 3, GradingType: "uneb", Description: "Advanced biology"},
		{Name: "Geography", Code: "GEO", Level: "S5", IsCompulsory: false, Papers: 3, GradingType: "uneb", Description: "Advanced geography"},
		{Name: "History & Political Education", Code: "HIST", Level: "S5", IsCompulsory: false, Papers: 3, GradingType: "uneb", Description: "Advanced history and political education"},
		{Name: "Religious Education", Code: "RE", Level: "S5", IsCompulsory: false, Papers: 2, GradingType: "uneb", Description: "Advanced religious studies (CRE or IRE)"},
		{Name: "Entrepreneurship Education", Code: "ENT", Level: "S5", IsCompulsory: false, Papers: 2, GradingType: "uneb", Description: "Advanced entrepreneurship"},
		{Name: "Agriculture", Code: "AGR", Level: "S5", IsCompulsory: false, Papers: 3, GradingType: "uneb", Description: "Advanced agriculture"},
		{Name: "Economics", Code: "ECON", Level: "S5", IsCompulsory: false, Papers: 2, GradingType: "uneb", Description: "Economic theory and practice"},
		{Name: "Luganda", Code: "LUG", Level: "S5", IsCompulsory: false, Papers: 2, GradingType: "uneb", Description: "Luganda language and literature"},
		{Name: "Art and Design", Code: "AD", Level: "S5", IsCompulsory: false, Papers: 2, GradingType: "uneb", Description: "Advanced art and design"},
		{Name: "Literature", Code: "LIT", Level: "S5", IsCompulsory: false, Papers: 2, GradingType: "uneb", Description: "Advanced English literature"},
	}

	// S5-S6 Subsidiary Subjects
	s56Subsidiary := []models.StandardSubject{
		{Name: "General Paper", Code: "GP", Level: "S5", IsCompulsory: true, Papers: 1, GradingType: "uneb", Description: "General knowledge and current affairs"},
		{Name: "Information Communication Technology", Code: "ICT", Level: "S5", IsCompulsory: false, Papers: 1, GradingType: "uneb", Description: "Information and Communication Technology"},
		{Name: "Subsidiary Mathematics", Code: "SUBMATH", Level: "S5", IsCompulsory: false, Papers: 1, GradingType: "uneb", Description: "Subsidiary level mathematics"},
	}

	// Combine all subjects
	allSubjects := []models.StandardSubject{}
	allSubjects = append(allSubjects, nurseryDomains...)

	// Replicate P1-P3 subjects for P2 and P3
	for _, subject := range p13Subjects {
		allSubjects = append(allSubjects, subject)
		for _, level := range []string{"P2", "P3"} {
			subjectCopy := subject
			subjectCopy.Level = level
			allSubjects = append(allSubjects, subjectCopy)
		}
	}

	// Replicate P4-P7 subjects for P5, P6, and P7
	for _, subject := range p47Subjects {
		allSubjects = append(allSubjects, subject)
		for _, level := range []string{"P5", "P6", "P7"} {
			subjectCopy := subject
			subjectCopy.Level = level
			allSubjects = append(allSubjects, subjectCopy)
		}
	}

	// Replicate S1-S2 compulsory subjects for S2, S3, and S4
	for _, subject := range s12Compulsory {
		allSubjects = append(allSubjects, subject)
		for _, level := range []string{"S2", "S3", "S4"} {
			subjectCopy := subject
			subjectCopy.Level = level
			allSubjects = append(allSubjects, subjectCopy)
		}
	}

	// Replicate S1-S4 electives for S2, S3, and S4
	for _, subject := range s14Electives {
		allSubjects = append(allSubjects, subject)
		for _, level := range []string{"S2", "S3", "S4"} {
			subjectCopy := subject
			subjectCopy.Level = level
			allSubjects = append(allSubjects, subjectCopy)
		}
	}

	// Replicate S5-S6 subjects for S6
	for _, subject := range s56Principal {
		allSubjects = append(allSubjects, subject)
		subjectCopy := subject
		subjectCopy.Level = "S6"
		allSubjects = append(allSubjects, subjectCopy)
	}

	for _, subject := range s56Subsidiary {
		allSubjects = append(allSubjects, subject)
		subjectCopy := subject
		subjectCopy.Level = "S6"
		allSubjects = append(allSubjects, subjectCopy)
	}

	// Batch insert all subjects
	if err := db.CreateInBatches(allSubjects, 100).Error; err != nil {
		log.Fatal("Failed to seed standard subjects:", err)
	}

}

func addMissingSubjects(db *gorm.DB) {
	log.Println("🔍 Checking for missing subjects...")

	// Define missing subjects (Leb Acoli and Luganda)
	missingSubjects := []models.StandardSubject{
		// S1-S4 Electives
		{Name: "Leb Acoli", Code: "ACOLI", Level: "S1", IsCompulsory: false, Papers: 1, GradingType: "ncdc", Description: "Leb Acoli language"},
		{Name: "Luganda", Code: "LUG", Level: "S1", IsCompulsory: false, Papers: 1, GradingType: "ncdc", Description: "Luganda language"},
		{Name: "Leb Acoli", Code: "ACOLI", Level: "S2", IsCompulsory: false, Papers: 1, GradingType: "ncdc", Description: "Leb Acoli language"},
		{Name: "Luganda", Code: "LUG", Level: "S2", IsCompulsory: false, Papers: 1, GradingType: "ncdc", Description: "Luganda language"},
		{Name: "Leb Acoli", Code: "ACOLI", Level: "S3", IsCompulsory: false, Papers: 1, GradingType: "ncdc", Description: "Leb Acoli language"},
		{Name: "Luganda", Code: "LUG", Level: "S3", IsCompulsory: false, Papers: 1, GradingType: "ncdc", Description: "Luganda language"},
		{Name: "Leb Acoli", Code: "ACOLI", Level: "S4", IsCompulsory: false, Papers: 1, GradingType: "ncdc", Description: "Leb Acoli language"},
		{Name: "Luganda", Code: "LUG", Level: "S4", IsCompulsory: false, Papers: 1, GradingType: "ncdc", Description: "Luganda language"},
		// S5-S6 Principal Subjects
		{Name: "Leb Acoli", Code: "ACOLI", Level: "S5", IsCompulsory: false, Papers: 2, GradingType: "uneb", Description: "Leb Acoli language and literature"},
		{Name: "Leb Acoli", Code: "ACOLI", Level: "S6", IsCompulsory: false, Papers: 2, GradingType: "uneb", Description: "Leb Acoli language and literature"},
	}

	addedCount := 0
	skippedCount := 0

	for _, subject := range missingSubjects {
		// Check if subject already exists
		var existing models.StandardSubject
		if err := db.Where("code = ? AND level = ?", subject.Code, subject.Level).First(&existing).Error; err == nil {
			log.Printf("   ⏭️  Skipped: %s (%s) at level %s - already exists", subject.Name, subject.Code, subject.Level)
			skippedCount++
			continue
		}

		// Add the subject
		if err := db.Create(&subject).Error; err != nil {
			log.Printf("   ❌ Failed to add %s (%s) at level %s: %v", subject.Name, subject.Code, subject.Level, err)
			continue
		}

		log.Printf("   ✅ Added: %s (%s) at level %s - %d papers", subject.Name, subject.Code, subject.Level, subject.Papers)
		addedCount++
	}

	log.Printf("\n" + "============================================================")
	log.Printf("📊 Summary:")
	log.Printf("   ✅ Added: %d subjects", addedCount)
	log.Printf("   ⏭️  Skipped (already exist): %d subjects", skippedCount)
	log.Printf("============================================================")
	log.Println("✨ Missing subjects check completed!")
}

func seedStandardFeeTypes(db *gorm.DB) {
	log.Println("Seeding standard fee types...")

	feeTypeService := services.NewStandardFeeTypeService(db)
	if err := feeTypeService.SeedStandardFeeTypes(); err != nil {
		log.Fatal("Failed to seed standard fee types:", err)
	}

	log.Println("Standard fee types seeded successfully")
}


func migrateUsersToStaff(db *gorm.DB) {
	log.Println("🔍 Starting migration: Creating staff records for users without staff records...")

	// Find all users who don't have staff records (excluding system_admin and parent)
	var usersWithoutStaff []models.User
	err := db.Where("role NOT IN (?, ?) AND id NOT IN (SELECT user_id FROM staff WHERE user_id IS NOT NULL)", 
		"system_admin", "parent").
		Preload("School").
		Find(&usersWithoutStaff).Error

	if err != nil {
		log.Fatal("Failed to query users:", err)
	}

	if len(usersWithoutStaff) == 0 {
		log.Println("✅ No users found without staff records. Migration not needed.")
		return
	}

	log.Printf("📋 Found %d users without staff records:\n", len(usersWithoutStaff))

	successCount := 0
	errorCount := 0

	for _, user := range usersWithoutStaff {
		log.Printf("\n👤 Processing user: %s (%s) - Role: %s", user.FullName, user.Email, user.Role)

		// Parse full name into first, middle, last
		firstName, middleName, lastName := parseFullName(user.FullName)

		// Map user role to staff role
		staffRole := mapUserRoleToStaffRole(user.Role)

		// Generate school initials from school name
		var schoolInitials string
		if user.School != nil {
			for _, word := range strings.Fields(user.School.Name) {
				if len(word) > 0 {
					schoolInitials += strings.ToUpper(string(word[0]))
				}
			}
		}
		if schoolInitials == "" {
			schoolInitials = "SCH"
		}

		// Generate employee ID with format: SCHOOLINITIALS/STF/YEAR/SEQUENCE
		currentYear := time.Now().Year()
		pattern := fmt.Sprintf("%s/STF/%d/%%", schoolInitials, currentYear)
		
		var lastStaff models.Staff
		var sequence int = 0
		if err := db.Where("school_id = ? AND employee_id LIKE ?", user.SchoolID, pattern).
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

		// Create staff record
		staff := models.Staff{
			SchoolID:   *user.SchoolID,
			UserID:     &user.ID,
			EmployeeID: employeeID,
			FirstName:  firstName,
			MiddleName: middleName,
			LastName:   lastName,
			Email:      user.Email,
			Phone:      "0700000000", // Default phone
			Role:       staffRole,
			Status:     "active",
			Nationality: "Ugandan",
			EmploymentType: "Permanent",
		}

		if err := db.Create(&staff).Error; err != nil {
			log.Printf("   ❌ Failed to create staff record: %v", err)
			errorCount++
			continue
		}

		// Create TeacherProfile if role is Teacher
		if staffRole == "Teacher" {
			teacherProfile := models.TeacherProfile{
				StaffID:  staff.ID,
				SchoolID: staff.SchoolID,
			}
			if err := db.Create(&teacherProfile).Error; err != nil {
				log.Printf("   ⚠️  Staff created but failed to create teacher profile: %v", err)
			} else {
				log.Printf("   ✅ Created staff record (ID: %s) and teacher profile", employeeID)
			}
		} else {
			log.Printf("   ✅ Created staff record (ID: %s)", employeeID)
		}

		successCount++
	}

	log.Printf("\n" + "============================================================")
	log.Printf("📊 Migration Summary:")
	log.Printf("   ✅ Successfully migrated: %d users", successCount)
	if errorCount > 0 {
		log.Printf("   ❌ Failed: %d users", errorCount)
	}
	log.Printf("============================================================")
	log.Println("✨ Migration completed!")
}

func parseFullName(fullName string) (firstName, middleName, lastName string) {
	parts := strings.Fields(fullName)
	
	if len(parts) == 0 {
		return "Unknown", "", "User"
	} else if len(parts) == 1 {
		return parts[0], "", ""
	} else if len(parts) == 2 {
		return parts[0], "", parts[1]
	} else {
		// First name, middle names, last name
		firstName = parts[0]
		lastName = parts[len(parts)-1]
		middleName = strings.Join(parts[1:len(parts)-1], " ")
		return firstName, middleName, lastName
	}
}

func mapUserRoleToStaffRole(userRole string) string {
	roleMap := map[string]string{
		"teacher":      "Teacher",
		"bursar":       "Bursar",
		"librarian":    "Librarian",
		"nurse":        "Nurse",
		"store_keeper": "Store Keeper",
		"school_admin": "Admin",
		"security":     "Security",
		"cleaner":      "Cleaner",
		"cook":         "Cook",
		"driver":       "Driver",
		"gardener":     "Gardener",
		"maintenance":  "Maintenance",
		"receptionist": "Receptionist",
	}

	if staffRole, ok := roleMap[userRole]; ok {
		return staffRole
	}

	// Default: capitalize first letter
	if len(userRole) > 0 {
		return strings.ToUpper(string(userRole[0])) + userRole[1:]
	}

	return "Staff"
}
