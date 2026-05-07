package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/services"
	"github.com/school-system/backend/internal/utils"
	ws "github.com/school-system/backend/internal/websocket"
)

type RegistrationHandler struct {
	service *services.RegistrationService
}

func NewRegistrationHandler(service *services.RegistrationService) *RegistrationHandler {
	return &RegistrationHandler{service: service}
}

type GuardianInput struct {
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

type ComprehensiveRegistrationRequest struct {
	FirstName        string          `json:"first_name" binding:"required"`
	MiddleName       string          `json:"middle_name"`
	LastName         string          `json:"last_name" binding:"required"`
	DateOfBirth      string          `json:"date_of_birth"`
	Gender           string          `json:"gender" binding:"required"`
	Nationality      string          `json:"nationality"`
	Religion         string          `json:"religion"`
	LIN              string          `json:"lin"`
	SchoolPayCode    string          `json:"schoolpay_code"`
	Email            string          `json:"email"`
	Phone            string          `json:"phone"`
	Address          string          `json:"address"`
	District         string          `json:"district"`
	Village          string          `json:"village"`
	ClassLevel       string          `json:"class_level" binding:"required"`
	ClassID          string          `json:"class_id"`
	Term             string          `json:"term" binding:"required"`
	Year             int             `json:"year" binding:"required"`
	ResidenceType    string          `json:"residence_type"`
	PreviousSchool   string          `json:"previous_school"`
	PreviousClass    string          `json:"previous_class"`
	SpecialNeeds     string          `json:"special_needs"`
	DisabilityStatus string          `json:"disability_status"`
	Guardians        []GuardianInput `json:"guardians" binding:"required,min=1"`
}

func (h *RegistrationHandler) RegisterStudent(c *gin.Context) {
	var req ComprehensiveRegistrationRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate guardians
	for i, g := range req.Guardians {
		if err := utils.ValidateGuardianRelationship(g.Relationship); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Guardian %d: %s", i+1, err.Error())})
			return
		}
		if err := utils.ValidatePhone(g.Phone); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Guardian %d: %s", i+1, err.Error())})
			return
		}
		if err := utils.ValidateEmail(g.Email); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Guardian %d: %s", i+1, err.Error())})
			return
		}
	}

	// Validate student data
	if req.Email != "" {
		if err := utils.ValidateEmail(req.Email); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}
	if err := utils.ValidateResidenceType(req.ResidenceType); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get school ID
	tenantSchoolID := c.GetString("tenant_school_id")
	if tenantSchoolID == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "No school assigned to user"})
		return
	}
	schoolID, _ := uuid.Parse(tenantSchoolID)

	// Parse class ID if provided
	var classID *uuid.UUID
	if req.ClassID != "" {
		parsedClassID, err := uuid.Parse(req.ClassID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class_id"})
			return
		}
		classID = &parsedClassID
	}

	// Parse date of birth
	var dateOfBirth *time.Time
	if req.DateOfBirth != "" {
		parsedDate, err := time.Parse("2006-01-02", req.DateOfBirth)
		if err == nil {
			dateOfBirth = &parsedDate
		}
	}

	// Convert guardians
	var guardians []services.GuardianInput
	for _, g := range req.Guardians {
		guardians = append(guardians, services.GuardianInput{
			Relationship:     g.Relationship,
			FullName:         g.FullName,
			Phone:            g.Phone,
			AlternativePhone: g.AlternativePhone,
			Email:            g.Email,
			Occupation:       g.Occupation,
			Address:          g.Address,
			Workplace:        g.Workplace,
			WorkAddress:      g.WorkAddress,
			IsPrimaryContact: g.IsPrimaryContact,
			IsEmergency:      g.IsEmergency,
			IsFeePayer:       g.IsFeePayer,
			NationalID:       g.NationalID,
		})
	}

	// Create service request
	svcReq := &services.RegistrationRequest{
		FirstName:        strings.Title(strings.ToLower(utils.NormalizeText(req.FirstName))),
		MiddleName:       strings.Title(strings.ToLower(utils.NormalizeText(req.MiddleName))),
		LastName:         strings.Title(strings.ToLower(utils.NormalizeText(req.LastName))),
		DateOfBirth:      dateOfBirth,
		Gender:           strings.Title(strings.ToLower(req.Gender)),
		Nationality:      req.Nationality,
		Religion:         req.Religion,
		LIN:              req.LIN,
		SchoolPayCode:    req.SchoolPayCode,
		Email:            req.Email,
		Phone:            req.Phone,
		Address:          req.Address,
		District:         req.District,
		Village:          req.Village,
		ClassLevel:       req.ClassLevel,
		ClassID:          req.ClassID,
		Term:             req.Term,
		Year:             req.Year,
		ResidenceType:    req.ResidenceType,
		PreviousSchool:   req.PreviousSchool,
		PreviousClass:    req.PreviousClass,
		SpecialNeeds:     req.SpecialNeeds,
		DisabilityStatus: req.DisabilityStatus,
		Guardians:        guardians,
	}

	// Register student
	result, err := h.service.RegisterStudentComprehensive(schoolID, classID, svcReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Broadcast WebSocket event
	ws.GlobalHub.Broadcast("student:registered", result.Student, schoolID.String())

	c.JSON(http.StatusCreated, gin.H{
		"message":   "Student registered successfully",
		"student":   result.Student,
		"guardians": result.Guardians,
		"class":     result.Class,
	})
}
