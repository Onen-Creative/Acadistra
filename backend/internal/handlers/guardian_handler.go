package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	ws "github.com/school-system/backend/internal/websocket"
	"gorm.io/gorm"
)

type GuardianHandler struct {
	db *gorm.DB
}

func NewGuardianHandler(db *gorm.DB) *GuardianHandler {
	return &GuardianHandler{db: db}
}

func (h *GuardianHandler) Create(c *gin.Context) {
	var req struct {
		StudentID        string `json:"student_id" binding:"required"`
		Relationship     string `json:"relationship" binding:"required"`
		FullName         string `json:"full_name" binding:"required"`
		Phone            string `json:"phone" binding:"required"`
		AlternativePhone string `json:"alternative_phone"`
		Email            string `json:"email"`
		Occupation       string `json:"occupation"`
		Address          string `json:"address"`
		Workplace        string `json:"workplace"`
		WorkAddress      string `json:"work_address"`
		IsPrimaryContact bool   `json:"is_primary_contact"`
		IsEmergency      bool   `json:"is_emergency"`
		IsFeePayer       bool   `json:"is_fee_payer"`
		NationalID       string `json:"national_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	// Verify student exists and get school ID
	var student models.Student
	if err := h.db.First(&student, "id = ?", studentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	// Check school access
	schoolID := c.GetString("tenant_school_id")
	if schoolID != "" && student.SchoolID.String() != schoolID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	guardian := models.Guardian{
		StudentID:        studentID,
		SchoolID:         student.SchoolID,
		Relationship:     req.Relationship,
		FullName:         req.FullName,
		Phone:            req.Phone,
		AlternativePhone: req.AlternativePhone,
		Email:            req.Email,
		Occupation:       req.Occupation,
		Address:          req.Address,
		Workplace:        req.Workplace,
		WorkAddress:      req.WorkAddress,
		IsPrimaryContact: req.IsPrimaryContact,
		IsEmergency:      req.IsEmergency,
		IsFeePayer:       req.IsFeePayer,
		NationalID:       req.NationalID,
	}

	if err := h.db.Create(&guardian).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("guardian:created", guardian, student.SchoolID.String())
	c.JSON(http.StatusCreated, guardian)
}

func (h *GuardianHandler) List(c *gin.Context) {
	studentID := c.Query("student_id")
	schoolID := c.GetString("tenant_school_id")

	query := h.db.Model(&models.Guardian{})

	if schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}

	if studentID != "" {
		query = query.Where("student_id = ?", studentID)
	}

	var guardians []models.Guardian
	if err := query.Find(&guardians).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"guardians": guardians})
}

func (h *GuardianHandler) Get(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	query := h.db.Where("id = ?", id)
	if schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}

	var guardian models.Guardian
	if err := query.First(&guardian).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Guardian not found"})
		return
	}

	c.JSON(http.StatusOK, guardian)
}

func (h *GuardianHandler) Update(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var guardian models.Guardian
	query := h.db.Where("id = ?", id)
	if schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}

	if err := query.First(&guardian).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Guardian not found"})
		return
	}

	var req struct {
		Relationship     string `json:"relationship"`
		FullName         string `json:"full_name"`
		Phone            string `json:"phone"`
		AlternativePhone string `json:"alternative_phone"`
		Email            string `json:"email"`
		Occupation       string `json:"occupation"`
		Address          string `json:"address"`
		Workplace        string `json:"workplace"`
		WorkAddress      string `json:"work_address"`
		IsPrimaryContact *bool  `json:"is_primary_contact"`
		IsEmergency      *bool  `json:"is_emergency"`
		IsFeePayer       *bool  `json:"is_fee_payer"`
		NationalID       string `json:"national_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Relationship != "" {
		guardian.Relationship = req.Relationship
	}
	if req.FullName != "" {
		guardian.FullName = req.FullName
	}
	if req.Phone != "" {
		guardian.Phone = req.Phone
	}
	if req.AlternativePhone != "" {
		guardian.AlternativePhone = req.AlternativePhone
	}
	if req.Email != "" {
		guardian.Email = req.Email
	}
	if req.Occupation != "" {
		guardian.Occupation = req.Occupation
	}
	if req.Address != "" {
		guardian.Address = req.Address
	}
	if req.Workplace != "" {
		guardian.Workplace = req.Workplace
	}
	if req.WorkAddress != "" {
		guardian.WorkAddress = req.WorkAddress
	}
	if req.IsPrimaryContact != nil {
		guardian.IsPrimaryContact = *req.IsPrimaryContact
	}
	if req.IsEmergency != nil {
		guardian.IsEmergency = *req.IsEmergency
	}
	if req.IsFeePayer != nil {
		guardian.IsFeePayer = *req.IsFeePayer
	}
	if req.NationalID != "" {
		guardian.NationalID = req.NationalID
	}

	if err := h.db.Save(&guardian).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("guardian:updated", guardian, guardian.SchoolID.String())
	c.JSON(http.StatusOK, guardian)
}

func (h *GuardianHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	query := h.db.Where("id = ?", id)
	if schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}

	if err := query.Delete(&models.Guardian{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("guardian:deleted", gin.H{"id": id}, schoolID)
	c.JSON(http.StatusOK, gin.H{"message": "Guardian deleted"})
}
