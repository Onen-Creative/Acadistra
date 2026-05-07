package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
)

type IntegrationActivityHandler struct {
	service *services.IntegrationActivityService
}

func NewIntegrationActivityHandler(service *services.IntegrationActivityService) *IntegrationActivityHandler {
	return &IntegrationActivityHandler{service: service}
}

func (h *IntegrationActivityHandler) GetByClass(c *gin.Context) {
	classID := c.Query("class_id")
	subjectID := c.Query("subject_id")
	term := c.Query("term")
	year := c.Query("year")
	schoolID := c.GetString("tenant_school_id")

	if classID == "" || term == "" || year == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_id, term, and year are required"})
		return
	}

	activities, err := h.service.GetByClass(schoolID, classID, subjectID, term, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"activities": activities})
}

func (h *IntegrationActivityHandler) CreateOrUpdate(c *gin.Context) {
	var req struct {
		StudentID string       `json:"student_id" binding:"required"`
		SubjectID string       `json:"subject_id" binding:"required"`
		ClassID   string       `json:"class_id" binding:"required"`
		Term      string       `json:"term" binding:"required"`
		Year      int          `json:"year" binding:"required"`
		Marks     models.JSONB `json:"marks" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.SubjectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "subject_id is required and cannot be empty"})
		return
	}

	if _, err := uuid.Parse(req.StudentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	if _, err := uuid.Parse(req.SubjectID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subject ID: " + req.SubjectID})
		return
	}

	if _, err := uuid.Parse(req.ClassID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID"})
		return
	}

	schoolID := c.GetString("tenant_school_id")

	activity, err := h.service.CreateOrUpdate(schoolID, req.StudentID, req.SubjectID, req.ClassID, req.Term, req.Year, req.Marks)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, activity)
}
