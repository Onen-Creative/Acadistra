package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type FeesService struct {
	repo         repositories.FeesRepository
	db           *gorm.DB
	emailService *EmailService
}

func NewFeesService(repo repositories.FeesRepository, db *gorm.DB, emailService *EmailService) *FeesService {
	return &FeesService{
		repo:         repo,
		db:           db,
		emailService: emailService,
	}
}

func (s *FeesService) ListStudentFees(schoolID, term, year, classID, search string, page, limit int) ([]models.StudentFees, int64, error) {
	query := s.db.Where("student_fees.school_id = ?", schoolID)
	
	if term != "" {
		query = query.Where("student_fees.term = ?", term)
	}
	if year != "" {
		query = query.Where("student_fees.year = ?", year)
	}
	if classID != "" {
		query = query.Joins("JOIN enrollments ON enrollments.student_id = student_fees.student_id").
			Where("enrollments.class_id = ? AND enrollments.status = 'active'", classID)
	}
	if search != "" {
		query = query.Joins("JOIN students ON students.id = student_fees.student_id").
			Where("students.first_name ILIKE ? OR students.last_name ILIKE ? OR students.admission_no ILIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	
	var total int64
	query.Model(&models.StudentFees{}).Count(&total)
	
	offset := (page - 1) * limit
	var fees []models.StudentFees
	err := query.Preload("Student").Offset(offset).Limit(limit).Find(&fees).Error
	
	// Calculate outstanding for each fee record
	for i := range fees {
		fees[i].Outstanding = fees[i].TotalFees - fees[i].AmountPaid
		if fees[i].Outstanding < 0 {
			fees[i].Outstanding = 0
		}
	}
	
	return fees, total, err
}

func (s *FeesService) GetStudentFeesDetails(studentID, term string, year int) (*models.StudentFees, error) {
	var fees models.StudentFees
	err := s.db.Preload("Student").Where("student_id = ? AND term = ? AND year = ?", studentID, term, year).First(&fees).Error
	return &fees, err
}

func (s *FeesService) DeleteStudentFees(id, schoolID string) error {
	return s.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.StudentFees{}).Error
}

func (s *FeesService) CreateOrUpdateStudentFees(fees *models.StudentFees, schoolID string) error {
	fees.SchoolID = uuid.MustParse(schoolID)
	
	var existing models.StudentFees
	err := s.db.Where("student_id = ? AND term = ? AND year = ?", fees.StudentID, fees.Term, fees.Year).First(&existing).Error
	
	if err == gorm.ErrRecordNotFound {
		return s.db.Create(fees).Error
	} else if err != nil {
		return err
	}
	
	fees.ID = existing.ID
	return s.db.Save(fees).Error
}

func (s *FeesService) GetReportData(schoolID, term, year string) ([]models.StudentFees, []models.FeesPayment, error) {
	query := s.db.Where("school_id = ?", schoolID)
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}
	
	var fees []models.StudentFees
	if err := query.Preload("Student").Find(&fees).Error; err != nil {
		return nil, nil, err
	}
	
	var payments []models.FeesPayment
	paymentQuery := s.db.Joins("JOIN student_fees ON fees_payments.student_fees_id = student_fees.id").
		Where("student_fees.school_id = ?", schoolID)
	if term != "" {
		paymentQuery = paymentQuery.Where("student_fees.term = ?", term)
	}
	if year != "" {
		paymentQuery = paymentQuery.Where("student_fees.year = ?", year)
	}
	paymentQuery.Select("fees_payments.*").Find(&payments)
	
	return fees, payments, nil
}

func (s *FeesService) CreateStudentFees(fees *models.StudentFees) error {
	return s.db.Create(fees).Error
}

func (s *FeesService) UpdateStudentFees(fees *models.StudentFees) error {
	return s.db.Save(fees).Error
}

func (s *FeesService) GetStudentFees(studentID, term string, year int) (*models.StudentFees, error) {
	var fees models.StudentFees
	err := s.db.Where("student_id = ? AND term = ? AND year = ?", studentID, term, year).First(&fees).Error
	return &fees, err
}

func (s *FeesService) GetFeesBySchool(schoolID, term string, year int) ([]models.StudentFees, error) {
	var fees []models.StudentFees
	query := s.db.Where("school_id = ?", schoolID)
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year > 0 {
		query = query.Where("year = ?", year)
	}
	err := query.Find(&fees).Error
	return fees, err
}

func (s *FeesService) RecordPayment(payment *models.FeesPayment) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(payment).Error; err != nil {
			return err
		}

		var fees models.StudentFees
		if err := tx.First(&fees, payment.StudentFeesID).Error; err != nil {
			return err
		}

		fees.AmountPaid += payment.Amount
		fees.Outstanding = fees.TotalFees - fees.AmountPaid
		if err := tx.Save(&fees).Error; err != nil {
			return err
		}

		go s.sendPaymentReceipt(payment, &fees)

		return nil
	})
}

func (s *FeesService) GetPaymentHistory(studentFeesID uuid.UUID) ([]models.FeesPayment, error) {
	var payments []models.FeesPayment
	err := s.db.Where("student_fees_id = ?", studentFeesID).Order("payment_date DESC").Find(&payments).Error
	return payments, err
}

func (s *FeesService) GetOutstandingFees(schoolID, term string, year int) ([]models.StudentFees, error) {
	var fees []models.StudentFees
	err := s.db.Where("school_id = ? AND term = ? AND year = ? AND outstanding > 0",
		schoolID, term, year).Find(&fees).Error
	return fees, err
}

func (s *FeesService) GetFeesSummary(schoolID, term string, year int) (map[string]interface{}, error) {
	var totalExpected, totalPaid, totalOutstanding float64

	err := s.db.Model(&models.StudentFees{}).
		Where("school_id = ? AND term = ? AND year = ?", schoolID, term, year).
		Select("COALESCE(SUM(total_fees), 0), COALESCE(SUM(paid), 0), COALESCE(SUM(outstanding), 0)").
		Row().Scan(&totalExpected, &totalPaid, &totalOutstanding)
	if err != nil {
		return nil, err
	}

	var studentCount int64
	s.db.Model(&models.StudentFees{}).
		Where("school_id = ? AND term = ? AND year = ?", schoolID, term, year).
		Count(&studentCount)

	return map[string]interface{}{
		"total_expected":   totalExpected,
		"total_paid":       totalPaid,
		"total_outstanding": totalOutstanding,
		"student_count":    studentCount,
		"collection_rate":  (totalPaid / totalExpected) * 100,
	}, nil
}

func (s *FeesService) sendPaymentReceipt(payment *models.FeesPayment, fees *models.StudentFees) {
	if s.emailService == nil {
		return
	}

	var student models.Student
	if err := s.db.First(&student, fees.StudentID).Error; err != nil {
		return
	}

	var guardians []models.Guardian
	s.db.Where("student_id = ?", fees.StudentID).Find(&guardians)

	for _, guardian := range guardians {
		if guardian.Email != "" {
			subject := "Fee Payment Receipt"
			body := fmt.Sprintf("Payment of UGX %.2f received for %s %s (Term: %s, Year: %d)",
				payment.Amount, student.FirstName, student.LastName, fees.Term, fees.Year)
			s.emailService.SendEmail(EmailRequest{
				To:      []string{guardian.Email},
				Subject: subject,
				Body:    body,
			})
		}
	}
}

func (s *FeesService) BulkCreateFees(schoolID, classID, term string, year int, feeStructure map[string]float64) error {
	var students []models.Student
	if err := s.db.Raw(`
		SELECT DISTINCT s.*
		FROM students s
		JOIN enrollments e ON s.id = e.student_id
		WHERE e.class_id = ? AND e.status = 'active' AND s.school_id = ?
	`, classID, schoolID).Scan(&students).Error; err != nil {
		return err
	}

	totalFees := 0.0
	for _, amount := range feeStructure {
		totalFees += amount
	}

	for _, student := range students {
		var existing models.StudentFees
		err := s.db.Where("student_id = ? AND term = ? AND year = ?",
			student.ID, term, year).First(&existing).Error

		if err == gorm.ErrRecordNotFound {
			fees := &models.StudentFees{
				StudentID:    student.ID,
				SchoolID:     uuid.MustParse(schoolID),
				Term:         term,
				Year:         year,
				TotalFees:    totalFees,
				AmountPaid:   0,
				Outstanding:  totalFees,
				FeeBreakdown: func() models.JSONB {
					jsonb := make(models.JSONB)
					for k, v := range feeStructure {
						jsonb[k] = v
					}
					return jsonb
				}(),
			}
			if err := s.db.Create(fees).Error; err != nil {
				return err
			}
		}
	}

	return nil
}


func (s *FeesService) UpdateFeesRecord(id, schoolID string, totalFees float64, feeBreakdown models.JSONB) (*models.StudentFees, error) {
	var fees models.StudentFees
	if err := s.db.Where("id = ? AND school_id = ?", id, schoolID).First(&fees).Error; err != nil {
		return nil, fmt.Errorf("fees record not found")
	}
	fees.TotalFees = totalFees
	fees.FeeBreakdown = feeBreakdown
	fees.Outstanding = totalFees - fees.AmountPaid
	if err := s.db.Save(&fees).Error; err != nil {
		return nil, err
	}
	return &fees, nil
}

func (s *FeesService) RecordPaymentWithIncome(studentFeesID uuid.UUID, amount float64, paymentMethod, receiptNo, notes string, userID uuid.UUID, paymentBreakdown models.JSONB) (*models.FeesPayment, *models.StudentFees, error) {
	var studentFees models.StudentFees
	if err := s.db.Preload("Student").First(&studentFees, "id = ?", studentFeesID).Error; err != nil {
		return nil, nil, fmt.Errorf("student fees record not found")
	}

	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	payment := &models.FeesPayment{
		StudentFeesID:    studentFeesID,
		Amount:           amount,
		PaymentMethod:    paymentMethod,
		ReceiptNo:        receiptNo,
		Notes:            notes,
		RecordedBy:       userID,
		PaymentBreakdown: paymentBreakdown,
	}

	if err := tx.Create(payment).Error; err != nil {
		tx.Rollback()
		return nil, nil, err
	}

	studentFees.AmountPaid += amount
	studentFees.Outstanding = studentFees.TotalFees - studentFees.AmountPaid

	if studentFees.PaidBreakdown == nil {
		studentFees.PaidBreakdown = models.JSONB{}
	}
	for category, amt := range paymentBreakdown {
		if v, ok := amt.(float64); ok {
			if existingPaid, ok := studentFees.PaidBreakdown[category].(float64); ok {
				studentFees.PaidBreakdown[category] = existingPaid + v
			} else {
				studentFees.PaidBreakdown[category] = v
			}
		}
	}

	if err := tx.Save(&studentFees).Error; err != nil {
		tx.Rollback()
		return nil, nil, err
	}

	studentName := "Unknown Student"
	className := ""
	if studentFees.Student != nil {
		studentName = studentFees.Student.FirstName
		if studentFees.Student.MiddleName != "" {
			studentName += " " + studentFees.Student.MiddleName
		}
		studentName += " " + studentFees.Student.LastName
		
		var enrollment models.Enrollment
		if err := tx.Preload("Class").Where("student_id = ? AND status = 'active'", studentFees.Student.ID).First(&enrollment).Error; err == nil {
			if enrollment.Class != nil {
				className = enrollment.Class.Name
			}
		}
	}

	sourceDescription := fmt.Sprintf("Student Fees - %s", studentName)
	if className != "" {
		sourceDescription = fmt.Sprintf("Student Fees - %s (%s)", studentName, className)
	}

	income := models.Income{
		SchoolID:    studentFees.SchoolID,
		Category:    "Fees",
		Source:      sourceDescription,
		Amount:      amount,
		Description: fmt.Sprintf("Fees payment for %s %d", studentFees.Term, studentFees.Year),
		Date:        time.Now(),
		Term:        studentFees.Term,
		Year:        studentFees.Year,
		ReceiptNo:   receiptNo,
		ReceivedBy:  userID,
	}

	if err := tx.Create(&income).Error; err != nil {
		tx.Rollback()
		return nil, nil, fmt.Errorf("failed to create income record: %v", err)
	}

	if err := tx.Commit().Error; err != nil {
		return nil, nil, fmt.Errorf("failed to commit transaction")
	}

	go s.sendPaymentReceipt(payment, &studentFees)

	return payment, &studentFees, nil
}

func (s *FeesService) GetFeesDetailsWithPayments(studentFeesID string) (*models.StudentFees, []models.FeesPayment, error) {
	var fees models.StudentFees
	if err := s.db.Preload("Student").First(&fees, "id = ?", studentFeesID).Error; err != nil {
		return nil, nil, fmt.Errorf("student fees record not found")
	}

	if fees.Student != nil {
		var enrollment models.Enrollment
		if err := s.db.Preload("Class").Where("student_id = ? AND status = 'active'", fees.Student.ID).First(&enrollment).Error; err == nil {
			if enrollment.Class != nil {
				fees.Student.ClassName = enrollment.Class.Name
			}
		}
	}

	var payments []models.FeesPayment
	s.db.Where("student_fees_id = ?", studentFeesID).Order("payment_date DESC").Find(&payments)

	return &fees, payments, nil
}

func (s *FeesService) GetFeesReport(schoolID, term, year, level, classID string) (map[string]interface{}, error) {
	if term == "" {
		return nil, fmt.Errorf("invalid report type")
	}

	fees, payments, feesByClass, paymentMethods, startDate, endDate, err := s.generateReportData(schoolID, term, year, level, classID)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"fees":            fees,
		"payments":        payments,
		"fees_by_class":   feesByClass,
		"payment_methods": paymentMethods,
		"term":            term,
		"year":            year,
		"start_date":      startDate,
		"end_date":        endDate,
	}, nil
}

func (s *FeesService) generateReportData(schoolID, term, year, level, classID string) ([]models.StudentFees, []models.FeesPayment, interface{}, interface{}, string, string, error) {
	// This is a simplified version - the full implementation would include all the complex date range logic
	var fees []models.StudentFees
	var payments []models.FeesPayment
	
	feesQuery := s.db.Where("student_fees.school_id = ?", schoolID)
	if term != "" {
		feesQuery = feesQuery.Where("student_fees.term = ?", term)
	}
	if year != "" {
		feesQuery = feesQuery.Where("student_fees.year = ?", year)
	}
	
	if level != "" || classID != "" {
		var studentIDs []uuid.UUID
		studentQuery := s.db.Table("students").
			Select("DISTINCT students.id").
			Joins("INNER JOIN enrollments ON students.id = enrollments.student_id AND enrollments.status = 'active'").
			Joins("INNER JOIN classes ON enrollments.class_id = classes.id")
		
		if level != "" {
			studentQuery = studentQuery.Where("classes.level = ?", level)
		}
		if classID != "" {
			studentQuery = studentQuery.Where("classes.id = ?", classID)
		}
		
		studentQuery.Pluck("students.id", &studentIDs)
		
		if len(studentIDs) > 0 {
			feesQuery = feesQuery.Where("student_fees.student_id IN ?", studentIDs)
		} else {
			feesQuery = feesQuery.Where("1 = 0")
		}
	}
	
	feesQuery.Find(&fees)
	
	for i := range fees {
		var student models.Student
		if err := s.db.Where("id = ?", fees[i].StudentID).First(&student).Error; err == nil {
			var guardians []models.Guardian
			s.db.Where("student_id = ?", student.ID).Find(&guardians)
			
			var enrollment models.Enrollment
			if err := s.db.Preload("Class").Where("student_id = ? AND status = 'active'", student.ID).First(&enrollment).Error; err == nil {
				student.Class = enrollment.Class
			}
			
			fees[i].Student = &student
			fees[i].Student.Guardians = guardians
		}
	}
	
	paymentsQuery := s.db.Joins("JOIN student_fees ON fees_payments.student_fees_id = student_fees.id").Where("student_fees.school_id = ?", schoolID)
	if term != "" {
		paymentsQuery = paymentsQuery.Where("student_fees.term = ?", term)
	}
	if year != "" {
		paymentsQuery = paymentsQuery.Where("student_fees.year = ?", year)
	}
	paymentsQuery.Select("fees_payments.*").Find(&payments)
	
	return fees, payments, nil, nil, "", "", nil
}
