package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type AuditHandler struct {
	db *gorm.DB
}

func NewAuditHandler(db *gorm.DB) *AuditHandler {
	return &AuditHandler{db: db}
}

func (h *AuditHandler) GetRecentActivity(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit > 100 {
		limit = 20
	}

	actionFilter := c.Query("action")

	type ActivityWithUser struct {
		models.AuditLog
		UserName   string `json:"user_name"`
		SchoolName string `json:"school_name,omitempty"`
	}

	query := h.db.Table("audit_logs").
		Select("audit_logs.*, users.full_name as user_name, schools.name as school_name").
		Joins("LEFT JOIN users ON audit_logs.actor_user_id = users.id").
		Joins("LEFT JOIN schools ON users.school_id = schools.id")

	if actionFilter != "" {
		query = query.Where("audit_logs.action = ?", actionFilter)
	}

	var activities []ActivityWithUser
	if err := query.Order("audit_logs.timestamp DESC").
		Limit(limit).
		Scan(&activities).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, activities)
}