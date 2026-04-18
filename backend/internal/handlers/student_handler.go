package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/utils"
	"gorm.io/gorm"
)

type StudentHandler struct {
	db *gorm.DB
}

func NewStudentHandler(db *gorm.DB) *StudentHandler {
	return &StudentHandler{db: db}
}

// Get retrieves a single student by ID
func (h *StudentHandler) Get(c *gin.Context) {
	studentID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var student models.Student
	if err := h.db.Preload("Guardians").Preload("Enrollments.Class").
		Where("id = ? AND school_id = ?", studentID, schoolID).
		First(&student).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"student": student})
}

// Update updates student information
func (h *StudentHandler) Update(c *gin.Context) {
	studentID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var student models.Student
	if err := h.db.Where("id = ? AND school_id = ?", studentID, schoolID).First(&student).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	var req struct {
		FirstName        string `json:"first_name"`
		MiddleName       string `json:"middle_name"`
		LastName         string `json:"last_name"`
		DateOfBirth      string `json:"date_of_birth"`
		Gender           string `json:"gender"`
		Nationality      string `json:"nationality"`
		Religion         string `json:"religion"`
		LIN              string `json:"lin"`
		Email            string `json:"email"`
		Phone            string `json:"phone"`
		Address          string `json:"address"`
		District         string `json:"district"`
		Village          string `json:"village"`
		ResidenceType    string `json:"residence_type"`
		PreviousSchool   string `json:"previous_school"`
		PreviousClass    string `json:"previous_class"`
		SpecialNeeds     string `json:"special_needs"`
		DisabilityStatus string `json:"disability_status"`
		Status           string `json:"status"`
		PhotoURL         string `json:"photo_url"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Capitalize gender
	if req.Gender != "" {
		req.Gender = strings.Title(strings.ToLower(req.Gender))
		if req.Gender != "Male" && req.Gender != "Female" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Gender must be 'Male' or 'Female'"})
			return
		}
		student.Gender = req.Gender
	}

	// Update fields
	if req.FirstName != "" {
		student.FirstName = strings.Title(strings.ToLower(utils.NormalizeText(req.FirstName)))
	}
	if req.MiddleName != "" {
		student.MiddleName = strings.Title(strings.ToLower(utils.NormalizeText(req.MiddleName)))
	}
	if req.LastName != "" {
		student.LastName = strings.Title(strings.ToLower(utils.NormalizeText(req.LastName)))
	}
	if req.Nationality != "" {
		student.Nationality = req.Nationality
	}
	if req.Religion != "" {
		student.Religion = req.Religion
	}
	if req.LIN != "" {
		student.LIN = req.LIN
	}
	if req.Email != "" {
		student.Email = req.Email
	}
	if req.Phone != "" {
		student.Phone = req.Phone
	}
	if req.Address != "" {
		student.Address = req.Address
	}
	if req.District != "" {
		student.District = req.District
	}
	if req.Village != "" {
		student.Village = req.Village
	}
	if req.ResidenceType != "" {
		student.ResidenceType = req.ResidenceType
	}
	if req.PreviousSchool != "" {
		student.PreviousSchool = req.PreviousSchool
	}
	if req.PreviousClass != "" {
		student.PreviousClass = req.PreviousClass
	}
	if req.SpecialNeeds != "" {
		student.SpecialNeeds = req.SpecialNeeds
	}
	if req.DisabilityStatus != "" {
		student.DisabilityStatus = req.DisabilityStatus
	}
	if req.Status != "" {
		student.Status = req.Status
	}
	if req.PhotoURL != "" {
		student.PhotoURL = req.PhotoURL
	}

	if err := h.db.Save(&student).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update student"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student updated successfully", "student": student})
}

// Delete soft deletes a student
func (h *StudentHandler) Delete(c *gin.Context) {
	studentID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var student models.Student
	if err := h.db.Where("id = ? AND school_id = ?", studentID, schoolID).First(&student).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	if err := h.db.Delete(&student).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete student"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student deleted successfully"})
}

// List lists all students with filters and pagination
func (h *StudentHandler) List(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userRole := c.GetString("user_role")
	guardianPhone := c.GetString("guardian_phone")
	
	// If parent, only show their children
	if userRole == "parent" && guardianPhone != "" {
		h.GetMyChildren(c)
		return
	}
	
	query := h.db.Table("students").Where("students.school_id = ? AND students.deleted_at IS NULL", schoolID)

	// Check if we need to join enrollments and classes
	level := c.Query("level")
	classID := c.Query("class_id")
	year := c.Query("year")
	term := c.Query("term")
	needsJoin := level != "" || classID != "" || year != "" || term != ""

	if needsJoin {
		query = query.Joins("INNER JOIN enrollments ON enrollments.student_id = students.id AND enrollments.status = 'active'")
		query = query.Joins("INNER JOIN classes ON classes.id = enrollments.class_id")
		
		if level != "" {
			query = query.Where("classes.level = ?", level)
		}
		if classID != "" {
			query = query.Where("enrollments.class_id = ?", classID)
		}
		if year != "" {
			query = query.Where("enrollments.year = ?", year)
		}
		if term != "" {
			query = query.Where("enrollments.term = ?", term)
		}
	}

	// Other filters
	if search := c.Query("search"); search != "" {
		query = query.Where("(LOWER(students.first_name) LIKE LOWER(?) OR LOWER(students.middle_name) LIKE LOWER(?) OR LOWER(students.last_name) LIKE LOWER(?) OR LOWER(students.admission_no) LIKE LOWER(?))", 
			"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	if gender := c.Query("gender"); gender != "" {
		query = query.Where("students.gender = ?", gender)
	}

	// Select distinct students
	query = query.Select("DISTINCT students.*")

	// Get total count before pagination
	var totalCount int64
	if err := query.Count(&totalCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count students"})
		return
	}

	// Pagination
	page := 1
	if p := c.Query("page"); p != "" {
		if parsedPage, err := strconv.Atoi(p); err == nil && parsedPage > 0 {
			page = parsedPage
		}
	}
	
	// Allow flexible limit with reasonable defaults and maximum
	limit := 50 // Default to 50 per page
	if l := c.Query("limit"); l != "" {
		if parsedLimit, err := strconv.Atoi(l); err == nil {
			// Special case: if limit is -1, return all students (no pagination)
			if parsedLimit == -1 {
				limit = 0 // GORM treats 0 as no limit
			} else if parsedLimit > 0 {
				// Cap at 1000 to prevent performance issues
				if parsedLimit > 1000 {
					limit = 1000
				} else {
					limit = parsedLimit
				}
			}
		}
	}
	
	offset := 0
	if limit > 0 {
		offset = (page - 1) * limit
	}

	var students []models.Student
	var err error
	if limit == 0 {
		// No pagination - return all students
		err = query.Find(&students).Error
	} else {
		// With pagination
		err = query.Offset(offset).Limit(limit).Find(&students).Error
	}
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students"})
		return
	}

	// Load guardians and current class for each student
	for i := range students {
		h.db.Where("student_id = ?", students[i].ID).Find(&students[i].Guardians)
		
		// Load current class
		var enrollment models.Enrollment
		if err := h.db.Preload("Class").Where("student_id = ? AND status = 'active'", students[i].ID).First(&enrollment).Error; err == nil {
			if enrollment.Class != nil {
				students[i].ClassName = enrollment.Class.Name
			}
		}
	}

	totalPages := 1
	if limit > 0 {
		totalPages = int((totalCount + int64(limit) - 1) / int64(limit))
	}

	c.JSON(http.StatusOK, gin.H{
		"students": students, 
		"total": totalCount,
		"page": page,
		"limit": limit,
		"total_pages": totalPages,
		"showing_all": limit == 0,
	})
}

// PromoteOrDemote promotes or demotes a student to a new class
func (h *StudentHandler) PromoteOrDemote(c *gin.Context) {
	studentID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var req struct {
		NewClassID string `json:"new_class_id" binding:"required"`
		Year       int    `json:"year" binding:"required"`
		Term       string `json:"term" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify student exists
	var student models.Student
	if err := h.db.Where("id = ? AND school_id = ?", studentID, schoolID).First(&student).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	// Verify new class exists
	var newClass models.Class
	if err := h.db.Where("id = ? AND school_id = ?", req.NewClassID, schoolID).First(&newClass).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return
	}

	// Deactivate current enrollment
	h.db.Model(&models.Enrollment{}).Where("student_id = ? AND status = 'active'", studentID).Update("status", "completed")

	// Create new enrollment
	newEnrollment := models.Enrollment{
		StudentID:  uuid.MustParse(studentID),
		ClassID:    uuid.MustParse(req.NewClassID),
		Year:       req.Year,
		Term:       req.Term,
		Status:     "active",
		EnrolledOn: time.Now(),
	}

	if err := h.db.Create(&newEnrollment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create new enrollment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student promoted/demoted successfully", "enrollment": newEnrollment})
}

// GetMyChildren returns students for a parent based on guardian phone
func (h *StudentHandler) GetMyChildren(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	schoolID := c.GetString("tenant_school_id")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	// Normalize phone number - try with and without country code
	phoneVariants := []string{guardianPhone}
	if strings.HasPrefix(guardianPhone, "+256") {
		// Add variant without country code
		phoneVariants = append(phoneVariants, "0"+guardianPhone[4:])
	} else if strings.HasPrefix(guardianPhone, "0") {
		// Add variant with country code
		phoneVariants = append(phoneVariants, "+256"+guardianPhone[1:])
	}

	// Get all students for this guardian using phone variants
	var guardians []models.Guardian
	if err := h.db.Where("(phone IN ? OR alternative_phone IN ?) AND school_id = ?", phoneVariants, phoneVariants, schoolID).Find(&guardians).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch children"})
		return
	}

	if len(guardians) == 0 {
		c.JSON(http.StatusOK, gin.H{"students": []models.Student{}, "total": 0})
		return
	}

	// Extract student IDs
	studentIDs := make([]uuid.UUID, len(guardians))
	for i, g := range guardians {
		studentIDs[i] = g.StudentID
	}

	// Get students with their current class
	var students []models.Student
	if err := h.db.Where("id IN ? AND school_id = ?", studentIDs, schoolID).Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students"})
		return
	}

	// Load current class and guardians for each student
	for i := range students {
		var enrollment models.Enrollment
		if err := h.db.Preload("Class").Where("student_id = ? AND status = 'active'", students[i].ID).First(&enrollment).Error; err == nil {
			if enrollment.Class != nil {
				students[i].ClassName = enrollment.Class.Name
			}
		}
		// Load all guardians for the student
		h.db.Where("student_id = ?", students[i].ID).Find(&students[i].Guardians)
	}

	c.JSON(http.StatusOK, gin.H{"students": students, "total": len(students)})
}
