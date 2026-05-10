package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/services"
	"gorm.io/gorm"
)

type StaffSMSHandler struct {
	db                  *gorm.DB
	notificationService *services.NotificationService
}

func NewStaffSMSHandler(db *gorm.DB, notificationService *services.NotificationService) *StaffSMSHandler {
	return &StaffSMSHandler{
		db:                  db,
		notificationService: notificationService,
	}
}

// SendStaffSMS sends SMS to staff members
func (h *StaffSMSHandler) SendStaffSMS(c *gin.Context) {
	var req struct {
		Subject  string   `json:"subject" binding:"required"`
		Message  string   `json:"message" binding:"required"`
		StaffIDs []string `json:"staff_ids"` // Empty = all staff
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
		return
	}

	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID required"})
		return
	}

	// Convert staff IDs
	staffIDs := make([]uuid.UUID, 0)
	for _, id := range req.StaffIDs {
		if staffID, err := uuid.Parse(id); err == nil {
			staffIDs = append(staffIDs, staffID)
		}
	}

	err := h.notificationService.SendStaffAnnouncement(
		uuid.MustParse(schoolID),
		req.Message,
		req.Subject,
		uuid.MustParse(userID),
		staffIDs,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "SMS sent to staff successfully",
		"count":   len(staffIDs),
	})
}

// SendStaffSMSByDepartment sends SMS to staff by department
func (h *StaffSMSHandler) SendStaffSMSByDepartment(c *gin.Context) {
	var req struct {
		Subject    string   `json:"subject" binding:"required"`
		Message    string   `json:"message" binding:"required"`
		Departments []string `json:"departments"` // e.g., ["Academic", "Finance"]
		Roles      []string `json:"roles"`       // e.g., ["Teacher", "Admin"]
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
		return
	}

	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID required"})
		return
	}

	// Query staff by department/role
	query := h.db.Where("school_id = ? AND status = 'active'", schoolID)
	
	if len(req.Departments) > 0 {
		query = query.Where("department IN ?", req.Departments)
	}
	
	if len(req.Roles) > 0 {
		query = query.Where("role IN ?", req.Roles)
	}

	var staffIDs []uuid.UUID
	query.Model(&struct{ ID uuid.UUID }{}).Pluck("id", &staffIDs)

	err := h.notificationService.SendStaffAnnouncement(
		uuid.MustParse(schoolID),
		req.Message,
		req.Subject,
		uuid.MustParse(userID),
		staffIDs,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "SMS sent to staff successfully",
		"count":   len(staffIDs),
	})
}

// SendParentSMS sends SMS to parents/guardians
func (h *StaffSMSHandler) SendParentSMS(c *gin.Context) {
	var req struct {
		Subject     string   `json:"subject" binding:"required"`
		Message     string   `json:"message" binding:"required"`
		GuardianIDs []string `json:"guardian_ids"` // Empty = all guardians
		ClassIDs    []string `json:"class_ids"`    // Filter by class
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
		return
	}

	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID required"})
		return
	}

	// Get guardians
	var guardianIDs []uuid.UUID
	
	if len(req.GuardianIDs) > 0 {
		// Specific guardians
		for _, id := range req.GuardianIDs {
			if gid, err := uuid.Parse(id); err == nil {
				guardianIDs = append(guardianIDs, gid)
			}
		}
	} else if len(req.ClassIDs) > 0 {
		// Guardians of students in specific classes
		h.db.Raw(`
			SELECT DISTINCT g.id 
			FROM guardians g
			JOIN students s ON g.student_id = s.id
			JOIN enrollments e ON s.id = e.student_id
			WHERE e.class_id IN ? AND e.status = 'active' AND g.school_id = ?
		`, req.ClassIDs, schoolID).Pluck("id", &guardianIDs)
	} else {
		// All guardians
		h.db.Model(&struct{ ID uuid.UUID }{}).
			Where("school_id = ?", schoolID).
			Table("guardians").
			Pluck("id", &guardianIDs)
	}

	err := h.notificationService.SendBulkAnnouncement(
		uuid.MustParse(schoolID),
		req.Message,
		req.Subject,
		uuid.MustParse(userID),
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "SMS sent to parents successfully",
		"count":   len(guardianIDs),
	})
}
