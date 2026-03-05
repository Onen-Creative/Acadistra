package services

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/school-system/backend/internal/models"
)

type MobileMoneyService struct {
	db *gorm.DB
}

func NewMobileMoneyService(db *gorm.DB) *MobileMoneyService {
	return &MobileMoneyService{db: db}
}

// getSchoolConfig retrieves payment config for a school
func (s *MobileMoneyService) getSchoolConfig(schoolID uuid.UUID) (*models.SchoolPaymentConfig, error) {
	var config models.SchoolPaymentConfig
	if err := s.db.Where("school_id = ? AND is_active = ?", schoolID, true).First(&config).Error; err != nil {
		return nil, fmt.Errorf("payment gateway not configured for this school")
	}
	return &config, nil
}

type InitiatePaymentRequest struct {
	Amount      float64 `json:"amount"`
	Currency    string  `json:"currency"`
	PhoneNumber string  `json:"phone_number"`
	Email       string  `json:"email"`
	TxRef       string  `json:"tx_ref"`
	Network     string  `json:"network"`
	FullName    string  `json:"fullname"`
	RedirectURL string  `json:"redirect_url"`
	Meta        map[string]interface{} `json:"meta,omitempty"`
}

type PaymentResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Data    struct {
		Link          string `json:"link"`
		TransactionID string `json:"id"`
		FlwRef        string `json:"flw_ref"`
	} `json:"data"`
}

type VerifyResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Data    struct {
		ID              int     `json:"id"`
		TxRef           string  `json:"tx_ref"`
		FlwRef          string  `json:"flw_ref"`
		Amount          float64 `json:"amount"`
		Currency        string  `json:"currency"`
		ChargedAmount   float64 `json:"charged_amount"`
		Status          string  `json:"status"`
		PaymentType     string  `json:"payment_type"`
		CreatedAt       string  `json:"created_at"`
		Customer        struct {
			Email       string `json:"email"`
			PhoneNumber string `json:"phone_number"`
			Name        string `json:"name"`
		} `json:"customer"`
	} `json:"data"`
}

// InitiateMobileMoneyPayment initiates a mobile money payment
func (s *MobileMoneyService) InitiateMobileMoneyPayment(schoolID uuid.UUID, req InitiatePaymentRequest) (*PaymentResponse, error) {
	config, err := s.getSchoolConfig(schoolID)
	if err != nil {
		return nil, err
	}

	payload := map[string]interface{}{
		"tx_ref":       req.TxRef,
		"amount":       req.Amount,
		"currency":     req.Currency,
		"network":      req.Network,
		"email":        req.Email,
		"phone_number": req.PhoneNumber,
		"fullname":     req.FullName,
		"redirect_url": req.RedirectURL,
	}

	if req.Meta != nil {
		payload["meta"] = req.Meta
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	baseURL := "https://api.flutterwave.com/v3"
	httpReq, err := http.NewRequest("POST", baseURL+"/charges?type=mobile_money_uganda", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+config.SecretKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	var result PaymentResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if result.Status != "success" {
		return nil, fmt.Errorf("payment initiation failed: %s", result.Message)
	}

	return &result, nil
}

// VerifyTransaction verifies a mobile money transaction
func (s *MobileMoneyService) VerifyTransaction(schoolID uuid.UUID, transactionID string) (*VerifyResponse, error) {
	config, err := s.getSchoolConfig(schoolID)
	if err != nil {
		return nil, err
	}

	baseURL := "https://api.flutterwave.com/v3"
	httpReq, err := http.NewRequest("GET", baseURL+"/transactions/"+transactionID+"/verify", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+config.SecretKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	var result VerifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// ValidateWebhookSignature validates Flutterwave webhook signature
func (s *MobileMoneyService) ValidateWebhookSignature(schoolID uuid.UUID, signature, payload string) bool {
	config, err := s.getSchoolConfig(schoolID)
	if err != nil {
		return false
	}
	hash := sha256.New()
	hash.Write([]byte(config.WebhookSecret))
	expectedSignature := hex.EncodeToString(hash.Sum(nil))
	return signature == expectedSignature
}

// GetTransactionFee calculates transaction fee
func (s *MobileMoneyService) GetTransactionFee(amount float64) float64 {
	// Flutterwave Uganda: 1.4% + UGX 0
	return amount * 0.014
}

// RefundTransaction initiates a refund
func (s *MobileMoneyService) RefundTransaction(schoolID uuid.UUID, transactionID string, amount float64) error {
	config, err := s.getSchoolConfig(schoolID)
	if err != nil {
		return err
	}

	payload := map[string]interface{}{
		"id":     transactionID,
		"amount": amount,
	}

	baseURL := "https://api.flutterwave.com/v3"
	jsonData, _ := json.Marshal(payload)
	httpReq, _ := http.NewRequest("POST", baseURL+"/transactions/"+transactionID+"/refund", bytes.NewBuffer(jsonData))
	httpReq.Header.Set("Authorization", "Bearer "+config.SecretKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	if result["status"] != "success" {
		return fmt.Errorf("refund failed: %v", result["message"])
	}

	return nil
}

// GetSupportedNetworks returns supported mobile money networks
func (s *MobileMoneyService) GetSupportedNetworks() []string {
	return []string{"MTN", "AIRTEL"}
}

// ValidatePhoneNumber validates Uganda phone number format
func (s *MobileMoneyService) ValidatePhoneNumber(phone string) bool {
	// Uganda format: +256XXXXXXXXX or 0XXXXXXXXX
	if len(phone) == 13 && phone[:4] == "+256" {
		return true
	}
	if len(phone) == 10 && phone[0] == '0' {
		return true
	}
	return false
}

// NormalizePhoneNumber converts phone to international format
func (s *MobileMoneyService) NormalizePhoneNumber(phone string) string {
	if len(phone) == 10 && phone[0] == '0' {
		return "+256" + phone[1:]
	}
	return phone
}
