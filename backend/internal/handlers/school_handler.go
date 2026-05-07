package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/school-system/backend/internal/models"

	"github.com/school-system/backend/internal/services"
	"gorm.io/gorm"
)

type SchoolHandler struct {
	service      *services.SchoolService
	setupService *services.SchoolSetupService
	auditService *services.AuditService
}

func NewSchoolHandler(service *services.SchoolService, setupService *services.SchoolSetupService, auditService *services.AuditService) *SchoolHandler {
	return &SchoolHandler{
		service:      service,
		setupService: setupService,
		auditService: auditService,
	}
}

func (h *SchoolHandler) List(c *gin.Context) {
	page := 1
	limit := 10
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}
	search := c.Query("search")

	schools, total, err := h.service.List(page, limit, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"schools": schools,
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}

func (h *SchoolHandler) Create(c *gin.Context) {
	var req struct {
		Name         string   `json:"name" binding:"required"`
		Address      string   `json:"address"`
		Country      string   `json:"country"`
		Region       string   `json:"region"`
		ContactEmail string   `json:"contact_email"`
		Phone        string   `json:"phone"`
		LogoURL      string   `json:"logo_url"`
		Motto        string   `json:"motto"`
		SchoolType   string   `json:"school_type" binding:"required"`
		ModuleCodes  []string `json:"module_codes" binding:"required"` // Deprecated - no longer used
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	school, err := h.service.CreateWithLevels(req.Name, req.SchoolType, req.Address, req.Country, req.Region, req.ContactEmail, req.Phone, req.LogoURL, req.Motto)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, school)
}

func (h *SchoolHandler) Get(c *gin.Context) {
	id := c.Param("id")

	details, err := h.service.GetDetails(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, details)
}

func (h *SchoolHandler) GetMySchool(c *gin.Context) {
	tenantSchoolID := c.GetString("tenant_school_id")

	details, err := h.service.GetDetails(tenantSchoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
		return
	}

	c.JSON(http.StatusOK, details.School)
}

func (h *SchoolHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Name         string       `json:"name"`
		Type         string       `json:"type"`
		SchoolType   string       `json:"school_type"`
		Address      string       `json:"address"`
		Country      string       `json:"country"`
		Region       string       `json:"region"`
		ContactEmail string       `json:"contact_email"`
		Phone        string       `json:"phone"`
		LogoURL      string       `json:"logo_url"`
		Motto        string       `json:"motto"`
		Config       models.JSONB `json:"config"`
		ModuleCodes  []string     `json:"module_codes"` // Deprecated - no longer used
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolType := req.Type
	if schoolType == "" {
		schoolType = req.SchoolType
	}

	school, err := h.service.UpdateWithConfig(id, req.Name, schoolType, req.Address, req.Country, req.Region, req.ContactEmail, req.Phone, req.LogoURL, req.Motto, req.Config)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if req.Config != nil {
		if newLevels, ok := req.Config["levels"].([]interface{}); ok {
			var levels []string
			for _, lvl := range newLevels {
				if level, ok := lvl.(string); ok {
					levels = append(levels, level)
				}
			}
			if err := h.setupService.SetupNewLevels(school.ID, levels); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to setup new levels: " + err.Error()})
				return
			}
		}
	}

	c.JSON(http.StatusOK, school)
}

func (h *SchoolHandler) SetupSchool(c *gin.Context) {
	id := c.Param("id")

	levels, err := h.service.GetLevels(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
		return
	}

	details, err := h.service.GetDetails(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
		return
	}

	if err := h.setupService.SetupSchool(&details.School, levels); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to setup school: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "School setup completed successfully"})
}

func (h *SchoolHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if _, err := h.service.GetDetails(id); err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch school"})
		return
	}

	idUint, _ := strconv.ParseUint(id, 10, 32)
	if err := h.service.Delete(uint(idUint)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete school"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "School deleted successfully"})
}

func (h *SchoolHandler) ToggleActive(c *gin.Context) {
	id := c.Param("id")

	school, err := h.service.ToggleActive(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update school status"})
		return
	}

	c.JSON(http.StatusOK, school)
}

func (h *SchoolHandler) GetSchoolSummary(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	period := c.Query("period")

	if year == "" {
		year = "2026"
	}
	if term == "" {
		term = "Term 1"
	}

	yearInt, _ := strconv.Atoi(year)

	summary, err := h.service.GetSummary(schoolID, term, yearInt, period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}

func (h *SchoolHandler) GetStats(c *gin.Context) {
	stats, err := h.service.GetStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

func (h *SchoolHandler) GetSchoolLevels(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	levels, err := h.service.GetLevels(schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"levels": levels})
}
