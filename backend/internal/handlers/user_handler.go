package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"gorm.io/gorm"
)

type UserHandler struct {
	db          *gorm.DB
	authService *services.AuthService
}

func NewUserHandler(db *gorm.DB, authService *services.AuthService) *UserHandler {
	return &UserHandler{
		db:          db,
		authService: authService,
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
	offset := (page - 1) * limit

	query := h.db.Model(&models.User{}).Preload("School")
	if search != "" {
		query = query.Where("full_name LIKE ? OR email LIKE ?", "%"+search+"%", "%"+search+"%")
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

	user := &models.User{
		SchoolID: &schoolID,
		Email:    req.Email,
		FullName: req.FullName,
		Role:     req.Role,
		IsActive: true,
	}

	if err := h.authService.CreateUser(user, req.Password); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, user)
}

func (h *UserHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := h.db.Preload("School").First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, user)
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

	if req.Role == "system_admin" || req.Role == "school_admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot create system_admin or school_admin users"})
		return
	}

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

	c.JSON(http.StatusCreated, user)
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
