package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type NotificationService struct {
	repo         repositories.NotificationRepository
	db           *gorm.DB
	smsService   *SMSService
	emailService *EmailService
}

func NewNotificationService(repo repositories.NotificationRepository, db *gorm.DB, sms *SMSService, email *EmailService) *NotificationService {
	return &NotificationService{
		repo:         repo,
		db:           db,
		smsService:   sms,
		emailService: email,
	}
}

// SendPaymentConfirmation sends payment confirmation via SMS and Email
func (n *NotificationService) SendPaymentConfirmation(guardianID, schoolID uuid.UUID, studentName string, amount, balance float64) error {
	var guardian models.Guardian
	if err := n.db.First(&guardian, guardianID).Error; err != nil {
		return err
	}

	var pref models.NotificationPreference
	n.db.Where("guardian_id = ?", guardianID).First(&pref)

	if !pref.PaymentConfirm {
		return nil // User opted out
	}

	message := fmt.Sprintf("Payment received: UGX %.0f for %s. Balance: UGX %.0f. Thank you!", amount, studentName, balance)

	// Send SMS
	if pref.SMSEnabled && guardian.Phone != "" {
		err := n.smsService.SendSMS(SMSRequest{
			To:      []string{guardian.Phone},
			Message: message,
		})
		n.logNotification(schoolID, guardianID, "sms", "fees", guardian.Phone, "", message, err)
	}

	// Send Email
	if pref.EmailEnabled && guardian.Email != "" {
		err := n.emailService.SendEmail(EmailRequest{
			To:      []string{guardian.Email},
			Subject: "Payment Confirmation",
			Body:    message,
			IsHTML:  false,
		})
		n.logNotification(schoolID, guardianID, "email", "fees", guardian.Email, "Payment Confirmation", message, err)
	}

	return nil
}

// SendFeesReminder sends fees reminder notification
func (n *NotificationService) SendFeesReminder(guardianID, schoolID uuid.UUID, studentName string, amount float64, term, year string) error {
	var guardian models.Guardian
	if err := n.db.First(&guardian, guardianID).Error; err != nil {
		return err
	}

	var pref models.NotificationPreference
	n.db.Where("guardian_id = ?", guardianID).First(&pref)

	if !pref.FeesReminders {
		return nil
	}

	message := fmt.Sprintf("Dear Parent, fees reminder for %s: UGX %.0f outstanding for %s %s. Pay via Mobile Money.", studentName, amount, term, year)

	if pref.SMSEnabled && guardian.Phone != "" {
		err := n.smsService.SendSMS(SMSRequest{
			To:      []string{guardian.Phone},
			Message: message,
		})
		n.logNotification(schoolID, guardianID, "sms", "fees", guardian.Phone, "", message, err)
	}

	if pref.EmailEnabled && guardian.Email != "" {
		err := n.emailService.SendFeesInvoice(guardian.Email, studentName, amount, 0, amount, term, year)
		n.logNotification(schoolID, guardianID, "email", "fees", guardian.Email, "Fees Reminder", message, err)
	}

	return nil
}

// SendResultsNotification sends results notification
func (n *NotificationService) SendResultsNotification(guardianID, schoolID uuid.UUID, studentName, term, year string) error {
	var guardian models.Guardian
	if err := n.db.First(&guardian, guardianID).Error; err != nil {
		return err
	}

	var pref models.NotificationPreference
	n.db.Where("guardian_id = ?", guardianID).First(&pref)

	if !pref.ResultsNotify {
		return nil
	}

	message := fmt.Sprintf("Dear Parent, %s's results for %s %s are now available. Login to view.", studentName, term, year)

	if pref.SMSEnabled && guardian.Phone != "" {
		err := n.smsService.SendSMS(SMSRequest{
			To:      []string{guardian.Phone},
			Message: message,
		})
		n.logNotification(schoolID, guardianID, "sms", "results", guardian.Phone, "", message, err)
	}

	if pref.EmailEnabled && guardian.Email != "" {
		err := n.emailService.SendResultsNotification(guardian.Email, studentName, term, year)
		n.logNotification(schoolID, guardianID, "email", "results", guardian.Email, "Results Available", message, err)
	}

	return nil
}

// SendAttendanceAlert sends attendance alert
func (n *NotificationService) SendAttendanceAlert(guardianID, schoolID uuid.UUID, studentName, status, date string) error {
	var guardian models.Guardian
	if err := n.db.First(&guardian, guardianID).Error; err != nil {
		return err
	}

	var pref models.NotificationPreference
	n.db.Where("guardian_id = ?", guardianID).First(&pref)

	if !pref.AttendanceAlert {
		return nil
	}

	message := fmt.Sprintf("Dear Parent, %s was marked %s on %s.", studentName, status, date)

	if pref.SMSEnabled && guardian.Phone != "" {
		err := n.smsService.SendSMS(SMSRequest{
			To:      []string{guardian.Phone},
			Message: message,
		})
		n.logNotification(schoolID, guardianID, "sms", "attendance", guardian.Phone, "", message, err)
	}

	return nil
}

// SendBulkAnnouncement sends announcement to multiple guardians
func (n *NotificationService) SendBulkAnnouncement(schoolID uuid.UUID, message, subject string) error {
	var guardians []models.Guardian
	n.db.Where("school_id = ?", schoolID).Find(&guardians)

	for _, guardian := range guardians {
		var pref models.NotificationPreference
		n.db.Where("guardian_id = ?", guardian.ID).First(&pref)

		if !pref.Announcements {
			continue
		}

		if pref.SMSEnabled && guardian.Phone != "" {
			n.smsService.SendSMS(SMSRequest{
				To:      []string{guardian.Phone},
				Message: message,
			})
		}

		if pref.EmailEnabled && guardian.Email != "" {
			n.emailService.SendEmail(EmailRequest{
				To:      []string{guardian.Email},
				Subject: subject,
				Body:    message,
				IsHTML:  false,
			})
		}
	}

	return nil
}

func (n *NotificationService) logNotification(schoolID, recipientID uuid.UUID, notifType, channel, recipient, subject, message string, err error) {
	log := models.NotificationLog{
		SchoolID:    schoolID,
		RecipientID: recipientID,
		Type:        notifType,
		Channel:     channel,
		Recipient:   recipient,
		Subject:     subject,
		Message:     message,
		Status:      "sent",
	}

	if err != nil {
		log.Status = "failed"
		log.ErrorMessage = err.Error()
	} else {
		now := time.Now()
		log.SentAt = &now
	}

	n.db.Create(&log)
}


func (n *NotificationService) GetNotifications(userID, schoolID string, limit int) ([]models.Notification, error) {
	var notifications []models.Notification
	err := n.db.Where("user_id = ? OR school_id = ? OR (user_id IS NULL AND school_id IS NULL)", userID, schoolID).
		Order("created_at DESC").
		Limit(limit).
		Find(&notifications).Error
	return notifications, err
}

func (n *NotificationService) GetUnreadCount(userID, schoolID string) (int64, error) {
	var count int64
	err := n.db.Model(&models.Notification{}).
		Where("is_read = ? AND (user_id = ? OR school_id = ? OR (user_id IS NULL AND school_id IS NULL))", false, userID, schoolID).
		Count(&count).Error
	return count, err
}

func (n *NotificationService) MarkAsRead(id, userID string) error {
	now := time.Now()
	return n.db.Model(&models.Notification{}).
		Where("id = ? AND (user_id = ? OR user_id IS NULL)", id, userID).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		}).Error
}

func (n *NotificationService) MarkAllAsRead(userID, schoolID string) error {
	now := time.Now()
	return n.db.Model(&models.Notification{}).
		Where("is_read = ? AND (user_id = ? OR school_id = ? OR (user_id IS NULL AND school_id IS NULL))", false, userID, schoolID).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		}).Error
}

func (n *NotificationService) DeleteNotification(id, userID string) error {
	return n.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Notification{}).Error
}

func (n *NotificationService) GetPreferences(guardianID, schoolID string) (*models.NotificationPreference, error) {
	var prefs models.NotificationPreference
	err := n.db.Where("guardian_id = ? AND school_id = ?", guardianID, schoolID).First(&prefs).Error

	if err == gorm.ErrRecordNotFound {
		return &models.NotificationPreference{
			SMSEnabled:      true,
			EmailEnabled:    true,
			FeesReminders:   true,
			PaymentConfirm:  true,
			ResultsNotify:   true,
			AttendanceAlert: true,
			Announcements:   true,
			WeeklySummary:   false,
			MonthlySummary:  true,
		}, nil
	}

	return &prefs, err
}

func (n *NotificationService) UpdatePreferences(guardianID, schoolID string, req *models.NotificationPreference) (*models.NotificationPreference, error) {
	var prefs models.NotificationPreference
	err := n.db.Where("guardian_id = ? AND school_id = ?", guardianID, schoolID).First(&prefs).Error

	if err == gorm.ErrRecordNotFound {
		prefs = *req
		if err := n.db.Create(&prefs).Error; err != nil {
			return nil, err
		}
	} else {
		prefs.SMSEnabled = req.SMSEnabled
		prefs.EmailEnabled = req.EmailEnabled
		prefs.FeesReminders = req.FeesReminders
		prefs.PaymentConfirm = req.PaymentConfirm
		prefs.ResultsNotify = req.ResultsNotify
		prefs.AttendanceAlert = req.AttendanceAlert
		prefs.Announcements = req.Announcements
		prefs.WeeklySummary = req.WeeklySummary
		prefs.MonthlySummary = req.MonthlySummary
		if err := n.db.Save(&prefs).Error; err != nil {
			return nil, err
		}
	}

	return &prefs, nil
}
