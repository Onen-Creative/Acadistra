package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/utils"
	ws "github.com/school-system/backend/internal/websocket"
	"gorm.io/gorm"
)

type TeacherHandler struct {
	db *gorm.DB
}

func NewTeacherHandler(db *gorm.DB) *TeacherHandler {
	return &TeacherHandler{db: db}
}

func (h *TeacherHandler) List(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	search := c.Query("search")
	status := c.Query("status")
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")

	var teachers []models.Teacher
	query := h.db.Where("school_id = ?", schoolID)

	if search != "" {
		query = query.Where("first_name ILIKE ? OR last_name ILIKE ? OR employee_id ILIKE ? OR email ILIKE ?", 
			"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Model(&models.Teacher{}).Count(&total)

	offset := (utils.Atoi(page) - 1) * utils.Atoi(limit)
	if err := query.Offset(offset).Limit(utils.Atoi(limit)).Order("first_name, last_name").Find(&teachers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"teachers": teachers,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

func (h *TeacherHandler) Create(c *gin.Context) {
	var req models.Teacher
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("tenant_school_id")
	req.SchoolID = uuid.MustParse(schoolID)
	req.Status = "active"

	if err := h.db.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("teacher:created", req, schoolID)
	c.JSON(http.StatusCreated, req)
}

func (h *TeacherHandler) Get(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var teacher models.Teacher
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&teacher).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Teacher not found"})
		return
	}

	c.JSON(http.StatusOK, teacher)
}

func (h *TeacherHandler) Update(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var teacher models.Teacher
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&teacher).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Teacher not found"})
		return
	}

	var req models.Teacher
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Preserve ID and SchoolID
	req.ID = teacher.ID
	req.SchoolID = teacher.SchoolID

	if err := h.db.Save(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("teacher:updated", req, schoolID)
	c.JSON(http.StatusOK, req)
}

func (h *TeacherHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.Teacher{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("teacher:deleted", gin.H{"id": id}, schoolID)
	c.JSON(http.StatusOK, gin.H{"message": "Teacher deleted"})
}