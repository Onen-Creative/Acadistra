package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
)

type AnnouncementHandler struct {
	service *services.AnnouncementService
}

func NewAnnouncementHandler(service *services.AnnouncementService) *AnnouncementHandler {
	return &AnnouncementHandler{service: service}
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
	switch userRole {
	case "school_admin":
		if schoolID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "School admin must have a school_id"})
			return
		}
		parsed, _ := uuid.Parse(schoolID)
		schoolUUID = &parsed
	case "system_admin":
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

	if err := h.service.Create(&announcement); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create announcement"})
		return
	}

	c.JSON(http.StatusCreated, announcement)
}

func (h *AnnouncementHandler) SendAnnouncement(c *gin.Context) {
	announcementID := c.Param("id")
	userRole := c.GetString("user_role")
	schoolID := c.GetString("school_id")

	announcement, err := h.service.FindByID(announcementID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Announcement not found"})
		return
	}

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

	totalSent, totalFailed, err := h.service.SendAnnouncement(announcement)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send announcement"})
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

	announcements, err := h.service.FindAll(schoolID, userRole)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch announcements"})
		return
	}

	if announcements == nil {
		announcements = []models.SystemAnnouncement{}
	}

	c.JSON(http.StatusOK, announcements)
}

func (h *AnnouncementHandler) GetAnnouncement(c *gin.Context) {
	announcementID := c.Param("id")
	userRole := c.GetString("user_role")
	schoolID := c.GetString("school_id")

	announcement, err := h.service.FindByIDWithCreator(announcementID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Announcement not found"})
		return
	}

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

	announcement, err := h.service.FindByID(announcementID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Announcement not found"})
		return
	}

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

	if err := h.service.Delete(announcementID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete announcement"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Announcement deleted successfully"})
}
