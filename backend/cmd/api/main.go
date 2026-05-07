package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/config"
	"github.com/school-system/backend/internal/cron"
	"github.com/school-system/backend/internal/database"
	"github.com/school-system/backend/internal/middleware"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"github.com/school-system/backend/internal/routes"
	"github.com/school-system/backend/internal/services"
	"github.com/school-system/backend/internal/socketio"
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
	// Set timezone to UTC for consistent timestamp handling
	time.Local = time.UTC
	
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

	// Services
	authService := services.NewAuthService(db, cfg)
	monitoringService := services.NewSystemMonitoringService(db)
	emailService := services.NewEmailService(
		os.Getenv("SMTP_HOST"),
		587,
		os.Getenv("SMTP_USER"),
		os.Getenv("SMTP_PASSWORD"),
		os.Getenv("SMTP_FROM"),
		db,
	)
	
	// Start SMS scheduler
	smsScheduler := cron.NewSMSScheduler(db)
	smsScheduler.Start()
	defer smsScheduler.Stop()

	// Start email queue processor in background
	go emailService.ProcessEmailQueue()
	
	// Start system metrics collection (every 5 minutes)
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			monitoringService.RecordSystemMetric()
		}
	}()
	
	// Start daily report generation (at 1 AM)
	go func() {
		for {
			now := time.Now()
			next := time.Date(now.Year(), now.Month(), now.Day()+1, 1, 0, 0, 0, now.Location())
			time.Sleep(time.Until(next))
			monitoringService.GenerateDailyReport(now)
		}
	}()
	
	// Cleanup old logs daily (keep 90 days)
	go func() {
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			monitoringService.CleanupOldLogs(90)
		}
	}()

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.RequestLogger(monitoringService))

	// CORS
	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		// Allow localhost and local network IPs
		c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Disposition")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Static files
	r.Static("/logos", "./public/logos")
	r.Static("/photos", "./public/photos")


	// Initialize all services for routes
	smsService := services.NewSMSService(
		os.Getenv("AFRICASTALKING_API_KEY"),
		os.Getenv("AFRICASTALKING_USERNAME"),
		os.Getenv("AFRICASTALKING_SENDER_ID"),
	)
	notificationService := services.NewNotificationService(repositories.NewNotificationRepository(db), db, smsService, emailService)
	payrollService := services.NewPayrollService(repositories.NewPayrollRepository(db), db)

	// Setup all routes using the new routes package
	routes.SetupRoutes(r, &routes.Dependencies{
		DB:                  db,
		Config:              cfg,
		AuthService:         authService,
		MonitoringService:   monitoringService,
		EmailService:        emailService,
		PayrollService:      payrollService,
		SMSService:          smsService,
		NotificationService: notificationService,
		SocketServer:        socketServer,
	})

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

	case "seed-sms-templates":
		seedSMSTemplates(db)

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

	// P1-P3 subjects are already defined for all three levels, just add them
	allSubjects = append(allSubjects, p13Subjects...)

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

func seedSMSTemplates(db *gorm.DB) {
	log.Println("Seeding SMS templates...")

	templates := []models.SMSTemplate{
		{Name: "Fees Payment Received", Category: "fees", Template: "Dear {{.GuardianName}}, we have received UGX {{.Amount}} for {{.StudentName}}. Balance: UGX {{.Balance}}. Thank you.", Variables: models.JSONB{"fields": []string{"GuardianName", "Amount", "StudentName", "Balance"}}, IsActive: true},
		{Name: "Fees Reminder", Category: "fees", Template: "Dear {{.GuardianName}}, {{.StudentName}} has an outstanding balance of UGX {{.Balance}} for {{.Term}} {{.Year}}. Please clear to avoid inconvenience.", Variables: models.JSONB{"fields": []string{"GuardianName", "StudentName", "Balance", "Term", "Year"}}, IsActive: true},
		{Name: "Absent Alert", Category: "attendance", Template: "Dear {{.GuardianName}}, {{.StudentName}} was absent from school on {{.Date}}. Please contact the school if this is unexpected.", Variables: models.JSONB{"fields": []string{"GuardianName", "StudentName", "Date"}}, IsActive: true},
		{Name: "Results Published", Category: "results", Template: "Dear {{.GuardianName}}, {{.StudentName}}'s {{.ExamType}} results for {{.Term}} {{.Year}} are now available. Login to view.", Variables: models.JSONB{"fields": []string{"GuardianName", "StudentName", "ExamType", "Term", "Year"}}, IsActive: true},
		{Name: "General Announcement", Category: "announcement", Template: "{{.SchoolName}}: {{.Message}}", Variables: models.JSONB{"fields": []string{"SchoolName", "Message"}}, IsActive: true},
		{Name: "Medical Alert", Category: "alert", Template: "URGENT: {{.StudentName}} visited the clinic on {{.Date}}. Diagnosis: {{.Diagnosis}}. Please contact the school immediately.", Variables: models.JSONB{"fields": []string{"StudentName", "Date", "Diagnosis"}}, IsActive: true},
		{Name: "Exam Reminder", Category: "announcement", Template: "Dear {{.GuardianName}}, {{.StudentName}}'s {{.ExamName}} begins on {{.StartDate}}. Please ensure they are well prepared.", Variables: models.JSONB{"fields": []string{"GuardianName", "StudentName", "ExamName", "StartDate"}}, IsActive: true},
		{Name: "Term Opening", Category: "announcement", Template: "{{.SchoolName}}: {{.Term}} {{.Year}} begins on {{.StartDate}}. All students should report by {{.ReportTime}}.", Variables: models.JSONB{"fields": []string{"SchoolName", "Term", "Year", "StartDate", "ReportTime"}}, IsActive: true},
	}

	for _, tpl := range templates {
		var existing models.SMSTemplate
		if err := db.Where("name = ? AND school_id IS NULL", tpl.Name).First(&existing).Error; err != nil {
			if err := db.Create(&tpl).Error; err != nil {
				log.Printf("Failed to create template %s: %v", tpl.Name, err)
			} else {
				log.Printf("Created template: %s", tpl.Name)
			}
		} else {
			log.Printf("Template already exists: %s", tpl.Name)
		}
	}

	log.Println("SMS templates seeded successfully")
}
