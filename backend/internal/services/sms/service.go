package sms

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"text/template"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// GetProvider gets SMS provider for a school
func (s *Service) GetProvider(schoolID uuid.UUID) (*models.SMSProvider, error) {
	var provider models.SMSProvider
	if err := s.db.Where("school_id = ?", schoolID).First(&provider).Error; err != nil {
		return nil, err
	}
	return &provider, nil
}

// ConfigureProvider configures SMS provider for a school
func (s *Service) ConfigureProvider(provider *models.SMSProvider) error {
	var existing models.SMSProvider
	result := s.db.Where("school_id = ?", provider.SchoolID).First(&existing)

	if result.Error == gorm.ErrRecordNotFound {
		return s.db.Create(provider).Error
	}

	existing.Provider = provider.Provider
	existing.APIKey = provider.APIKey
	existing.APISecret = provider.APISecret
	existing.Username = provider.Username
	existing.SenderID = provider.SenderID
	existing.IsActive = provider.IsActive

	return s.db.Save(&existing).Error
}

// GetTemplates gets SMS templates for a school
func (s *Service) GetTemplates(schoolID *uuid.UUID) ([]models.SMSTemplate, error) {
	var templates []models.SMSTemplate
	query := s.db.Where("is_active = ?", true)
	
	if schoolID != nil {
		query = query.Where("school_id = ? OR school_id IS NULL", schoolID)
	} else {
		query = query.Where("school_id IS NULL")
	}
	
	if err := query.Order("category, name").Find(&templates).Error; err != nil {
		return nil, err
	}
	return templates, nil
}

// CreateTemplate creates a new SMS template
func (s *Service) CreateTemplate(template *models.SMSTemplate) error {
	return s.db.Create(template).Error
}

// UpdateTemplate updates an SMS template
func (s *Service) UpdateTemplate(template *models.SMSTemplate) error {
	return s.db.Save(template).Error
}

// DeleteTemplate deletes an SMS template
func (s *Service) DeleteTemplate(id uuid.UUID) error {
	return s.db.Delete(&models.SMSTemplate{}, "id = ?", id).Error
}

// GetQueue gets SMS queue for a school
func (s *Service) GetQueue(schoolID uuid.UUID, status string, limit int) ([]models.SMSQueue, error) {
	var queue []models.SMSQueue
	query := s.db.Where("school_id = ?", schoolID)
	
	if status != "" {
		query = query.Where("status = ?", status)
	}
	
	if limit == 0 {
		limit = 100
	}
	
	if err := query.Order("created_at DESC").Limit(limit).Find(&queue).Error; err != nil {
		return nil, err
	}
	return queue, nil
}

// GetBatches gets SMS batches for a school
func (s *Service) GetBatches(schoolID uuid.UUID, limit int) ([]models.SMSBatch, error) {
	var batches []models.SMSBatch
	
	if limit == 0 {
		limit = 50
	}
	
	if err := s.db.Where("school_id = ?", schoolID).Order("created_at DESC").Limit(limit).Find(&batches).Error; err != nil {
		return nil, err
	}
	return batches, nil
}

// GetLogs gets SMS logs for a school
func (s *Service) GetLogs(schoolID uuid.UUID, limit int) ([]models.SMSLog, error) {
	var logs []models.SMSLog
	
	if limit == 0 {
		limit = 100
	}
	
	if err := s.db.Where("school_id = ?", schoolID).Order("created_at DESC").Limit(limit).Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

// GetStats gets SMS statistics for a school
func (s *Service) GetStats(schoolID uuid.UUID) (map[string]interface{}, error) {
	stats := make(map[string]interface{})
	
	// Total sent
	var totalSent int64
	s.db.Model(&models.SMSLog{}).Where("school_id = ? AND status = ?", schoolID, "sent").Count(&totalSent)
	stats["total_sent"] = totalSent
	
	// Total failed
	var totalFailed int64
	s.db.Model(&models.SMSLog{}).Where("school_id = ? AND status = ?", schoolID, "failed").Count(&totalFailed)
	stats["total_failed"] = totalFailed
	
	// Total cost
	var totalCost float64
	s.db.Model(&models.SMSLog{}).Where("school_id = ?", schoolID).Select("COALESCE(SUM(cost), 0)").Scan(&totalCost)
	stats["total_cost"] = totalCost
	
	// Pending
	var pending int64
	s.db.Model(&models.SMSQueue{}).Where("school_id = ? AND status = ?", schoolID, "pending").Count(&pending)
	stats["pending"] = pending
	
	// This month
	var thisMonth int64
	s.db.Model(&models.SMSLog{}).Where("school_id = ? AND created_at >= ?", schoolID, time.Now().AddDate(0, 0, -30)).Count(&thisMonth)
	stats["this_month"] = thisMonth
	
	return stats, nil
}

// SendSMS queues an SMS for sending
func (s *Service) SendSMS(ctx context.Context, req SendSMSRequest) error {
	sms := &models.SMSQueue{
		SchoolID:      req.SchoolID,
		RecipientID:   req.RecipientID,
		RecipientType: req.RecipientType,
		PhoneNumber:   normalizePhone(req.PhoneNumber),
		Message:       req.Message,
		Category:      req.Category,
		Priority:      req.Priority,
		ScheduledFor:  req.ScheduledFor,
		CreatedBy:     req.CreatedBy,
		Metadata:      req.Metadata,
	}

	if err := s.db.Create(sms).Error; err != nil {
		return err
	}

	// Send immediately if not scheduled
	if req.ScheduledFor == nil || req.ScheduledFor.Before(time.Now()) {
		go s.processSMS(sms.ID)
	}

	return nil
}

// SendBulkSMS sends SMS to multiple recipients
func (s *Service) SendBulkSMS(ctx context.Context, req BulkSMSRequest) (*models.SMSBatch, error) {
	batch := &models.SMSBatch{
		SchoolID:    req.SchoolID,
		Name:        req.Name,
		Category:    req.Category,
		TotalCount:  len(req.Recipients),
		CreatedBy:   req.CreatedBy,
	}

	if err := s.db.Create(batch).Error; err != nil {
		return nil, err
	}

	// Queue all messages
	for _, recipient := range req.Recipients {
		msg := req.Message
		if req.TemplateID != nil {
			rendered, err := s.RenderTemplate(*req.TemplateID, recipient.Variables)
			if err == nil {
				msg = rendered
			}
		}

		sms := &models.SMSQueue{
			SchoolID:      req.SchoolID,
			RecipientID:   recipient.RecipientID,
			RecipientType: recipient.RecipientType,
			PhoneNumber:   normalizePhone(recipient.PhoneNumber),
			Message:       msg,
			Category:      req.Category,
			Priority:      req.Priority,
			CreatedBy:     req.CreatedBy,
			Metadata:      map[string]interface{}{"batch_id": batch.ID.String()},
		}
		s.db.Create(sms)
	}

	go s.processBatch(batch.ID)
	return batch, nil
}

// RenderTemplate renders SMS template with variables
func (s *Service) RenderTemplate(templateID uuid.UUID, vars map[string]interface{}) (string, error) {
	var tpl models.SMSTemplate
	if err := s.db.First(&tpl, "id = ?", templateID).Error; err != nil {
		return "", err
	}

	tmpl, err := template.New("sms").Parse(tpl.Template)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, vars); err != nil {
		return "", err
	}

	return buf.String(), nil
}

// processSMS sends a single SMS
func (s *Service) processSMS(smsID uuid.UUID) {
	var sms models.SMSQueue
	if err := s.db.Preload("School").First(&sms, "id = ?", smsID).Error; err != nil {
		return
	}

	sms.Status = "sending"
	sms.Attempts++
	s.db.Save(&sms)

	// Get provider config
	var provider models.SMSProvider
	if err := s.db.First(&provider, "school_id = ? AND is_active = ?", sms.SchoolID, true).Error; err != nil {
		sms.Status = "failed"
		sms.ErrorMessage = "No active SMS provider configured"
		s.db.Save(&sms)
		return
	}

	// Send via provider
	var err error
	switch provider.Provider {
	case "africastalking":
		err = s.sendViaAfricasTalking(&provider, &sms)
	case "twilio":
		err = s.sendViaTwilio(&provider, &sms)
	default:
		err = errors.New("unsupported provider")
	}

	if err != nil {
		sms.Status = "failed"
		sms.ErrorMessage = err.Error()
		if sms.Attempts < sms.MaxAttempts {
			sms.Status = "pending" // Retry
		}
	} else {
		sms.Status = "sent"
		now := time.Now()
		sms.SentAt = &now
	}

	s.db.Save(&sms)

	// Log to SMSLog
	s.logSMS(&sms)
}

// sendViaAfricasTalking sends SMS via Africa's Talking
func (s *Service) sendViaAfricasTalking(provider *models.SMSProvider, sms *models.SMSQueue) error {
	url := "https://api.africastalking.com/version1/messaging"
	
	payload := map[string]interface{}{
		"username": provider.Username,
		"to":       sms.PhoneNumber,
		"message":  sms.Message,
	}
	if provider.SenderID != "" {
		payload["from"] = provider.SenderID
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	req.Header.Set("apiKey", provider.APIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		return fmt.Errorf("provider error: %s", string(respBody))
	}

	var result map[string]interface{}
	json.Unmarshal(respBody, &result)
	
	if recipients, ok := result["SMSMessageData"].(map[string]interface{})["Recipients"].([]interface{}); ok && len(recipients) > 0 {
		if recipient, ok := recipients[0].(map[string]interface{}); ok {
			sms.ProviderID = fmt.Sprintf("%v", recipient["messageId"])
			if cost, ok := recipient["cost"].(string); ok {
				fmt.Sscanf(cost, "KES %f", &sms.Cost)
			}
		}
	}

	return nil
}

// sendViaTwilio sends SMS via Twilio
func (s *Service) sendViaTwilio(provider *models.SMSProvider, sms *models.SMSQueue) error {
	url := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", provider.Username)
	
	data := fmt.Sprintf("To=%s&From=%s&Body=%s", sms.PhoneNumber, provider.SenderID, sms.Message)
	req, _ := http.NewRequest("POST", url, strings.NewReader(data))
	req.SetBasicAuth(provider.Username, provider.APIKey)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("twilio error: %s", string(body))
	}

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	sms.ProviderID = fmt.Sprintf("%v", result["sid"])
	if price, ok := result["price"].(string); ok {
		fmt.Sscanf(price, "%f", &sms.Cost)
	}

	return nil
}

// processBatch processes a batch of SMS
func (s *Service) processBatch(batchID uuid.UUID) {
	var batch models.SMSBatch
	if err := s.db.First(&batch, "id = ?", batchID).Error; err != nil {
		return
	}

	batch.Status = "processing"
	now := time.Now()
	batch.StartedAt = &now
	s.db.Save(&batch)

	// Get all pending SMS for this batch
	var smsList []models.SMSQueue
	s.db.Where("metadata->>'batch_id' = ? AND status = ?", batchID.String(), "pending").Find(&smsList)

	for _, sms := range smsList {
		s.processSMS(sms.ID)
		time.Sleep(100 * time.Millisecond) // Rate limiting
	}

	// Update batch status
	var sentCount int64
	s.db.Model(&models.SMSQueue{}).
		Where("metadata->>'batch_id' = ? AND status = ?", batchID.String(), "sent").
		Count(&sentCount)
	batch.SentCount = int(sentCount)
	
	var failedCount int64
	s.db.Model(&models.SMSQueue{}).
		Where("metadata->>'batch_id' = ? AND status = ?", batchID.String(), "failed").
		Count(&failedCount)
	batch.FailedCount = int(failedCount)

	s.db.Model(&models.SMSQueue{}).
		Where("metadata->>'batch_id' = ?", batchID.String()).
		Select("COALESCE(SUM(cost), 0)").
		Scan(&batch.TotalCost)

	batch.Status = "completed"
	now = time.Now()
	batch.CompletedAt = &now
	s.db.Save(&batch)
}

// logSMS creates an SMSLog entry
func (s *Service) logSMS(sms *models.SMSQueue) {
	log := &models.SMSLog{
		SchoolID:     sms.SchoolID,
		Recipient:    sms.PhoneNumber,
		Message:      sms.Message,
		Status:       sms.Status,
		SMSType:      sms.Category,
		Cost:         sms.Cost,
		SentAt:       sms.SentAt,
		ErrorMessage: sms.ErrorMessage,
		SentBy:       sms.CreatedBy,
	}
	s.db.Create(log)
}

// ProcessScheduled processes scheduled SMS
func (s *Service) ProcessScheduled() {
	var smsList []models.SMSQueue
	s.db.Where("status = ? AND scheduled_for <= ?", "pending", time.Now()).Find(&smsList)

	for _, sms := range smsList {
		go s.processSMS(sms.ID)
	}
}

// normalizePhone normalizes phone number to E.164 format
func normalizePhone(phone string) string {
	phone = strings.TrimSpace(phone)
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")
	
	if strings.HasPrefix(phone, "0") {
		phone = "+256" + phone[1:]
	} else if !strings.HasPrefix(phone, "+") {
		phone = "+256" + phone
	}
	
	return phone
}

// Request types
type SendSMSRequest struct {
	SchoolID      uuid.UUID
	RecipientID   *uuid.UUID
	RecipientType string
	PhoneNumber   string
	Message       string
	Category      string
	Priority      int
	ScheduledFor  *time.Time
	CreatedBy     uuid.UUID
	Metadata      models.JSONB
}

type BulkSMSRequest struct {
	SchoolID   uuid.UUID
	Name       string
	Category   string
	Message    string
	TemplateID *uuid.UUID
	Recipients []SMSRecipient
	Priority   int
	CreatedBy  uuid.UUID
}

type SMSRecipient struct {
	RecipientID   *uuid.UUID
	RecipientType string
	PhoneNumber   string
	Variables     map[string]interface{}
}
