package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

type LoginRequest struct {
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password" binding:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// @Summary Login
// @Tags auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} services.TokenPair
// @Router /api/v1/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Email == "" && req.Phone == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email or phone required"})
		return
	}

	identifier := req.Email
	if req.Phone != "" {
		identifier = req.Phone
	}

	tokens, user, err := h.authService.Login(identifier, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Log login action
	h.authService.LogAudit(user.ID, "login", "auth", user.ID, nil, models.JSONB{"email": user.Email}, c.ClientIP())

	userResponse := gin.H{
		"id":        user.ID,
		"email":     user.Email,
		"full_name": user.FullName,
		"role":      user.Role,
		"school_id": user.SchoolID,
	}

	// Include school details if user belongs to a school
	if user.School != nil {
		userResponse["school"] = gin.H{
			"id":            user.School.ID,
			"name":          user.School.Name,
			"address":       user.School.Address,
			"phone":         user.School.Phone,
			"contact_email": user.School.ContactEmail,
			"motto":         user.School.Motto,
			"logo_url":      user.School.LogoURL,
			"config":        user.School.Config,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"tokens": tokens,
		"user":   userResponse,
	})
}

// @Summary Refresh tokens
// @Tags auth
// @Accept json
// @Produce json
// @Param request body RefreshRequest true "Refresh token"
// @Success 200 {object} services.TokenPair
// @Router /api/v1/auth/refresh [post]
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tokens, err := h.authService.RefreshTokens(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	c.JSON(http.StatusOK, tokens)
}

// @Summary Logout
// @Tags auth
// @Accept json
// @Produce json
// @Param request body RefreshRequest true "Refresh token"
// @Success 200
// @Router /api/v1/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if exists {
		if uid, ok := userID.(string); ok {
			if parsedID, err := uuid.Parse(uid); err == nil {
				h.authService.LogAudit(parsedID, "logout", "auth", parsedID, nil, nil, c.ClientIP())
			}
		}
	}

	if err := h.authService.RevokeToken(req.RefreshToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}
