package services

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
)

type PaymentConfigService struct {
	repo *repositories.PaymentConfigRepository
}

func NewPaymentConfigService(repo *repositories.PaymentConfigRepository) *PaymentConfigService {
	return &PaymentConfigService{repo: repo}
}

type PaymentConfigRequest struct {
	Provider              string
	PublicKey             string
	SecretKey             string
	EncryptionKey         string
	WebhookSecret         string
	MerchantAccountNumber string
	MerchantAccountName   string
	MerchantBankName      string
}

func (s *PaymentConfigService) CreateOrUpdate(schoolID string, req *PaymentConfigRequest) (*models.SchoolPaymentConfig, error) {
	schoolUUID, _ := uuid.Parse(schoolID)
	
	config, err := s.repo.FindBySchoolID(schoolID)
	if err != nil {
		// Create new
		config = &models.SchoolPaymentConfig{
			SchoolID:              schoolUUID,
			Provider:              req.Provider,
			PublicKey:             req.PublicKey,
			SecretKey:             req.SecretKey,
			EncryptionKey:         req.EncryptionKey,
			WebhookSecret:         req.WebhookSecret,
			MerchantAccountNumber: req.MerchantAccountNumber,
			MerchantAccountName:   req.MerchantAccountName,
			MerchantBankName:      req.MerchantBankName,
			IsActive:              true,
		}
		return s.repo.Create(config)
	}

	// Update existing
	config.Provider = req.Provider
	config.PublicKey = req.PublicKey
	config.SecretKey = req.SecretKey
	config.EncryptionKey = req.EncryptionKey
	config.WebhookSecret = req.WebhookSecret
	config.MerchantAccountNumber = req.MerchantAccountNumber
	config.MerchantAccountName = req.MerchantAccountName
	config.MerchantBankName = req.MerchantBankName
	config.IsActive = true

	return s.repo.Update(config)
}

func (s *PaymentConfigService) GetConfig(schoolID string) (*models.SchoolPaymentConfig, error) {
	return s.repo.FindBySchoolID(schoolID)
}

func (s *PaymentConfigService) ToggleConfig(schoolID string) (*models.SchoolPaymentConfig, error) {
	config, err := s.repo.FindBySchoolID(schoolID)
	if err != nil {
		return nil, err
	}

	config.IsActive = !config.IsActive
	return s.repo.Update(config)
}
