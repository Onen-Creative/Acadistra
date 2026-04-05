package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type ClassHandler struct {
	db *gorm.DB
}

func NewClassHandler(db *gorm.DB) *ClassHandler {
	return &ClassHandler{db: db}
}

func (h *ClassHandler) List(c *gin.Context) {
	year := c.Query("year")
	term := c.Query("term")
	level := c.Query("level")
	schoolID := c.GetString("tenant_school_id")

	var classes []models.Class
	query := h.db.Preload("TeacherProfile.Staff")

	// Filter by school for non-system admins
	if schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}

	if year != "" {
		query = query.Where("year = ?", year)
	}
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if level != "" {
		query = query.Where("level = ?", level)
	}

	query = query.Order("level, stream")

	if err := query.Find(&classes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Add student count for each class (only active enrollments with non-deleted students)
	type ClassWithCount struct {
		models.Class
		StudentCount int64 `json:"student_count"`
	}
	result := make([]ClassWithCount, len(classes))
	for i, class := range classes {
		var count int64
		h.db.Model(&models.Enrollment{}).
			Joins("JOIN students ON students.id = enrollments.student_id AND students.deleted_at IS NULL").
			Where("enrollments.class_id = ? AND enrollments.status = ?", class.ID, "active").
			Count(&count)
		result[i] = ClassWithCount{Class: class, StudentCount: count}
	}

	c.JSON(http.StatusOK, result)
}

func (h *ClassHandler) Create(c *gin.Context) {
	var class models.Class
	if err := c.ShouldBindJSON(&class); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Auto-assign class to user's school
	userRole := c.GetString("user_role")
	if userRole != "system_admin" {
		tenantSchoolID := c.GetString("tenant_school_id")
		if tenantSchoolID == "" {
			c.JSON(http.StatusForbidden, gin.H{"error": "No school assigned to user"})
			return
		}
		schoolID, _ := uuid.Parse(tenantSchoolID)
		class.SchoolID = schoolID
	}

	// Handle teacher_profile_id - validate if provided
	if class.TeacherProfileID != nil && *class.TeacherProfileID != uuid.Nil {
		var teacherProfile models.TeacherProfile
		if err := h.db.First(&teacherProfile, "id = ? AND school_id = ?", *class.TeacherProfileID, class.SchoolID).Error; err != nil {
			class.TeacherProfileID = nil
		}
	} else {
		class.TeacherProfileID = nil
	}

	// Auto-generate class name from level and stream
	if class.Stream != "" {
		class.Name = class.Level + " " + class.Stream
	} else {
		class.Name = class.Level
	}

	// Check for duplicate class (same level, stream, year, term)
	var existing models.Class
	if err := h.db.Where("school_id = ? AND level = ? AND stream = ? AND year = ? AND term = ?", 
		class.SchoolID, class.Level, class.Stream, class.Year, class.Term).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Class with this level and stream already exists for this term/year"})
		return
	}

	if err := h.db.Create(&class).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, class)
}

func (h *ClassHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var class models.Class
	if err := h.db.Preload("TeacherProfile").Preload("TeacherProfile.Staff").Preload("School").First(&class, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return
	}
	c.JSON(http.StatusOK, class)
}

func (h *ClassHandler) GetStudents(c *gin.Context) {
	classID := c.Param("id")
	year, _ := strconv.Atoi(c.Query("year"))
	term := c.Query("term")

	var enrollments []models.Enrollment
	query := h.db.Preload("Student").Where("class_id = ? AND status = ?", classID, "active")
	if year > 0 {
		query = query.Where("year = ?", year)
	}
	if term != "" {
		query = query.Where("term = ?", term)
	}

	if err := query.Find(&enrollments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	students := make([]models.Student, len(enrollments))
	for i, e := range enrollments {
		students[i] = *e.Student
	}

	c.JSON(http.StatusOK, students)
}

func (h *ClassHandler) GetLevels(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
		return
	}

	// Get school and return academic levels from config
	var school models.School
	if err := h.db.First(&school, "id = ?", schoolID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
		return
	}

	// Extract academic_levels from config
	levels := []string{}
	if academicLevels, ok := school.Config["academic_levels"].([]interface{}); ok {
		for _, level := range academicLevels {
			if levelStr, ok := level.(string); ok {
				levels = append(levels, levelStr)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"levels": levels})
}

func (h *ClassHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var class models.Class
	if err := h.db.First(&class, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return
	}

	// Check school access
	userRole := c.GetString("user_role")
	if userRole != "system_admin" {
		tenantSchoolID := c.GetString("tenant_school_id")
		if tenantSchoolID == "" || class.SchoolID.String() != tenantSchoolID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}
	}

	var updates models.Class
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Prevent changing school_id
	updates.SchoolID = class.SchoolID

	// Validate teacher_profile_id if provided
	if updates.TeacherProfileID != nil && *updates.TeacherProfileID != uuid.Nil {
		var teacherProfile models.TeacherProfile
		if err := h.db.First(&teacherProfile, "id = ? AND school_id = ?", *updates.TeacherProfileID, class.SchoolID).Error; err != nil {
			updates.TeacherProfileID = nil
		}
	} else if updates.TeacherProfileID != nil && *updates.TeacherProfileID == uuid.Nil {
		updates.TeacherProfileID = nil
	}

	// Auto-generate class name from level and stream
	if updates.Stream != "" {
		updates.Name = updates.Level + " " + updates.Stream
	} else {
		updates.Name = updates.Level
	}

	if err := h.db.Model(&class).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, class)
}

func (h *ClassHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	var class models.Class
	if err := h.db.First(&class, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return
	}

	// Check school access
	userRole := c.GetString("user_role")
	if userRole != "system_admin" {
		tenantSchoolID := c.GetString("tenant_school_id")
		if tenantSchoolID == "" || class.SchoolID.String() != tenantSchoolID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}
	}

	// Check if class has active enrollments with non-deleted students
	var count int64
	h.db.Model(&models.Enrollment{}).
		Joins("JOIN students ON students.id = enrollments.student_id AND students.deleted_at IS NULL").
		Where("enrollments.class_id = ? AND enrollments.status = ?", id, "active").
		Count(&count)
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Cannot delete class with active enrollments"})
		return
	}

	if err := h.db.Delete(&class).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Class deleted successfully"})
}

func (h *ClassHandler) GetTeacherClasses(c *gin.Context) {
	teacherName := c.Query("name")
	schoolID := c.GetString("tenant_school_id")

	var classes []models.Class
	h.db.Joins("JOIN teacher_profiles ON teacher_profiles.id = classes.teacher_profile_id").
		Joins("JOIN staff ON staff.id = teacher_profiles.staff_id").
		Where("staff.first_name LIKE ? OR staff.last_name LIKE ?", "%"+teacherName+"%", "%"+teacherName+"%").
		Where("classes.school_id = ?", schoolID).
		Preload("TeacherProfile.Staff").
		Find(&classes)

	c.JSON(http.StatusOK, gin.H{"classes": classes})
}
