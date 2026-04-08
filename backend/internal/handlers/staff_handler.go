package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/school-system/backend/internal/config"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
)

type StaffHandler struct {
	DB           *gorm.DB
	authService  *services.AuthService
	emailService *services.EmailService
}

func NewStaffHandler(db *gorm.DB, cfg *config.Config, emailService *services.EmailService) *StaffHandler {
	return &StaffHandler{
		DB:           db,
		authService:  services.NewAuthService(db, cfg),
		emailService: emailService,
	}
}

// CreateStaff creates a new staff member
// This is the PRIMARY method for creating users with system access (except school_admin)
// Roles that get user accounts: Teacher, Bursar, Librarian, Nurse, Store Keeper
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
		var existingUser models.User
		if err := h.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
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

	// Get school to extract initials (before transaction)
	var school models.School
	if err := h.DB.First(&school, "id = ?", schoolID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch school: " + err.Error()})
		}
		return
	}

	// Generate school initials from school name
	var schoolInitials string
	for _, word := range strings.Fields(school.Name) {
		if len(word) > 0 {
			schoolInitials += strings.ToUpper(string(word[0]))
		}
	}
	if schoolInitials == "" {
		schoolInitials = "SCH"
	}

	// Auto-generate employee_id - use transaction to prevent race conditions
	tx := h.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Find last employee number for this school
	var lastStaff models.Staff
	var sequence int = 0
	currentYear := time.Now().Year()
	pattern := fmt.Sprintf("%s/STF/%d/%%", schoolInitials, currentYear)
	if err := tx.Where("school_id = ? AND employee_id LIKE ?", schoolID, pattern).
		Order("employee_id DESC").First(&lastStaff).Error; err == nil {
		parts := strings.Split(lastStaff.EmployeeID, "/")
		if len(parts) == 4 {
			var num int
			if _, scanErr := fmt.Sscanf(parts[3], "%d", &num); scanErr == nil {
				sequence = num
			}
		}
	}
	sequence++
	staff.EmployeeID = fmt.Sprintf("%s/STF/%d/%03d", schoolInitials, currentYear, sequence)

	// Create staff record first
	if err := tx.Create(&staff).Error; err != nil {
		tx.Rollback()
		if strings.Contains(err.Error(), "duplicate key") {
			c.JSON(http.StatusConflict, gin.H{"error": "Staff record already exists"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create staff: " + err.Error()})
		}
		return
	}

	// Create User account if email is provided (after staff is created)
	var defaultPassword string
	if req.Email != "" {
		// Map staff role to user role and default password
		userRole := ""
		
		switch req.Role {
		case "Teacher":
			userRole = "teacher"
			defaultPassword = "Teacher@123"
		case "Bursar":
			userRole = "bursar"
			defaultPassword = "Bursar@123"
		case "Librarian":
			userRole = "librarian"
			defaultPassword = "Librarian@123"
		case "Nurse":
			userRole = "nurse"
			defaultPassword = "Nurse@123"
		case "Store Keeper":
			userRole = "store_keeper"
			defaultPassword = "StoreKeeper@123"
		default:
			// Other roles don't get user accounts
			userRole = ""
		}
		
		// Only create user account for roles that need system access
		if userRole != "" && defaultPassword != "" {
			hashed, err := h.authService.HashPassword(defaultPassword)
			if err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
				return
			}
			
			schoolIDPtr := uuid.MustParse(schoolID)
			fullName := req.FirstName
			if req.MiddleName != "" {
				fullName += " " + req.MiddleName
			}
			fullName += " " + req.LastName
			
			user := models.User{
				SchoolID:     &schoolIDPtr,
				Email:        req.Email,
				FullName:     fullName,
				Role:         userRole,
				IsActive:     true,
				PasswordHash: hashed,
			}
			if err := tx.Create(&user).Error; err != nil {
				tx.Rollback()
				if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "idx_users_email") {
					c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
				} else {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user account: " + err.Error()})
				}
				return
			}
			// Update staff with user_id
			staff.UserID = &user.ID
			if err := tx.Save(&staff).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link user to staff"})
				return
			}
		}
	}

	// Create TeacherProfile if role is Teacher (after staff and user are created)
	if req.Role == "Teacher" {
		teacherProfile := models.TeacherProfile{
			StaffID:  staff.ID,
			SchoolID: staff.SchoolID,
		}
		if err := tx.Create(&teacherProfile).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create teacher profile"})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Send welcome email asynchronously if user account was created
	if staff.UserID != nil && req.Email != "" {
		go func(email, fullName, role, employeeID, defaultPassword string, schoolID uuid.UUID) {
			// Get school name
			var school models.School
			if err := h.DB.First(&school, "id = ?", schoolID).Error; err == nil {
				// Send welcome email with credentials
				if err := h.emailService.SendWelcomeEmail(email, fullName, role, school.Name, defaultPassword); err != nil {
					log.Printf("Failed to send welcome email to %s: %v", email, err)
				}
			}
		}(req.Email, req.FirstName+" "+req.LastName, req.Role, staff.EmployeeID, defaultPassword, staff.SchoolID)
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

	// Convert to generic response format
	type StaffResponse struct {
		ID                 string     `json:"id"`
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

	// Add staff from staff table
	for _, s := range staff {
		sr := StaffResponse{
			ID:            s.ID.String(),
			EmployeeID:    s.EmployeeID,
			FirstName:     s.FirstName,
			MiddleName:    s.MiddleName,
			LastName:      s.LastName,
			Email:         s.Email,
			Phone:         s.Phone,
			Role:          s.Role,
			Department:    s.Department,
			Status:        s.Status,
			IsSchoolAdmin: false,
		}
		
		// If role is Teacher, include teacher_profile_id
		if s.Role == "Teacher" {
			var teacherProfile models.TeacherProfile
			if err := h.DB.Where("staff_id = ?", s.ID).First(&teacherProfile).Error; err == nil {
				profileID := teacherProfile.ID.String()
				sr.TeacherProfileID = &profileID
			}
		}
		
		result = append(result, sr)
	}

	// Add school admins from users table (if no specific role filter or role is "School Admin")
	if role == "" || role == "School Admin" {
		var schoolAdmins []models.User
		adminQuery := h.DB.Where("school_id = ? AND role = ?", schoolID, "school_admin")
		if status == "" || status == "active" {
			adminQuery = adminQuery.Where("is_active = ?", true)
		}
		if err := adminQuery.Find(&schoolAdmins).Error; err == nil {
			for _, admin := range schoolAdmins {
				// Parse full name into first and last name
				nameParts := strings.Fields(admin.FullName)
				firstName := ""
				lastName := ""
				if len(nameParts) > 0 {
					firstName = nameParts[0]
				}
				if len(nameParts) > 1 {
					lastName = strings.Join(nameParts[1:], " ")
				}
				
				statusStr := "active"
				if !admin.IsActive {
					statusStr = "inactive"
				}
				
				sr := StaffResponse{
					ID:            admin.ID.String(),
					EmployeeID:    "",
					FirstName:     firstName,
					LastName:      lastName,
					Email:         admin.Email,
					Role:          "School Admin",
					Status:        statusStr,
					IsSchoolAdmin: true,
				}
				result = append(result, sr)
			}
		}
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

	// Check if this is a school admin (in users table)
	var user models.User
	if err := h.DB.Where("id = ? AND school_id = ? AND role = ?", staffID, schoolID, "school_admin").First(&user).Error; err == nil {
		// Return school admin as staff response
		nameParts := strings.Fields(user.FullName)
		firstName := ""
		lastName := ""
		if len(nameParts) > 0 {
			firstName = nameParts[0]
		}
		if len(nameParts) > 1 {
			lastName = strings.Join(nameParts[1:], " ")
		}

		// Try to get staff record if it exists
		var staff models.Staff
		if err := h.DB.Where("user_id = ? AND school_id = ?", user.ID, schoolID).First(&staff).Error; err == nil {
			c.JSON(http.StatusOK, staff)
			return
		}

		// Return minimal staff info from user record
		statusStr := "active"
		if !user.IsActive {
			statusStr = "inactive"
		}

		c.JSON(http.StatusOK, gin.H{
			"id":              user.ID.String(),
			"first_name":      firstName,
			"last_name":       lastName,
			"email":           user.Email,
			"role":            "School Admin",
			"status":          statusStr,
			"is_school_admin": true,
		})
		return
	}

	// Regular staff lookup
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

	// Check if this is a school admin (in users table) or regular staff
	var user models.User
	isSchoolAdmin := false
	if err := h.DB.Where("id = ? AND school_id = ? AND role = ?", staffID, schoolID, "school_admin").First(&user).Error; err == nil {
		isSchoolAdmin = true
	}

	if isSchoolAdmin {
		// Update school admin in users table
		var req struct {
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
			Email     string `json:"email"`
			Phone     string `json:"phone"`
			Status    string `json:"status"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		fullName := req.FirstName
		if req.LastName != "" {
			fullName += " " + req.LastName
		}

		updates := map[string]interface{}{
			"full_name": fullName,
			"email":     req.Email,
		}

		if req.Status != "" {
			updates["is_active"] = (req.Status == "active")
		}

		if err := h.DB.Model(&user).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update school admin"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"id":              user.ID.String(),
			"first_name":      req.FirstName,
			"last_name":       req.LastName,
			"email":           user.Email,
			"phone":           req.Phone,
			"role":            "School Admin",
			"status":          req.Status,
			"is_school_admin": true,
		})
		return
	}

	// Regular staff update
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

	// Update fields (employee_id is NOT updated - it's auto-generated and immutable)
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

	leave := models.StaffLeave{
		StaffID:   uuid.MustParse(req.StaffID),
		SchoolID:  uuid.MustParse(schoolID),
		LeaveType: req.LeaveType,
		StartDate: startDate,
		EndDate:   endDate,
		Days:      req.Days,
		Reason:    req.Reason,
		Status:    "pending",
	}

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
