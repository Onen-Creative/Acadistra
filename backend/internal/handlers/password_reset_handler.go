package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
)

type PasswordResetHandler struct {
	service *services.PasswordResetService
}

func NewPasswordResetHandler(service *services.PasswordResetService) *PasswordResetHandler {
	return &PasswordResetHandler{service: service}
}

type PasswordResetRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type PasswordResetConfirm struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

func (h *PasswordResetHandler) RequestPasswordReset(c *gin.Context) {
	var req PasswordResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.service.RequestPasswordReset(req.Email)
	c.JSON(http.StatusOK, gin.H{"message": "If your email exists, you will receive a password reset link shortly"})
}

func (h *PasswordResetHandler) ConfirmPasswordReset(c *gin.Context) {
	var req PasswordResetConfirm
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.ConfirmPasswordReset(req.Token, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}
