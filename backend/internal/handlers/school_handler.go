package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"gorm.io/gorm"
)

type SchoolHandler struct {
	db           *gorm.DB
	setupService *services.SchoolSetupService
	auditService *services.AuditService
}

func NewSchoolHandler(db *gorm.DB) *SchoolHandler {
	return &SchoolHandler{
		db:           db,
		setupService: services.NewSchoolSetupService(db),
		auditService: services.NewAuditService(db),
	}
}

func (h *SchoolHandler) List(c *gin.Context) {
	page := 1
	limit := 10
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}
	search := c.Query("search")
	offset := (page - 1) * limit

	query := h.db.Model(&models.School{})
	if search != "" {
		query = query.Where("name LIKE ? OR address LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	var schools []models.School
	if err := query.Offset(offset).Limit(limit).Find(&schools).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"schools": schools,
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}

func (h *SchoolHandler) Create(c *gin.Context) {
	var req struct {
		models.School
		Levels []string `json:"levels"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Store levels in config
	if req.School.Config == nil {
		req.School.Config = make(models.JSONB)
	}
	req.School.Config["levels"] = req.Levels

	if err := h.db.Create(&req.School).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log audit
	if userID, exists := c.Get("user_id"); exists {
		h.auditService.Log(userID.(uuid.UUID), "CREATE", "school", req.School.ID, nil, models.JSONB{"name": req.School.Name}, c.ClientIP())
	}

	// Setup school with classes, subjects, and grading rules
	if err := h.setupService.SetupSchool(&req.School, req.Levels); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to setup school: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, req.School)
}

func (h *SchoolHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var school models.School
	if err := h.db.First(&school, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
		return
	}
	c.JSON(http.StatusOK, school)
}

func (h *SchoolHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var school models.School
	if err := h.db.First(&school, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
		return
	}

	var updateData models.School
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	school.Name = updateData.Name
	school.Type = updateData.Type
	school.Address = updateData.Address
	school.Country = updateData.Country
	school.Region = updateData.Region
	school.ContactEmail = updateData.ContactEmail
	school.Phone = updateData.Phone
	school.LogoURL = updateData.LogoURL
	school.Motto = updateData.Motto
	school.Config = updateData.Config

	if err := h.db.Save(&school).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Setup additional levels if added
	if updateData.Config != nil {
		if newLevels, ok := updateData.Config["levels"].([]interface{}); ok {
			var levels []string
			for _, lvl := range newLevels {
				if level, ok := lvl.(string); ok {
					levels = append(levels, level)
				}
			}
			if err := h.setupService.SetupNewLevels(school.ID, levels); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to setup new levels: " + err.Error()})
				return
			}
		}
	}

	c.JSON(http.StatusOK, school)
}

// SetupSchool sets up classes and subjects for existing schools
func (h *SchoolHandler) SetupSchool(c *gin.Context) {
	id := c.Param("id")
	var school models.School
	if err := h.db.First(&school, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
		return
	}

	// Get levels from school config
	var levels []string
	if school.Config != nil {
		if configLevels, ok := school.Config["levels"].([]interface{}); ok {
			for _, lvl := range configLevels {
				if level, ok := lvl.(string); ok {
					levels = append(levels, level)
				}
			}
		}
	}

	// If no levels in config, use default based on school type
	if len(levels) == 0 {
		switch school.Type {
		case "Primary":
			levels = []string{"P1", "P2", "P3", "P4", "P5", "P6", "P7"}
		case "Secondary":
			levels = []string{"S1", "S2", "S3", "S4", "S5", "S6"}
		case "Nursery":
			levels = []string{"Baby", "Middle", "Top"}
		}
		// Update school config with levels
		if school.Config == nil {
			school.Config = make(models.JSONB)
		}
		school.Config["levels"] = levels
		h.db.Save(&school)
	}

	if err := h.setupService.SetupSchool(&school, levels); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to setup school: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "School setup completed successfully"})
}

func (h *SchoolHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	var school models.School
	if err := h.db.First(&school, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
		return
	}

	// Cascade delete all related data in proper order
	err := h.db.Transaction(func(tx *gorm.DB) error {
		// Delete marks first (depends on assessments)
		if err := tx.Exec("DELETE FROM marks WHERE assessment_id IN (SELECT id FROM assessments WHERE school_id = ?)", id).Error; err != nil {
			return err
		}
		// Delete subject results
		if err := tx.Where("school_id = ?", id).Delete(&models.SubjectResult{}).Error; err != nil {
			return err
		}
		// Delete assessments
		if err := tx.Where("school_id = ?", id).Delete(&models.Assessment{}).Error; err != nil {
			return err
		}
		// Delete report cards
		if err := tx.Exec("DELETE FROM report_cards WHERE student_id IN (SELECT id FROM students WHERE school_id = ?)", id).Error; err != nil {
			return err
		}
		// Delete enrollments
		if err := tx.Exec("DELETE FROM enrollments WHERE student_id IN (SELECT id FROM students WHERE school_id = ?)", id).Error; err != nil {
			return err
		}
		// Delete students
		if err := tx.Where("school_id = ?", id).Delete(&models.Student{}).Error; err != nil {
			return err
		}
		// Delete classes
		if err := tx.Where("school_id = ?", id).Delete(&models.Class{}).Error; err != nil {
			return err
		}
		// Delete subjects
		if err := tx.Where("school_id = ?", id).Delete(&models.Subject{}).Error; err != nil {
			return err
		}
		// Delete grading rules
		if err := tx.Where("school_id = ?", id).Delete(&models.GradingRule{}).Error; err != nil {
			return err
		}
		// Delete users assigned to this school (but not system admins)
		if err := tx.Where("school_id = ? AND role != 'system_admin'", id).Delete(&models.User{}).Error; err != nil {
			return err
		}
		// Finally delete the school
		if err := tx.Delete(&school).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete school: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "School and all related data deleted successfully"})
}

func (h *SchoolHandler) GetSchoolSummary(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")

	type SchoolSummary struct {
		// User counts
		TotalUsers    int64            `json:"total_users"`
		UsersByRole   map[string]int64 `json:"users_by_role"`
		
		// Student counts
		TotalStudents int64            `json:"total_students"`
		StudentsByLevel map[string]int64 `json:"students_by_level"`
		
		// Teacher summary
		TotalTeachers int64 `json:"total_teachers"`
		
		// Library summary
		LibrarySummary struct {
			TotalBooks     int64 `json:"total_books"`
			AvailableBooks int64 `json:"available_books"`
			IssuedBooks    int64 `json:"issued_books"`
			OverdueBooks   int64 `json:"overdue_books"`
		} `json:"library_summary"`
		
		// Fees summary
		FeesSummary struct {
			TotalFeesCollected float64 `json:"total_fees_collected"`
			OutstandingFees    float64 `json:"outstanding_fees"`
			StudentsWithFees   int64   `json:"students_with_fees"`
		} `json:"fees_summary"`
		
		// Clinic summary (aggregated only)
		ClinicSummary struct {
			TotalVisits        int64 `json:"total_visits"`
			MalariaTests       int64 `json:"malaria_tests"`
			PregnancyTests     int64 `json:"pregnancy_tests"`
			Emergencies        int64 `json:"emergencies"`
			LowStockMedicines  int64 `json:"low_stock_medicines"`
		} `json:"clinic_summary"`
	}

	summary := SchoolSummary{
		UsersByRole:     make(map[string]int64),
		StudentsByLevel: make(map[string]int64),
	}

	// User counts
	h.db.Model(&models.User{}).Where("school_id = ?", schoolID).Count(&summary.TotalUsers)
	var userRoleResults []struct {
		Role  string
		Count int64
	}
	h.db.Model(&models.User{}).Select("role, COUNT(*) as count").Where("school_id = ?", schoolID).Group("role").Scan(&userRoleResults)
	for _, result := range userRoleResults {
		summary.UsersByRole[result.Role] = result.Count
	}

	// Student counts
	if term != "" || year != "" {
		// Filter by term/year through enrollments
		query := h.db.Table("students").
			Select("COUNT(DISTINCT students.id)").
			Joins("JOIN enrollments ON students.id = enrollments.student_id AND enrollments.status = 'active'").
			Joins("JOIN classes ON enrollments.class_id = classes.id").
			Where("students.school_id = ?", schoolID)
		if term != "" {
			query = query.Where("classes.term = ?", term)
		}
		if year != "" {
			query = query.Where("classes.year = ?", year)
		}
		query.Scan(&summary.TotalStudents)
	} else {
		h.db.Model(&models.Student{}).Where("school_id = ?", schoolID).Count(&summary.TotalStudents)
	}
	var studentLevelResults []struct {
		Level string
		Count int64
	}
	studentQuery := h.db.Table("students").
		Select("classes.level, COUNT(DISTINCT students.id) as count").
		Joins("LEFT JOIN enrollments ON students.id = enrollments.student_id AND enrollments.status = 'active'").
		Joins("LEFT JOIN classes ON enrollments.class_id = classes.id").
		Where("students.school_id = ?", schoolID)
	if term != "" {
		studentQuery = studentQuery.Where("classes.term = ?", term)
	}
	if year != "" {
		studentQuery = studentQuery.Where("classes.year = ?", year)
	}
	studentQuery.Group("classes.level").Scan(&studentLevelResults)
	for _, result := range studentLevelResults {
		if result.Level != "" {
			summary.StudentsByLevel[result.Level] = result.Count
		}
	}

	// Library summary - filter by term/year
	libraryQuery := h.db.Model(&models.BookIssue{}).
		Joins("JOIN books ON book_issues.book_id = books.id").
		Where("books.school_id = ?", schoolID)
	if term != "" {
		libraryQuery = libraryQuery.Where("book_issues.term = ?", term)
	}
	if year != "" {
		libraryQuery = libraryQuery.Where("book_issues.year = ?", year)
	}
	
	h.db.Model(&models.Book{}).Where("school_id = ?", schoolID).Count(&summary.LibrarySummary.TotalBooks)
	h.db.Model(&models.Book{}).Where("school_id = ? AND available > 0", schoolID).Count(&summary.LibrarySummary.AvailableBooks)
	libraryQuery.Where("book_issues.status = 'issued'").Count(&summary.LibrarySummary.IssuedBooks)
	libraryQuery.Where("book_issues.status = 'issued' AND book_issues.due_date < NOW()").Count(&summary.LibrarySummary.OverdueBooks)

	// Fees summary - filter by term/year
	feesQuery := h.db.Model(&models.StudentFees{}).Where("school_id = ?", schoolID)
	if term != "" {
		feesQuery = feesQuery.Where("term = ?", term)
	}
	if year != "" {
		feesQuery = feesQuery.Where("year = ?", year)
	}
	feesQuery.Count(&summary.FeesSummary.StudentsWithFees)
	feesQuery.Select("COALESCE(SUM(amount_paid), 0)").Scan(&summary.FeesSummary.TotalFeesCollected)
	feesQuery.Select("COALESCE(SUM(outstanding), 0)").Scan(&summary.FeesSummary.OutstandingFees)

	// Clinic summary - filter by term/year
	clinicQuery := h.db.Where("school_id = ?", schoolID)
	if term != "" {
		clinicQuery = clinicQuery.Where("term = ?", term)
	}
	if year != "" {
		clinicQuery = clinicQuery.Where("year = ?", year)
	}
	clinicQuery.Model(&models.ClinicVisit{}).Count(&summary.ClinicSummary.TotalVisits)
	
	testQuery := h.db.Where("school_id = ?", schoolID)
	if term != "" {
		testQuery = testQuery.Where("term = ?", term)
	}
	if year != "" {
		testQuery = testQuery.Where("year = ?", year)
	}
	testQuery.Model(&models.MedicalTest{}).Where("test_type = 'malaria_rdt'").Count(&summary.ClinicSummary.MalariaTests)
	testQuery.Model(&models.MedicalTest{}).Where("test_type = 'pregnancy'").Count(&summary.ClinicSummary.PregnancyTests)
	
	emergencyQuery := h.db.Where("school_id = ?", schoolID)
	if term != "" {
		emergencyQuery = emergencyQuery.Where("term = ?", term)
	}
	if year != "" {
		emergencyQuery = emergencyQuery.Where("year = ?", year)
	}
	emergencyQuery.Model(&models.EmergencyIncident{}).Count(&summary.ClinicSummary.Emergencies)
	h.db.Model(&models.Medicine{}).Where("school_id = ? AND quantity <= minimum_stock", schoolID).Count(&summary.ClinicSummary.LowStockMedicines)
	
	// Teacher summary
	h.db.Model(&models.Teacher{}).Where("school_id = ? AND status = 'active'", schoolID).Count(&summary.TotalTeachers)

	c.JSON(http.StatusOK, summary)
}

func (h *SchoolHandler) GetStats(c *gin.Context) {
	type Stats struct {
		SchoolsByType    map[string]int64 `json:"schools_by_type"`
		UsersByRole      map[string]int64 `json:"users_by_role"`
		UsersBySchool    []struct {
			SchoolName string `json:"school_name"`
			UserCount  int64  `json:"user_count"`
		} `json:"users_by_school"`
		TotalStudents    int64 `json:"total_students"`
		TotalSchools     int64 `json:"total_schools"`
		TotalUsers       int64 `json:"total_users"`
		StudentsBySchool []struct {
			SchoolName    string `json:"school_name"`
			StudentCount  int64  `json:"student_count"`
		} `json:"students_by_school"`
		Health struct {
			Database string  `json:"database"`
			Status   string  `json:"status"`
			Uptime   float64 `json:"uptime_percent"`
		} `json:"health"`
	}

	stats := Stats{
		SchoolsByType: make(map[string]int64),
		UsersByRole:   make(map[string]int64),
	}

	// Health check
	if sqlDB, err := h.db.DB(); err == nil {
		if err := sqlDB.Ping(); err == nil {
			stats.Health.Database = "connected"
			stats.Health.Status = "healthy"
			stats.Health.Uptime = 99.9
		} else {
			stats.Health.Database = "error"
			stats.Health.Status = "degraded"
			stats.Health.Uptime = 0
		}
	} else {
		stats.Health.Database = "error"
		stats.Health.Status = "down"
		stats.Health.Uptime = 0
	}

	// Schools by type
	var schoolTypeResults []struct {
		Type  string
		Count int64
	}
	h.db.Model(&models.School{}).Select("type, COUNT(*) as count").Group("type").Scan(&schoolTypeResults)
	for _, result := range schoolTypeResults {
		stats.SchoolsByType[result.Type] = result.Count
	}

	// Users by role
	var userRoleResults []struct {
		Role  string
		Count int64
	}
	h.db.Model(&models.User{}).Select("role, COUNT(*) as count").Group("role").Scan(&userRoleResults)
	for _, result := range userRoleResults {
		stats.UsersByRole[result.Role] = result.Count
	}

	// Users by school (show all schools with their user counts, including zero)
	h.db.Model(&models.School{}).
		Select("schools.name as school_name, COUNT(DISTINCT users.id) as user_count").
		Joins("LEFT JOIN users ON schools.id = users.school_id AND users.deleted_at IS NULL").
		Group("schools.id, schools.name").
		Scan(&stats.UsersBySchool)

	// Students by school (show all schools with their student counts, including zero)
	h.db.Model(&models.School{}).
		Select("schools.name as school_name, COUNT(DISTINCT students.id) as student_count").
		Joins("LEFT JOIN students ON schools.id = students.school_id AND students.deleted_at IS NULL").
		Group("schools.id, schools.name").
		Scan(&stats.StudentsBySchool)

	// Total counts
	h.db.Model(&models.School{}).Count(&stats.TotalSchools)
	h.db.Model(&models.User{}).Count(&stats.TotalUsers)
	h.db.Model(&models.Student{}).Count(&stats.TotalStudents)

	c.JSON(http.StatusOK, stats)
}

func (h *SchoolHandler) GetSchoolLevels(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	
	var school models.School
	if err := h.db.First(&school, "id = ?", schoolID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
		return
	}
	
	var levels []string
	if school.Config != nil {
		if configLevels, ok := school.Config["levels"].([]interface{}); ok {
			for _, lvl := range configLevels {
				if level, ok := lvl.(string); ok {
					levels = append(levels, level)
				}
			}
		}
	}
	
	c.JSON(http.StatusOK, gin.H{"levels": levels})
}

