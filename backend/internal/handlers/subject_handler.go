package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
)

type SubjectHandler struct {
	subjectService         *services.SubjectService
	standardSubjectService *services.StandardSubjectService
}

func NewSubjectHandler(subjectService *services.SubjectService, standardSubjectService *services.StandardSubjectService) *SubjectHandler {
	return &SubjectHandler{
		subjectService:         subjectService,
		standardSubjectService: standardSubjectService,
	}
}

func (h *SubjectHandler) List(c *gin.Context) {
	level := c.Query("level")

	if level != "" {
		standardSubjects, err := h.standardSubjectService.GetSubjectsForLevel(level)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var subjects []models.StandardSubject
		for _, std := range standardSubjects {
			subjects = append(subjects, models.StandardSubject{
				BaseModel:    models.BaseModel{ID: std.ID},
				Name:         std.Name,
				Code:         std.Code,
				Level:        level,
				IsCompulsory: std.IsCompulsory,
				Papers:       std.Papers,
			})
		}
		c.JSON(http.StatusOK, subjects)
		return
	}

	subjects, err := h.subjectService.ListAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var result []models.StandardSubject
	for _, std := range subjects {
		result = append(result, models.StandardSubject{
			BaseModel:    models.BaseModel{ID: std.ID},
			Name:         std.Name,
			Code:         std.Code,
			Level:        std.Level,
			IsCompulsory: std.IsCompulsory,
			Papers:       std.Papers,
		})
	}
	c.JSON(http.StatusOK, result)
}

func (h *SubjectHandler) Create(c *gin.Context) {
	c.JSON(http.StatusForbidden, gin.H{
		"error":   "Custom subjects not allowed",
		"message": "All schools must use standardized curriculum subjects. Contact system administrator to add new standard subjects.",
	})
}

func (h *SubjectHandler) Update(c *gin.Context) {
	c.JSON(http.StatusForbidden, gin.H{
		"error":   "Cannot modify standard subjects",
		"message": "Standard curriculum subjects cannot be modified. Contact system administrator for curriculum changes.",
	})
}

func (h *SubjectHandler) Delete(c *gin.Context) {
	c.JSON(http.StatusForbidden, gin.H{
		"error":   "Cannot delete standard subjects",
		"message": "Standard curriculum subjects cannot be deleted. Contact system administrator for curriculum changes.",
	})
}

func (h *SubjectHandler) GetLevels(c *gin.Context) {
	levels, err := h.standardSubjectService.GetAllLevels()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var expandedLevels []string
	for _, level := range levels {
		if level == "Nursery" {
			expandedLevels = append(expandedLevels, "Baby", "Middle", "Top")
		} else {
			expandedLevels = append(expandedLevels, level)
		}
	}

	c.JSON(http.StatusOK, gin.H{"levels": expandedLevels})
}

func (h *SubjectHandler) CreateStandardSubject(c *gin.Context) {
	var standardSubject models.StandardSubject
	if err := c.ShouldBindJSON(&standardSubject); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.subjectService.Create(&standardSubject); err != nil {
		if err.Error() == "standard subject already exists for this level" {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, standardSubject)
}

func (h *SubjectHandler) UpdateStandardSubject(c *gin.Context) {
	id := c.Param("id")

	var standardSubject models.StandardSubject
	if err := c.ShouldBindJSON(&standardSubject); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.subjectService.Update(id, &standardSubject); err != nil {
		if err.Error() == "standard subject not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	subject, _ := h.subjectService.GetByID(id)
	c.JSON(http.StatusOK, subject)
}

func (h *SubjectHandler) DeleteStandardSubject(c *gin.Context) {
	id := c.Param("id")
	if err := h.subjectService.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Standard subject deleted"})
}

func (h *SubjectHandler) ListStandardSubjects(c *gin.Context) {
	level := c.Query("level")

	var subjects []models.StandardSubject
	var err error

	if level != "" {
		subjects, err = h.subjectService.ListByLevel(level)
	} else {
		subjects, err = h.subjectService.ListAll()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, subjects)
}

func (h *SubjectHandler) GetSchoolSubjects(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	subjects, err := h.subjectService.GetSchoolSubjects(schoolID)
	if err != nil {
		if err.Error() == "school not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, subjects)
}
