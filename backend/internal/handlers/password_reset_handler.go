package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"gorm.io/gorm"
)

type PasswordResetHandler struct {
	db           *gorm.DB
	emailService *services.EmailService
	authService  *services.AuthService
}

func NewPasswordResetHandler(db *gorm.DB, emailService *services.EmailService, authService *services.AuthService) *PasswordResetHandler {
	return &PasswordResetHandler{
		db:           db,
		emailService: emailService,
		authService:  authService,
	}
}

type PasswordResetRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type PasswordResetConfirm struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

// RequestPasswordReset sends a password reset email
func (h *PasswordResetHandler) RequestPasswordReset(c *gin.Context) {
	var req PasswordResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Don't reveal if email exists for security
		c.JSON(http.StatusOK, gin.H{"message": "If email exists, password reset link has been sent"})
		return
	}

	// Generate reset token
	token := generateResetToken()
	resetLink := fmt.Sprintf("https://acadistra.com/reset-password?token=%s", token)

	// Store token in database with expiry (24 hours)
	resetRecord := &models.PasswordReset{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	if err := h.db.Create(resetRecord).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create reset token"})
		return
	}

	// Send email
	if h.emailService != nil {
		go h.emailService.SendPasswordResetEmail(user.Email, user.FullName, resetLink)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset link sent to email"})
}

// ConfirmPasswordReset resets the password with valid token
func (h *PasswordResetHandler) ConfirmPasswordReset(c *gin.Context) {
	var req PasswordResetConfirm
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var resetRecord models.PasswordReset
	if err := h.db.Where("token = ? AND expires_at > ?", req.Token, time.Now()).First(&resetRecord).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired reset token"})
		return
	}

	var user models.User
	if err := h.db.First(&user, "id = ?", resetRecord.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Update password
	if err := h.authService.UpdatePassword(&user, req.NewPassword); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	// Delete used token
	h.db.Delete(&resetRecord)

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}

// Helper function to generate random token
func generateResetToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}
