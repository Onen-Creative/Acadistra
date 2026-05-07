package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/handlers"
	"github.com/school-system/backend/internal/middleware"
	"github.com/school-system/backend/internal/services"
)

func setupSharedRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	// Shared routes for school_admin, teacher, librarian, nurse, bursar, dos, director_of_studies, and parent
	shared := protected.Group("")
	shared.Use(func(c *gin.Context) {
		userRole := c.GetString("user_role")
		allowedRoles := []string{"school_admin", "teacher", "librarian", "nurse", "bursar", "dos", "director_of_studies", "parent", "system_admin"}
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

	studentHandler := handlers.NewStudentHandler(newStudentService(deps))
	studentExportHandler := handlers.NewStudentExportHandler(newStudentExportService(deps))
	teacherExportHandler := handlers.NewTeacherExportHandler(newTeacherExportService(deps))
	staffHandler := handlers.NewStaffHandler(deps.DB, deps.Config, deps.EmailService)
	schoolHandler := handlers.NewSchoolHandler(newSchoolService(deps), services.NewSchoolSetupService(deps.DB), newAuditService(deps))

	shared.GET("/students", studentHandler.List)
	shared.GET("/students/export", studentExportHandler.ExportStudents)
	shared.GET("/teachers/export", teacherExportHandler.ExportTeachers)
	shared.GET("/staff", staffHandler.GetAllStaff)
	shared.GET("/school", schoolHandler.GetMySchool)
}

func setupParentRoutes(protected *gin.RouterGroup, deps *Dependencies) {
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

	parentHandler := handlers.NewParentHandler(newParentService(deps))

	parent.GET("/dashboard", parentHandler.GetDashboardSummary)
	parent.GET("/children/:student_id", parentHandler.GetChildDetails)
	parent.GET("/children/:student_id/attendance", parentHandler.GetChildAttendance)
	parent.GET("/children/:student_id/results", parentHandler.GetChildResults)
	parent.GET("/children/:student_id/fees", parentHandler.GetChildFees)
	parent.GET("/children/:student_id/health", parentHandler.GetChildHealth)
	parent.GET("/children/:student_id/report-card", parentHandler.GetChildReportCard)
	parent.GET("/children/:student_id/timetable", parentHandler.GetChildTimetable)
}

func setupTeacherRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	// Marks import - Teachers, DOS, and School Admins
	teacherOrAdmin := protected.Group("")
	teacherOrAdmin.Use(func(c *gin.Context) {
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

	bulkMarksHandler := handlers.NewBulkMarksImportHandler(newBulkMarksImportService(deps))
	examMarksHandler := handlers.NewBulkExamMarksImportHandler(newBulkExamMarksImportService(deps))
	aoiMarksHandler := handlers.NewBulkAOIMarksImportHandler(newBulkAOIMarksImportService(deps))
	caMarksHandler := handlers.NewBulkCAMarksImportHandler(services.NewBulkCAMarksService(deps.DB))
	marksExportHandler := handlers.NewMarksExportHandler(newMarksExportService(deps))

	// Legacy bulk marks import
	teacherOrAdmin.POST("/marks/bulk-import", bulkMarksHandler.UploadMarksForApproval)
	teacherOrAdmin.GET("/marks/imports", bulkMarksHandler.ListImports)
	teacherOrAdmin.GET("/marks/imports/:id", bulkMarksHandler.GetImportDetails)
	teacherOrAdmin.GET("/marks/import-template", bulkMarksHandler.DownloadTemplate)

	// Exam marks import
	teacherOrAdmin.POST("/marks/exam-validate", examMarksHandler.ValidateExamMarks)
	teacherOrAdmin.POST("/marks/exam-import", examMarksHandler.UploadExamMarksForApproval)
	teacherOrAdmin.GET("/marks/exam-template", examMarksHandler.DownloadExamMarksTemplate)

	// AOI marks import
	teacherOrAdmin.POST("/marks/aoi-validate", aoiMarksHandler.ValidateAOIMarks)
	teacherOrAdmin.POST("/marks/aoi-import", aoiMarksHandler.UploadAOIMarks)
	teacherOrAdmin.GET("/marks/aoi-template", aoiMarksHandler.DownloadAOIMarksTemplate)

	// CA marks import
	teacherOrAdmin.POST("/marks/ca-validate", caMarksHandler.ValidateCAMarks)
	teacherOrAdmin.POST("/marks/ca-import", caMarksHandler.UploadCAMarksForApproval)
	teacherOrAdmin.GET("/marks/ca-template", caMarksHandler.DownloadCAMarksTemplate)

	teacherOrAdmin.GET("/export/marks", marksExportHandler.ExportClassMarks)
}

func setupBursarRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	bursar := protected.Group("")
	bursar.Use(func(c *gin.Context) {
		userRole := c.GetString("user_role")
		allowedRoles := []string{"bursar", "school_admin", "parent", "system_admin"}
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

	feesHandler := handlers.NewFeesHandler(newFeesService(deps))
	financeHandler := handlers.NewFinanceHandler(newFinanceService(deps))
	schoolPayHandler := handlers.NewSchoolPayHandler(services.NewSchoolPayService(deps.DB))

	// Fees routes
	bursar.GET("/fees", feesHandler.ListStudentFees)
	bursar.POST("/fees", feesHandler.CreateOrUpdateStudentFees)
	bursar.POST("/fees/bulk", feesHandler.BulkCreateFees)
	bursar.PUT("/fees/:id", feesHandler.UpdateStudentFees)
	bursar.GET("/fees/:id", feesHandler.GetStudentFeesDetails)
	bursar.DELETE("/fees/:id", feesHandler.DeleteStudentFees)
	bursar.POST("/fees/payment", feesHandler.RecordPayment)
	bursar.GET("/fees/reports", feesHandler.GetReportData)

	// SchoolPay integration
	bursar.GET("/schoolpay/config", schoolPayHandler.GetConfig)
	bursar.PUT("/schoolpay/config", schoolPayHandler.UpdateConfig)
	bursar.POST("/schoolpay/sync", schoolPayHandler.SyncTransactions)
	bursar.POST("/schoolpay/process", schoolPayHandler.ProcessTransactions)
	bursar.GET("/schoolpay/transactions", schoolPayHandler.GetTransactions)

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

	// Budget & Requisitions routes
	budget := protected.Group("")
	budget.Use(func(c *gin.Context) {
		userRole := c.GetString("user_role")
		allowedRoles := []string{"bursar", "school_admin", "system_admin"}
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

	budgetHandler := handlers.NewBudgetHandler(newBudgetRequisitionService(deps))
	requisitionHandler := handlers.NewRequisitionHandler(newBudgetRequisitionService(deps))

	budget.POST("/budgets", budgetHandler.CreateBudget)
	budget.GET("/budgets", budgetHandler.ListBudgets)
	budget.GET("/budgets/:id", budgetHandler.GetBudget)
	budget.GET("/budgets/summary", budgetHandler.GetBudgetSummary)
	budget.PUT("/budgets/:id", budgetHandler.UpdateBudget)
	budget.DELETE("/budgets/:id", budgetHandler.DeleteBudget)

	budget.POST("/requisitions/:id/approve", requisitionHandler.ApproveRequisition)
	budget.POST("/requisitions/:id/reject", requisitionHandler.RejectRequisition)
	budget.POST("/requisitions/:id/mark-paid", requisitionHandler.MarkRequisitionPaid)

	// Requisition routes (all staff can create/view)
	requisitions := protected.Group("")
	requisitions.Use(func(c *gin.Context) {
		userRole := c.GetString("user_role")
		allowedRoles := []string{"bursar", "school_admin", "teacher", "librarian", "nurse", "dos", "director_of_studies", "system_admin"}
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

	requisitions.POST("/requisitions", requisitionHandler.CreateRequisition)
	requisitions.GET("/requisitions", requisitionHandler.ListRequisitions)
	requisitions.GET("/requisitions/:id", requisitionHandler.GetRequisition)
	requisitions.GET("/requisitions/stats", requisitionHandler.GetRequisitionStats)
	requisitions.PUT("/requisitions/:id", requisitionHandler.UpdateRequisition)
	requisitions.DELETE("/requisitions/:id", requisitionHandler.DeleteRequisition)
}

func setupLibrarianRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	librarian := protected.Group("")
	librarian.Use(func(c *gin.Context) {
		userRole := c.GetString("user_role")
		allowedRoles := []string{"librarian", "school_admin", "system_admin"}
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

	libraryHandler := handlers.NewLibraryHandler(newLibraryService(deps))

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

func setupNurseRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	nurse := protected.Group("/clinic")
	nurse.Use(func(c *gin.Context) {
		userRole := c.GetString("user_role")
		allowedRoles := []string{"nurse", "school_admin", "parent", "system_admin"}
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

	clinicHandler := handlers.NewClinicHandler(newClinicService(deps))

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

	// Summary
	nurse.GET("/summary", clinicHandler.GetAdminSummary)
	nurse.GET("/reports", clinicHandler.GetReportData)
}

func setupInventoryRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	inventory := protected.Group("/inventory")
	inventory.Use(func(c *gin.Context) {
		userRole := c.GetString("user_role")
		allowedRoles := []string{"school_admin", "bursar", "storekeeper", "system_admin"}
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

	inventoryHandler := handlers.NewInventoryHandler(newInventoryService(deps))

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

func setupPaymentRoutes(v1 *gin.RouterGroup, deps *Dependencies) {
	paymentHandler := handlers.NewPaymentHandler(
		services.NewMobileMoneyService(deps.DB),
		deps.NotificationService,
		services.NewPaymentService(deps.DB),
	)

	payments := v1.Group("/payments")
	{
		payments.POST("/mobile-money", middleware.AuthMiddleware(deps.AuthService), paymentHandler.InitiateMobileMoneyPayment)
		payments.GET("/:id/verify", middleware.AuthMiddleware(deps.AuthService), paymentHandler.VerifyPayment)
		payments.GET("/student/:student_id/history", middleware.AuthMiddleware(deps.AuthService), paymentHandler.GetPaymentHistory)
		payments.GET("/stats", middleware.AuthMiddleware(deps.AuthService), paymentHandler.GetPaymentStats)
		payments.POST("/webhook", paymentHandler.WebhookCallback)
	}
}

func setupCommonProtectedRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	// Routes accessible by all authenticated users
	userNotificationHandler := handlers.NewUserNotificationHandler(newUserNotificationService(deps))
	notificationHandler := handlers.NewNotificationHandler(deps.NotificationService)
	attendanceHandler := handlers.NewAttendanceHandler(newAttendanceService(deps))
	schoolHandler := handlers.NewSchoolHandler(newSchoolService(deps), services.NewSchoolSetupService(deps.DB), newAuditService(deps))
	classHandler := handlers.NewClassHandler(newClassService(deps))
	studentHandler := handlers.NewStudentHandler(newStudentService(deps))
	resultHandler := handlers.NewResultHandler(newResultService(deps))
	classRankingHandler := handlers.NewClassRankingHandler(newClassRankingService(deps))
	webVitalsHandler := handlers.NewWebVitalsHandler(newWebVitalsService(deps))
	subjectHandler := handlers.NewSubjectHandler(newSubjectService(deps), services.NewStandardSubjectService(deps.DB))
	standardFeeTypeHandler := handlers.NewStandardFeeTypeHandler(newStandardFeeTypeService(deps))
	integrationActivityHandler := handlers.NewIntegrationActivityHandler(newIntegrationActivityService(deps))
	uploadHandler := handlers.NewUploadHandler()
	websocketHandler := handlers.NewWebSocketHandler(deps.AuthService)
	reportsHandler := handlers.NewReportsHandler(newReportsService(deps))
	announcementHandler := handlers.NewAnnouncementHandler(newAnnouncementService(deps))

	// User notifications
	protected.GET("/user-notifications", userNotificationHandler.GetUserNotifications)
	protected.PUT("/user-notifications/:id/read", userNotificationHandler.MarkAsRead)
	protected.GET("/user-notifications/unread-count", userNotificationHandler.GetUnreadCount)

	// Notifications
	protected.GET("/notifications", notificationHandler.GetNotifications)
	protected.GET("/notifications/unread-count", notificationHandler.GetUnreadCount)
	protected.GET("/notifications/preferences", notificationHandler.GetPreferences)
	protected.PUT("/notifications/preferences", notificationHandler.UpdatePreferences)
	protected.PUT("/notifications/:id/read", notificationHandler.MarkAsRead)
	protected.PUT("/notifications/mark-all-read", notificationHandler.MarkAllAsRead)
	protected.DELETE("/notifications/:id", notificationHandler.DeleteNotification)

	// Announcements (System Admin and School Admin only)
	announcements := protected.Group("/announcements")
	announcements.Use(func(c *gin.Context) {
		userRole := c.GetString("user_role")
		if userRole != "system_admin" && userRole != "school_admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			c.Abort()
			return
		}
		c.Next()
	})
	announcements.POST("", announcementHandler.CreateAnnouncement)
	announcements.GET("", announcementHandler.ListAnnouncements)
	announcements.GET("/:id", announcementHandler.GetAnnouncement)
	announcements.POST("/:id/send", announcementHandler.SendAnnouncement)
	announcements.DELETE("/:id", announcementHandler.DeleteAnnouncement)

	// Attendance
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

	// Calendar
	protected.GET("/calendar/holidays", attendanceHandler.GetHolidays)

	// School & Classes
	protected.GET("/classes", classHandler.List)
	protected.POST("/classes", classHandler.Create)
	protected.GET("/classes/:id", classHandler.Get)
	protected.PUT("/classes/:id", classHandler.Update)
	protected.DELETE("/classes/:id", classHandler.Delete)
	protected.GET("/classes/:id/students", classHandler.GetStudents)
	protected.GET("/students/:id", studentHandler.Get)
	protected.GET("/students/:id/results", resultHandler.GetByStudent)
	protected.GET("/results/bulk-marks", resultHandler.GetBulkMarks)
	protected.GET("/results/performance-summary", resultHandler.GetPerformanceSummary)
	protected.GET("/results/exam-types", resultHandler.GetExamTypes)
	protected.POST("/results", resultHandler.CreateOrUpdate)
	protected.GET("/analytics/class-ranking/:class_id", classRankingHandler.GetClassRanking)
	protected.GET("/analytics/class-ranking/:class_id/export", classRankingHandler.ExportClassRanking)
	protected.GET("/analytics/class-ranking/:class_id/terms-years", classRankingHandler.GetAvailableTermsYears)
	protected.GET("/subjects", subjectHandler.ListStandardSubjects)
	protected.GET("/subjects/school", subjectHandler.GetSchoolSubjects)
	protected.GET("/subjects/levels", subjectHandler.GetLevels)
	protected.GET("/integration-activities", integrationActivityHandler.GetByClass)
	protected.POST("/integration-activities", integrationActivityHandler.CreateOrUpdate)

	// School levels (no module restriction)
	protected.GET("/school/levels", schoolHandler.GetSchoolLevels)

	// Fee types
	protected.GET("/fee-types", standardFeeTypeHandler.GetAllFeeTypes)
	protected.GET("/fee-types/by-level", standardFeeTypeHandler.GetFeeTypesByLevel)
	protected.GET("/fee-types/by-category", standardFeeTypeHandler.GetFeeTypesByCategory)
	protected.GET("/fee-types/compulsory", standardFeeTypeHandler.GetCompulsoryFeeTypes)
	protected.GET("/fee-types/categories", standardFeeTypeHandler.GetFeeTypeCategories)

	// Web vitals (no module restriction)
	protected.POST("/analytics/web-vitals", webVitalsHandler.RecordWebVital)
	protected.GET("/analytics/web-vitals/stats", webVitalsHandler.GetWebVitalsStats)

	// Debug endpoint
	protected.POST("/debug/results", func(c *gin.Context) {
		var body map[string]interface{}
		c.ShouldBindJSON(&body)
		c.JSON(200, gin.H{"received": body, "headers": c.Request.Header})
	})

	// Upload endpoints with query token support
	upload := protected.Group("/upload")
	upload.Use(middleware.AllowQueryToken())
	upload.POST("/logo", uploadHandler.UploadLogo)
	upload.POST("/student-photo", uploadHandler.UploadStudentPhoto)

	// WebSocket
	protected.GET("/ws", websocketHandler.HandleWebSocket)

	// Reports (accessible by school admins and system admins)
	protected.GET("/reports/students", reportsHandler.GenerateStudentsReport)
	protected.GET("/reports/staff", reportsHandler.GenerateStaffReport)
	protected.GET("/reports/attendance", reportsHandler.GenerateAttendanceReport)
	protected.GET("/reports/performance", reportsHandler.GeneratePerformanceReport)
}
