package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/utils"
	ws "github.com/school-system/backend/internal/websocket"
	"gorm.io/gorm"
)

type StudentHandler struct {
	db *gorm.DB
}

func NewStudentHandler(db *gorm.DB) *StudentHandler {
	return &StudentHandler{db: db}
}

func (h *StudentHandler) List(c *gin.Context) {
	classID := c.Query("class_id")
	classLevel := c.Query("class_level")
	term := c.Query("term")
	year := c.Query("year")
	search := c.Query("search")
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")
	schoolID := c.GetString("tenant_school_id")

	// Debug logging
	fmt.Printf("[DEBUG] Student List Query - classLevel: %s, term: %s, year: %s, schoolID: %s\n", classLevel, term, year, schoolID)

	type StudentWithClass struct {
		models.Student
		ClassName     string `json:"class_name"`
		ClassLevel    string `json:"class_level"`
		ClassID       uuid.UUID `json:"class_id"`
		BloodGroup    string `json:"-" gorm:"column:blood_group"`
		Allergies     string `json:"-" gorm:"column:allergies"`
		ChronicConditions string `json:"-" gorm:"column:chronic_conditions"`
		Disabilities  string `json:"-" gorm:"column:disabilities"`
		EmergencyContact string `json:"-" gorm:"column:emergency_contact"`
		HealthProfile *models.StudentHealthProfile `json:"health_profile,omitempty" gorm:"-"`
	}

	var results []StudentWithClass
	var query *gorm.DB

	// Build query based on filters
	if classLevel != "" || term != "" || year != "" {
		// When filtering by class/term/year, use INNER JOIN to only get students with enrollments
		query = h.db.Table("students").Select("students.*, classes.level as class_name, classes.level as class_level, classes.id as class_id, student_health_profiles.blood_group, student_health_profiles.allergies, student_health_profiles.chronic_conditions, student_health_profiles.disabilities, student_health_profiles.emergency_contact").
			Joins("INNER JOIN enrollments ON students.id = enrollments.student_id AND enrollments.status = 'active'").
			Joins("INNER JOIN classes ON enrollments.class_id = classes.id").
			Joins("LEFT JOIN student_health_profiles ON students.id = student_health_profiles.student_id").
			Where("students.deleted_at IS NULL")
	} else {
		// When not filtering, use LEFT JOIN to include all students
		query = h.db.Table("students").Select("students.*, classes.level as class_name, classes.level as class_level, classes.id as class_id, student_health_profiles.blood_group, student_health_profiles.allergies, student_health_profiles.chronic_conditions, student_health_profiles.disabilities, student_health_profiles.emergency_contact").
			Joins("LEFT JOIN enrollments ON students.id = enrollments.student_id AND enrollments.status = 'active'").
			Joins("LEFT JOIN classes ON enrollments.class_id = classes.id").
			Joins("LEFT JOIN student_health_profiles ON students.id = student_health_profiles.student_id").
			Where("students.deleted_at IS NULL")
	}

	if schoolID != "" {
		query = query.Where("students.school_id = ?", schoolID)
	}

	if search != "" {
		query = query.Where("students.first_name ILIKE ? OR students.last_name ILIKE ? OR students.admission_no ILIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if classID != "" {
		query = query.Where("enrollments.class_id = ?", classID)
	} else if classLevel != "" {
		// Filter by class level and optionally term/year
		query = query.Where("classes.level = ?", classLevel)
		if term != "" {
			query = query.Where("enrollments.term = ?", term)
		}
		if year != "" {
			yearInt, _ := strconv.Atoi(year)
			query = query.Where("enrollments.year = ?", yearInt)
		}
	} else {
		// When no class filter, still apply term/year to enrollments if provided
		if term != "" {
			query = query.Where("enrollments.term = ?", term)
		}
		if year != "" {
			yearInt, _ := strconv.Atoi(year)
			query = query.Where("enrollments.year = ?", yearInt)
		}
	}

	var total int64
	query.Count(&total)

	// Debug logging
	fmt.Printf("[DEBUG] Query returned total: %d\n", total)

	offset := (utils.Atoi(page) - 1) * utils.Atoi(limit)
	if err := query.Offset(offset).Limit(utils.Atoi(limit)).Scan(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Populate health_profile object
	for i := range results {
		if results[i].BloodGroup != "" || results[i].Allergies != "" || results[i].ChronicConditions != "" {
			results[i].HealthProfile = &models.StudentHealthProfile{
				BloodGroup:        results[i].BloodGroup,
				Allergies:         results[i].Allergies,
				ChronicConditions: results[i].ChronicConditions,
				Disabilities:      results[i].Disabilities,
				EmergencyContact:  results[i].EmergencyContact,
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"students": results,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

func (h *StudentHandler) Create(c *gin.Context) {
	var req struct {
		FirstName        string     `json:"first_name" binding:"required"`
		MiddleName       string     `json:"middle_name"`
		LastName         string     `json:"last_name" binding:"required"`
		DateOfBirth      *time.Time `json:"date_of_birth"`
		Gender           string     `json:"gender"`
		Nationality      string     `json:"nationality"`
		Religion         string     `json:"religion"`
		LIN              string     `json:"lin"`
		Email            string     `json:"email"`
		Phone            string     `json:"phone"`
		Address          string     `json:"address"`
		District         string     `json:"district"`
		Village          string     `json:"village"`
		ResidenceType    string     `json:"residence_type"`
		PreviousSchool   string     `json:"previous_school"`
		PreviousClass    string     `json:"previous_class"`
		SpecialNeeds     string     `json:"special_needs"`
		DisabilityStatus string     `json:"disability_status"`
		ClassLevel       string     `json:"class_level" binding:"required"`
		Term             string     `json:"term" binding:"required"`
		Year             int        `json:"year" binding:"required"`
		Guardians        []struct {
			Relationship     string `json:"relationship" binding:"required"`
			FullName         string `json:"full_name" binding:"required"`
			Phone            string `json:"phone" binding:"required"`
			AlternativePhone string `json:"alternative_phone"`
			Email            string `json:"email"`
			Occupation       string `json:"occupation"`
			Address          string `json:"address"`
			Workplace        string `json:"workplace"`
			WorkAddress      string `json:"work_address"`
			IsPrimaryContact bool   `json:"is_primary_contact"`
			IsEmergency      bool   `json:"is_emergency"`
			IsFeePayer       bool   `json:"is_fee_payer"`
			NationalID       string `json:"national_id"`
		} `json:"guardians"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Auto-assign student to the same school as the user
	userRole := c.GetString("user_role")
	var school models.School
	if userRole != "system_admin" {
		tenantSchoolID := c.GetString("tenant_school_id")
		if tenantSchoolID == "" {
			c.JSON(http.StatusForbidden, gin.H{"error": "No school assigned to user"})
			return
		}
		if err := h.db.First(&school, "id = ?", tenantSchoolID).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "School not found"})
			return
		}
	} else {
		// System admin must specify school through class selection
		var class models.Class
		if err := h.db.Preload("School").Where("level = ? AND term = ? AND year = ?", req.ClassLevel, req.Term, req.Year).First(&class).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Class not found"})
			return
		}
		school = *class.School
	}

	// Find or create the specific class for this school, level, term, and year
	var class models.Class
	if err := h.db.Where("school_id = ? AND level = ? AND term = ? AND year = ?", school.ID, req.ClassLevel, req.Term, req.Year).First(&class).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create the class if it doesn't exist
			class = models.Class{
				SchoolID: school.ID,
				Name:     req.ClassLevel,
				Level:    req.ClassLevel,
				Year:     req.Year,
				Term:     req.Term,
			}
			if err := h.db.Create(&class).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create class: " + err.Error()})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
			return
		}
	}

	// Count students in this class
	var count int64
	h.db.Table("students").Joins("JOIN enrollments ON students.id = enrollments.student_id").
		Where("enrollments.class_id = ?", class.ID).Count(&count)

	// Generate admission number
	schoolInitial := string(school.Name[0])
	var schoolType string
	switch school.Type {
	case "Nursery":
		schoolType = "NS"
	case "Primary":
		schoolType = "PS"
	default:
		schoolType = "SS"
	}
	sequence := int(count) + 1
	admissionNo := fmt.Sprintf("%s%s/%s/%d/%03d", schoolInitial, schoolType, class.Level, req.Year, sequence)

	// Set admission date to now if not provided
	admissionDate := time.Now()
	if req.DateOfBirth != nil {
		admissionDate = time.Now()
	}

	// Default values
	nationality := req.Nationality
	if nationality == "" {
		nationality = "Ugandan"
	}
	residenceType := req.ResidenceType
	if residenceType == "" {
		residenceType = "Day"
	}

	student := models.Student{
		SchoolID:         school.ID,
		AdmissionNo:      admissionNo,
		LIN:              req.LIN,
		FirstName:        req.FirstName,
		MiddleName:       req.MiddleName,
		LastName:         req.LastName,
		DateOfBirth:      req.DateOfBirth,
		Gender:           req.Gender,
		Nationality:      nationality,
		Religion:         req.Religion,
		Email:            req.Email,
		Phone:            req.Phone,
		Address:          req.Address,
		District:         req.District,
		Village:          req.Village,
		ResidenceType:    residenceType,
		AdmissionDate:    &admissionDate,
		Status:           "active",
		PreviousSchool:   req.PreviousSchool,
		PreviousClass:    req.PreviousClass,
		SpecialNeeds:     req.SpecialNeeds,
		DisabilityStatus: req.DisabilityStatus,
	}

	if err := h.db.Create(&student).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create guardians if provided
	var createdGuardians []models.Guardian
	for _, g := range req.Guardians {
		guardian := models.Guardian{
			StudentID:        student.ID,
			SchoolID:         school.ID,
			Relationship:     g.Relationship,
			FullName:         g.FullName,
			Phone:            g.Phone,
			AlternativePhone: g.AlternativePhone,
			Email:            g.Email,
			Occupation:       g.Occupation,
			Address:          g.Address,
			Workplace:        g.Workplace,
			WorkAddress:      g.WorkAddress,
			IsPrimaryContact: g.IsPrimaryContact,
			IsEmergency:      g.IsEmergency,
			IsFeePayer:       g.IsFeePayer,
			NationalID:       g.NationalID,
		}
		if err := h.db.Create(&guardian).Error; err != nil {
			// Rollback student creation if guardian creation fails
			h.db.Delete(&student)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create guardian: " + err.Error()})
			return
		}
		createdGuardians = append(createdGuardians, guardian)
	}

	enrollment := models.Enrollment{
		StudentID:  student.ID,
		ClassID:    class.ID,
		Year:       req.Year,
		Term:       req.Term,
		Status:     "active",
		EnrolledOn: time.Now(),
	}
	if err := h.db.Create(&enrollment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create enrollment: " + err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("student:created", student, school.ID.String())
	c.JSON(http.StatusCreated, gin.H{
		"student":   student,
		"guardians": createdGuardians,
	})
}

func (h *StudentHandler) Get(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var student models.Student
	query := h.db.Where("id = ?", id)

	if schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}

	if err := query.First(&student).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	// Fetch active enrollment
	var enrollment models.Enrollment
	var className string
	var classID uuid.UUID
	if err := h.db.Where("student_id = ? AND status = ?", id, "active").First(&enrollment).Error; err == nil {
		var class models.Class
		if err := h.db.First(&class, "id = ?", enrollment.ClassID).Error; err == nil {
			className = class.Level
			classID = class.ID
		}
	}

	// Fetch guardians
	var guardians []models.Guardian
	h.db.Where("student_id = ?", id).Find(&guardians)

	response := map[string]interface{}{
		"id":                student.ID,
		"school_id":         student.SchoolID,
		"admission_no":      student.AdmissionNo,
		"lin":               student.LIN,
		"first_name":        student.FirstName,
		"middle_name":       student.MiddleName,
		"last_name":         student.LastName,
		"date_of_birth":     student.DateOfBirth,
		"gender":            student.Gender,
		"nationality":       student.Nationality,
		"religion":          student.Religion,
		"email":             student.Email,
		"phone":             student.Phone,
		"address":           student.Address,
		"district":          student.District,
		"village":           student.Village,
		"residence_type":    student.ResidenceType,
		"admission_date":    student.AdmissionDate,
		"status":            student.Status,
		"previous_school":   student.PreviousSchool,
		"previous_class":    student.PreviousClass,
		"special_needs":     student.SpecialNeeds,
		"disability_status": student.DisabilityStatus,
		"class_name":        className,
		"class_id":          classID,
		"guardians":         guardians,
		"created_at":        student.CreatedAt,
		"updated_at":        student.UpdatedAt,
	}

	c.JSON(http.StatusOK, response)
}

func (h *StudentHandler) Update(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var student models.Student
	query := h.db.Where("id = ?", id)

	// Filter by school for non-system admins
	if schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}

	if err := query.First(&student).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	var req struct {
		FirstName        string     `json:"first_name"`
		MiddleName       string     `json:"middle_name"`
		LastName         string     `json:"last_name"`
		DateOfBirth      *time.Time `json:"date_of_birth"`
		Gender           string     `json:"gender"`
		Nationality      string     `json:"nationality"`
		Religion         string     `json:"religion"`
		LIN              string     `json:"lin"`
		Email            string     `json:"email"`
		Phone            string     `json:"phone"`
		Address          string     `json:"address"`
		District         string     `json:"district"`
		Village          string     `json:"village"`
		ResidenceType    string     `json:"residence_type"`
		Status           string     `json:"status"`
		PreviousSchool   string     `json:"previous_school"`
		PreviousClass    string     `json:"previous_class"`
		SpecialNeeds     string     `json:"special_needs"`
		DisabilityStatus string     `json:"disability_status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update only provided fields
	if req.FirstName != "" {
		student.FirstName = req.FirstName
	}
	if req.MiddleName != "" {
		student.MiddleName = req.MiddleName
	}
	if req.LastName != "" {
		student.LastName = req.LastName
	}
	if req.DateOfBirth != nil {
		student.DateOfBirth = req.DateOfBirth
	}
	if req.Gender != "" {
		student.Gender = req.Gender
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
	if req.Status != "" {
		student.Status = req.Status
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

	if err := h.db.Save(&student).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("student:updated", student, schoolID)
	c.JSON(http.StatusOK, student)
}

func (h *StudentHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	query := h.db.Where("id = ?", id)

	// Filter by school for non-system admins
	if schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}

	if err := query.Delete(&models.Student{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("student:deleted", gin.H{"id": id}, schoolID)
	c.JSON(http.StatusOK, gin.H{"message": "Student deleted"})
}

func (h *StudentHandler) PromoteOrDemote(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var req struct {
		NewClassLevel string `json:"new_class_level" binding:"required"`
		Year          int    `json:"year" binding:"required"`
		Term          string `json:"term" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get student
	var student models.Student
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&student).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	// Find or create the new class
	var newClass models.Class
	if err := h.db.Where("school_id = ? AND level = ? AND term = ? AND year = ?", schoolID, req.NewClassLevel, req.Term, req.Year).First(&newClass).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			newClass = models.Class{
				SchoolID: student.SchoolID,
				Name:     req.NewClassLevel,
				Level:    req.NewClassLevel,
				Year:     req.Year,
				Term:     req.Term,
			}
			if err := h.db.Create(&newClass).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create class"})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	// Deactivate current enrollment
	h.db.Model(&models.Enrollment{}).Where("student_id = ? AND status = ?", id, "active").Update("status", "inactive")

	// Create new enrollment
	enrollment := models.Enrollment{
		StudentID:  student.ID,
		ClassID:    newClass.ID,
		Year:       req.Year,
		Term:       req.Term,
		Status:     "active",
		EnrolledOn: time.Now(),
	}
	if err := h.db.Create(&enrollment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create enrollment"})
		return
	}

	ws.GlobalHub.Broadcast("student:promoted", gin.H{"student_id": id, "new_class": req.NewClassLevel}, schoolID)
	c.JSON(http.StatusOK, gin.H{"message": "Student class updated successfully", "new_class": req.NewClassLevel})
}
