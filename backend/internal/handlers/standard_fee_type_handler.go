package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
	"gorm.io/gorm"
)

type StandardFeeTypeHandler struct {
	service *services.StandardFeeTypeService
}

func NewStandardFeeTypeHandler(db *gorm.DB) *StandardFeeTypeHandler {
	return &StandardFeeTypeHandler{
		service: services.NewStandardFeeTypeService(db),
	}
}

// GetAllFeeTypes returns all standard fee types
func (h *StandardFeeTypeHandler) GetAllFeeTypes(c *gin.Context) {
	feeTypes, err := h.service.GetAllFeeTypes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"fee_types": feeTypes})
}

// GetFeeTypesByLevel returns fee types applicable to a specific level
func (h *StandardFeeTypeHandler) GetFeeTypesByLevel(c *gin.Context) {
	level := c.Query("level")
	if level == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Level parameter is required"})
		return
	}

	feeTypes, err := h.service.GetFeeTypesByLevel(level)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"fee_types": feeTypes})
}

// GetFeeTypesByCategory returns fee types by category
func (h *StandardFeeTypeHandler) GetFeeTypesByCategory(c *gin.Context) {
	category := c.Query("category")
	if category == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Category parameter is required"})
		return
	}

	feeTypes, err := h.service.GetFeeTypesByCategory(category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"fee_types": feeTypes})
}

// GetCompulsoryFeeTypes returns only compulsory fee types for a level
func (h *StandardFeeTypeHandler) GetCompulsoryFeeTypes(c *gin.Context) {
	level := c.Query("level")
	if level == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Level parameter is required"})
		return
	}

	feeTypes, err := h.service.GetCompulsoryFeeTypes(level)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"fee_types": feeTypes})
}

// GetFeeTypeCategories returns all unique categories
func (h *StandardFeeTypeHandler) GetFeeTypeCategories(c *gin.Context) {
	categories, err := h.service.GetFeeTypeCategories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"categories": categories})
}

// SeedStandardFeeTypes seeds the database with standard fee types
func (h *StandardFeeTypeHandler) SeedStandardFeeTypes(c *gin.Context) {
	err := h.service.SeedStandardFeeTypes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Standard fee types seeded successfully"})
}