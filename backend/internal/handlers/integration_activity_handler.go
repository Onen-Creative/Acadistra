package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type IntegrationActivityHandler struct {
	db *gorm.DB
}

func NewIntegrationActivityHandler(db *gorm.DB) *IntegrationActivityHandler {
	return &IntegrationActivityHandler{db: db}
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

	query := h.db.Where("class_id = ? AND term = ? AND year = ? AND school_id = ?", classID, term, year, schoolID)
	if subjectID != "" {
		query = query.Where("subject_id = ?", subjectID)
	}

	var activities []models.IntegrationActivity
	if err := query.Preload("Student").Preload("Subject").Find(&activities).Error; err != nil {
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

	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	subjectID, err := uuid.Parse(req.SubjectID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subject ID: " + req.SubjectID})
		return
	}

	classID, err := uuid.Parse(req.ClassID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class ID"})
		return
	}

	schoolID := c.GetString("tenant_school_id")

	// Validate marks are between 0 and 3
	for _, v := range req.Marks {
		if mark, ok := v.(float64); ok {
			if mark < 0 || mark > 3 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Marks must be between 0 and 3"})
				return
			}
		}
	}

	var activity models.IntegrationActivity
	err = h.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ?", studentID, subjectID, req.Term, req.Year).
		First(&activity).Error

	if err == gorm.ErrRecordNotFound {
		activity = models.IntegrationActivity{
			StudentID: studentID,
			SubjectID: subjectID,
			ClassID:   classID,
			SchoolID:  uuid.MustParse(schoolID),
			Term:      req.Term,
			Year:      req.Year,
			Marks:     req.Marks,
		}
		if err := h.db.Create(&activity).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	} else {
		activity.Marks = req.Marks
		if err := h.db.Save(&activity).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, activity)
}
