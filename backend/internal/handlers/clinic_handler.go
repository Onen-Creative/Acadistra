package handlers

import (
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type ClinicHandler struct {
	db *gorm.DB
}

func NewClinicHandler(db *gorm.DB) *ClinicHandler {
	return &ClinicHandler{db: db}
}

// ============ HEALTH PROFILES ============

func (h *ClinicHandler) CreateHealthProfile(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	
	var profile models.StudentHealthProfile
	if err := c.ShouldBindJSON(&profile); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	profile.SchoolID = uuid.MustParse(schoolID)
	if err := h.db.Create(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, profile)
}

func (h *ClinicHandler) GetHealthProfile(c *gin.Context) {
	studentID := c.Param("student_id")
	schoolID := c.GetString("tenant_school_id")
	
	var profile models.StudentHealthProfile
	if err := h.db.Preload("Student").Where("student_id = ? AND school_id = ?", studentID, schoolID).First(&profile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Health profile not found"})
		return
	}
	
	c.JSON(http.StatusOK, profile)
}

func (h *ClinicHandler) GetHealthProfileByID(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	
	var profile models.StudentHealthProfile
	if err := h.db.Preload("Student").Where("id = ? AND school_id = ?", id, schoolID).First(&profile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Health profile not found"})
		return
	}
	
	c.JSON(http.StatusOK, profile)
}

func (h *ClinicHandler) GetStudentHealthData(c *gin.Context) {
	studentID := c.Param("student_id")
	schoolID := c.GetString("tenant_school_id")
	
	var student models.Student
	if err := h.db.Where("id = ? AND school_id = ?", studentID, schoolID).First(&student).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}
	
	var guardians []models.Guardian
	h.db.Where("student_id = ?", studentID).Find(&guardians)
	
	var emergencyContact, emergencyPhone string
	for _, g := range guardians {
		if g.IsEmergency {
			emergencyContact = g.FullName
			emergencyPhone = g.Phone
			break
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"special_needs":      student.SpecialNeeds,
		"disability_status":  student.DisabilityStatus,
		"emergency_contact":  emergencyContact,
		"emergency_phone":    emergencyPhone,
	})
}

func (h *ClinicHandler) UpdateHealthProfile(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var profile models.StudentHealthProfile
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&profile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Health profile not found"})
		return
	}

	if err := c.ShouldBindJSON(&profile); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Save(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update health profile"})
		return
	}

	c.JSON(http.StatusOK, profile)
}

func (h *ClinicHandler) DeleteHealthProfile(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.StudentHealthProfile{}).Error; err != nil {
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
	
	req.ClinicVisit.SchoolID = uuid.MustParse(schoolID)
	req.ClinicVisit.AttendedBy = uuid.MustParse(userID)
	
	// Start transaction
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()
	
	// Create visit
	if err := tx.Create(&req.ClinicVisit).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	// Create tests
	for i := range req.Tests {
		req.Tests[i].VisitID = req.ClinicVisit.ID
		req.Tests[i].StudentID = req.ClinicVisit.StudentID
		req.Tests[i].SchoolID = uuid.MustParse(schoolID)
		req.Tests[i].Year = req.ClinicVisit.Year
		req.Tests[i].Term = req.ClinicVisit.Term
		req.Tests[i].PerformedBy = uuid.MustParse(userID)
		if err := tx.Create(&req.Tests[i]).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	
	// Create medication administrations
	for i := range req.Medications {
		req.Medications[i].VisitID = req.ClinicVisit.ID
		req.Medications[i].StudentID = req.ClinicVisit.StudentID
		req.Medications[i].SchoolID = uuid.MustParse(schoolID)
		req.Medications[i].AdministeredBy = uuid.MustParse(userID)
		req.Medications[i].AdministeredAt = time.Now()
		
		// Update medicine quantity
		var medicine models.Medicine
		if err := tx.First(&medicine, req.Medications[i].MedicineID).Error; err == nil {
			medicine.Quantity -= req.Medications[i].QuantityGiven
			tx.Save(&medicine)
		}
		
		if err := tx.Create(&req.Medications[i]).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	
	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	// Load student details
	h.db.Preload("Student").First(&req.ClinicVisit, req.ClinicVisit.ID)
	
	c.JSON(http.StatusCreated, req.ClinicVisit)
}

func (h *ClinicHandler) GetVisits(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	
	query := h.db.Where("school_id = ?", schoolID)
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}
	
	var total int64
	query.Model(&models.ClinicVisit{}).Count(&total)
	
	var visits []models.ClinicVisit
	if err := query.Preload("Student.Enrollments.Class").Order("visit_date DESC").
		Limit(limit).Offset((page-1)*limit).Find(&visits).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"visits": visits, "total": total})
}

func (h *ClinicHandler) GetVisit(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	
	var visit models.ClinicVisit
	if err := h.db.Preload("Student").Preload("Nurse").
		Where("id = ? AND school_id = ?", id, schoolID).First(&visit).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Visit not found"})
		return
	}
	
	c.JSON(http.StatusOK, visit)
}

func (h *ClinicHandler) UpdateVisit(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	
	var visit models.ClinicVisit
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&visit).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Visit not found"})
		return
	}
	
	if err := c.ShouldBindJSON(&visit); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if err := h.db.Save(&visit).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update visit"})
		return
	}
	
	c.JSON(http.StatusOK, visit)
}

func (h *ClinicHandler) DeleteVisit(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.ClinicVisit{}).Error; err != nil {
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
	
	// Get visit to copy year/term
	if test.VisitID != uuid.Nil {
		var visit models.ClinicVisit
		if err := h.db.First(&visit, test.VisitID).Error; err == nil {
			test.Year = visit.Year
			test.Term = visit.Term
		}
	}
	
	if err := h.db.Create(&test).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	h.db.Preload("Student").First(&test, test.ID)
	
	c.JSON(http.StatusCreated, test)
}

func (h *ClinicHandler) GetTests(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	visitID := c.Query("visit_id")
	studentID := c.Query("student_id")
	
	query := h.db.Where("medical_tests.school_id = ?", schoolID)
	if visitID != "" {
		query = query.Where("medical_tests.visit_id = ?", visitID)
	}
	if studentID != "" {
		query = query.Where("medical_tests.student_id = ?", studentID)
	}
	
	var tests []models.MedicalTest
	if err := query.Preload("Student").Preload("Visit").Order("test_date DESC").Find(&tests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
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
	
	query := h.db.Where("school_id = ?", schoolID)
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}
	if search != "" {
		query = query.Where("name LIKE ? OR category LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	
	var total int64
	query.Model(&models.Medicine{}).Count(&total)
	
	var medicines []models.Medicine
	if err := query.Order("name ASC").Limit(limit).Offset((page-1)*limit).Find(&medicines).Error; err != nil {
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
	
	medicine.SchoolID = uuid.MustParse(schoolID)
	// Set initial quantity on creation
	if medicine.InitialQuantity == 0 {
		medicine.InitialQuantity = medicine.Quantity
	}
	if err := h.db.Create(&medicine).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, medicine)
}

func (h *ClinicHandler) DeleteMedicine(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.Medicine{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Medicine deleted"})
}

func (h *ClinicHandler) UpdateMedicine(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var medicine models.Medicine
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&medicine).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Medicine not found"})
		return
	}

	if err := c.ShouldBindJSON(&medicine); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Save(&medicine).Error; err != nil {
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
	
	// Update medicine quantity
	var medicine models.Medicine
	if err := h.db.First(&medicine, admin.MedicineID).Error; err == nil {
		medicine.Quantity -= admin.QuantityGiven
		h.db.Save(&medicine)
	}
	
	if err := h.db.Create(&admin).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	h.db.Preload("Medicine").Preload("Student").First(&admin, admin.ID)
	
	c.JSON(http.StatusCreated, admin)
}

func (h *ClinicHandler) GetMedicationHistory(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Query("student_id")
	visitID := c.Query("visit_id")
	
	query := h.db.Where("medication_administrations.school_id = ?", schoolID)
	if studentID != "" {
		query = query.Where("medication_administrations.student_id = ?", studentID)
	}
	if visitID != "" {
		query = query.Where("medication_administrations.visit_id = ?", visitID)
	}
	
	var history []models.MedicationAdministration
	if err := query.Preload("Medicine").Preload("Student").
		Order("administered_at DESC").Find(&history).Error; err != nil {
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
	
	query := h.db.Where("school_id = ?", schoolID)
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}
	if search != "" {
		query = query.Where("name LIKE ? OR category LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	
	var total int64
	query.Model(&models.ClinicConsumable{}).Count(&total)
	
	var consumables []models.ClinicConsumable
	if err := query.Order("name ASC").Limit(limit).Offset((page-1)*limit).Find(&consumables).Error; err != nil {
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
	// Set initial quantity on creation
	if consumable.InitialQuantity == 0 {
		consumable.InitialQuantity = consumable.Quantity
	}
	if err := h.db.Create(&consumable).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, consumable)
}

func (h *ClinicHandler) DeleteConsumable(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.ClinicConsumable{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Consumable deleted"})
}

func (h *ClinicHandler) UpdateConsumable(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var consumable models.ClinicConsumable
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&consumable).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Consumable not found"})
		return
	}

	if err := c.ShouldBindJSON(&consumable); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Save(&consumable).Error; err != nil {
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
	
	if err := h.db.Create(&incident).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	h.db.Preload("Student").First(&incident, incident.ID)
	
	c.JSON(http.StatusCreated, incident)
}

func (h *ClinicHandler) GetIncidents(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	studentID := c.Query("student_id")
	
	query := h.db.Where("school_id = ?", schoolID)
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}
	if studentID != "" {
		query = query.Where("student_id = ?", studentID)
	}
	
	var incidents []models.EmergencyIncident
	if err := query.Preload("Student").Order("incident_date DESC").Find(&incidents).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"incidents": incidents})
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
	
	// Start transaction
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()
	
	// Update consumable quantity
	var consumable models.ClinicConsumable
	if err := tx.First(&consumable, usage.ConsumableID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Consumable not found"})
		return
	}
	
	if consumable.Quantity < usage.QuantityUsed {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient quantity"})
		return
	}
	
	consumable.Quantity -= usage.QuantityUsed
	if err := tx.Save(&consumable).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	// Create usage record
	if err := tx.Create(&usage).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	h.db.Preload("Consumable").First(&usage, usage.ID)
	c.JSON(http.StatusCreated, usage)
}

func (h *ClinicHandler) GetConsumableUsage(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	consumableID := c.Query("consumable_id")
	visitID := c.Query("visit_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	
	query := h.db.Where("consumable_usages.school_id = ?", schoolID)
	if consumableID != "" {
		query = query.Where("consumable_usages.consumable_id = ?", consumableID)
	}
	if visitID != "" {
		query = query.Where("consumable_usages.visit_id = ?", visitID)
	}
	
	var total int64
	query.Model(&models.ConsumableUsage{}).Count(&total)
	
	var usages []models.ConsumableUsage
	if err := query.Preload("Consumable").Preload("Nurse").
		Order("used_at DESC").Limit(limit).Offset((page-1)*limit).Find(&usages).Error; err != nil {
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
	
	// Log parameters for debugging
	log.Printf("GetAdminSummary - schoolID: %s, term: %s, year: %s, startDate: %s", schoolID, term, year, startDate)
	
	// Build base query with school, term, and year filters
	baseQuery := h.db.Where("school_id = ?", schoolID)
	if term != "" {
		baseQuery = baseQuery.Where("term = ?", term)
	}
	if year != "" {
		baseQuery = baseQuery.Where("year = ?", year)
	}
	
	// Total visits for today
	var totalVisits int64
	visitQuery := h.db.Where("school_id = ?", schoolID).Model(&models.ClinicVisit{})
	if term != "" {
		visitQuery = visitQuery.Where("term = ?", term)
	}
	if year != "" {
		visitQuery = visitQuery.Where("year = ?", year)
	}
	if startDate != "" {
		visitQuery = visitQuery.Where("DATE(visit_date) = ?", startDate)
	}
	visitQuery.Count(&totalVisits)
	
	// Students sent home today
	var studentsSentHome int64
	sentHomeQuery := h.db.Where("school_id = ?", schoolID).Model(&models.ClinicVisit{}).Where("outcome = ?", "sent_home")
	if term != "" {
		sentHomeQuery = sentHomeQuery.Where("term = ?", term)
	}
	if year != "" {
		sentHomeQuery = sentHomeQuery.Where("year = ?", year)
	}
	if startDate != "" {
		sentHomeQuery = sentHomeQuery.Where("DATE(visit_date) = ?", startDate)
	}
	sentHomeQuery.Count(&studentsSentHome)
	
	// Referrals today
	var referrals int64
	referralQuery := h.db.Where("school_id = ?", schoolID).Model(&models.ClinicVisit{}).Where("outcome = ?", "referred")
	if term != "" {
		referralQuery = referralQuery.Where("term = ?", term)
	}
	if year != "" {
		referralQuery = referralQuery.Where("year = ?", year)
	}
	if startDate != "" {
		referralQuery = referralQuery.Where("DATE(visit_date) = ?", startDate)
	}
	referralQuery.Count(&referrals)
	
	// Emergencies today
	var emergencies int64
	emergencyQuery := h.db.Where("school_id = ?", schoolID).Model(&models.ClinicVisit{}).Where("outcome = ?", "emergency")
	if term != "" {
		emergencyQuery = emergencyQuery.Where("term = ?", term)
	}
	if year != "" {
		emergencyQuery = emergencyQuery.Where("year = ?", year)
	}
	if startDate != "" {
		emergencyQuery = emergencyQuery.Where("DATE(visit_date) = ?", startDate)
	}
	emergencyQuery.Count(&emergencies)
	
	// Total tests
	var totalTests int64
	testQuery := h.db.Where("school_id = ?", schoolID)
	if term != "" {
		testQuery = testQuery.Where("term = ?", term)
	}
	if year != "" {
		testQuery = testQuery.Where("year = ?", year)
	}
	testQuery.Model(&models.MedicalTest{}).Count(&totalTests)
	
	// Total incidents
	var totalIncidents int64
	incidentQuery := h.db.Where("school_id = ?", schoolID).Model(&models.EmergencyIncident{})
	if term != "" {
		incidentQuery = incidentQuery.Where("term = ?", term)
	}
	if year != "" {
		incidentQuery = incidentQuery.Where("year = ?", year)
	}
	incidentQuery.Count(&totalIncidents)
	
	// Low stock medicines
	var lowStockMedicines []models.Medicine
	medicineQuery := h.db.Where("school_id = ?", schoolID)
	if term != "" {
		medicineQuery = medicineQuery.Where("term = ?", term)
	}
	if year != "" {
		medicineQuery = medicineQuery.Where("year = ?", year)
	}
	medicineQuery.Where("quantity < minimum_stock").Find(&lowStockMedicines)
	
	// Recent visits
	var recentVisits []models.ClinicVisit
	recentQuery := h.db.Where("school_id = ?", schoolID)
	if term != "" {
		recentQuery = recentQuery.Where("term = ?", term)
	}
	if year != "" {
		recentQuery = recentQuery.Where("year = ?", year)
	}
	recentQuery.Preload("Student").Order("visit_date DESC").Limit(5).Find(&recentVisits)
	
	c.JSON(http.StatusOK, gin.H{
		"total_visits":         totalVisits,
		"students_sent_home":   studentsSentHome,
		"referrals":            referrals,
		"emergencies":          emergencies,
		"total_tests":          totalTests,
		"total_incidents":      totalIncidents,
		"low_stock_medicines":  len(lowStockMedicines),
		"low_stock_items":      lowStockMedicines,
		"recent_visits":        recentVisits,
	})
}

func (h *ClinicHandler) GetReportData(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	reportType := c.Query("type")
	term := c.Query("term")
	year := c.Query("year")

	var startDate, endDate time.Time
	now := time.Now()

	switch reportType {
	case "daily":
		startDate = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		endDate = startDate.AddDate(0, 0, 1)
	case "weekly":
		weekday := int(now.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		startDate = now.AddDate(0, 0, -weekday+1)
		startDate = time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
		endDate = startDate.AddDate(0, 0, 7)
	case "monthly":
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		endDate = startDate.AddDate(0, 1, 0)
	case "termly":
		startDate = time.Time{}
		endDate = now
	case "yearly":
		startDate = time.Time{}
		endDate = now
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report type"})
		return
	}

	// Get clinic visits
	var visits []models.ClinicVisit
	visitQuery := h.db.Preload("Student").Where("clinic_visits.school_id = ?", schoolID)
	if reportType == "daily" || reportType == "weekly" || reportType == "monthly" {
		visitQuery = visitQuery.Where("clinic_visits.visit_date >= ? AND clinic_visits.visit_date < ?", startDate, endDate)
	}
	if reportType == "termly" && term != "" {
		visitQuery = visitQuery.Where("clinic_visits.term = ?", term)
	}
	if (reportType == "termly" || reportType == "yearly") && year != "" {
		visitQuery = visitQuery.Where("clinic_visits.year = ?", year)
	}
	visitQuery.Order("visit_date DESC").Find(&visits)

	// Get medicines inventory
	var medicines []models.Medicine
	medicineQuery := h.db.Where("school_id = ?", schoolID)
	if reportType == "termly" && term != "" {
		medicineQuery = medicineQuery.Where("term = ?", term)
	}
	if (reportType == "termly" || reportType == "yearly") && year != "" {
		medicineQuery = medicineQuery.Where("year = ?", year)
	}
	medicineQuery.Order("name").Find(&medicines)

	// Get consumables inventory
	var consumables []models.ClinicConsumable
	consumableQuery := h.db.Where("school_id = ?", schoolID)
	if reportType == "termly" && term != "" {
		consumableQuery = consumableQuery.Where("term = ?", term)
	}
	if (reportType == "termly" || reportType == "yearly") && year != "" {
		consumableQuery = consumableQuery.Where("year = ?", year)
	}
	consumableQuery.Order("name").Find(&consumables)

	// Get emergency incidents
	var incidents []models.EmergencyIncident
	incidentQuery := h.db.Preload("Student").Where("emergency_incidents.school_id = ?", schoolID)
	if reportType == "daily" || reportType == "weekly" || reportType == "monthly" {
		incidentQuery = incidentQuery.Where("emergency_incidents.incident_date >= ? AND emergency_incidents.incident_date < ?", startDate, endDate)
	}
	if reportType == "termly" && term != "" {
		incidentQuery = incidentQuery.Where("emergency_incidents.term = ?", term)
	}
	if (reportType == "termly" || reportType == "yearly") && year != "" {
		incidentQuery = incidentQuery.Where("emergency_incidents.year = ?", year)
	}
	incidentQuery.Order("incident_date DESC").Find(&incidents)

	// Get visits by complaint - Process comma-separated symptoms
	var allVisits []models.ClinicVisit
	visitsForSymptomsQuery := h.db.Select("symptoms").Where("school_id = ?", schoolID)
	if reportType == "daily" || reportType == "weekly" || reportType == "monthly" {
		visitsForSymptomsQuery = visitsForSymptomsQuery.Where("visit_date >= ? AND visit_date < ?", startDate, endDate)
	}
	if reportType == "termly" && term != "" {
		visitsForSymptomsQuery = visitsForSymptomsQuery.Where("term = ?", term)
	}
	if (reportType == "termly" || reportType == "yearly") && year != "" {
		visitsForSymptomsQuery = visitsForSymptomsQuery.Where("year = ?", year)
	}
	visitsForSymptomsQuery.Find(&allVisits)

	// Count individual symptoms
	symptomCounts := make(map[string]int64)
	for _, visit := range allVisits {
		// Split by comma and trim whitespace
		symptoms := strings.Split(visit.Symptoms, ",")
		for _, symptom := range symptoms {
			symptom = strings.TrimSpace(symptom)
			if symptom != "" {
				symptomCounts[symptom]++
			}
		}
	}

	// Convert map to sorted slice
	type SymptomCount struct {
		Complaint string `json:"complaint"`
		Count     int64  `json:"count"`
	}
	var visitsByComplaint []SymptomCount
	for symptom, count := range symptomCounts {
		visitsByComplaint = append(visitsByComplaint, SymptomCount{
			Complaint: symptom,
			Count:     count,
		})
	}
	// Sort by count descending
	sort.Slice(visitsByComplaint, func(i, j int) bool {
		return visitsByComplaint[i].Count > visitsByComplaint[j].Count
	})
	// Limit to top 20
	if len(visitsByComplaint) > 20 {
		visitsByComplaint = visitsByComplaint[:20]
	}

	// Get medication usage
	var medicationUsage []struct {
		MedicineName string `json:"medicine_name"`
		TotalGiven   int    `json:"total_given"`
	}
	usageQuery := h.db.Table("medication_administrations").
		Select("medicines.name as medicine_name, SUM(medication_administrations.quantity_given) as total_given").
		Joins("JOIN medicines ON medication_administrations.medicine_id = medicines.id").
		Where("medication_administrations.school_id = ?", schoolID)
	if reportType == "daily" || reportType == "weekly" || reportType == "monthly" {
		usageQuery = usageQuery.Where("medication_administrations.administered_at >= ? AND medication_administrations.administered_at < ?", startDate, endDate)
	}
	usageQuery.Group("medicines.name").Order("total_given DESC").Scan(&medicationUsage)

	c.JSON(http.StatusOK, gin.H{
		"visits":              visits,
		"medicines":           medicines,
		"consumables":         consumables,
		"incidents":           incidents,
		"visits_by_complaint": visitsByComplaint,
		"medication_usage":    medicationUsage,
		"report_type":         reportType,
		"term":                term,
		"year":                year,
		"start_date":          startDate,
		"end_date":            endDate,
	})
}
