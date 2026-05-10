package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"github.com/school-system/backend/internal/services/sms"
	"gorm.io/gorm"
)

type NotificationService struct {
	repo         repositories.NotificationRepository
	db           *gorm.DB
	smsService   *sms.Service
	emailService *EmailService
}

func NewNotificationService(repo repositories.NotificationRepository, db *gorm.DB, email *EmailService) *NotificationService {
	return &NotificationService{
		repo:         repo,
		db:           db,
		smsService:   sms.NewService(db),
		emailService: email,
	}
}

// SendPaymentConfirmation sends payment confirmation via SMS and Email to guardian and linked staff
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

	// Send SMS to guardian and linked staff
	if pref.SMSEnabled && guardian.Phone != "" {
		metadata := models.JSONB{
			"type":         "payment_confirmation",
			"student_name": studentName,
			"amount":       amount,
			"balance":      balance,
		}
		err := n.smsService.SendSMSToGuardianAndStaff(
			context.Background(),
			guardianID,
			schoolID,
			message,
			"fees",
			5,
			schoolID,
			metadata,
		)
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

// SendFeesReminder sends fees reminder notification to guardian and linked staff
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

	// Send SMS to guardian and linked staff
	if pref.SMSEnabled && guardian.Phone != "" {
		metadata := models.JSONB{
			"type":         "fees_reminder",
			"student_name": studentName,
			"amount":       amount,
			"term":         term,
			"year":         year,
		}
		err := n.smsService.SendSMSToGuardianAndStaff(
			context.Background(),
			guardianID,
			schoolID,
			message,
			"fees",
			5,
			schoolID, // createdBy - using schoolID as system user
			metadata,
		)
		n.logNotification(schoolID, guardianID, "sms", "fees", guardian.Phone, "", message, err)
	}

	if pref.EmailEnabled && guardian.Email != "" {
		err := n.emailService.SendFeesInvoice(guardian.Email, studentName, amount, 0, amount, term, year)
		n.logNotification(schoolID, guardianID, "email", "fees", guardian.Email, "Fees Reminder", message, err)
	}

	return nil
}

// SendResultsNotification sends results notification to guardian and linked staff
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
		metadata := models.JSONB{
			"type":         "results_notification",
			"student_name": studentName,
			"term":         term,
			"year":         year,
		}
		err := n.smsService.SendSMSToGuardianAndStaff(
			context.Background(),
			guardianID,
			schoolID,
			message,
			"results",
			5,
			schoolID,
			metadata,
		)
		n.logNotification(schoolID, guardianID, "sms", "results", guardian.Phone, "", message, err)
	}

	if pref.EmailEnabled && guardian.Email != "" {
		err := n.emailService.SendResultsNotification(guardian.Email, studentName, term, year)
		n.logNotification(schoolID, guardianID, "email", "results", guardian.Email, "Results Available", message, err)
	}

	return nil
}

// SendAttendanceAlert sends attendance alert to guardian and linked staff
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
		metadata := models.JSONB{
			"type":         "attendance_alert",
			"student_name": studentName,
			"status":       status,
			"date":         date,
		}
		err := n.smsService.SendSMSToGuardianAndStaff(
			context.Background(),
			guardianID,
			schoolID,
			message,
			"attendance",
			5,
			schoolID,
			metadata,
		)
		n.logNotification(schoolID, guardianID, "sms", "attendance", guardian.Phone, "", message, err)
	}

	return nil
}

// SendBulkAnnouncement sends announcement to multiple guardians and their linked staff
func (n *NotificationService) SendBulkAnnouncement(schoolID uuid.UUID, message, subject string, createdBy uuid.UUID) error {
	var guardians []models.Guardian
	n.db.Where("school_id = ?", schoolID).Find(&guardians)

	guardianIDs := make([]uuid.UUID, 0)
	for _, guardian := range guardians {
		var pref models.NotificationPreference
		n.db.Where("guardian_id = ?", guardian.ID).First(&pref)

		if !pref.Announcements {
			continue
		}

		if pref.SMSEnabled && guardian.Phone != "" {
			guardianIDs = append(guardianIDs, guardian.ID)
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

	// Send bulk SMS to all guardians and their linked staff
	if len(guardianIDs) > 0 {
		n.smsService.SendBulkSMSToGuardiansAndStaff(context.Background(), sms.BulkSMSToGuardiansRequest{
			SchoolID:    schoolID,
			Name:        subject,
			Category:    "announcement",
			Message:     message,
			GuardianIDs: guardianIDs,
			Priority:    5,
			CreatedBy:   createdBy,
		})
	}

	return nil
}

// SendStaffAnnouncement sends announcement to staff members only
func (n *NotificationService) SendStaffAnnouncement(schoolID uuid.UUID, message, subject string, createdBy uuid.UUID, staffIDs []uuid.UUID) error {
	var staff []models.Staff
	query := n.db.Where("school_id = ? AND status = 'active'", schoolID)
	
	if len(staffIDs) > 0 {
		query = query.Where("id IN ?", staffIDs)
	}
	
	query.Find(&staff)

	recipients := make([]sms.SMSRecipient, 0)
	for _, s := range staff {
		if s.Phone != "" {
			recipients = append(recipients, sms.SMSRecipient{
				RecipientID:   &s.ID,
				RecipientType: "staff",
				PhoneNumber:   s.Phone,
			})
		}

		if s.Email != "" {
			n.emailService.SendEmail(EmailRequest{
				To:      []string{s.Email},
				Subject: subject,
				Body:    message,
				IsHTML:  false,
			})
		}
	}

	if len(recipients) > 0 {
		_, err := n.smsService.SendBulkSMS(context.Background(), sms.BulkSMSRequest{
			SchoolID:   schoolID,
			Name:       subject,
			Category:   "staff_announcement",
			Message:    message,
			Recipients: recipients,
			Priority:   5,
			CreatedBy:  createdBy,
		})
		return err
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
