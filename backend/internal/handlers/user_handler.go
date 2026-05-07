package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
	"github.com/school-system/backend/internal/utils"
)

type UserHandler struct {
	service *services.UserService
}

func NewUserHandler(service *services.UserService) *UserHandler {
	return &UserHandler{service: service}
}

func (h *UserHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	search := c.Query("search")
	role := c.Query("role")
	schoolID := c.Query("school_id")

	result, err := h.service.List(search, role, schoolID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
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

	if err := utils.ValidateEmailFormat(req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Role != "school_admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "System admin can only create school_admin users"})
		return
	}

	if req.SchoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School assignment required for school_admin"})
		return
	}

	user, employeeID, err := h.service.CreateSystemAdmin(req.Email, req.Password, req.FullName, req.SchoolID)
	if err != nil {
		// Check if it's a business logic error (inactive school, school not found, etc.)
		if strings.Contains(err.Error(), "inactive school") || strings.Contains(err.Error(), "school not found") || strings.Contains(err.Error(), "invalid school_id") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
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

	user, err := h.service.GetByID(id, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	schoolName := "System"
	if user.School != nil {
		schoolName = user.School.Name
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          user.ID,
		"email":       user.Email,
		"full_name":   user.FullName,
		"role":        user.Role,
		"is_active":   user.IsActive,
		"school_id":   user.SchoolID,
		"created_at":  user.CreatedAt,
		"school_name": schoolName,
	})
}

func (h *UserHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Email    string `json:"email"`
		FullName string `json:"full_name"`
		Role     string `json:"role"`
		Password string `json:"password"`
		IsActive *bool  `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := make(map[string]interface{})
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.FullName != "" {
		updates["full_name"] = req.FullName
	}
	if req.Role != "" {
		updates["role"] = req.Role
	}
	if req.Password != "" {
		updates["password"] = req.Password
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	user, err := h.service.Update(id, updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted"})
}

// School Admin User Management Methods

func (h *UserHandler) ListSchoolUsers(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	users, err := h.service.ListSchoolUsers(schoolID)
	if err != nil {
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

	user, err := h.service.CreateSchoolUser(req.Email, req.Password, req.FullName, req.Role, schoolID)
	if err != nil {
		// Check if it's a business logic error (inactive school, school not found, etc.)
		if strings.Contains(err.Error(), "inactive school") || strings.Contains(err.Error(), "school not found") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusCreated, user)
}

func (h *UserHandler) GetSchoolUser(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	user, err := h.service.GetByID(id, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	schoolName := "System"
	if user.School != nil {
		schoolName = user.School.Name
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          user.ID,
		"email":       user.Email,
		"full_name":   user.FullName,
		"role":        user.Role,
		"is_active":   user.IsActive,
		"school_id":   user.SchoolID,
		"created_at":  user.CreatedAt,
		"school_name": schoolName,
	})
}

func (h *UserHandler) UpdateSchoolUser(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

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

	updates := make(map[string]interface{})
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.FullName != "" {
		updates["full_name"] = req.FullName
	}
	if req.Role != "" {
		allowedRoles := []string{"teacher", "bursar", "librarian", "nurse", "store_keeper", "dos", "director_of_studies", "security", "cleaner", "cook", "driver", "gardener", "maintenance", "receptionist"}
		validRole := false
		for _, role := range allowedRoles {
			if req.Role == role {
				validRole = true
				break
			}
		}
		if !validRole {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role. Allowed: teacher, bursar, librarian, nurse, dos, director_of_studies, store_keeper, security, cleaner, cook, driver, gardener, maintenance, receptionist"})
			return
		}
		updates["role"] = req.Role
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	user, roleChanged, err := h.service.UpdateSchoolUser(id, schoolID, updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	message := "User updated successfully"
	if roleChanged {
		message = "User role updated. User must log out and log back in for changes to take effect."
	}

	c.JSON(http.StatusOK, gin.H{
		"user":         user,
		"role_changed": roleChanged,
		"message":      message,
	})
}

func (h *UserHandler) DeleteSchoolUser(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	if err := h.service.DeleteSchoolUser(id, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted"})
}

func (h *UserHandler) ResetUserPassword(c *gin.Context) {
	userID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var req struct {
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.ResetUserPassword(userID, schoolID, req.NewPassword); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully. User has been notified via email."})
}
