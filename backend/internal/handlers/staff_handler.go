package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/school-system/backend/internal/config"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"github.com/school-system/backend/internal/services"
)

type StaffHandler struct {
	service *services.StaffService
}

func NewStaffHandler(db *gorm.DB, cfg *config.Config, emailService *services.EmailService) *StaffHandler {
	return &StaffHandler{
		service: services.NewStaffService(repositories.NewStaffRepository(db), db, cfg, emailService),
	}
}

// CreateStaff creates a new staff member
// This is the PRIMARY method for creating users with system access (except school_admin)
// Roles that get user accounts: Teacher, Director of Studies, Bursar, Librarian, Nurse, Store Keeper
// Other roles (Security, Cook, Cleaner, etc.) are for record-keeping only
func (h *StaffHandler) CreateStaff(c *gin.Context) {
	var req struct {
		FirstName          string  `json:"first_name"`
		MiddleName         string  `json:"middle_name"`
		LastName           string  `json:"last_name"`
		DateOfBirth        string  `json:"date_of_birth"`
		Gender             string  `json:"gender"`
		Nationality        string  `json:"nationality"`
		NationalID         string  `json:"national_id"`
		Email              string  `json:"email"`
		Phone              string  `json:"phone"`
		AlternativePhone   string  `json:"alternative_phone"`
		Address            string  `json:"address"`
		District           string  `json:"district"`
		Village            string  `json:"village"`
		Role               string  `json:"role"`
		Department         string  `json:"department"`
		Qualifications     string  `json:"qualifications"`
		Specialization     string  `json:"specialization"`
		Experience         int     `json:"experience"`
		EmploymentType     string  `json:"employment_type"`
		DateJoined         string  `json:"date_joined"`
		ContractEndDate    string  `json:"contract_end_date"`
		Salary             float64 `json:"salary"`
		BankAccount        string  `json:"bank_account"`
		BankName           string  `json:"bank_name"`
		TIN                string  `json:"tin"`
		NSSF               string  `json:"nssf"`
		RegistrationNumber string  `json:"registration_number"`
		RegistrationBody   string  `json:"registration_body"`
		IPPSNumber         string  `json:"ipps_number"`
		SupplierNumber     string  `json:"supplier_number"`
		EmergencyContact   string  `json:"emergency_contact"`
		EmergencyPhone     string  `json:"emergency_phone"`
		EmergencyRelation  string  `json:"emergency_relation"`
		Notes              string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		schoolID = c.GetString("school_id")
	}
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID not found"})
		return
	}

	// Check if email already exists BEFORE starting transaction
	if req.Email != "" {
		if err := h.service.CheckEmailExists(req.Email, schoolID); err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
	}

	staff := models.Staff{
		SchoolID:           uuid.MustParse(schoolID),
		FirstName:          req.FirstName,
		MiddleName:         req.MiddleName,
		LastName:           req.LastName,
		Gender:             req.Gender,
		Nationality:        req.Nationality,
		NationalID:         req.NationalID,
		Email:              req.Email,
		Phone:              req.Phone,
		AlternativePhone:   req.AlternativePhone,
		Address:            req.Address,
		District:           req.District,
		Village:            req.Village,
		Role:               req.Role,
		Department:         req.Department,
		Qualifications:     req.Qualifications,
		Specialization:     req.Specialization,
		Experience:         req.Experience,
		EmploymentType:     req.EmploymentType,
		Salary:             req.Salary,
		BankAccount:        req.BankAccount,
		BankName:           req.BankName,
		TIN:                req.TIN,
		NSSF:               req.NSSF,
		RegistrationNumber: req.RegistrationNumber,
		RegistrationBody:   req.RegistrationBody,
		IPPSNumber:         req.IPPSNumber,
		SupplierNumber:     req.SupplierNumber,
		EmergencyContact:   req.EmergencyContact,
		EmergencyPhone:     req.EmergencyPhone,
		EmergencyRelation:  req.EmergencyRelation,
		Status:             "active",
		Notes:              req.Notes,
	}

	// Parse dates
	if req.DateOfBirth != "" {
		if dob, err := time.Parse("2006-01-02", req.DateOfBirth); err == nil {
			staff.DateOfBirth = &dob
		}
	}
	if req.DateJoined != "" {
		if dj, err := time.Parse("2006-01-02", req.DateJoined); err == nil {
			staff.DateJoined = &dj
		}
	}
	if req.ContractEndDate != "" {
		if ced, err := time.Parse("2006-01-02", req.ContractEndDate); err == nil {
			staff.ContractEndDate = &ced
		}
	}

	if err := h.service.CreateStaff(&staff, schoolID); err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			c.JSON(http.StatusConflict, gin.H{"error": "Staff record already exists"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusCreated, staff)
}

// GetAllStaff retrieves all staff for a school (including school admins from users table)
func (h *StaffHandler) GetAllStaff(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		schoolID = c.GetString("school_id")
	}
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID not found in context"})
		return
	}
	
	role := c.Query("role")
	department := c.Query("department")
	status := c.Query("status")
	search := c.Query("search")

	staff, err := h.service.GetAllStaff(schoolID, role, department, status, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch staff"})
		return
	}

	// Convert to generic response format
	type StaffResponse struct {
		ID                 string     `json:"id"`
		UserID             *string    `json:"user_id,omitempty"`
		EmployeeID         string     `json:"employee_id,omitempty"`
		FirstName          string     `json:"first_name"`
		MiddleName         string     `json:"middle_name,omitempty"`
		LastName           string     `json:"last_name"`
		Email              string     `json:"email"`
		Phone              string     `json:"phone,omitempty"`
		Role               string     `json:"role"`
		Department         string     `json:"department,omitempty"`
		Status             string     `json:"status,omitempty"`
		TeacherProfileID   *string    `json:"teacher_profile_id,omitempty"`
		IsSchoolAdmin      bool       `json:"is_school_admin"`
	}

	result := make([]StaffResponse, 0)

	// Return only staff from staff table
	for _, s := range staff {
		var userIDStr *string
		if s.UserID != nil {
			uid := s.UserID.String()
			userIDStr = &uid
		}
		
		sr := StaffResponse{
			ID:            s.ID.String(),
			UserID:        userIDStr,
			EmployeeID:    s.EmployeeID,
			FirstName:     s.FirstName,
			MiddleName:    s.MiddleName,
			LastName:      s.LastName,
			Email:         s.Email,
			Phone:         s.Phone,
			Role:          s.Role,
			Department:    s.Department,
			Status:        s.Status,
			IsSchoolAdmin: (s.Role == "School Admin"),
		}
		
		result = append(result, sr)
	}

	c.JSON(http.StatusOK, result)
}

// GetStaffByID retrieves a single staff member
func (h *StaffHandler) GetStaffByID(c *gin.Context) {
	staffID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		schoolID = c.GetString("school_id")
	}

	staff, err := h.service.GetStaffByID(staffID, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Staff not found"})
		return
	}

	c.JSON(http.StatusOK, staff)
}

// UpdateStaff updates staff information
func (h *StaffHandler) UpdateStaff(c *gin.Context) {
	staffID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		schoolID = c.GetString("school_id")
	}

	var req struct {
		FirstName          string  `json:"first_name"`
		MiddleName         string  `json:"middle_name"`
		LastName           string  `json:"last_name"`
		DateOfBirth        string  `json:"date_of_birth"`
		Gender             string  `json:"gender"`
		Nationality        string  `json:"nationality"`
		NationalID         string  `json:"national_id"`
		Email              string  `json:"email"`
		Phone              string  `json:"phone"`
		AlternativePhone   string  `json:"alternative_phone"`
		Address            string  `json:"address"`
		District           string  `json:"district"`
		Village            string  `json:"village"`
		Role               string  `json:"role"`
		Department         string  `json:"department"`
		Qualifications     string  `json:"qualifications"`
		Specialization     string  `json:"specialization"`
		Experience         int     `json:"experience"`
		EmploymentType     string  `json:"employment_type"`
		DateJoined         string  `json:"date_joined"`
		ContractEndDate    string  `json:"contract_end_date"`
		Salary             float64 `json:"salary"`
		BankAccount        string  `json:"bank_account"`
		BankName           string  `json:"bank_name"`
		TIN                string  `json:"tin"`
		NSSF               string  `json:"nssf"`
		RegistrationNumber string  `json:"registration_number"`
		RegistrationBody   string  `json:"registration_body"`
		IPPSNumber         string  `json:"ipps_number"`
		SupplierNumber     string  `json:"supplier_number"`
		EmergencyContact   string  `json:"emergency_contact"`
		EmergencyPhone     string  `json:"emergency_phone"`
		EmergencyRelation  string  `json:"emergency_relation"`
		Status             string  `json:"status"`
		Notes              string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := &models.Staff{
		FirstName:          req.FirstName,
		MiddleName:         req.MiddleName,
		LastName:           req.LastName,
		Gender:             req.Gender,
		Nationality:        req.Nationality,
		NationalID:         req.NationalID,
		Email:              req.Email,
		Phone:              req.Phone,
		AlternativePhone:   req.AlternativePhone,
		Address:            req.Address,
		District:           req.District,
		Village:            req.Village,
		Role:               req.Role,
		Department:         req.Department,
		Qualifications:     req.Qualifications,
		Specialization:     req.Specialization,
		Experience:         req.Experience,
		EmploymentType:     req.EmploymentType,
		Salary:             req.Salary,
		BankAccount:        req.BankAccount,
		BankName:           req.BankName,
		TIN:                req.TIN,
		NSSF:               req.NSSF,
		RegistrationNumber: req.RegistrationNumber,
		RegistrationBody:   req.RegistrationBody,
		IPPSNumber:         req.IPPSNumber,
		SupplierNumber:     req.SupplierNumber,
		EmergencyContact:   req.EmergencyContact,
		EmergencyPhone:     req.EmergencyPhone,
		EmergencyRelation:  req.EmergencyRelation,
		Status:             req.Status,
		Notes:              req.Notes,
	}

	// Parse dates
	if req.DateOfBirth != "" {
		if dob, err := time.Parse("2006-01-02", req.DateOfBirth); err == nil {
			updates.DateOfBirth = &dob
		}
	}
	if req.DateJoined != "" {
		if dj, err := time.Parse("2006-01-02", req.DateJoined); err == nil {
			updates.DateJoined = &dj
		}
	}
	if req.ContractEndDate != "" {
		if ced, err := time.Parse("2006-01-02", req.ContractEndDate); err == nil {
			updates.ContractEndDate = &ced
		}
	}

	if err := h.service.UpdateStaff(staffID, schoolID, updates); err != nil {
		if strings.Contains(err.Error(), "School Admin") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update staff"})
		}
		return
	}

	staff, _ := h.service.GetStaffByID(staffID, schoolID)
	c.JSON(http.StatusOK, gin.H{
		"staff": staff,
		"message": "Staff updated successfully",
	})
}

// DeleteStaff soft deletes a staff member
func (h *StaffHandler) DeleteStaff(c *gin.Context) {
	staffID := c.Param("id")
	schoolID := c.GetString("school_id")

	if err := h.service.DeleteStaff(staffID, schoolID); err != nil {
		if strings.Contains(err.Error(), "School Admin") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete staff"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Staff deleted successfully"})
}

// CreateLeaveRequest creates a leave request
func (h *StaffHandler) CreateLeaveRequest(c *gin.Context) {
	var req struct {
		StaffID   string `json:"staff_id" binding:"required"`
		LeaveType string `json:"leave_type" binding:"required"`
		StartDate string `json:"start_date" binding:"required"`
		EndDate   string `json:"end_date" binding:"required"`
		Days      int    `json:"days" binding:"required"`
		Reason    string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("school_id")
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

	leave := &models.StaffLeave{
		StaffID:   uuid.MustParse(req.StaffID),
		LeaveType: req.LeaveType,
		StartDate: startDate,
		EndDate:   endDate,
		Days:      req.Days,
		Reason:    req.Reason,
	}

	if err := h.service.CreateLeaveRequest(leave, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create leave request"})
		return
	}

	c.JSON(http.StatusCreated, leave)
}

// GetLeaveRequests retrieves leave requests
func (h *StaffHandler) GetLeaveRequests(c *gin.Context) {
	schoolID := c.GetString("school_id")
	staffID := c.Query("staff_id")
	status := c.Query("status")

	leaves, err := h.service.GetLeaveRequests(schoolID, staffID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch leave requests"})
		return
	}

	c.JSON(http.StatusOK, leaves)
}

// ApproveLeave approves or rejects a leave request
func (h *StaffHandler) ApproveLeave(c *gin.Context) {
	leaveID := c.Param("id")
	schoolID := c.GetString("school_id")
	userID := c.GetString("user_id")

	var input struct {
		Status          string `json:"status" binding:"required,oneof=approved rejected"`
		RejectionReason string `json:"rejection_reason"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.ApproveLeave(leaveID, schoolID, userID, input.Status, input.RejectionReason); err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update leave request"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Leave request updated"})
}

// MarkStaffAttendance marks staff attendance
func (h *StaffHandler) MarkStaffAttendance(c *gin.Context) {
	var req struct {
		StaffID  string `json:"staff_id" binding:"required"`
		Date     string `json:"date" binding:"required"`
		CheckIn  string `json:"check_in"`
		CheckOut string `json:"check_out"`
		Status   string `json:"status" binding:"required"`
		Remarks  string `json:"remarks"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("school_id")
	userID := c.GetString("user_id")

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	attendance := models.StaffAttendance{
		StaffID:  uuid.MustParse(req.StaffID),
		SchoolID: uuid.MustParse(schoolID),
		Date:     date,
		Status:   req.Status,
		Remarks:  req.Remarks,
		MarkedBy: uuid.MustParse(userID),
	}

	if req.CheckIn != "" {
		if checkIn, err := time.Parse(time.RFC3339, req.CheckIn); err == nil {
			attendance.CheckIn = &checkIn
		}
	}
	if req.CheckOut != "" {
		if checkOut, err := time.Parse(time.RFC3339, req.CheckOut); err == nil {
			attendance.CheckOut = &checkOut
		}
	}

	if err := h.service.MarkStaffAttendance(&attendance); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark attendance"})
		return
	}

	c.JSON(http.StatusCreated, attendance)
}

// GetStaffAttendance retrieves staff attendance
func (h *StaffHandler) GetStaffAttendance(c *gin.Context) {
	schoolID := c.GetString("school_id")
	staffID := c.Query("staff_id")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	attendance, err := h.service.GetStaffAttendance(schoolID, staffID, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attendance"})
		return
	}

	c.JSON(http.StatusOK, attendance)
}

// UploadStaffDocument uploads a document for a staff member
func (h *StaffHandler) UploadStaffDocument(c *gin.Context) {
	var document models.StaffDocument
	if err := c.ShouldBindJSON(&document); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("school_id")
	userID := c.GetString("user_id")
	document.SchoolID = uuid.MustParse(schoolID)
	document.UploadedBy = uuid.MustParse(userID)
	document.UploadedAt = time.Now()

	if err := h.service.UploadStaffDocument(&document); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload document"})
		return
	}

	c.JSON(http.StatusCreated, document)
}

// GetStaffDocuments retrieves documents for a staff member
func (h *StaffHandler) GetStaffDocuments(c *gin.Context) {
	staffID := c.Param("staff_id")
	schoolID := c.GetString("school_id")

	documents, err := h.service.GetStaffDocuments(staffID, schoolID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch documents"})
		return
	}

	c.JSON(http.StatusOK, documents)
}

// GetStaffStats retrieves staff statistics
func (h *StaffHandler) GetStaffStats(c *gin.Context) {
	schoolID := c.GetString("school_id")

	stats, err := h.service.GetStaffStats(schoolID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}
