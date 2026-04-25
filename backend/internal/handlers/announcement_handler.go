package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"gorm.io/gorm"
)

type AnnouncementHandler struct {
	db           *gorm.DB
	emailService *services.EmailService
}

func NewAnnouncementHandler(db *gorm.DB, emailService *services.EmailService) *AnnouncementHandler {
	return &AnnouncementHandler{db: db, emailService: emailService}
}

type CreateAnnouncementRequest struct {
	Title        string     `json:"title" binding:"required"`
	Message      string     `json:"message" binding:"required"`
	TargetRoles  []string   `json:"target_roles" binding:"required"`
	Priority     string     `json:"priority"`
	SendEmail    bool       `json:"send_email"`
	SendSMS      bool       `json:"send_sms"`
	ScheduledFor *time.Time `json:"scheduled_for"`
}

func (h *AnnouncementHandler) CreateAnnouncement(c *gin.Context) {
	var req CreateAnnouncementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	schoolID := c.GetString("school_id")
	userRole := c.GetString("user_role")

	var schoolUUID *uuid.UUID
	// School admin can only create announcements for their school
	switch userRole {
	case "school_admin":
		if schoolID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "School admin must have a school_id"})
			return
		}
		parsed, _ := uuid.Parse(schoolID)
		schoolUUID = &parsed
	case "system_admin":
		// System admin can create announcements for any school or system-wide (null school_id)
		if schoolID != "" {
			parsed, _ := uuid.Parse(schoolID)
			schoolUUID = &parsed
		}
	}

	announcement := models.SystemAnnouncement{
		SchoolID:     schoolUUID,
		Title:        req.Title,
		Message:      req.Message,
		TargetRoles:  models.JSONB{"roles": req.TargetRoles},
		Priority:     req.Priority,
		SendEmail:    req.SendEmail,
		SendSMS:      req.SendSMS,
		Status:       "draft",
		ScheduledFor: req.ScheduledFor,
		CreatedBy:    uuid.MustParse(userID),
	}

	if req.Priority == "" {
		announcement.Priority = "normal"
	}

	if err := h.db.Create(&announcement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create announcement"})
		return
	}

	c.JSON(http.StatusCreated, announcement)
}

func (h *AnnouncementHandler) SendAnnouncement(c *gin.Context) {
	announcementID := c.Param("id")
	userRole := c.GetString("user_role")
	schoolID := c.GetString("school_id")

	var announcement models.SystemAnnouncement
	if err := h.db.First(&announcement, "id = ?", announcementID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Announcement not found"})
		return
	}

	// School admin can only send announcements for their school
	if userRole == "school_admin" {
		if announcement.SchoolID == nil || announcement.SchoolID.String() != schoolID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only send announcements for your school"})
			return
		}
	}

	if announcement.Status == "sent" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Announcement already sent"})
		return
	}

	// Get target users
	var users []models.User
	query := h.db.Where("is_active = ?", true)

	// Filter by school - school_admin announcements are always school-specific
	if announcement.SchoolID != nil {
		query = query.Where("school_id = ?", announcement.SchoolID)
	}

	roles := announcement.TargetRoles["roles"].([]interface{})
	roleStrings := make([]string, len(roles))
	for i, r := range roles {
		roleStrings[i] = r.(string)
	}
	query = query.Where("role IN ?", roleStrings)

	if err := query.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	// Send emails and create notifications
	totalSent := 0
	totalFailed := 0

	for _, user := range users {
		// Create notification for user (always create, regardless of email)
		notification := models.UserNotification{
			UserID:         user.ID,
			AnnouncementID: &announcement.ID,
			Title:          announcement.Title,
			Message:        announcement.Message,
			Priority:       announcement.Priority,
			IsRead:         false,
		}
		h.db.Create(&notification)

		// Send email if requested, service is available, and user has email
		if announcement.SendEmail && h.emailService != nil && user.Email != "" {
			err := h.emailService.SendSystemAnnouncement(user.Email, user.FullName, announcement.Title, announcement.Message, announcement.Priority)
			if err != nil {
				totalFailed++
			} else {
				totalSent++
			}
		}
	}

	// Update announcement status
	now := time.Now()
	announcement.Status = "sent"
	announcement.SentAt = &now
	announcement.TotalSent = totalSent
	announcement.TotalFailed = totalFailed

	if err := h.db.Save(&announcement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update announcement"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Announcement sent successfully",
		"total_sent":   totalSent,
		"total_failed": totalFailed,
		"announcement": announcement,
	})
}

func (h *AnnouncementHandler) ListAnnouncements(c *gin.Context) {
	schoolID := c.GetString("school_id")
	userRole := c.GetString("user_role")

	var announcements []models.SystemAnnouncement
	query := h.db.Order("created_at DESC")

	// System admin sees all announcements
	// School admin sees only their school's announcements
	if userRole == "school_admin" && schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}

	if err := query.Find(&announcements).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch announcements"})
		return
	}

	// Return empty array if no announcements
	if announcements == nil {
		announcements = []models.SystemAnnouncement{}
	}

	c.JSON(http.StatusOK, announcements)
}

func (h *AnnouncementHandler) GetAnnouncement(c *gin.Context) {
	announcementID := c.Param("id")
	userRole := c.GetString("user_role")
	schoolID := c.GetString("school_id")

	var announcement models.SystemAnnouncement
	if err := h.db.Preload("Creator").First(&announcement, "id = ?", announcementID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Announcement not found"})
		return
	}

	// School admin can only view announcements for their school
	if userRole == "school_admin" {
		if announcement.SchoolID == nil || announcement.SchoolID.String() != schoolID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only view announcements for your school"})
			return
		}
	}

	c.JSON(http.StatusOK, announcement)
}

func (h *AnnouncementHandler) DeleteAnnouncement(c *gin.Context) {
	announcementID := c.Param("id")
	userRole := c.GetString("user_role")
	schoolID := c.GetString("school_id")

	var announcement models.SystemAnnouncement
	if err := h.db.First(&announcement, "id = ?", announcementID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Announcement not found"})
		return
	}

	// School admin can only delete announcements for their school
	if userRole == "school_admin" {
		if announcement.SchoolID == nil || announcement.SchoolID.String() != schoolID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete announcements for your school"})
			return
		}
	}

	if announcement.Status == "sent" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete sent announcement"})
		return
	}

	if err := h.db.Delete(&announcement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete announcement"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Announcement deleted successfully"})
}
