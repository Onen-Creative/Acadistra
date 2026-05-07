package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
)

type ClinicHandler struct {
	service *services.ClinicService
}

func NewClinicHandler(service *services.ClinicService) *ClinicHandler {
	return &ClinicHandler{service: service}
}

// ============ HEALTH PROFILES ============

func (h *ClinicHandler) CreateHealthProfile(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	
	var profile models.StudentHealthProfile
	if err := c.ShouldBindJSON(&profile); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if err := h.service.CreateHealthProfile(&profile, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, profile)
}

func (h *ClinicHandler) GetHealthProfile(c *gin.Context) {
	studentID := c.Param("student_id")
	schoolID := c.GetString("tenant_school_id")
	
	profile, err := h.service.GetHealthProfile(studentID, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Health profile not found"})
		return
	}
	
	c.JSON(http.StatusOK, profile)
}

func (h *ClinicHandler) GetHealthProfileByID(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	
	profile, err := h.service.GetHealthProfileByID(id, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Health profile not found"})
		return
	}
	
	c.JSON(http.StatusOK, profile)
}

func (h *ClinicHandler) GetStudentHealthData(c *gin.Context) {
	studentID := c.Param("student_id")
	schoolID := c.GetString("tenant_school_id")
	
	data, err := h.service.GetStudentHealthData(studentID, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}
	
	c.JSON(http.StatusOK, data)
}

func (h *ClinicHandler) UpdateHealthProfile(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var updates models.StudentHealthProfile
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.UpdateHealthProfile(id, schoolID, &updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update health profile"})
		return
	}

	profile, _ := h.service.GetHealthProfileByID(id, schoolID)
	c.JSON(http.StatusOK, profile)
}

func (h *ClinicHandler) DeleteHealthProfile(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	if err := h.service.DeleteHealthProfile(id, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete health profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Health profile deleted successfully"})
}

// ============ CLINIC VISITS ============

func (h *ClinicHandler) CreateVisit(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")
	
	var req struct {
		models.ClinicVisit
		Tests       []models.MedicalTest              `json:"tests"`
		Medications []models.MedicationAdministration `json:"medications"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if err := h.service.CreateVisit(&req.ClinicVisit, req.Tests, req.Medications, schoolID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	h.service.SendHealthAlert(&req.ClinicVisit)
	
	c.JSON(http.StatusCreated, req.ClinicVisit)
}

func (h *ClinicHandler) GetVisits(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	
	visits, total, err := h.service.GetVisits(schoolID, term, year, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"visits": visits, "total": total})
}

func (h *ClinicHandler) GetVisit(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	
	visit, err := h.service.GetVisit(id, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Visit not found"})
		return
	}
	
	c.JSON(http.StatusOK, visit)
}

func (h *ClinicHandler) UpdateVisit(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	
	var updates models.ClinicVisit
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if err := h.service.UpdateVisit(id, schoolID, &updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update visit"})
		return
	}
	
	visit, _ := h.service.GetVisit(id, schoolID)
	c.JSON(http.StatusOK, visit)
}

func (h *ClinicHandler) DeleteVisit(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	
	if err := h.service.DeleteVisit(id, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete visit"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Visit deleted successfully"})
}

// ============ MEDICAL TESTS ============

func (h *ClinicHandler) CreateTest(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")
	
	var test models.MedicalTest
	if err := c.ShouldBindJSON(&test); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	test.SchoolID = uuid.MustParse(schoolID)
	test.PerformedBy = uuid.MustParse(userID)
	
	if err := h.service.CreateTest(&test); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, test)
}

func (h *ClinicHandler) GetTests(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	visitID := c.Query("visit_id")
	studentID := c.Query("student_id")
	
	tests, _, err := h.service.ListTests(schoolID, studentID, "", "", 1, 1000)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	// Filter by visitID if provided
	if visitID != "" {
		filtered := []models.MedicalTest{}
		for _, test := range tests {
			if test.VisitID.String() == visitID {
				filtered = append(filtered, test)
			}
		}
		tests = filtered
	}
	
	c.JSON(http.StatusOK, gin.H{"tests": tests})
}

// ============ MEDICINES ============

func (h *ClinicHandler) ListMedicines(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	search := c.Query("search")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	
	medicines, total, err := h.service.ListMedicines(schoolID, term, year, search, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"medicines": medicines, "total": total, "page": page, "limit": limit})
}

func (h *ClinicHandler) CreateMedicine(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	
	var medicine models.Medicine
	if err := c.ShouldBindJSON(&medicine); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if err := h.service.CreateMedicine(&medicine, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, medicine)
}

func (h *ClinicHandler) DeleteMedicine(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	
	if err := h.service.DeleteMedicine(id, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Medicine deleted"})
}

func (h *ClinicHandler) UpdateMedicine(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	medicine, err := h.service.GetMedicine(id, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Medicine not found"})
		return
	}

	if err := c.ShouldBindJSON(&medicine); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.UpdateMedicine(id, schoolID, medicine); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update medicine"})
		return
	}

	c.JSON(http.StatusOK, medicine)
}

// ============ MEDICATION ADMINISTRATION ============

func (h *ClinicHandler) AdministerMedication(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")
	
	var admin models.MedicationAdministration
	if err := c.ShouldBindJSON(&admin); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	admin.SchoolID = uuid.MustParse(schoolID)
	admin.AdministeredBy = uuid.MustParse(userID)
	admin.AdministeredAt = time.Now()
	
	if err := h.service.AdministerMedication(&admin); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, admin)
}

func (h *ClinicHandler) GetMedicationHistory(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Query("student_id")
	visitID := c.Query("visit_id")
	
	history, err := h.service.GetMedicationHistory(schoolID, studentID, visitID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"history": history})
}

// ============ CONSUMABLES ============

func (h *ClinicHandler) ListConsumables(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	search := c.Query("search")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	
	consumables, total, err := h.service.ListConsumables(schoolID, term, year, search, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"consumables": consumables, "total": total, "page": page, "limit": limit})
}

func (h *ClinicHandler) CreateConsumable(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	
	var consumable models.ClinicConsumable
	if err := c.ShouldBindJSON(&consumable); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	consumable.SchoolID = uuid.MustParse(schoolID)
	if consumable.InitialQuantity == 0 {
		consumable.InitialQuantity = consumable.Quantity
	}
	
	if err := h.service.CreateConsumable(&consumable, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, consumable)
}

func (h *ClinicHandler) DeleteConsumable(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	
	if err := h.service.DeleteConsumable(id, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Consumable deleted"})
}

func (h *ClinicHandler) UpdateConsumable(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	consumable, err := h.service.GetConsumable(id, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Consumable not found"})
		return
	}

	if err := c.ShouldBindJSON(&consumable); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.UpdateConsumable(id, schoolID, consumable); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update consumable"})
		return
	}

	c.JSON(http.StatusOK, consumable)
}

// ============ EMERGENCY INCIDENTS ============

func (h *ClinicHandler) CreateIncident(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")
	
	var incident models.EmergencyIncident
	if err := c.ShouldBindJSON(&incident); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	incident.SchoolID = uuid.MustParse(schoolID)
	incident.ReportedBy = uuid.MustParse(userID)
	
	if err := h.service.CreateIncident(&incident); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, incident)
}

func (h *ClinicHandler) GetIncidents(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	studentID := c.Query("student_id")
	
	incidents, err := h.service.GetIncidents(schoolID, term, year, studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"incidents": incidents})
}

func (h *ClinicHandler) GetIncident(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	
	incident, err := h.service.GetIncident(id, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Incident not found"})
		return
	}
	
	c.JSON(http.StatusOK, incident)
}

func (h *ClinicHandler) UpdateIncident(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	
	incident, err := h.service.GetIncident(id, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Incident not found"})
		return
	}
	
	if err := c.ShouldBindJSON(&incident); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if err := h.service.UpdateIncident(id, schoolID, incident); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update incident"})
		return
	}
	
	c.JSON(http.StatusOK, incident)
}

func (h *ClinicHandler) DeleteIncident(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	
	if err := h.service.DeleteIncident(id, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete incident"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Incident deleted successfully"})
}

// ============ CONSUMABLE USAGE ============

func (h *ClinicHandler) RecordConsumableUsage(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")
	
	var usage models.ConsumableUsage
	if err := c.ShouldBindJSON(&usage); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	usage.SchoolID = uuid.MustParse(schoolID)
	usage.UsedBy = uuid.MustParse(userID)
	usage.UsedAt = time.Now()
	
	if err := h.service.RecordConsumableUsage(&usage); err != nil {
		if err.Error() == "Consumable not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if err.Error() == "Insufficient quantity" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	
	c.JSON(http.StatusCreated, usage)
}

func (h *ClinicHandler) GetConsumableUsage(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	consumableID := c.Query("consumable_id")
	visitID := c.Query("visit_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "200"))
	
	usages, total, err := h.service.GetConsumableUsage(schoolID, consumableID, visitID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"usages": usages, "total": total})
}

// ============ SUMMARY ============

func (h *ClinicHandler) GetAdminSummary(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	startDate := c.Query("start_date")
	
	summary, err := h.service.GetSummary(schoolID, term, year, startDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, summary)
}

func (h *ClinicHandler) GetReportData(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	reportType := c.Query("type")
	term := c.Query("term")
	year := c.Query("year")

	report, err := h.service.GetReportData(schoolID, reportType, term, year)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, report)
}
