package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/school-system/backend/internal/models"
)

type StaffHandler struct {
	DB *gorm.DB
}

func NewStaffHandler(db *gorm.DB) *StaffHandler {
	return &StaffHandler{DB: db}
}

// CreateStaff creates a new staff member
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

	// Auto-generate employee_id if not provided
	var maxEmployeeID string
	h.DB.Model(&models.Staff{}).Where("school_id = ? AND employee_id LIKE 'STF%'", schoolID).
		Order("employee_id DESC").Limit(1).Pluck("employee_id", &maxEmployeeID)
	
	nextNum := 1
	if maxEmployeeID != "" {
		// Extract number from STF0001 format
		var num int
		if _, err := fmt.Sscanf(maxEmployeeID, "STF%d", &num); err == nil {
			nextNum = num + 1
		}
	}
	staff.EmployeeID = fmt.Sprintf("STF%04d", nextNum)

	if err := h.DB.Create(&staff).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create staff"})
		return
	}

	c.JSON(http.StatusCreated, staff)
}

// GetAllStaff retrieves all staff for a school
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

	query := h.DB.Where("school_id = ?", schoolID)

	if role != "" {
		query = query.Where("role = ?", role)
	}
	if department != "" {
		query = query.Where("department = ?", department)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	} else {
		query = query.Where("status = ?", "active")
	}

	var staff []models.Staff
	if err := query.Preload("User").Find(&staff).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch staff"})
		return
	}

	c.JSON(http.StatusOK, staff)
}

// GetStaffByID retrieves a single staff member
func (h *StaffHandler) GetStaffByID(c *gin.Context) {
	staffID := c.Param("id")
	schoolID := c.GetString("school_id")

	var staff models.Staff
	if err := h.DB.Where("id = ? AND school_id = ?", staffID, schoolID).
		Preload("User").
		First(&staff).Error; err != nil {
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

	var staff models.Staff
	if err := h.DB.Where("id = ? AND school_id = ?", staffID, schoolID).First(&staff).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Staff not found"})
		return
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

	// Update fields
	staff.FirstName = req.FirstName
	staff.MiddleName = req.MiddleName
	staff.LastName = req.LastName
	staff.Gender = req.Gender
	staff.Nationality = req.Nationality
	staff.NationalID = req.NationalID
	staff.Email = req.Email
	staff.Phone = req.Phone
	staff.AlternativePhone = req.AlternativePhone
	staff.Address = req.Address
	staff.District = req.District
	staff.Village = req.Village
	staff.Role = req.Role
	staff.Department = req.Department
	staff.Qualifications = req.Qualifications
	staff.Specialization = req.Specialization
	staff.Experience = req.Experience
	staff.EmploymentType = req.EmploymentType
	staff.Salary = req.Salary
	staff.BankAccount = req.BankAccount
	staff.BankName = req.BankName
	staff.TIN = req.TIN
	staff.NSSF = req.NSSF
	staff.RegistrationNumber = req.RegistrationNumber
	staff.RegistrationBody = req.RegistrationBody
	staff.IPPSNumber = req.IPPSNumber
	staff.SupplierNumber = req.SupplierNumber
	staff.EmergencyContact = req.EmergencyContact
	staff.EmergencyPhone = req.EmergencyPhone
	staff.EmergencyRelation = req.EmergencyRelation
	staff.Status = req.Status
	staff.Notes = req.Notes

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

	if err := h.DB.Save(&staff).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update staff"})
		return
	}

	c.JSON(http.StatusOK, staff)
}

// DeleteStaff soft deletes a staff member
func (h *StaffHandler) DeleteStaff(c *gin.Context) {
	staffID := c.Param("id")
	schoolID := c.GetString("school_id")

	if err := h.DB.Where("id = ? AND school_id = ?", staffID, schoolID).Delete(&models.Staff{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete staff"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Staff deleted successfully"})
}

// CreateLeaveRequest creates a leave request
func (h *StaffHandler) CreateLeaveRequest(c *gin.Context) {
	var leave models.StaffLeave
	if err := c.ShouldBindJSON(&leave); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("school_id")
	leave.SchoolID = uuid.MustParse(schoolID)

	if err := h.DB.Create(&leave).Error; err != nil {
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

	query := h.DB.Where("school_id = ?", schoolID)

	if staffID != "" {
		query = query.Where("staff_id = ?", staffID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var leaves []models.StaffLeave
	if err := query.Preload("Staff").Preload("Approver").Find(&leaves).Error; err != nil {
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

	var leave models.StaffLeave
	if err := h.DB.Where("id = ? AND school_id = ?", leaveID, schoolID).First(&leave).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Leave request not found"})
		return
	}

	approverID := uuid.MustParse(userID)
	now := time.Now()

	updates := map[string]interface{}{
		"status":      input.Status,
		"approved_by": approverID,
		"approved_at": now,
	}

	if input.Status == "rejected" {
		updates["rejection_reason"] = input.RejectionReason
	}

	if err := h.DB.Model(&leave).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update leave request"})
		return
	}

	c.JSON(http.StatusOK, leave)
}

// MarkStaffAttendance marks staff attendance
func (h *StaffHandler) MarkStaffAttendance(c *gin.Context) {
	var attendance models.StaffAttendance
	if err := c.ShouldBindJSON(&attendance); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("school_id")
	userID := c.GetString("user_id")
	attendance.SchoolID = uuid.MustParse(schoolID)
	attendance.MarkedBy = uuid.MustParse(userID)

	if err := h.DB.Create(&attendance).Error; err != nil {
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

	query := h.DB.Where("school_id = ?", schoolID)

	if staffID != "" {
		query = query.Where("staff_id = ?", staffID)
	}
	if startDate != "" {
		query = query.Where("date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("date <= ?", endDate)
	}

	var attendance []models.StaffAttendance
	if err := query.Preload("Staff").Order("date DESC").Find(&attendance).Error; err != nil {
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

	if err := h.DB.Create(&document).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload document"})
		return
	}

	c.JSON(http.StatusCreated, document)
}

// GetStaffDocuments retrieves documents for a staff member
func (h *StaffHandler) GetStaffDocuments(c *gin.Context) {
	staffID := c.Param("staff_id")
	schoolID := c.GetString("school_id")

	var documents []models.StaffDocument
	if err := h.DB.Where("staff_id = ? AND school_id = ?", staffID, schoolID).
		Find(&documents).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch documents"})
		return
	}

	c.JSON(http.StatusOK, documents)
}

// GetStaffStats retrieves staff statistics
func (h *StaffHandler) GetStaffStats(c *gin.Context) {
	schoolID := c.GetString("school_id")

	var stats struct {
		TotalStaff      int64            `json:"total_staff"`
		ActiveStaff     int64            `json:"active_staff"`
		OnLeave         int64            `json:"on_leave"`
		ByRole          map[string]int64 `json:"by_role"`
		ByDepartment    map[string]int64 `json:"by_department"`
		ByEmploymentType map[string]int64 `json:"by_employment_type"`
	}

	h.DB.Model(&models.Staff{}).Where("school_id = ?", schoolID).Count(&stats.TotalStaff)
	h.DB.Model(&models.Staff{}).Where("school_id = ? AND status = ?", schoolID, "active").Count(&stats.ActiveStaff)
	h.DB.Model(&models.Staff{}).Where("school_id = ? AND status = ?", schoolID, "on_leave").Count(&stats.OnLeave)

	// By role
	var roleStats []struct {
		Role  string
		Count int64
	}
	h.DB.Model(&models.Staff{}).Select("role, COUNT(*) as count").
		Where("school_id = ? AND status = ?", schoolID, "active").
		Group("role").Scan(&roleStats)

	stats.ByRole = make(map[string]int64)
	for _, rs := range roleStats {
		stats.ByRole[rs.Role] = rs.Count
	}

	// By department
	var deptStats []struct {
		Department string
		Count      int64
	}
	h.DB.Model(&models.Staff{}).Select("department, COUNT(*) as count").
		Where("school_id = ? AND status = ? AND department IS NOT NULL", schoolID, "active").
		Group("department").Scan(&deptStats)

	stats.ByDepartment = make(map[string]int64)
	for _, ds := range deptStats {
		stats.ByDepartment[ds.Department] = ds.Count
	}

	// By employment type
	var empStats []struct {
		EmploymentType string
		Count          int64
	}
	h.DB.Model(&models.Staff{}).Select("employment_type, COUNT(*) as count").
		Where("school_id = ? AND status = ?", schoolID, "active").
		Group("employment_type").Scan(&empStats)

	stats.ByEmploymentType = make(map[string]int64)
	for _, es := range empStats {
		stats.ByEmploymentType[es.EmploymentType] = es.Count
	}

	c.JSON(http.StatusOK, stats)
}
