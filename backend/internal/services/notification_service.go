package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type NotificationService struct {
	db           *gorm.DB
	smsService   *SMSService
	emailService *EmailService
}

func NewNotificationService(db *gorm.DB, sms *SMSService, email *EmailService) *NotificationService {
	return &NotificationService{
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
