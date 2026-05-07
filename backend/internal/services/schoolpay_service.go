package services

import (
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/school-system/backend/internal/models"
)

const SchoolPayBaseURL = "https://schoolpay.co.ug/paymentapi"

type SchoolPayService struct {
	db *gorm.DB
}

func NewSchoolPayService(db *gorm.DB) *SchoolPayService {
	return &SchoolPayService{db: db}
}

func (s *SchoolPayService) DB() *gorm.DB {
	return s.db
}

// SchoolPay API Response structures
type SchoolPayResponse struct {
	ReturnCode              int                       `json:"returnCode"`
	ReturnMessage           string                    `json:"returnMessage"`
	Transactions            []SchoolPayTransaction    `json:"transactions"`
	SupplementaryFeePayments []SchoolPayTransaction   `json:"supplementaryFeePayments"`
}

type SchoolPayTransaction struct {
	Amount                           string  `json:"amount"`
	PaymentDateAndTime               string  `json:"paymentDateAndTime"`
	SchoolpayReceiptNumber           string  `json:"schoolpayReceiptNumber"`
	SettlementBankCode               string  `json:"settlementBankCode"`
	SourceChannelTransDetail         string  `json:"sourceChannelTransDetail"`
	SourceChannelTransactionID       string  `json:"sourceChannelTransactionId"`
	SourcePaymentChannel             string  `json:"sourcePaymentChannel"`
	StudentName                      string  `json:"studentName"`
	StudentPaymentCode               string  `json:"studentPaymentCode"`
	StudentRegistrationNumber        string  `json:"studentRegistrationNumber"`
	StudentClass                     string  `json:"studentClass,omitempty"`
	SupplementaryFeeDescription      string  `json:"supplementaryFeeDescription,omitempty"`
	SupplementaryFeeID               string  `json:"supplementaryFeeId,omitempty"`
	TransactionCompletionStatus      string  `json:"transactionCompletionStatus"`
	TransactionCompletionDateAndTime string  `json:"transactionCompletionDateAndTime,omitempty"`
}

// Webhook payload structures
type SchoolPayWebhookPayload struct {
	Signature string                  `json:"signature"`
	Type      string                  `json:"type"` // SCHOOL_FEES, OTHER_FEES
	Payment   SchoolPayTransaction    `json:"payment"`
}

// generateHash creates MD5 hash for authentication
func (s *SchoolPayService) generateHash(schoolCode, date, password string) string {
	data := schoolCode + date + password
	hash := md5.Sum([]byte(data))
	return strings.ToUpper(hex.EncodeToString(hash[:]))
}

// verifyWebhookSignature verifies webhook signature
func (s *SchoolPayService) verifyWebhookSignature(signature, apiPassword, receiptNumber string) bool {
	data := apiPassword + receiptNumber
	hash := sha256.Sum256([]byte(data))
	expectedSignature := hex.EncodeToString(hash[:])
	return signature == expectedSignature
}

// SyncTransactionsForDate fetches transactions for a specific date
func (s *SchoolPayService) SyncTransactionsForDate(schoolID uuid.UUID, date time.Time) error {
	var config models.SchoolPayConfig
	if err := s.db.Where("school_id = ? AND is_active = ?", schoolID, true).First(&config).Error; err != nil {
		return fmt.Errorf("schoolpay config not found: %w", err)
	}

	dateStr := date.Format("2006-01-02")
	hash := s.generateHash(config.SchoolCode, dateStr, config.APIPassword)
	url := fmt.Sprintf("%s/AndroidRS/SyncSchoolTransactions/%s/%s/%s", 
		SchoolPayBaseURL, config.SchoolCode, dateStr, hash)

	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("failed to fetch transactions: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	var apiResp SchoolPayResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return fmt.Errorf("failed to parse response: %w", err)
	}

	if apiResp.ReturnCode != 0 {
		return fmt.Errorf("api error: %s", apiResp.ReturnMessage)
	}

	// Process regular transactions
	for _, txn := range apiResp.Transactions {
		if err := s.saveTransaction(schoolID, "SCHOOL_FEES", txn, body); err != nil {
			return err
		}
	}

	// Process supplementary fee payments
	for _, txn := range apiResp.SupplementaryFeePayments {
		if err := s.saveTransaction(schoolID, "OTHER_FEES", txn, body); err != nil {
			return err
		}
	}

	// Update last sync time
	s.db.Model(&config).Update("last_sync_at", time.Now())

	return nil
}

// SyncTransactionsForRange fetches transactions for a date range (max 31 days)
func (s *SchoolPayService) SyncTransactionsForRange(schoolID uuid.UUID, fromDate, toDate time.Time) error {
	var config models.SchoolPayConfig
	if err := s.db.Where("school_id = ? AND is_active = ?", schoolID, true).First(&config).Error; err != nil {
		return fmt.Errorf("schoolpay config not found: %w", err)
	}

	fromStr := fromDate.Format("2006-01-02")
	toStr := toDate.Format("2006-01-02")
	hash := s.generateHash(config.SchoolCode, fromStr, config.APIPassword)
	url := fmt.Sprintf("%s/AndroidRS/SchoolRangeTransactions/%s/%s/%s/%s", 
		SchoolPayBaseURL, config.SchoolCode, fromStr, toStr, hash)

	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("failed to fetch transactions: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	var apiResp SchoolPayResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return fmt.Errorf("failed to parse response: %w", err)
	}

	if apiResp.ReturnCode != 0 {
		return fmt.Errorf("api error: %s", apiResp.ReturnMessage)
	}

	for _, txn := range apiResp.Transactions {
		if err := s.saveTransaction(schoolID, "SCHOOL_FEES", txn, body); err != nil {
			return err
		}
	}

	for _, txn := range apiResp.SupplementaryFeePayments {
		if err := s.saveTransaction(schoolID, "OTHER_FEES", txn, body); err != nil {
			return err
		}
	}

	s.db.Model(&config).Update("last_sync_at", time.Now())

	return nil
}

// saveTransaction saves a transaction to the database
func (s *SchoolPayService) saveTransaction(schoolID uuid.UUID, txnType string, txn SchoolPayTransaction, rawPayload []byte) error {
	// Check if transaction already exists
	var existing models.SchoolPayTransaction
	if err := s.db.Where("schoolpay_receipt_number = ?", txn.SchoolpayReceiptNumber).First(&existing).Error; err == nil {
		return nil // Already exists
	}

	paymentTime, _ := time.Parse("2006-01-02 15:04:05", txn.PaymentDateAndTime)
	var completionTime *time.Time
	if txn.TransactionCompletionDateAndTime != "" {
		t, _ := time.Parse("2006-01-02 15:04:05", txn.TransactionCompletionDateAndTime)
		completionTime = &t
	}

	// Try to match student by SchoolPay code first, then fallback to admission number
	var studentID *uuid.UUID
	var student models.Student
	if err := s.db.Where("school_id = ? AND schoolpay_code = ?", 
		schoolID, txn.StudentPaymentCode).First(&student).Error; err == nil {
		studentID = &student.ID
	} else if err := s.db.Where("school_id = ? AND admission_no = ?", 
		schoolID, txn.StudentRegistrationNumber).First(&student).Error; err == nil {
		studentID = &student.ID
	}

	transaction := models.SchoolPayTransaction{
		SchoolID:                         schoolID,
		StudentID:                        studentID,
		TransactionType:                  txnType,
		SchoolpayReceiptNumber:           txn.SchoolpayReceiptNumber,
		Amount:                           parseAmount(txn.Amount),
		StudentPaymentCode:               txn.StudentPaymentCode,
		StudentName:                      txn.StudentName,
		StudentRegistrationNumber:        txn.StudentRegistrationNumber,
		StudentClass:                     txn.StudentClass,
		SupplementaryFeeID:               txn.SupplementaryFeeID,
		SupplementaryFeeDescription:      txn.SupplementaryFeeDescription,
		SourcePaymentChannel:             txn.SourcePaymentChannel,
		SourceChannelTransactionID:       txn.SourceChannelTransactionID,
		SourceChannelTransDetail:         txn.SourceChannelTransDetail,
		SettlementBankCode:               txn.SettlementBankCode,
		PaymentDateAndTime:               paymentTime,
		TransactionCompletionStatus:      txn.TransactionCompletionStatus,
		TransactionCompletionDateAndTime: completionTime,
		RawPayload:                       models.JSONB{"data": string(rawPayload)},
	}

	return s.db.Create(&transaction).Error
}

// ProcessWebhook handles incoming webhook notifications
func (s *SchoolPayService) ProcessWebhook(schoolID uuid.UUID, payload SchoolPayWebhookPayload) error {
	var config models.SchoolPayConfig
	if err := s.db.Where("school_id = ? AND is_active = ?", schoolID, true).First(&config).Error; err != nil {
		return fmt.Errorf("schoolpay config not found: %w", err)
	}

	// Verify signature
	if !s.verifyWebhookSignature(payload.Signature, config.APIPassword, payload.Payment.SchoolpayReceiptNumber) {
		return fmt.Errorf("invalid webhook signature")
	}

	// Save transaction
	rawPayload, _ := json.Marshal(payload)
	return s.saveTransaction(schoolID, payload.Type, payload.Payment, rawPayload)
}

// ProcessUnprocessedTransactions processes transactions and creates fee payments
func (s *SchoolPayService) ProcessUnprocessedTransactions(schoolID uuid.UUID) error {
	var transactions []models.SchoolPayTransaction
	if err := s.db.Where("school_id = ? AND processed = ? AND transaction_completion_status = ?", 
		schoolID, false, "Completed").Find(&transactions).Error; err != nil {
		return err
	}

	for _, txn := range transactions {
		if err := s.processTransaction(&txn); err != nil {
			txn.ErrorMessage = err.Error()
			s.db.Save(&txn)
			continue
		}
	}

	return nil
}

// processTransaction creates a fee payment from a SchoolPay transaction
func (s *SchoolPayService) processTransaction(txn *models.SchoolPayTransaction) error {
	if txn.StudentID == nil {
		return fmt.Errorf("student not found - payment code: %s, registration: %s", 
			txn.StudentPaymentCode, txn.StudentRegistrationNumber)
	}

	// Get current term and year
	var termDates models.TermDates
	if err := s.db.Where("school_id = ? AND start_date <= ? AND end_date >= ?", 
		txn.SchoolID, txn.PaymentDateAndTime, txn.PaymentDateAndTime).First(&termDates).Error; err != nil {
		return fmt.Errorf("term not found for payment date")
	}

	// Get or create student fees record
	var studentFees models.StudentFees
	if err := s.db.Where("student_id = ? AND term = ? AND year = ?", 
		txn.StudentID, termDates.Term, termDates.Year).First(&studentFees).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("student fees record not found")
		}
		return err
	}

	// Create fees payment
	payment := models.FeesPayment{
		StudentFeesID: studentFees.ID,
		Amount:        txn.Amount,
		PaymentDate:   txn.PaymentDateAndTime,
		PaymentMethod: fmt.Sprintf("SchoolPay - %s", txn.SourcePaymentChannel),
		ReceiptNo:     txn.SchoolpayReceiptNumber,
		Notes:         fmt.Sprintf("SchoolPay transaction: %s", txn.SourceChannelTransactionID),
		RecordedBy:    uuid.MustParse("00000000-0000-0000-0000-000000000000"), // System user
	}

	if err := s.db.Create(&payment).Error; err != nil {
		return err
	}

	// Update student fees
	studentFees.AmountPaid += txn.Amount
	studentFees.Outstanding = studentFees.TotalFees - studentFees.AmountPaid
	if err := s.db.Save(&studentFees).Error; err != nil {
		return err
	}

	// Mark transaction as processed
	now := time.Now()
	txn.Processed = true
	txn.ProcessedAt = &now
	txn.FeesPaymentID = &payment.ID

	return s.db.Save(txn).Error
}

func parseAmount(amount string) float64 {
	var val float64
	fmt.Sscanf(amount, "%f", &val)
	return val
}
