package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/handlers"
	"github.com/school-system/backend/internal/middleware"
	"github.com/school-system/backend/internal/services"
)

func setupProtectedRoutes(v1 *gin.RouterGroup, deps *Dependencies) {
	// Template downloads - MUST be set up BEFORE protected middleware
	// This allows query token authentication for file downloads
	templateDL := v1.Group("/import/templates")
	templateDL.Use(middleware.AllowQueryToken())
	templateDL.Use(middleware.AuthMiddleware(deps.AuthService))
	templateDL.Use(middleware.TenantMiddleware())
	templateDL.Use(func(c *gin.Context) {
		userRole := c.GetString("user_role")
		allowedRoles := []string{"teacher", "school_admin", "dos", "director_of_studies", "system_admin"}
		allowed := false
		for _, role := range allowedRoles {
			if userRole == role {
				allowed = true
				break
			}
		}
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			c.Abort()
			return
		}
		c.Next()
	})

	bulkImportXLSXHandler := handlers.NewBulkImportXLSXHandler(newBulkImportXLSXService(deps))
	templateDL.GET("/students", bulkImportXLSXHandler.DownloadStudentTemplate)
	templateDL.GET("/marks", bulkImportXLSXHandler.DownloadMarksTemplate)

	// Protected routes base
	protected := v1.Group("")
	protected.Use(middleware.AuthMiddleware(deps.AuthService))
	protected.Use(middleware.AuditLogger(deps.DB))
	protected.Use(middleware.TenantMiddleware())

	// System Admin only routes
	setupSystemAdminRoutes(protected, deps)

	// School Admin routes
	setupSchoolAdminRoutes(protected, deps)

	// Shared routes (multiple roles can access)
	setupSharedRoutes(protected, deps)

	// Parent routes
	setupParentRoutes(protected, deps)

	// Teacher/DOS routes
	setupTeacherRoutes(protected, deps)

	// Bursar routes
	setupBursarRoutes(protected, deps)

	// Librarian routes
	setupLibrarianRoutes(protected, deps)

	// Nurse routes
	setupNurseRoutes(protected, deps)

	// Inventory routes
	setupInventoryRoutes(protected, deps)

	// Common protected routes (all authenticated users)
	setupCommonProtectedRoutes(protected, deps)

	// Payment routes (special handling)
	setupPaymentRoutes(v1, deps)
}

func setupSystemAdminRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	sysAdmin := protected.Group("")
	sysAdmin.Use(middleware.RequireSystemAdmin())

	// Initialize handlers
	userHandler := handlers.NewUserHandler(newUserService(deps))
	schoolHandler := handlers.NewSchoolHandler(newSchoolService(deps), services.NewSchoolSetupService(deps.DB), newAuditService(deps))
	subjectHandler := handlers.NewSubjectHandler(newSubjectService(deps), services.NewStandardSubjectService(deps.DB))
	standardFeeTypeHandler := handlers.NewStandardFeeTypeHandler(newStandardFeeTypeService(deps))
	auditHandler := handlers.NewAuditHandler(newAuditService(deps))
	monitoringHandler := handlers.NewSystemMonitoringHandler(deps.MonitoringService)
	settingsHandler := handlers.NewSettingsHandler(newSettingsService(deps))
	emailMonitorHandler := handlers.NewEmailMonitorHandler(deps.EmailService)
	systemReportsHandler := handlers.NewSystemReportsHandler(newSystemReportsService(deps))
	resultHandler := handlers.NewResultHandler(newResultService(deps))

	// User management
	sysAdmin.GET("/users", userHandler.List)
	sysAdmin.POST("/users", userHandler.Create)
	sysAdmin.GET("/users/:id", userHandler.Get)
	sysAdmin.PUT("/users/:id", userHandler.Update)
	sysAdmin.DELETE("/users/:id", userHandler.Delete)

	// School management
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

	// Standard fee types
	sysAdmin.GET("/standard-fee-types", standardFeeTypeHandler.GetAllFeeTypes)
	sysAdmin.GET("/standard-fee-types/by-level", standardFeeTypeHandler.GetFeeTypesByLevel)
	sysAdmin.GET("/standard-fee-types/by-category", standardFeeTypeHandler.GetFeeTypesByCategory)
	sysAdmin.GET("/standard-fee-types/compulsory", standardFeeTypeHandler.GetCompulsoryFeeTypes)
	sysAdmin.GET("/standard-fee-types/categories", standardFeeTypeHandler.GetFeeTypeCategories)

	// Audit logs
	sysAdmin.GET("/audit/recent", auditHandler.GetRecentActivity)

	// System monitoring
	sysAdmin.GET("/monitoring/active-users", monitoringHandler.GetActiveUsers)
	sysAdmin.GET("/monitoring/audit-logs", monitoringHandler.GetEnhancedAuditLogs)
	sysAdmin.GET("/monitoring/system-stats", monitoringHandler.GetSystemStats)
	sysAdmin.GET("/monitoring/daily-reports", monitoringHandler.GetDailyReports)
	sysAdmin.GET("/monitoring/performance-metrics", monitoringHandler.GetPerformanceMetrics)
	sysAdmin.GET("/monitoring/slowest-endpoints", monitoringHandler.GetSlowestEndpoints)
	sysAdmin.GET("/monitoring/error-analysis", monitoringHandler.GetErrorAnalysis)
	sysAdmin.POST("/monitoring/generate-daily-report", monitoringHandler.GenerateDailyReport)

	// Audit logs with filtering
	sysAdmin.GET("/audit-logs", getAuditLogsHandler(deps.DB))

	// Migration and seeding
	sysAdmin.POST("/migrate", migrateHandler(deps.DB))
	sysAdmin.POST("/seed-admin", seedAdminHandler(deps.DB, deps.Config))
	sysAdmin.POST("/seed-subjects", seedSubjectsHandler(deps.DB))
	sysAdmin.POST("/seed-fee-types", seedFeeTypesHandler(deps.DB))

	// System settings
	sysAdmin.GET("/settings", settingsHandler.GetSettings)
	sysAdmin.PUT("/settings", settingsHandler.UpdateSettings)

	// Email monitoring
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

	// Custom reports
	customReportHandler := handlers.NewCustomReportHandler(services.NewCustomReportService(deps.DB))
	sysAdmin.POST("/reports/custom", customReportHandler.GenerateCustomReport)
	sysAdmin.GET("/reports/custom", customReportHandler.ListReports)
	sysAdmin.GET("/reports/custom/:id", customReportHandler.GetReport)
	sysAdmin.GET("/reports/custom/:id/download", customReportHandler.DownloadReport)
	sysAdmin.DELETE("/reports/custom/:id", customReportHandler.DeleteReport)

	// Backup management
	backupHandler := handlers.NewBackupHandler(services.NewBackupService(deps.DB))
	sysAdmin.POST("/backup/run", backupHandler.RunBackup)
	sysAdmin.GET("/backup/list", backupHandler.ListBackups)
	sysAdmin.GET("/backup/:id", backupHandler.GetBackup)
	sysAdmin.POST("/backup/cleanup", backupHandler.CleanupOldBackups)

	// Grade recalculation
	sysAdmin.POST("/recalculate-grades", resultHandler.RecalculateGrades)
}

func setupSchoolAdminRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	schoolAdmin := protected.Group("")
	schoolAdmin.Use(middleware.RequireSchoolAdmin())

	// Initialize handlers
	bulkMarksHandler := handlers.NewBulkMarksImportHandler(newBulkMarksImportService(deps))
	userHandler := handlers.NewUserHandler(newUserService(deps))
	schoolUserHandler := handlers.NewSchoolUserHandler(newUserAssignmentService(deps))
	schoolHandler := handlers.NewSchoolHandler(newSchoolService(deps), services.NewSchoolSetupService(deps.DB), newAuditService(deps))
	settingsHandler := handlers.NewSettingsHandler(newSettingsService(deps))
	staffHandler := handlers.NewStaffHandler(deps.DB, deps.Config, deps.EmailService)
	resultHandler := handlers.NewResultHandler(newResultService(deps))
	lessonHandler := handlers.NewLessonHandler(newLessonService(deps))
	registrationHandler := handlers.NewRegistrationHandler(newRegistrationService(deps))
	studentHandler := handlers.NewStudentHandler(newStudentService(deps))
	guardianHandler := handlers.NewGuardianHandler(newGuardianService(deps))
	bulkImportXLSXHandler := handlers.NewBulkImportXLSXHandler(newBulkImportXLSXService(deps))
	attendanceHandler := handlers.NewAttendanceHandler(newAttendanceService(deps))

	// Marks import approval
	schoolAdmin.POST("/marks/imports/:id/approve", bulkMarksHandler.ApproveImport)
	schoolAdmin.POST("/marks/imports/:id/reject", bulkMarksHandler.RejectImport)
	// Results management
	schoolAdmin.DELETE("/results/:id", resultHandler.Delete)

	// User management (no module restriction)
	schoolAdmin.POST("/school-users", userHandler.CreateSchoolUser)
	schoolAdmin.GET("/school-users", userHandler.ListSchoolUsers)
	schoolAdmin.GET("/school-users/:id", userHandler.GetSchoolUser)
	schoolAdmin.PUT("/school-users/:id", userHandler.UpdateSchoolUser)
	schoolAdmin.DELETE("/school-users/:id", userHandler.DeleteSchoolUser)
	schoolAdmin.POST("/school-users/:id/reset-password", userHandler.ResetUserPassword)

	// Create specific user roles (no module restriction)
	schoolAdmin.POST("/schools/:id/teachers", schoolUserHandler.CreateTeacher)
	schoolAdmin.POST("/schools/:id/store-keepers", schoolUserHandler.CreateStoreKeeper)
	schoolAdmin.GET("/schools/:id/users", schoolUserHandler.GetSchoolUsers)

	// School dashboard (no module restriction)
	schoolAdmin.GET("/dashboard/summary", schoolHandler.GetSchoolSummary)

	// School settings (no module restriction)
	schoolAdmin.GET("/school-settings", settingsHandler.GetSchoolSettings)
	schoolAdmin.PUT("/school-settings", settingsHandler.UpdateSchoolSettings)

	// Staff management
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

	// Payroll management (School Admin and Bursar)
	payroll := protected.Group("")
	payroll.Use(func(c *gin.Context) {
		userRole := c.GetString("user_role")
		allowedRoles := []string{"school_admin", "bursar", "system_admin"}
		allowed := false
		for _, role := range allowedRoles {
			if userRole == role {
				allowed = true
				break
			}
		}
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			c.Abort()
			return
		}
		c.Next()
	})
	payrollHandler := handlers.NewPayrollHandler(deps.PayrollService, deps.EmailService)
	payroll.POST("/payroll/salary-structures", payrollHandler.CreateSalaryStructure)
	payroll.PUT("/payroll/salary-structures/:id", payrollHandler.UpdateSalaryStructure)
	payroll.DELETE("/payroll/salary-structures/:id", payrollHandler.DeleteSalaryStructure)
	payroll.GET("/payroll/salary-structures", payrollHandler.ListSalaryStructures)
	payroll.GET("/payroll/salary-structures/user/:user_id", payrollHandler.GetSalaryStructure)
	payroll.POST("/payroll/process", payrollHandler.ProcessPayroll)
	payroll.GET("/payroll/runs", payrollHandler.ListPayrollRuns)
	payroll.GET("/payroll/runs/:id", payrollHandler.GetPayrollRun)
	payroll.POST("/payroll/payments/:id/mark-paid", payrollHandler.MarkPaymentPaid)
	payroll.GET("/payroll/payslip/:payment_id", payrollHandler.GetPayslip)
	payroll.GET("/payroll/summary/:year", payrollHandler.GetPayrollSummary)

	// School Admin and DOS routes
	schoolAdminOrDOS := protected.Group("")
	schoolAdminOrDOS.Use(middleware.RequireDOS())
	{
		// Lesson Monitoring
		schoolAdminOrDOS.POST("/lessons", lessonHandler.CreateLesson)
		schoolAdminOrDOS.GET("/lessons", lessonHandler.ListLessons)
		schoolAdminOrDOS.GET("/lessons/:id", lessonHandler.GetLesson)
		schoolAdminOrDOS.PUT("/lessons/:id", lessonHandler.UpdateLesson)
		schoolAdminOrDOS.DELETE("/lessons/:id", lessonHandler.DeleteLesson)
		schoolAdminOrDOS.GET("/lessons/stats", lessonHandler.GetStats)
		schoolAdminOrDOS.GET("/lessons/export", lessonHandler.ExportReport)
		schoolAdminOrDOS.GET("/lessons/subjects", lessonHandler.GetSchoolSubjects)
		schoolAdminOrDOS.GET("/lessons/teachers", lessonHandler.GetSchoolTeachers)

		// Student management
		schoolAdminOrDOS.POST("/students", registrationHandler.RegisterStudent)
		schoolAdminOrDOS.PUT("/students/:id", studentHandler.Update)
		schoolAdminOrDOS.DELETE("/students/:id", studentHandler.Delete)
		schoolAdminOrDOS.POST("/students/:id/promote", studentHandler.PromoteOrDemote)

		// Guardian management
		schoolAdminOrDOS.POST("/guardians", guardianHandler.Create)
		schoolAdminOrDOS.GET("/guardians", guardianHandler.List)
		schoolAdminOrDOS.GET("/guardians/:id", guardianHandler.Get)
		schoolAdminOrDOS.PUT("/guardians/:id", guardianHandler.Update)
		schoolAdminOrDOS.DELETE("/guardians/:id", guardianHandler.Delete)

		// Student import
		schoolAdminOrDOS.POST("/import/students/upload", bulkImportXLSXHandler.UploadStudents)

		// Import management
		schoolAdminOrDOS.GET("/import/list", bulkImportXLSXHandler.ListImports)
		schoolAdminOrDOS.GET("/import/:id", bulkImportXLSXHandler.GetImportDetails)
		schoolAdminOrDOS.POST("/import/:id/approve", bulkImportXLSXHandler.ApproveImport)
		schoolAdminOrDOS.POST("/import/:id/reject", bulkImportXLSXHandler.RejectImport)
	}

	// Calendar management
	schoolAdmin.POST("/calendar/holidays", attendanceHandler.AddHoliday)
	schoolAdmin.DELETE("/calendar/holidays/:id", attendanceHandler.DeleteHoliday)

	// SMS management
	smsHandler := handlers.NewSMSHandler(deps.DB)
	schoolAdmin.POST("/sms/send", smsHandler.SendSMS)
	schoolAdmin.POST("/sms/bulk", smsHandler.SendBulkSMS)
	schoolAdmin.GET("/sms/queue", smsHandler.GetSMSQueue)
	schoolAdmin.GET("/sms/batches", smsHandler.GetSMSBatches)
	schoolAdmin.GET("/sms/logs", smsHandler.GetSMSLogs)
	schoolAdmin.GET("/sms/stats", smsHandler.GetSMSStats)
	schoolAdmin.POST("/sms/templates", smsHandler.CreateTemplate)
	schoolAdmin.GET("/sms/templates", smsHandler.GetTemplates)
	schoolAdmin.POST("/sms/provider", smsHandler.ConfigureProvider)
	schoolAdmin.GET("/sms/provider", smsHandler.GetProvider)

	// Analytics routes
	analyticsService := services.NewAnalyticsService(deps.DB)
	exportService := services.NewAnalyticsExportService(analyticsService)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService, exportService)
	schoolAdmin.GET("/analytics/student/:student_id", analyticsHandler.GetStudentAnalytics)
	schoolAdmin.GET("/analytics/grade", analyticsHandler.GetGradeAnalytics)
	schoolAdmin.GET("/analytics/grade/export", analyticsHandler.ExportGradeAnalytics)
}
