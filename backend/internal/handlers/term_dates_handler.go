package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type TermDatesHandler struct {
	db *gorm.DB
}

func NewTermDatesHandler(db *gorm.DB) *TermDatesHandler {
	return &TermDatesHandler{db: db}
}

// CreateOrUpdate - Create or update term dates
func (h *TermDatesHandler) CreateOrUpdate(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	var req struct {
		Year      int    `json:"year" binding:"required"`
		Term      string `json:"term" binding:"required"`
		StartDate string `json:"start_date" binding:"required"`
		EndDate   string `json:"end_date" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format"})
		return
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format"})
		return
	}

	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End date must be after start date"})
		return
	}

	var termDates models.TermDates
	result := h.db.Where("school_id = ? AND year = ? AND term = ?", schoolID, req.Year, req.Term).First(&termDates)

	if result.Error == nil {
		// Update existing
		termDates.StartDate = startDate
		termDates.EndDate = endDate
		if err := h.db.Save(&termDates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, termDates)
		return
	}

	// Create new
	termDates = models.TermDates{
		SchoolID:  uuid.MustParse(schoolID),
		Year:      req.Year,
		Term:      req.Term,
		StartDate: startDate,
		EndDate:   endDate,
	}

	if err := h.db.Create(&termDates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, termDates)
}

// List - Get all term dates for a school
func (h *TermDatesHandler) List(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	year := c.Query("year")

	query := h.db.Where("school_id = ?", schoolID)
	if year != "" {
		query = query.Where("year = ?", year)
	}

	var termDates []models.TermDates
	if err := query.Order("year DESC, term").Find(&termDates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, termDates)
}

// Get - Get specific term dates
func (h *TermDatesHandler) Get(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	year := c.Query("year")
	term := c.Query("term")

	if year == "" || term == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "year and term are required"})
		return
	}

	var termDates models.TermDates
	if err := h.db.Where("school_id = ? AND year = ? AND term = ?", schoolID, year, term).First(&termDates).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Term dates not found"})
		return
	}

	c.JSON(http.StatusOK, termDates)
}

// Delete - Delete term dates
func (h *TermDatesHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.TermDates{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Term dates deleted successfully"})
}
