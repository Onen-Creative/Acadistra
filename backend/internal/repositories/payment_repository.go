package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type MobileMoneyPaymentRepository struct {
	db *gorm.DB
}

func NewMobileMoneyPaymentRepository(db *gorm.DB) *MobileMoneyPaymentRepository {
	return &MobileMoneyPaymentRepository{db: db}
}

func (r *MobileMoneyPaymentRepository) FindByTransactionRef(txRef string) (*models.MobileMoneyPayment, error) {
	var payment models.MobileMoneyPayment
	err := r.db.Where("transaction_ref = ?", txRef).First(&payment).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &payment, err
}

func (r *MobileMoneyPaymentRepository) FindBySchool(schoolID string, limit, offset int) ([]models.MobileMoneyPayment, error) {
	var payments []models.MobileMoneyPayment
	err := r.db.Where("school_id = ?", schoolID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&payments).Error
	return payments, err
}

func (r *MobileMoneyPaymentRepository) FindByStudentFees(studentFeesID uuid.UUID) ([]models.MobileMoneyPayment, error) {
	var payments []models.MobileMoneyPayment
	err := r.db.Where("student_fees_id = ?", studentFeesID).
		Order("created_at DESC").
		Find(&payments).Error
	return payments, err
}

func (r *MobileMoneyPaymentRepository) FindByStatus(schoolID, status string) ([]models.MobileMoneyPayment, error) {
	var payments []models.MobileMoneyPayment
	err := r.db.Where("school_id = ? AND status = ?", schoolID, status).
		Order("created_at DESC").
		Find(&payments).Error
	return payments, err
}

func (r *MobileMoneyPaymentRepository) UpdateStatus(id uuid.UUID, status string) error {
	return r.db.Model(&models.MobileMoneyPayment{}).
		Where("id = ?", id).
		Update("status", status).Error
}

type FeesPaymentRepository struct {
	db *gorm.DB
}

func NewFeesPaymentRepository(db *gorm.DB) *FeesPaymentRepository {
	return &FeesPaymentRepository{db: db}
}

func (r *FeesPaymentRepository) FindByStudentFees(studentFeesID uuid.UUID) ([]models.FeesPayment, error) {
	var payments []models.FeesPayment
	err := r.db.Where("student_fees_id = ?", studentFeesID).
		Preload("StudentFees").
		Preload("StudentFees.Student").
		Order("payment_date DESC").
		Find(&payments).Error
	return payments, err
}

func (r *FeesPaymentRepository) FindByReceiptNo(receiptNo string) (*models.FeesPayment, error) {
	var payment models.FeesPayment
	err := r.db.Where("receipt_no = ?", receiptNo).
		Preload("StudentFees").
		Preload("StudentFees.Student").
		First(&payment).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &payment, err
}

func (r *FeesPaymentRepository) FindBySchoolAndDateRange(schoolID, startDate, endDate string) ([]models.FeesPayment, error) {
	var payments []models.FeesPayment
	query := r.db.Joins("JOIN student_fees ON fees_payments.student_fees_id = student_fees.id").
		Where("student_fees.school_id = ?", schoolID)
	
	if startDate != "" {
		query = query.Where("fees_payments.payment_date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("fees_payments.payment_date <= ?", endDate)
	}
	
	err := query.Preload("StudentFees").
		Preload("StudentFees.Student").
		Order("fees_payments.payment_date DESC").
		Find(&payments).Error
	return payments, err
}

type PaymentWebhookLogRepository struct {
	db *gorm.DB
}

func NewPaymentWebhookLogRepository(db *gorm.DB) *PaymentWebhookLogRepository {
	return &PaymentWebhookLogRepository{db: db}
}

func (r *PaymentWebhookLogRepository) FindUnprocessed(limit int) ([]models.PaymentWebhookLog, error) {
	var logs []models.PaymentWebhookLog
	err := r.db.Where("processed = ?", false).
		Order("created_at ASC").
		Limit(limit).
		Find(&logs).Error
	return logs, err
}

func (r *PaymentWebhookLogRepository) MarkProcessed(id uuid.UUID) error {
	return r.db.Model(&models.PaymentWebhookLog{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"processed":    true,
			"processed_at": gorm.Expr("NOW()"),
		}).Error
}
