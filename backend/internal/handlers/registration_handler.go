package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"github.com/school-system/backend/internal/utils"
	ws "github.com/school-system/backend/internal/websocket"
	"gorm.io/gorm"
)

type RegistrationHandler struct {
	db           *gorm.DB
	emailService *services.EmailService
}

func NewRegistrationHandler(db *gorm.DB, emailService *services.EmailService) *RegistrationHandler {
	return &RegistrationHandler{
		db:           db,
		emailService: emailService,
	}
}

type GuardianInput struct {
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
}

type ComprehensiveRegistrationRequest struct {
	// Student Basic Info
	FirstName   string `json:"first_name" binding:"required"`
	MiddleName  string `json:"middle_name"`
	LastName    string `json:"last_name" binding:"required"`
	DateOfBirth string `json:"date_of_birth"`
	Gender      string `json:"gender" binding:"required"`
	Nationality string `json:"nationality"`
	Religion    string `json:"religion"`
	LIN         string `json:"lin"`

	// Contact Info
	Email   string `json:"email"`
	Phone   string `json:"phone"`
	Address string `json:"address"`
	District string `json:"district"`
	Village string `json:"village"`

	// Academic Info
	ClassLevel     string `json:"class_level" binding:"required"`
	ClassID        string `json:"class_id"`
	Term           string `json:"term" binding:"required"`
	Year           int    `json:"year" binding:"required"`
	ResidenceType  string `json:"residence_type"`
	PreviousSchool string `json:"previous_school"`
	PreviousClass  string `json:"previous_class"`

	// Special Needs
	SpecialNeeds     string `json:"special_needs"`
	DisabilityStatus string `json:"disability_status"`

	// Guardians (at least one required)
	Guardians []GuardianInput `json:"guardians" binding:"required,min=1"`
}

func (h *RegistrationHandler) RegisterStudent(c *gin.Context) {
	var req ComprehensiveRegistrationRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate guardians
	if len(req.Guardians) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one guardian is required"})
		return
	}

	// Validate guardian data
	for i, g := range req.Guardians {
		if err := utils.ValidateGuardianRelationship(g.Relationship); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Guardian %d: %s", i+1, err.Error())})
			return
		}
		if err := utils.ValidatePhone(g.Phone); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Guardian %d: %s", i+1, err.Error())})
			return
		}
		if err := utils.ValidateEmail(g.Email); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Guardian %d: %s", i+1, err.Error())})
			return
		}
	}

	// Validate student data
	if req.Email != "" {
		if err := utils.ValidateEmail(req.Email); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}
	if err := utils.ValidateResidenceType(req.ResidenceType); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get school
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
		var class models.Class
		if err := h.db.Preload("School").Where("level = ? AND term = ? AND year = ?", req.ClassLevel, req.Term, req.Year).First(&class).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Class not found"})
			return
		}
		school = *class.School
	}

	// Find or create class
	var class models.Class
	if req.ClassID != "" {
		// Use provided class_id
		if err := h.db.Where("id = ? AND school_id = ?", req.ClassID, school.ID).First(&class).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Class not found"})
			return
		}
	} else {
		// Find or create class by level
		if err := h.db.Where("school_id = ? AND level = ? AND term = ? AND year = ?", school.ID, req.ClassLevel, req.Term, req.Year).First(&class).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
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
	}

	// Start transaction
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Generate admission number using first letters of school name
	var schoolInitials string
	for _, word := range strings.Fields(school.Name) {
		if len(word) > 0 {
			schoolInitials += strings.ToUpper(string(word[0]))
		}
	}

	// Find last admission number (excluding soft-deleted)
	var lastStudent models.Student
	var sequence int = 0
	pattern := fmt.Sprintf("%s/%s/%d/%%", schoolInitials, class.Name, req.Year)
	if err := tx.Where("school_id = ? AND admission_no LIKE ?", school.ID, pattern).
		Order("admission_no DESC").First(&lastStudent).Error; err == nil {
		parts := strings.Split(lastStudent.AdmissionNo, "/")
		if len(parts) == 4 {
			if num, err := strconv.Atoi(parts[3]); err == nil {
				sequence = num
			}
		}
	}
	sequence++
	admissionNo := fmt.Sprintf("%s/%s/%d/%03d", schoolInitials, class.Name, req.Year, sequence)
	
	// Check if admission number already exists (including soft-deleted records)
	var existingStudent models.Student
	if err := tx.Unscoped().Where("school_id = ? AND admission_no = ?", school.ID, admissionNo).First(&existingStudent).Error; err == nil {
		// Admission number exists (even if soft-deleted), try next sequence
		for i := 0; i < 100; i++ { // Try up to 100 times
			sequence++
			admissionNo = fmt.Sprintf("%s/%s/%d/%03d", schoolInitials, class.Name, req.Year, sequence)
			if err := tx.Unscoped().Where("school_id = ? AND admission_no = ?", school.ID, admissionNo).First(&existingStudent).Error; err != nil {
				// Found available admission number
				break
			}
			if i == 99 {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to generate unique admission number after 100 attempts"})
				return
			}
		}
	}

	// Set defaults
	nationality := req.Nationality
	if nationality == "" {
		nationality = "Ugandan"
	}
	residenceType := req.ResidenceType
	if residenceType == "" {
		residenceType = "Day"
	}
	admissionDate := time.Now()

	// Parse date of birth
	var dateOfBirth *time.Time
	if req.DateOfBirth != "" {
		parsedDate, err := time.Parse("2006-01-02", req.DateOfBirth)
		if err == nil {
			dateOfBirth = &parsedDate
		}
	}

	// Create student
	student := models.Student{
		SchoolID:         school.ID,
		AdmissionNo:      admissionNo,
		LIN:              req.LIN,
		FirstName:        strings.Title(strings.ToLower(utils.NormalizeText(req.FirstName))),
		MiddleName:       strings.Title(strings.ToLower(utils.NormalizeText(req.MiddleName))),
		LastName:         strings.Title(strings.ToLower(utils.NormalizeText(req.LastName))),
		DateOfBirth:      dateOfBirth,
		Gender:           strings.Title(strings.ToLower(req.Gender)),
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

	if err := tx.Create(&student).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create student: " + err.Error()})
		return
	}

	// Create enrollment
	enrollment := models.Enrollment{
		StudentID:  student.ID,
		ClassID:    class.ID,
		Year:       req.Year,
		Term:       req.Term,
		Status:     "active",
		EnrolledOn: time.Now(),
	}
	if err := tx.Create(&enrollment).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create enrollment: " + err.Error()})
		return
	}

	// Create guardians
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
		if err := tx.Create(&guardian).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create guardian: " + err.Error()})
			return
		}
		createdGuardians = append(createdGuardians, guardian)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete registration: " + err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("student:registered", student, school.ID.String())
	
	// Send registration confirmation email to guardians
	go func(studentID uuid.UUID, studentName, admissionNo, schoolName string) {
		var guardians []models.Guardian
		h.db.Where("student_id = ?", studentID).Find(&guardians)
		
		for _, guardian := range guardians {
			if guardian.Email != "" {
				if err := h.emailService.SendRegistrationConfirmation(guardian.Email, studentName, admissionNo, schoolName); err != nil {
					log.Printf("Failed to send registration confirmation: %v", err)
				}
			}
		}
	}(student.ID, fmt.Sprintf("%s %s", student.FirstName, student.LastName), student.AdmissionNo, school.Name)
	
	c.JSON(http.StatusCreated, gin.H{
		"message":   "Student registered successfully",
		"student":   student,
		"guardians": createdGuardians,
		"class":     class,
	})
}
