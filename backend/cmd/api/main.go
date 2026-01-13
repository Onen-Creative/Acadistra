package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/school-system/backend/internal/config"
	"github.com/school-system/backend/internal/database"
	"github.com/school-system/backend/internal/handlers"
	"github.com/school-system/backend/internal/middleware"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
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
		allowedOrigins := []string{"http://localhost:5173", "http://localhost:5174", "https://report-card-system.netlify.app"}
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
				break
			}
		}
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

	// Metrics
	if cfg.Monitoring.PrometheusEnabled {
		r.GET("/metrics", gin.WrapH(promhttp.Handler()))
	}

	// Swagger
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Services
	authService := services.NewAuthService(db, cfg)

	// Handlers
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(db, authService)
	schoolHandler := handlers.NewSchoolHandler(db)
	classHandler := handlers.NewClassHandler(db)
	studentHandler := handlers.NewStudentHandler(db)
	guardianHandler := handlers.NewGuardianHandler(db)
	registrationHandler := handlers.NewRegistrationHandler(db)
	subjectHandler := handlers.NewSubjectHandler(db)
	resultHandler := handlers.NewResultHandler(db)
	uploadHandler := handlers.NewUploadHandler(db)
	auditHandler := handlers.NewAuditHandler(db)
	feesHandler := handlers.NewFeesHandler(db)
	libraryHandler := handlers.NewLibraryHandler(db)
	teacherHandler := handlers.NewTeacherHandler(db)
	websocketHandler := handlers.NewWebSocketHandler(authService)

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
				sysAdmin.PUT("/schools/:id", schoolHandler.Update)
				sysAdmin.DELETE("/schools/:id", schoolHandler.Delete)
				sysAdmin.GET("/stats", schoolHandler.GetStats)

				// Standard subject management
				sysAdmin.GET("/standard-subjects", subjectHandler.ListStandardSubjects)
				sysAdmin.POST("/standard-subjects", subjectHandler.CreateStandardSubject)
				sysAdmin.PUT("/standard-subjects/:id", subjectHandler.UpdateStandardSubject)
				sysAdmin.DELETE("/standard-subjects/:id", subjectHandler.DeleteStandardSubject)

				// Audit logs
				sysAdmin.GET("/audit/recent", auditHandler.GetRecentActivity)

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
			}

			// Shared routes for school_admin, teacher, librarian, nurse, and bursar
			shared := protected.Group("")
			shared.Use(func(c *gin.Context) {
				userRole := c.GetString("user_role")
				if userRole != "school_admin" && userRole != "teacher" && userRole != "librarian" && userRole != "nurse" && userRole != "bursar" && userRole != "system_admin" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
					c.Abort()
					return
				}
				c.Next()
			})
			{
				shared.GET("/teachers", teacherHandler.List)
				shared.GET("/students", studentHandler.List)
			}

			// School Admin routes
			schoolAdmin := protected.Group("")
			schoolAdmin.Use(middleware.RequireSchoolAdmin())
			{
				// User management - School admin can create all users except system_admin
				schoolAdmin.POST("/school-users", userHandler.CreateSchoolUser)
				schoolAdmin.GET("/school-users", userHandler.ListSchoolUsers)
				schoolAdmin.PUT("/school-users/:id", userHandler.UpdateSchoolUser)
				schoolAdmin.DELETE("/school-users/:id", userHandler.DeleteSchoolUser)
				
				// School dashboard summary
				schoolAdmin.GET("/dashboard/summary", schoolHandler.GetSchoolSummary)
				
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
				
				// Teacher management (admin only for create/update/delete)
				schoolAdmin.POST("/teachers", teacherHandler.Create)
				schoolAdmin.GET("/teachers/:id", teacherHandler.Get)
				schoolAdmin.PUT("/teachers/:id", teacherHandler.Update)
				schoolAdmin.DELETE("/teachers/:id", teacherHandler.Delete)
				
				// Results management
				schoolAdmin.DELETE("/results/:id", resultHandler.Delete)
			}

			// Bursar routes
			bursar := protected.Group("")
			bursar.Use(func(c *gin.Context) {
				userRole := c.GetString("user_role")
				if userRole != "bursar" && userRole != "school_admin" && userRole != "system_admin" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
					c.Abort()
					return
				}
				c.Next()
			})
			{
				bursar.GET("/fees", feesHandler.ListStudentFees)
				bursar.POST("/fees", feesHandler.CreateOrUpdateStudentFees)
				bursar.GET("/fees/:id", feesHandler.GetStudentFeesDetails)
				bursar.DELETE("/fees/:id", feesHandler.DeleteStudentFees)
				bursar.POST("/fees/payment", feesHandler.RecordPayment)
				bursar.GET("/fees/reports", feesHandler.GetReportData)
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

			// Nurse routes - FULL ACCESS (includes summary for their dashboard)
			nurse := protected.Group("/clinic")
			nurse.Use(func(c *gin.Context) {
				userRole := c.GetString("user_role")
				if userRole != "nurse" && userRole != "school_admin" && userRole != "system_admin" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
					c.Abort()
					return
				}
				c.Next()
			})
			{
				clinicHandler := handlers.NewClinicHandler(db)
				
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
			protected.GET("/schools", schoolHandler.List)
			protected.GET("/schools/:id", schoolHandler.Get)
			protected.GET("/school/levels", schoolHandler.GetSchoolLevels)
			protected.GET("/classes", classHandler.List)
			protected.GET("/classes/levels", classHandler.GetLevels)
			protected.GET("/classes/:id", classHandler.Get)
			protected.GET("/classes/:id/students", classHandler.GetStudents)
			protected.GET("/students/:id", studentHandler.Get)
			protected.GET("/students/:id/results", resultHandler.GetByStudent)
			protected.GET("/subjects", subjectHandler.ListStandardSubjects)
			protected.GET("/subjects/levels", subjectHandler.GetLevels)
			protected.POST("/results", resultHandler.CreateOrUpdate)
			protected.POST("/debug/results", func(c *gin.Context) {
				var body map[string]interface{}
				c.ShouldBindJSON(&body)
				c.JSON(200, gin.H{"received": body, "headers": c.Request.Header})
			})
			protected.POST("/upload/logo", uploadHandler.UploadLogo)
		}
	}

	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("Server starting on %s", addr)
	if err := r.Run(addr); err != nil {
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

	default:
		log.Printf("Unknown command: %s", cmd)
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
		Email:    "sysadmin@school.ug",
		FullName: "System Administrator",
		Role:     "system_admin",
		IsActive: true,
	}

	if err := authService.CreateUser(sysAdmin, "Admin@123"); err != nil {
		log.Fatal("Failed to create system admin:", err)
	}

	log.Println("System Admin: sysadmin@school.ug / Admin@123")

	// Create default school
	var school models.School
	if err := db.First(&school).Error; err != nil {
		school = models.School{
			Name:         "Nabumali Secondary School",
			Type:         "Secondary",
			Address:      "Nabumali, Mbale District",
			Country:      "Uganda",
			Region:       "Eastern",
			ContactEmail: "nabumalisecondaryschool@gmail.com",
			Phone:        "+256-782-390-592",
			LogoURL:      "https://picsum.photos/150",
			Motto:        "Excellence Through Discipline",
			Config:       models.JSONB{"levels": []string{"S1", "S2", "S3", "S4", "S5", "S6"}},
		}
		db.Create(&school)
	}

	// Create school admin assigned to the school
	schoolAdmin := &models.User{
		SchoolID: &school.ID,
		Email:    "schooladmin@school.ug",
		FullName: "School Administrator",
		Role:     "school_admin",
		IsActive: true,
	}

	if err := authService.CreateUser(schoolAdmin, "Admin@123"); err != nil {
		log.Fatal("Failed to create school admin:", err)
	}

	log.Println("School Admin: schooladmin@school.ug / Admin@123")

	// Create teacher assigned to the school
	teacher := &models.User{
		SchoolID: &school.ID,
		Email:    "teacher@school.ug",
		FullName: "Teacher",
		Role:     "teacher",
		IsActive: true,
	}

	if err := authService.CreateUser(teacher, "Teacher@123"); err != nil {
		log.Fatal("Failed to create teacher:", err)
	}

	log.Println("Teacher: teacher@school.ug / Teacher@123")

	// Create bursar assigned to the school
	bursar := &models.User{
		SchoolID: &school.ID,
		Email:    "bursar@school.ug",
		FullName: "School Bursar",
		Role:     "bursar",
		IsActive: true,
	}

	if err := authService.CreateUser(bursar, "Bursar@123"); err != nil {
		log.Fatal("Failed to create bursar:", err)
	}

	log.Println("Bursar: bursar@school.ug / Bursar@123")

	// Create librarian assigned to the school
	var existingLibrarian models.User
	if err := db.Where("email = ?", "librarian@school.ug").First(&existingLibrarian).Error; err == nil {
		log.Println("Librarian already exists")
	} else {
		librarian := &models.User{
			SchoolID: &school.ID,
			Email:    "librarian@school.ug",
			FullName: "School Librarian",
			Role:     "librarian",
			IsActive: true,
		}

		if err := authService.CreateUser(librarian, "Librarian@123"); err != nil {
			log.Fatal("Failed to create librarian:", err)
		}

		log.Println("Librarian: librarian@school.ug / Librarian@123")
	}

	// Create nurse assigned to the school
	var existingNurse models.User
	if err := db.Where("email = ?", "nurse@school.ug").First(&existingNurse).Error; err == nil {
		log.Println("Nurse already exists")
	} else {
		nurse := &models.User{
			SchoolID: &school.ID,
			Email:    "nurse@school.ug",
			FullName: "School Nurse",
			Role:     "nurse",
			IsActive: true,
		}

		if err := authService.CreateUser(nurse, "Nurse@123"); err != nil {
			log.Fatal("Failed to create nurse:", err)
		}

		log.Println("Nurse: nurse@school.ug / Nurse@123")
	}
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
		{Name: "Language & Early Literacy", Code: "LEL", Level: "Nursery", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Language development and early literacy skills"},
		{Name: "Early Numeracy", Code: "EN", Level: "Nursery", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Basic number concepts and mathematical thinking"},
		{Name: "Social & Emotional Development", Code: "SED", Level: "Nursery", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Social skills and emotional development"},
		{Name: "Creative Arts", Code: "CA", Level: "Nursery", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Music, drama, and art activities"},
		{Name: "Physical & Motor Skills", Code: "PMS", Level: "Nursery", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Physical development and motor skills"},
		{Name: "Health, Hygiene & Nutrition", Code: "HHN", Level: "Nursery", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Health awareness and hygiene practices"},
		{Name: "Play & Environmental Awareness", Code: "PEA", Level: "Nursery", IsCompulsory: true, Papers: 1, GradingType: "nursery", Description: "Environmental awareness through play"},
	}

	// P1-P3 Thematic Subjects
	p13Subjects := []models.StandardSubject{
		{Name: "Literacy", Code: "LIT", Level: "P1", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Reading, writing, and communication skills"},
		{Name: "Numeracy", Code: "NUM", Level: "P1", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Basic mathematical concepts and problem solving"},
		{Name: "Life Skills", Code: "LS", Level: "P1", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Personal and social life skills"},
		{Name: "Creative Arts", Code: "CA", Level: "P1", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Creative expression through arts"},
		{Name: "Environment", Code: "ENV", Level: "P1", IsCompulsory: true, Papers: 1, GradingType: "primary_lower", Description: "Environmental awareness and science concepts"},
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

	log.Printf("Successfully seeded %d standard subjects", len(allSubjects))
}