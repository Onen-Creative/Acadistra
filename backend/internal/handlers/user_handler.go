package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"github.com/school-system/backend/internal/utils"
	"gorm.io/gorm"
)

type UserHandler struct {
	db           *gorm.DB
	authService  *services.AuthService
	emailService *services.EmailService
}

func NewUserHandler(db *gorm.DB, authService *services.AuthService) *UserHandler {
	return &UserHandler{
		db:          db,
		authService: authService,
	}
}

func NewUserHandlerWithEmail(db *gorm.DB, authService *services.AuthService, emailService *services.EmailService) *UserHandler {
	return &UserHandler{
		db:           db,
		authService:  authService,
		emailService: emailService,
	}
}

func (h *UserHandler) List(c *gin.Context) {
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
	role := c.Query("role")
	offset := (page - 1) * limit

	query := h.db.Model(&models.User{}).Preload("School")
	if search != "" {
		query = query.Where("full_name LIKE ? OR email LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if role != "" {
		query = query.Where("role = ?", role)
	}

	var total int64
	query.Count(&total)

	var users []models.User
	if err := query.Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Map users with school_name for frontend
	type UserResponse struct {
		models.User
		SchoolName string `json:"school_name"`
	}

	var response []UserResponse
	for _, user := range users {
		schoolName := "System"
		if user.School != nil {
			schoolName = user.School.Name
		}
		response = append(response, UserResponse{
			User:       user,
			SchoolName: schoolName,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"users": response,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *UserHandler) Create(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=8"`
		FullName string `json:"full_name" binding:"required"`
		Role     string `json:"role" binding:"required"`
		SchoolID string `json:"school_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Validate email format
	if err := utils.ValidateEmailFormat(req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// System admin can only create school_admin
	if req.Role != "school_admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "System admin can only create school_admin users"})
		return
	}

	if req.SchoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School assignment required for school_admin"})
		return
	}

	schoolID, err := uuid.Parse(req.SchoolID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid school_id"})
		return
	}

	// Get school to extract initials for employee_id
	var school models.School
	if err := h.db.First(&school, "id = ?", schoolID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch school: " + err.Error()})
		}
		return
	}

	// Start transaction
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	user := &models.User{
		SchoolID: &schoolID,
		Email:    req.Email,
		FullName: req.FullName,
		Role:     req.Role,
		IsActive: true,
	}

	// Create user account
	if err := h.authService.CreateUser(user, req.Password); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create corresponding staff record with employee_id
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
	employeeID := fmt.Sprintf("%s/STF/%d/%03d", schoolInitials, currentYear, sequence)

	// Parse full name into first and last name
	nameParts := strings.Fields(req.FullName)
	firstName := ""
	middleName := ""
	lastName := ""
	if len(nameParts) > 0 {
		firstName = nameParts[0]
	}
	if len(nameParts) > 2 {
		middleName = nameParts[1]
		lastName = strings.Join(nameParts[2:], " ")
	} else if len(nameParts) > 1 {
		lastName = strings.Join(nameParts[1:], " ")
	}

	// Create staff record
	staff := models.Staff{
		SchoolID:   schoolID,
		UserID:     &user.ID,
		EmployeeID: employeeID,
		FirstName:  firstName,
		MiddleName: middleName,
		LastName:   lastName,
		Email:      req.Email,
		Phone:      "",
		Role:       "School Admin",
		Status:     "active",
	}

	if err := tx.Create(&staff).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create staff record: " + err.Error()})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete user creation: " + err.Error()})
		return
	}

	// Send welcome email if email service is available
	if h.emailService != nil {
		schoolName := "Acadistra"
		if user.School != nil {
			schoolName = user.School.Name
		} else {
			schoolName = school.Name
		}
		go func(email, name, role, schoolN, password string) {
			if err := h.emailService.SendWelcomeEmail(email, name, role, schoolN, password); err != nil {
				log.Printf("Failed to send welcome email to %s: %v", email, err)
				
				// Create admin notification for email failure
				notification := models.Notification{
					Type:     "email_failure",
					Category: "system",
					Title:    "Email Delivery Failed",
					Message:  "Failed to send welcome email to " + email,
				}
				h.db.Create(&notification)
			}
		}(user.Email, user.FullName, user.Role, schoolName, req.Password)
	}

	c.JSON(http.StatusCreated, gin.H{
		"user":        user,
		"employee_id": employeeID,
		"message":     "School admin created successfully with employee ID: " + employeeID,
	})
}

func (h *UserHandler) Get(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	var user models.User
	if err := h.db.Preload("School").Where("id = ? AND school_id = ?", id, schoolID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	type UserResponse struct {
		models.User
		SchoolName string `json:"school_name"`
	}
	schoolName := "System"
	if user.School != nil {
		schoolName = user.School.Name
	}
	c.JSON(http.StatusOK, UserResponse{User: user, SchoolName: schoolName})
}

func (h *UserHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := h.db.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req struct {
		Email    string `json:"email"`
		FullName string `json:"full_name"`
		Role     string `json:"role"`
		IsActive *bool  `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Email != "" {
		user.Email = req.Email
	}
	if req.FullName != "" {
		user.FullName = req.FullName
	}
	if req.Role != "" {
		user.Role = req.Role
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}

	if err := h.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Delete(&models.User{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User deleted"})
}

// School Admin User Management Methods

func (h *UserHandler) ListSchoolUsers(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	var users []models.User
	if err := h.db.Preload("School").Where("school_id = ?", schoolID).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}

func (h *UserHandler) CreateSchoolUser(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=8"`
		FullName string `json:"full_name" binding:"required"`
		Role     string `json:"role" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Validate email format
	if err := utils.ValidateEmailFormat(req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Prevent creating users for roles that should be created via staff registration
	if req.Role == "teacher" || req.Role == "bursar" || req.Role == "librarian" || req.Role == "nurse" || req.Role == "store_keeper" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Users with role " + req.Role + " must be created via Staff Registration. Go to Staff > Register New Staff to create this user."})
		return
	}

	allowedRoles := []string{"security", "cleaner", "cook", "driver", "gardener", "maintenance", "receptionist"}
	validRole := false
	for _, role := range allowedRoles {
		if req.Role == role {
			validRole = true
			break
		}
	}
	if !validRole {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role. For teachers, bursar, librarian, nurse, or store keeper, use Staff Registration. Other roles: security, cleaner, cook, driver, gardener, maintenance, receptionist"})
		return
	}

	schoolUUID, _ := uuid.Parse(schoolID)
	user := &models.User{
		SchoolID: &schoolUUID,
		Email:    req.Email,
		FullName: req.FullName,
		Role:     req.Role,
		IsActive: true,
	}

	if err := h.authService.CreateUser(user, req.Password); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Send welcome email if email service is available
	if h.emailService != nil {
		schoolUUID, _ := uuid.Parse(schoolID)
		var school models.School
		h.db.First(&school, "id = ?", schoolUUID)
		schoolName := "Acadistra"
		if school.ID != uuid.Nil {
			schoolName = school.Name
		}
		go func(email, name, role, schoolN, password string) {
			if err := h.emailService.SendWelcomeEmail(email, name, role, schoolN, password); err != nil {
				log.Printf("Failed to send welcome email to %s: %v", email, err)
				
				// Create admin notification for email failure
				notification := models.Notification{
					Type:     "email_failure",
					Category: "system",
					Title:    "Email Delivery Failed",
					Message:  "Failed to send welcome email to " + email,
				}
				h.db.Create(&notification)
			}
		}(user.Email, user.FullName, user.Role, schoolName, req.Password)
	}

	c.JSON(http.StatusCreated, user)
}

func (h *UserHandler) GetSchoolUser(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	var user models.User
	if err := h.db.Preload("School").Where("id = ? AND school_id = ?", id, schoolID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	type UserResponse struct {
		models.User
		SchoolName string `json:"school_name"`
	}
	schoolName := "System"
	if user.School != nil {
		schoolName = user.School.Name
	}
	c.JSON(http.StatusOK, UserResponse{User: user, SchoolName: schoolName})
}

func (h *UserHandler) UpdateSchoolUser(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var user models.User
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.Role == "system_admin" || user.Role == "school_admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot update system_admin or school_admin users"})
		return
	}

	var req struct {
		Email    string `json:"email"`
		FullName string `json:"full_name"`
		Role     string `json:"role"`
		IsActive *bool  `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Email != "" {
		user.Email = req.Email
	}
	if req.FullName != "" {
		user.FullName = req.FullName
	}
	if req.Role != "" {
		allowedRoles := []string{"teacher", "bursar", "librarian", "nurse", "store_keeper", "security", "cleaner", "cook", "driver", "gardener", "maintenance", "receptionist"}
		validRole := false
		for _, role := range allowedRoles {
			if req.Role == role {
				validRole = true
				break
			}
		}
		if !validRole {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role. Allowed: teacher, bursar, librarian, nurse, store_keeper, security, cleaner, cook, driver, gardener, maintenance, receptionist"})
			return
		}
		user.Role = req.Role
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}

	if err := h.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) DeleteSchoolUser(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var user models.User
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.Role == "system_admin" || user.Role == "school_admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete system_admin or school_admin users"})
		return
	}

	if err := h.db.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted"})
}

// ResetUserPassword allows school admin to reset a user's password
func (h *UserHandler) ResetUserPassword(c *gin.Context) {
	userID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var user models.User
	if err := h.db.Where("id = ? AND school_id = ?", userID, schoolID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req struct {
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update password
	if err := h.authService.UpdatePassword(&user, req.NewPassword); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	// Send email notification to user with new password
	if h.emailService != nil && user.Email != "" {
		schoolUUID, _ := uuid.Parse(schoolID)
		var school models.School
		h.db.First(&school, "id = ?", schoolUUID)
		schoolName := "Acadistra"
		if school.ID != uuid.Nil {
			schoolName = school.Name
		}
		go func(email, name, role, schoolN, password string) {
			if err := h.emailService.SendWelcomeEmail(email, name, role, schoolN, password); err != nil {
				log.Printf("Failed to send password reset email to %s: %v", email, err)
			}
		}(user.Email, user.FullName, user.Role, schoolName, req.NewPassword)
	}

	// Delete any pending password reset requests for this user
	h.db.Where("user_id = ?", user.ID).Delete(&models.PasswordReset{})

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully. User has been notified via email."})
}
