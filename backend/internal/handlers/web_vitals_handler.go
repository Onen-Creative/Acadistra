package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/services"
)

type WebVitalsHandler struct {
	service *services.WebVitalsService
}

func NewWebVitalsHandler(service *services.WebVitalsService) *WebVitalsHandler {
	return &WebVitalsHandler{service: service}
}

type WebVitalRequest struct {
	Name   string  `json:"name" binding:"required"`
	Value  float64 `json:"value" binding:"required"`
	Rating string  `json:"rating"`
	Delta  float64 `json:"delta"`
	ID     string  `json:"id"`
}

func (h *WebVitalsHandler) RecordWebVital(c *gin.Context) {
	var req WebVitalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	schoolID := c.GetString("tenant_school_id")

	svcReq := &services.WebVitalRequest{
		Name:      req.Name,
		Value:     req.Value,
		Rating:    req.Rating,
		Delta:     req.Delta,
		ID:        req.ID,
		URL:       c.Request.Referer(),
		UserAgent: c.Request.UserAgent(),
	}

	if userID != "" {
		if uid, err := uuid.Parse(userID); err == nil {
			svcReq.UserID = &uid
		}
	}

	if schoolID != "" {
		if sid, err := uuid.Parse(schoolID); err == nil {
			svcReq.SchoolID = &sid
		}
	}

	if err := h.service.RecordWebVital(svcReq); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record metric"})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *WebVitalsHandler) GetWebVitalsStats(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	metricName := c.Query("name")

	stats, err := h.service.GetStats(schoolID, metricName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"stats": stats})
}
