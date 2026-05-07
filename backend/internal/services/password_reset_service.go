package services

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
)

type PasswordResetService struct {
	repo         *repositories.PasswordResetRepository
	emailService *EmailService
	authService  *AuthService
}

func NewPasswordResetService(repo *repositories.PasswordResetRepository, emailService *EmailService, authService *AuthService) *PasswordResetService {
	return &PasswordResetService{
		repo:         repo,
		emailService: emailService,
		authService:  authService,
	}
}

func (s *PasswordResetService) RequestPasswordReset(email string) error {
	user, err := s.repo.FindUserByEmail(email)
	if err != nil {
		return nil // Don't reveal if email exists
	}

	token := generateResetToken()
	resetLink := fmt.Sprintf("http://localhost:3000/reset-password/confirm?token=%s", token)

	resetRecord := &models.PasswordReset{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}

	if err := s.repo.CreateResetToken(resetRecord); err != nil {
		return err
	}

	if s.emailService != nil {
		go func() {
			if err := s.emailService.SendPasswordResetEmail(user.Email, user.FullName, resetLink); err != nil {
				fmt.Printf("Failed to send password reset email to: %s, Error: %v\n", user.Email, err)
			}
		}()
	}

	return nil
}

func (s *PasswordResetService) ConfirmPasswordReset(token, newPassword string) error {
	resetRecord, err := s.repo.FindValidToken(token)
	if err != nil {
		return fmt.Errorf("invalid or expired reset token")
	}

	user, err := s.repo.FindUserByID(resetRecord.UserID)
	if err != nil {
		return fmt.Errorf("user not found")
	}

	if err := s.authService.UpdatePassword(user, newPassword); err != nil {
		return err
	}

	s.repo.DeleteToken(resetRecord.ID)
	return nil
}

func generateResetToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}
