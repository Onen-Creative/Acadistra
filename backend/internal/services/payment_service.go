package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type PaymentService struct {
	db *gorm.DB
}

func NewPaymentService(db *gorm.DB) *PaymentService {
	return &PaymentService{db: db}
}

func (s *PaymentService) RecordPayment(payment *models.FeesPayment) error {
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create payment record
	if err := tx.Create(payment).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Update student fees
	var studentFees models.StudentFees
	if err := tx.First(&studentFees, payment.StudentFeesID).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Update existing record
	studentFees.AmountPaid += payment.Amount
	studentFees.Outstanding = studentFees.TotalFees - studentFees.AmountPaid
	if err := tx.Save(&studentFees).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

func (s *PaymentService) GetPayments(schoolID string, studentFeesID *uuid.UUID, startDate, endDate *time.Time) ([]models.FeesPayment, error) {
	query := s.db.Joins("JOIN student_fees ON fees_payments.student_fees_id = student_fees.id").
		Where("student_fees.school_id = ?", schoolID)

	if studentFeesID != nil {
		query = query.Where("fees_payments.student_fees_id = ?", studentFeesID)
	}
	if startDate != nil {
		query = query.Where("fees_payments.payment_date >= ?", startDate)
	}
	if endDate != nil {
		query = query.Where("fees_payments.payment_date <= ?", endDate)
	}

	var payments []models.FeesPayment
	if err := query.Preload("StudentFees.Student").
		Order("fees_payments.payment_date DESC").Find(&payments).Error; err != nil {
		return nil, err
	}

	return payments, nil
}

func (s *PaymentService) GetPaymentByID(id string) (*models.FeesPayment, error) {
	var payment models.FeesPayment
	if err := s.db.Where("id = ?", id).
		Preload("StudentFees.Student").
		First(&payment).Error; err != nil {
		return nil, err
	}

	return &payment, nil
}

func (s *PaymentService) GetPaymentSummary(schoolID, term string, year int) (map[string]interface{}, error) {
	summary := make(map[string]interface{})

	// Total collected
	var totalCollected float64
	s.db.Table("fees_payments").
		Joins("JOIN student_fees ON fees_payments.student_fees_id = student_fees.id").
		Where("student_fees.school_id = ? AND student_fees.term = ? AND student_fees.year = ?", schoolID, term, year).
		Select("COALESCE(SUM(fees_payments.amount), 0)").
		Scan(&totalCollected)
	summary["total_collected"] = totalCollected

	// Total outstanding
	var totalOutstanding float64
	s.db.Model(&models.StudentFees{}).
		Where("school_id = ? AND term = ? AND year = ?", schoolID, term, year).
		Select("COALESCE(SUM(outstanding), 0)").
		Scan(&totalOutstanding)
	summary["total_outstanding"] = totalOutstanding

	// Collection by payment method
	var methodBreakdown []struct {
		PaymentMethod string
		Amount        float64
		Count         int64
	}
	s.db.Table("fees_payments").
		Joins("JOIN student_fees ON fees_payments.student_fees_id = student_fees.id").
		Select("fees_payments.payment_method, SUM(fees_payments.amount) as amount, COUNT(*) as count").
		Where("student_fees.school_id = ? AND student_fees.term = ? AND student_fees.year = ?", schoolID, term, year).
		Group("fees_payments.payment_method").
		Scan(&methodBreakdown)
	summary["by_method"] = methodBreakdown

	return summary, nil
}

func (s *PaymentService) GetStudentPaymentHistory(studentID, schoolID string) ([]models.FeesPayment, error) {
	var payments []models.FeesPayment
	if err := s.db.Joins("JOIN student_fees ON fees_payments.student_fees_id = student_fees.id").
		Where("student_fees.student_id = ? AND student_fees.school_id = ?", studentID, schoolID).
		Preload("StudentFees").
		Order("fees_payments.payment_date DESC").
		Find(&payments).Error; err != nil {
		return nil, err
	}

	return payments, nil
}

func (s *PaymentService) GetStudentBalance(studentID, schoolID, term string, year int) (*models.StudentFees, error) {
	var fees models.StudentFees
	if err := s.db.Where("student_id = ? AND school_id = ? AND term = ? AND year = ?", 
		studentID, schoolID, term, year).First(&fees).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return &models.StudentFees{
				StudentID:   uuid.MustParse(studentID),
				SchoolID:    uuid.MustParse(schoolID),
				Term:        term,
				Year:        year,
				TotalFees:   0,
				AmountPaid:  0,
				Outstanding: 0,
			}, nil
		}
		return nil, err
	}

	return &fees, nil
}

func (s *PaymentService) GeneratePaymentReceipt(paymentID string) (map[string]interface{}, error) {
	payment, err := s.GetPaymentByID(paymentID)
	if err != nil {
		return nil, err
	}

	if payment.StudentFees == nil {
		return nil, fmt.Errorf("student fees not found")
	}

	// Get school details
	var school models.School
	if err := s.db.First(&school, payment.StudentFees.SchoolID).Error; err != nil {
		return nil, err
	}

	receipt := map[string]interface{}{
		"receipt_number": payment.ReceiptNo,
		"payment_date":   payment.PaymentDate,
		"student_name":   fmt.Sprintf("%s %s", payment.StudentFees.Student.FirstName, payment.StudentFees.Student.LastName),
		"admission_no":   payment.StudentFees.Student.AdmissionNo,
		"amount":         payment.Amount,
		"payment_method": payment.PaymentMethod,
		"term":           payment.StudentFees.Term,
		"year":           payment.StudentFees.Year,
		"school_name":    school.Name,
		"school_address": school.Address,
		"school_phone":   school.Phone,
	}

	return receipt, nil
}

func (s *PaymentService) GetDefaultersReport(schoolID, term string, year int, minOutstanding float64) ([]map[string]interface{}, error) {
	var defaulters []struct {
		StudentID     string
		FirstName     string
		LastName      string
		AdmissionNo   string
		ClassName     string
		TotalFees     float64
		AmountPaid    float64
		Outstanding   float64
		GuardianPhone string
	}

	s.db.Raw(`
		SELECT 
			s.id as student_id,
			s.first_name,
			s.last_name,
			s.admission_no,
			c.name as class_name,
			sf.total_fees,
			sf.amount_paid,
			sf.outstanding,
			g.phone as guardian_phone
		FROM student_fees sf
		JOIN students s ON sf.student_id = s.id
		LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
		LEFT JOIN classes c ON e.class_id = c.id
		LEFT JOIN guardians g ON s.id = g.student_id AND g.is_primary_contact = true
		WHERE sf.school_id = ? AND sf.term = ? AND sf.year = ? AND sf.outstanding >= ?
		ORDER BY sf.outstanding DESC
	`, schoolID, term, year, minOutstanding).Scan(&defaulters)

	result := make([]map[string]interface{}, len(defaulters))
	for i, d := range defaulters {
		result[i] = map[string]interface{}{
			"student_id":      d.StudentID,
			"student_name":    fmt.Sprintf("%s %s", d.FirstName, d.LastName),
			"admission_no":    d.AdmissionNo,
			"class_name":      d.ClassName,
			"total_fees":      d.TotalFees,
			"amount_paid":     d.AmountPaid,
			"outstanding":     d.Outstanding,
			"guardian_phone":  d.GuardianPhone,
		}
	}

	return result, nil
}


func (s *PaymentService) GetStudentFees(feesID, schoolID string) (*models.StudentFees, error) {
	var fees models.StudentFees
	err := s.db.Where("id = ? AND school_id = ?", feesID, schoolID).First(&fees).Error
	return &fees, err
}

func (s *PaymentService) GetStudent(studentID uuid.UUID) (*models.Student, error) {
	var student models.Student
	err := s.db.First(&student, studentID).Error
	return &student, err
}

func (s *PaymentService) CreatePayment(payment *models.MobileMoneyPayment) error {
	return s.db.Create(payment).Error
}

func (s *PaymentService) GetPaymentByIDWithDetails(paymentID, schoolID string) (*models.MobileMoneyPayment, error) {
	var payment models.MobileMoneyPayment
	err := s.db.Where("id = ? AND school_id = ?", paymentID, schoolID).First(&payment).Error
	return &payment, err
}

func (s *PaymentService) UpdatePaymentStatus(payment *models.MobileMoneyPayment) error {
	return s.db.Save(payment).Error
}

func (s *PaymentService) RecordFeesPayment(payment *models.MobileMoneyPayment) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Update payment status
		if err := tx.Save(payment).Error; err != nil {
			return err
		}

		// Get fees
		var fees models.StudentFees
		if err := tx.First(&fees, payment.StudentFeesID).Error; err != nil {
			return err
		}

		// Update fees balance
		fees.AmountPaid += payment.Amount
		fees.Outstanding = fees.TotalFees - fees.AmountPaid
		if err := tx.Save(&fees).Error; err != nil {
			return err
		}

		// Create fees payment record
		feesPayment := models.FeesPayment{
			StudentFeesID: payment.StudentFeesID,
			Amount:        payment.Amount,
			PaymentMethod: "Mobile Money",
			PaymentDate:   payment.UpdatedAt,
			ReceiptNo:     payment.TransactionRef,
		}
		return tx.Create(&feesPayment).Error
	})
}

func (s *PaymentService) GetGuardianByStudent(studentID uuid.UUID) (*models.Guardian, error) {
	var guardian models.Guardian
	err := s.db.Where("student_id = ?", studentID).First(&guardian).Error
	return &guardian, err
}


func (s *PaymentService) InitiatePayment(schoolID, feesID string, amount float64, phoneNumber, network, email string) (*models.MobileMoneyPayment, *InitiatePaymentRequest, error) {
	// Get fees
	fees, err := s.GetStudentFees(feesID, schoolID)
	if err != nil {
		return nil, nil, fmt.Errorf("fees record not found")
	}

	// Validate amount
	if amount > fees.Outstanding {
		return nil, nil, fmt.Errorf("amount exceeds outstanding balance")
	}

	// Get student
	student, err := s.GetStudent(fees.StudentID)
	if err != nil {
		return nil, nil, fmt.Errorf("student not found")
	}

	// Generate transaction reference
	txRef := fmt.Sprintf("FEES_%s_%d", fees.ID.String()[:8], time.Now().Unix())

	// Create payment request
	paymentReq := &InitiatePaymentRequest{
		Amount:      amount,
		Currency:    "UGX",
		PhoneNumber: phoneNumber,
		Email:       email,
		TxRef:       txRef,
		Network:     network,
		FullName:    fmt.Sprintf("%s %s", student.FirstName, student.LastName),
		RedirectURL: fmt.Sprintf("https://yourschool.com/payment/callback?ref=%s", txRef),
		Meta: map[string]interface{}{
			"student_id":      student.ID.String(),
			"student_fees_id": fees.ID.String(),
			"term":            fees.Term,
			"year":            fees.Year,
		},
	}

	// Create payment record
	payment := &models.MobileMoneyPayment{
		StudentFeesID:  fees.ID,
		SchoolID:       uuid.MustParse(schoolID),
		Amount:         amount,
		PhoneNumber:    phoneNumber,
		Provider:       network,
		TransactionRef: txRef,
		Status:         "pending",
		InitiatedAt:    time.Now(),
	}

	return payment, paymentReq, nil
}

func (s *PaymentService) ProcessSuccessfulPayment(payment *models.MobileMoneyPayment) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Update payment
		now := time.Now()
		payment.CompletedAt = &now
		if err := tx.Save(payment).Error; err != nil {
			return err
		}

		// Get fees
		var fees models.StudentFees
		if err := tx.First(&fees, payment.StudentFeesID).Error; err != nil {
			return err
		}

		// Update fees
		fees.AmountPaid += payment.Amount
		fees.Outstanding = fees.TotalFees - fees.AmountPaid
		if err := tx.Save(&fees).Error; err != nil {
			return err
		}

		// Create fees payment record
		feesPayment := models.FeesPayment{
			StudentFeesID: fees.ID,
			Amount:        payment.Amount,
			PaymentMethod: "Mobile Money - " + payment.Provider,
			PaymentDate:   time.Now(),
			RecordedBy:    payment.SchoolID,
		}
		if err := tx.Create(&feesPayment).Error; err != nil {
			return err
		}

		// Get student
		var student models.Student
		if err := tx.First(&student, fees.StudentID).Error; err != nil {
			return err
		}

		// Create income record
		studentName := fmt.Sprintf("%s %s", student.FirstName, student.LastName)
		income := models.Income{
			SchoolID:    payment.SchoolID,
			Category:    "School Fees",
			Source:      fmt.Sprintf("Mobile Money - %s", payment.Provider),
			Amount:      payment.Amount,
			Description: fmt.Sprintf("Fees payment for %s (Term %s %d) via %s", studentName, fees.Term, fees.Year, payment.Provider),
			Date:        time.Now(),
			Term:        fees.Term,
			Year:        fees.Year,
			ReceiptNo:   payment.TransactionRef,
			ReceivedBy:  payment.SchoolID,
		}
		return tx.Create(&income).Error
	})
}

func (s *PaymentService) LogWebhook(provider, event, txRef, errorMsg string, payload map[string]interface{}) (*models.PaymentWebhookLog, error) {
	webhookLog := &models.PaymentWebhookLog{
		Provider:       provider,
		Event:          event,
		TransactionRef: txRef,
		Payload:        models.JSONB(payload),
		ErrorMessage:   errorMsg,
	}
	err := s.db.Create(webhookLog).Error
	return webhookLog, err
}

func (s *PaymentService) MarkWebhookProcessed(webhookLog *models.PaymentWebhookLog) error {
	webhookLog.Processed = true
	now := time.Now()
	webhookLog.ProcessedAt = &now
	return s.db.Save(webhookLog).Error
}

func (s *PaymentService) GetPaymentByTxRef(txRef string) (*models.MobileMoneyPayment, error) {
	var payment models.MobileMoneyPayment
	err := s.db.Where("transaction_ref = ?", txRef).First(&payment).Error
	return &payment, err
}

func (s *PaymentService) GetPaymentHistory(studentID, schoolID string) ([]models.MobileMoneyPayment, error) {
	var payments []models.MobileMoneyPayment
	err := s.db.Where("student_id = ? AND school_id = ?", studentID, schoolID).
		Order("created_at DESC").
		Find(&payments).Error
	return payments, err
}

type PaymentStats struct {
	TotalPayments    int64   `json:"total_payments"`
	SuccessfulCount  int64   `json:"successful_count"`
	PendingCount     int64   `json:"pending_count"`
	FailedCount      int64   `json:"failed_count"`
	TotalAmount      float64 `json:"total_amount"`
	SuccessfulAmount float64 `json:"successful_amount"`
}

func (s *PaymentService) GetPaymentStats(schoolID string) (*PaymentStats, error) {
	var stats PaymentStats
	s.db.Model(&models.MobileMoneyPayment{}).Where("school_id = ?", schoolID).Count(&stats.TotalPayments)
	s.db.Model(&models.MobileMoneyPayment{}).Where("school_id = ? AND status = 'successful'", schoolID).Count(&stats.SuccessfulCount)
	s.db.Model(&models.MobileMoneyPayment{}).Where("school_id = ? AND status = 'pending'", schoolID).Count(&stats.PendingCount)
	s.db.Model(&models.MobileMoneyPayment{}).Where("school_id = ? AND status = 'failed'", schoolID).Count(&stats.FailedCount)
	s.db.Model(&models.MobileMoneyPayment{}).Select("COALESCE(SUM(amount), 0)").Where("school_id = ?", schoolID).Scan(&stats.TotalAmount)
	s.db.Model(&models.MobileMoneyPayment{}).Select("COALESCE(SUM(amount), 0)").Where("school_id = ? AND status = 'successful'", schoolID).Scan(&stats.SuccessfulAmount)
	return &stats, nil
}
