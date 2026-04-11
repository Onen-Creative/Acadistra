package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

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
		Name         string `json:"name" binding:"required"`
		Address      string `json:"address"`
		Country      string `json:"country"`
		Region       string `json:"region"`
		ContactEmail string `json:"contact_email"`
		Phone        string `json:"phone"`
		LogoURL      string `json:"logo_url"`
		Motto        string `json:"motto"`
		SchoolType   string `json:"school_type" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var levels []string
	var academicLevels []string

	switch req.SchoolType {
	case "nursery":
		levels = []string{"Baby", "Middle", "Top"}
		academicLevels = []string{"nursery"}
	case "primary":
		levels = []string{"P1", "P2", "P3", "P4", "P5", "P6", "P7"}
		academicLevels = []string{"primary"}
	case "ordinary":
		levels = []string{"S1", "S2", "S3", "S4"}
		academicLevels = []string{"ordinary"}
	case "advanced":
		levels = []string{"S5", "S6"}
		academicLevels = []string{"advanced"}
	case "nursery_primary":
		levels = []string{"Baby", "Middle", "Top", "P1", "P2", "P3", "P4", "P5", "P6", "P7"}
		academicLevels = []string{"nursery", "primary"}
	case "nursery_primary_ordinary":
		levels = []string{"Baby", "Middle", "Top", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "S1", "S2", "S3", "S4"}
		academicLevels = []string{"nursery", "primary", "ordinary"}
	case "nursery_primary_ordinary_advanced":
		levels = []string{"Baby", "Middle", "Top", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "S1", "S2", "S3", "S4", "S5", "S6"}
		academicLevels = []string{"nursery", "primary", "ordinary", "advanced"}
	case "ordinary_advanced":
		levels = []string{"S1", "S2", "S3", "S4", "S5", "S6"}
		academicLevels = []string{"ordinary", "advanced"}
	case "primary_ordinary":
		levels = []string{"P1", "P2", "P3", "P4", "P5", "P6", "P7", "S1", "S2", "S3", "S4"}
		academicLevels = []string{"primary", "ordinary"}
	case "primary_ordinary_advanced":
		levels = []string{"P1", "P2", "P3", "P4", "P5", "P6", "P7", "S1", "S2", "S3", "S4", "S5", "S6"}
		academicLevels = []string{"primary", "ordinary", "advanced"}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid school type"})
		return
	}

	school := models.School{
		Name:         req.Name,
		Type:         req.SchoolType,
		Address:      req.Address,
		Country:      req.Country,
		Region:       req.Region,
		ContactEmail: req.ContactEmail,
		Phone:        req.Phone,
		LogoURL:      req.LogoURL,
		Motto:        req.Motto,
		IsActive:     true,
		Config:       models.JSONB{"academic_levels": academicLevels, "levels": levels},
	}

	if err := h.db.Create(&school).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create school"})
		return
	}

	c.JSON(http.StatusCreated, school)
}

func (h *SchoolHandler) Get(c *gin.Context) {
	id := c.Param("id")
	
	var school models.School
	if err := h.db.First(&school, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
		return
	}

	type SchoolDetails struct {
		models.School
		UserCount    int64 `json:"user_count"`
		StaffCount   int64 `json:"staff_count"`
		StudentCount int64 `json:"student_count"`
	}

	details := SchoolDetails{School: school}
	h.db.Model(&models.User{}).Where("school_id = ? AND deleted_at IS NULL", id).Count(&details.UserCount)
	h.db.Model(&models.Staff{}).Where("school_id = ? AND status = ?", id, "active").Count(&details.StaffCount)
	h.db.Model(&models.Student{}).Where("school_id = ? AND status = ? AND deleted_at IS NULL", id, "active").Count(&details.StudentCount)

	c.JSON(http.StatusOK, details)
}

func (h *SchoolHandler) GetMySchool(c *gin.Context) {
	tenantSchoolID := c.GetString("tenant_school_id")
	
	var school models.School
	if err := h.db.First(&school, "id = ?", tenantSchoolID).Error; err != nil {
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

	var req struct {
		Name         string       `json:"name"`
		Type         string       `json:"type"`
		SchoolType   string       `json:"school_type"`
		Address      string       `json:"address"`
		Country      string       `json:"country"`
		Region       string       `json:"region"`
		ContactEmail string       `json:"contact_email"`
		Phone        string       `json:"phone"`
		LogoURL      string       `json:"logo_url"`
		Motto        string       `json:"motto"`
		Config       models.JSONB `json:"config"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	school.Name = req.Name
	if req.Type != "" {
		school.Type = req.Type
	} else if req.SchoolType != "" {
		school.Type = req.SchoolType
	}
	school.Address = req.Address
	school.Country = req.Country
	school.Region = req.Region
	school.ContactEmail = req.ContactEmail
	school.Phone = req.Phone
	school.LogoURL = req.LogoURL
	school.Motto = req.Motto
	if req.Config != nil {
		school.Config = req.Config
	}

	if err := h.db.Save(&school).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Setup additional levels if added
	if req.Config != nil {
		if newLevels, ok := req.Config["levels"].([]interface{}); ok {
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
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch school"})
		return
	}

	if err := h.db.Delete(&school).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete school"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "School deleted successfully"})
}

func (h *SchoolHandler) ToggleActive(c *gin.Context) {
	id := c.Param("id")
	
	var school models.School
	if err := h.db.First(&school, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch school"})
		return
	}

	newStatus := !school.IsActive
	if err := h.db.Model(&school).Update("is_active", newStatus).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update school status"})
		return
	}

	school.IsActive = newStatus
	c.JSON(http.StatusOK, school)
}

func (h *SchoolHandler) GetSchoolSummary(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")

	// Default to current year and term 1 if not provided
	if year == "" {
		year = "2026"
	}
	if term == "" {
		term = "Term 1"
	}

	yearInt, _ := strconv.Atoi(year)

	fmt.Printf("[DEBUG] GetSchoolSummary - schoolID: %s, term: %s, year: %d\n", schoolID, term, yearInt)

	type SchoolSummary struct {
		TotalStudents    int64   `json:"total_students"`
		TotalTeachers    int64   `json:"total_teachers"`
		TotalClasses     int64   `json:"total_classes"`
		AttendanceRate   float64 `json:"attendance_rate"`
		TotalIncome      float64 `json:"total_income"`
		TotalBooks       int64   `json:"total_books"`
		ClinicVisits     int64   `json:"clinic_visits"`
		InventoryItems   int64   `json:"inventory_items"`
	}

	summary := SchoolSummary{}

	// Total classes for the specific term/year
	h.db.Model(&models.Class{}).
		Where("school_id = ? AND term = ? AND year = ?", schoolID, term, yearInt).
		Count(&summary.TotalClasses)
	fmt.Printf("[DEBUG] Total classes: %d\n", summary.TotalClasses)

	// Total students - count through enrollments for the specific term/year
	h.db.Table("students").
		Select("COUNT(DISTINCT students.id)").
		Joins("INNER JOIN enrollments ON students.id = enrollments.student_id AND enrollments.status = 'active'").
		Joins("INNER JOIN classes ON enrollments.class_id = classes.id").
		Where("students.school_id = ? AND students.status = 'active'", schoolID).
		Where("classes.term = ? AND classes.year = ?", term, yearInt).
		Scan(&summary.TotalStudents)
	fmt.Printf("[DEBUG] Total students: %d\n", summary.TotalStudents)

	// Total teachers
	h.db.Model(&models.Staff{}).Where("school_id = ? AND role = ? AND status = ?", schoolID, "Teacher", "active").Count(&summary.TotalTeachers)

	// Attendance rate for the specific term/year
	// If querying for today specifically, only count today's attendance
	period := c.Query("period")
	var totalAttendance, presentCount int64
	
	if period == "today" {
		// Today's attendance - only count if attendance was marked today
		today := time.Now().Format("2006-01-02")
		h.db.Model(&models.Attendance{}).
			Where("school_id = ? AND date::date = ?::date", schoolID, today).
			Count(&totalAttendance)
		h.db.Model(&models.Attendance{}).
			Where("school_id = ? AND date::date = ?::date AND status = 'present'", schoolID, today).
			Count(&presentCount)
	} else {
		// Term/year attendance
		h.db.Model(&models.Attendance{}).
			Where("school_id = ? AND term = ? AND year = ?", schoolID, term, yearInt).
			Select("COUNT(DISTINCT CONCAT(student_id, '-', date))").
			Scan(&totalAttendance)
		h.db.Model(&models.Attendance{}).
			Where("school_id = ? AND term = ? AND year = ? AND status = 'present'", schoolID, term, yearInt).
			Select("COUNT(DISTINCT CONCAT(student_id, '-', date))").
			Scan(&presentCount)
	}
	
	if totalAttendance > 0 {
		summary.AttendanceRate = float64(presentCount) / float64(totalAttendance) * 100
	}

	// Total income for the specific term/year
	h.db.Model(&models.Income{}).
		Where("school_id = ? AND term = ? AND year = ?", schoolID, term, yearInt).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&summary.TotalIncome)

	// Total books (not filtered by term/year)
	h.db.Model(&models.Book{}).Where("school_id = ?", schoolID).Count(&summary.TotalBooks)

	// Clinic visits for the specific term/year
	h.db.Model(&models.ClinicVisit{}).
		Where("school_id = ? AND term = ? AND year = ?", schoolID, term, yearInt).
		Count(&summary.ClinicVisits)

	// Inventory items (not filtered by term/year)
	h.db.Table("inventory_items").Where("school_id = ?", schoolID).Count(&summary.InventoryItems)

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
		Joins("LEFT JOIN students ON schools.id = students.school_id AND students.deleted_at IS NULL AND students.status = 'active'").
		Group("schools.id, schools.name").
		Scan(&stats.StudentsBySchool)

	// Total counts
	h.db.Model(&models.School{}).Count(&stats.TotalSchools)
	h.db.Model(&models.User{}).Where("deleted_at IS NULL").Count(&stats.TotalUsers)
	// Count all active students (consistent with student list endpoint and students_by_school)
	h.db.Model(&models.Student{}).Where("deleted_at IS NULL AND status = 'active'").Count(&stats.TotalStudents)

	c.JSON(http.StatusOK, stats)
}

func (h *SchoolHandler) GetSchoolLevels(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	
	var school models.School
	if err := h.db.First(&school, "id = ?", schoolID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
		return
	}
	
	levels := []string{}
	if school.Config != nil {
		if configLevels, ok := school.Config["levels"].([]interface{}); ok {
			for _, lvl := range configLevels {
				if level, ok := lvl.(string); ok {
					levels = append(levels, level)
				}
			}
		}
	}
	
	// Auto-fix: If no levels configured, set them based on school type
	if len(levels) == 0 && school.Type != "" {
		switch school.Type {
		case "nursery":
			levels = []string{"Baby", "Middle", "Top"}
		case "primary":
			levels = []string{"P1", "P2", "P3", "P4", "P5", "P6", "P7"}
		case "ordinary":
			levels = []string{"S1", "S2", "S3", "S4"}
		case "advanced":
			levels = []string{"S5", "S6"}
		case "nursery_primary":
			levels = []string{"Baby", "Middle", "Top", "P1", "P2", "P3", "P4", "P5", "P6", "P7"}
		case "nursery_primary_ordinary":
			levels = []string{"Baby", "Middle", "Top", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "S1", "S2", "S3", "S4"}
		case "nursery_primary_ordinary_advanced":
			levels = []string{"Baby", "Middle", "Top", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "S1", "S2", "S3", "S4", "S5", "S6"}
		case "ordinary_advanced":
			levels = []string{"S1", "S2", "S3", "S4", "S5", "S6"}
		case "primary_ordinary":
			levels = []string{"P1", "P2", "P3", "P4", "P5", "P6", "P7", "S1", "S2", "S3", "S4"}
		case "primary_ordinary_advanced":
			levels = []string{"P1", "P2", "P3", "P4", "P5", "P6", "P7", "S1", "S2", "S3", "S4", "S5", "S6"}
		}
		
		// Save the levels to database
		if len(levels) > 0 {
			if school.Config == nil {
				school.Config = make(models.JSONB)
			}
			school.Config["levels"] = levels
			h.db.Save(&school)
		}
	}
	
	if levels == nil {
		levels = []string{}
	}
	
	c.JSON(http.StatusOK, gin.H{"levels": levels})
}

