package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
)

type ClassHandler struct {
	svc *services.ClassService
}

func NewClassHandler(svc *services.ClassService) *ClassHandler {
	return &ClassHandler{svc: svc}
}

func (h *ClassHandler) List(c *gin.Context) {
	result, err := h.svc.List(
		c.GetString("tenant_school_id"),
		c.Query("year"),
		c.Query("term"),
		c.Query("level"),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *ClassHandler) Create(c *gin.Context) {
	var class models.Class
	if err := c.ShouldBindJSON(&class); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.Create(&class, c.GetString("user_role"), c.GetString("tenant_school_id")); err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "no school assigned to user" || err.Error() == "invalid school ID" {
			status = http.StatusForbidden
		} else if err.Error() == "class with this level and stream already exists for this term/year" {
			status = http.StatusConflict
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, class)
}

func (h *ClassHandler) Get(c *gin.Context) {
	class, err := h.svc.Get(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, class)
}

func (h *ClassHandler) GetStudents(c *gin.Context) {
	students, err := h.svc.GetStudents(c.Param("id"), c.Query("year"), c.Query("term"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, students)
}

func (h *ClassHandler) GetLevels(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
		return
	}
	levels, err := h.svc.GetLevels(schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"levels": levels})
}

func (h *ClassHandler) Update(c *gin.Context) {
	var updates models.Class
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	class, err := h.svc.Update(c.Param("id"), &updates, c.GetString("user_role"), c.GetString("tenant_school_id"))
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "class not found" {
			status = http.StatusNotFound
		} else if err.Error() == "access denied" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, class)
}

func (h *ClassHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Param("id"), c.GetString("user_role"), c.GetString("tenant_school_id")); err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "class not found" {
			status = http.StatusNotFound
		} else if err.Error() == "access denied" {
			status = http.StatusForbidden
		} else if err.Error() == "cannot delete class with active enrollments" {
			status = http.StatusConflict
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Class deleted successfully"})
}

func (h *ClassHandler) GetTeacherClasses(c *gin.Context) {
	classes, err := h.svc.GetTeacherClasses(c.GetString("tenant_school_id"), c.Query("name"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"classes": classes})
}
