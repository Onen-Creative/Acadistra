package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/utils"
	ws "github.com/school-system/backend/internal/websocket"
	"gorm.io/gorm"
)

type FeesHandler struct {
	db *gorm.DB
}

func NewFeesHandler(db *gorm.DB) *FeesHandler {
	return &FeesHandler{db: db}
}

// List student fees for a term/year
func (h *FeesHandler) ListStudentFees(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	yearStr := c.Query("year")
	search := c.Query("search")
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")

	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
		return
	}

	// Use StudentFees model directly to get all fields including JSONB
	var fees []models.StudentFees
	
	// Get class_id filter if provided
	classID := c.Query("class_id")
	
	query := h.db.Where("student_fees.school_id = ?", schoolID)

	if term != "" {
		query = query.Where("student_fees.term = ?", term)
	}
	if yearStr != "" {
		year := utils.Atoi(yearStr)
		query = query.Where("student_fees.year = ?", year)
	}

	if search != "" {
		query = query.Where("students.first_name ILIKE ? OR students.last_name ILIKE ? OR students.admission_no ILIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Filter by class_id if provided
	if classID != "" {
		// Get student IDs in this class
		var studentIDs []uuid.UUID
		h.db.Table("enrollments").
			Select("student_id").
			Where("class_id = ? AND status = 'active'", classID).
			Pluck("student_id", &studentIDs)
		
		if len(studentIDs) > 0 {
			query = query.Where("student_fees.student_id IN ?", studentIDs)
		} else {
			// No students in class, return empty
			c.JSON(http.StatusOK, gin.H{"fees": []models.StudentFees{}, "total": 0})
			return
		}
	}

	var total int64
	query.Model(&models.StudentFees{}).Count(&total)

	offset := (utils.Atoi(page) - 1) * utils.Atoi(limit)
	if err := query.Offset(offset).Limit(utils.Atoi(limit)).Find(&fees).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Load student data and payments for each fee
	for i := range fees {
		var student models.Student
		if err := h.db.First(&student, "id = ?", fees[i].StudentID).Error; err == nil {
			// Load student's current class
			var enrollment models.Enrollment
			if err := h.db.Preload("Class").Where("student_id = ? AND status = 'active'", student.ID).First(&enrollment).Error; err == nil {
				if enrollment.Class != nil {
					student.ClassName = enrollment.Class.Name
				}
			}
			fees[i].Student = &student
		}
		
		// Load payment history for this fee record
		var payments []models.FeesPayment
		h.db.Where("student_fees_id = ?", fees[i].ID).Order("payment_date DESC").Find(&payments)
		// Store payments in a temporary field (we'll need to add this to response)
		// For now, we can add it via a custom response structure if needed
	}

	c.JSON(http.StatusOK, gin.H{
		"fees":  fees,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// Create or update student fees
func (h *FeesHandler) CreateOrUpdateStudentFees(c *gin.Context) {
	var req struct {
		StudentID    string             `json:"student_id" binding:"required"`
		Term         string             `json:"term" binding:"required"`
		Year         int                `json:"year" binding:"required"`
		TotalFees    float64            `json:"total_fees" binding:"required"`
		FeeBreakdown map[string]float64 `json:"fee_breakdown"` // {"tuition": 500000, "uniform": 50000}
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student ID"})
		return
	}

	schoolID := c.GetString("tenant_school_id")

	// Check if student belongs to school
	var student models.Student
	if err := h.db.Where("id = ? AND school_id = ?", studentID, schoolID).First(&student).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Student not found"})
		return
	}

	// Convert fee breakdown to JSONB
	feeBreakdown := models.JSONB{}
	if req.FeeBreakdown != nil {
		for k, v := range req.FeeBreakdown {
			feeBreakdown[k] = v
		}
	}

	// Check if fees record exists
	var fees models.StudentFees
	err = h.db.Where("student_id = ? AND term = ? AND year = ?", studentID, req.Term, req.Year).First(&fees).Error

	if err == gorm.ErrRecordNotFound {
		// Create new record
		fees = models.StudentFees{
			StudentID:    studentID,
			SchoolID:     uuid.MustParse(schoolID),
			Term:         req.Term,
			Year:         req.Year,
			TotalFees:    req.TotalFees,
			FeeBreakdown: feeBreakdown,
			AmountPaid:   0,
			Outstanding:  req.TotalFees,
		}
		if err := h.db.Create(&fees).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		ws.GlobalHub.Broadcast("fees:created", fees, schoolID)
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	} else {
		// Update existing record
		fees.TotalFees = req.TotalFees
		fees.FeeBreakdown = feeBreakdown
		fees.Outstanding = req.TotalFees - fees.AmountPaid
		if err := h.db.Save(&fees).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		ws.GlobalHub.Broadcast("fees:updated", fees, schoolID)
	}

	c.JSON(http.StatusOK, fees)
}

// Update student fees
func (h *FeesHandler) UpdateStudentFees(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var fees models.StudentFees
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&fees).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fees record not found"})
		return
	}

	var req struct {
		TotalFees    float64            `json:"total_fees" binding:"required"`
		FeeBreakdown map[string]float64 `json:"fee_breakdown"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	feeBreakdown := models.JSONB{}
	if req.FeeBreakdown != nil {
		for k, v := range req.FeeBreakdown {
			feeBreakdown[k] = v
		}
	}

	fees.TotalFees = req.TotalFees
	fees.FeeBreakdown = feeBreakdown
	fees.Outstanding = req.TotalFees - fees.AmountPaid

	if err := h.db.Save(&fees).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("fees:updated", fees, schoolID)
	c.JSON(http.StatusOK, fees)
}

// Record payment
func (h *FeesHandler) RecordPayment(c *gin.Context) {
	var req struct {
		StudentFeesID    string             `json:"student_fees_id" binding:"required"`
		Amount           float64            `json:"amount" binding:"required,gt=0"`
		PaymentMethod    string             `json:"payment_method"`
		ReceiptNo        string             `json:"receipt_no"`
		Notes            string             `json:"notes"`
		PaymentBreakdown map[string]float64 `json:"payment_breakdown"` // {"tuition": 300000, "uniform": 50000}
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed: " + err.Error()})
		return
	}

	studentFeesID, err := uuid.Parse(req.StudentFeesID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student fees ID"})
		return
	}

	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID not found"})
		return
	}

	var userID uuid.UUID
	switch v := userIDInterface.(type) {
	case uuid.UUID:
		userID = v
	case string:
		parsedID, err := uuid.Parse(v)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
			return
		}
		userID = parsedID
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID type"})
		return
	}

	// Get student fees record
	var studentFees models.StudentFees
	if err := h.db.Preload("Student").First(&studentFees, "id = ?", studentFeesID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student fees record not found"})
		return
	}

	// Start transaction
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Convert payment breakdown to JSONB
	paymentBreakdown := models.JSONB{}
	if req.PaymentBreakdown != nil {
		for k, v := range req.PaymentBreakdown {
			paymentBreakdown[k] = v
		}
	}

	payment := models.FeesPayment{
		StudentFeesID:    studentFeesID,
		Amount:           req.Amount,
		PaymentDate:      time.Now(),
		PaymentMethod:    req.PaymentMethod,
		ReceiptNo:        req.ReceiptNo,
		Notes:            req.Notes,
		RecordedBy:       userID,
		PaymentBreakdown: paymentBreakdown,
	}

	if err := tx.Create(&payment).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update student fees totals
	studentFees.AmountPaid += req.Amount
	studentFees.Outstanding = studentFees.TotalFees - studentFees.AmountPaid

	// Update paid breakdown
	if studentFees.PaidBreakdown == nil {
		studentFees.PaidBreakdown = models.JSONB{}
	}
	if req.PaymentBreakdown != nil {
		for category, amount := range req.PaymentBreakdown {
			if existingPaid, ok := studentFees.PaidBreakdown[category].(float64); ok {
				studentFees.PaidBreakdown[category] = existingPaid + amount
			} else {
				studentFees.PaidBreakdown[category] = amount
			}
		}
	}

	if err := tx.Save(&studentFees).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Automatically create income record
	studentName := "Unknown Student"
	if studentFees.Student != nil {
		studentName = studentFees.Student.FirstName
		if studentFees.Student.MiddleName != "" {
			studentName += " " + studentFees.Student.MiddleName
		}
		studentName += " " + studentFees.Student.LastName
	}

	income := models.Income{
		SchoolID:    studentFees.SchoolID,
		Category:    "Fees",
		Source:      "Student Fees - " + studentName,
		Amount:      req.Amount,
		Description: fmt.Sprintf("Fees payment for %s %d", studentFees.Term, studentFees.Year),
		Date:        payment.PaymentDate,
		Term:        studentFees.Term,
		Year:        studentFees.Year,
		ReceiptNo:   req.ReceiptNo,
		ReceivedBy:  userID,
	}

	if err := tx.Create(&income).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create income record: " + err.Error()})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	ws.GlobalHub.Broadcast("fees:payment:recorded", gin.H{"payment": payment, "updated_fees": studentFees}, studentFees.SchoolID.String())
	c.JSON(http.StatusOK, gin.H{"payment": payment, "updated_fees": studentFees, "income_created": true})
}

// Get student fees details
func (h *FeesHandler) GetStudentFeesDetails(c *gin.Context) {
	studentFeesID := c.Param("id")

	var fees models.StudentFees
	if err := h.db.Preload("Student").First(&fees, "id = ?", studentFeesID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student fees record not found"})
		return
	}

	// Load student's current class
	if fees.Student != nil {
		var enrollment models.Enrollment
		if err := h.db.Preload("Class").Where("student_id = ? AND status = 'active'", fees.Student.ID).First(&enrollment).Error; err == nil {
			if enrollment.Class != nil {
				fees.Student.ClassName = enrollment.Class.Name
			}
		}
	}

	var payments []models.FeesPayment
	h.db.Where("student_fees_id = ?", studentFeesID).Order("payment_date DESC").Find(&payments)

	c.JSON(http.StatusOK, gin.H{
		"fees":     fees,
		"payments": payments,
	})
}

// Delete student fees record
func (h *FeesHandler) DeleteStudentFees(c *gin.Context) {
	id := c.Param("id")

	// Delete associated payments first
	h.db.Where("student_fees_id = ?", id).Delete(&models.FeesPayment{})

	// Delete fees record
	if err := h.db.Delete(&models.StudentFees{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Student fees record deleted"})
}

func (h *FeesHandler) GetReportData(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	reportType := c.Query("type")
	term := c.Query("term")
	year := c.Query("year")
	level := c.Query("level")
	classID := c.Query("class_id")

	var startDate, endDate time.Time
	now := time.Now()

	switch reportType {
	case "daily":
		startDate = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		endDate = startDate.AddDate(0, 0, 1)
	case "weekly":
		weekday := int(now.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		startDate = now.AddDate(0, 0, -weekday+1)
		startDate = time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
		endDate = startDate.AddDate(0, 0, 7)
	case "monthly":
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		endDate = startDate.AddDate(0, 1, 0)
	case "termly":
		startDate = time.Time{}
		endDate = now
	case "yearly":
		startDate = time.Time{}
		endDate = now
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report type"})
		return
	}

	// Get all student fees with proper filtering
	var fees []models.StudentFees
	feesQuery := h.db.Where("student_fees.school_id = ?", schoolID)
	
	if reportType == "termly" && term != "" {
		feesQuery = feesQuery.Where("student_fees.term = ?", term)
	}
	if (reportType == "termly" || reportType == "yearly") && year != "" {
		feesQuery = feesQuery.Where("student_fees.year = ?", year)
	}
	
	if level != "" || classID != "" {
		// Get student IDs that match the class filter
		var studentIDs []uuid.UUID
		studentQuery := h.db.Table("students").
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
			// No students found, return empty result
			feesQuery = feesQuery.Where("1 = 0")
		}
	}
	
	feesQuery.Find(&fees)
	
	// Manually load students with guardians and class info for each fee
	for i := range fees {
		var student models.Student
		if err := h.db.Where("id = ?", fees[i].StudentID).First(&student).Error; err == nil {
			// Load guardians
			var guardians []models.Guardian
			h.db.Where("student_id = ?", student.ID).Find(&guardians)
			
			// Load current class
			var enrollment models.Enrollment
			if err := h.db.Preload("Class").Where("student_id = ? AND status = 'active'", student.ID).First(&enrollment).Error; err == nil {
				student.Class = enrollment.Class
			}
			
			fees[i].Student = &student
			fees[i].Student.Guardians = guardians
		}
	}

	// Get payments based on date range
	var payments []models.FeesPayment
	paymentsQuery := h.db.Joins("JOIN student_fees ON fees_payments.student_fees_id = student_fees.id").Where("student_fees.school_id = ?", schoolID)
	if reportType == "daily" || reportType == "weekly" || reportType == "monthly" {
		paymentsQuery = paymentsQuery.Where("fees_payments.payment_date >= ? AND fees_payments.payment_date < ?", startDate, endDate)
	}
	if reportType == "termly" && term != "" {
		paymentsQuery = paymentsQuery.Where("student_fees.term = ?", term)
	}
	if (reportType == "termly" || reportType == "yearly") && year != "" {
		paymentsQuery = paymentsQuery.Where("student_fees.year = ?", year)
	}
	paymentsQuery.Select("fees_payments.*").Find(&payments)
	
	// Load full student data with guardians and class for each payment
	for i := range payments {
		var studentFees models.StudentFees
		if err := h.db.Where("id = ?", payments[i].StudentFeesID).First(&studentFees).Error; err == nil {
			var student models.Student
			if err := h.db.Where("id = ?", studentFees.StudentID).First(&student).Error; err == nil {
				// Load guardians
				var guardians []models.Guardian
				h.db.Where("student_id = ?", student.ID).Find(&guardians)
				
				// Load current class
				var enrollment models.Enrollment
				if err := h.db.Preload("Class").Where("student_id = ? AND status = 'active'", student.ID).First(&enrollment).Error; err == nil {
					student.Class = enrollment.Class
				}
				
				student.Guardians = guardians
				studentFees.Student = &student
			}
			payments[i].StudentFees = &studentFees
		}
	}

	// Get fees by class
	var feesByClass []struct {
		Class          string  `json:"class"`
		TotalStudents  int64   `json:"total_students"`
		TotalFees      float64 `json:"total_fees"`
		TotalPaid      float64 `json:"total_paid"`
		TotalOutstanding float64 `json:"total_outstanding"`
	}
	classQuery := h.db.Table("student_fees").
		Select("classes.name as class, COUNT(DISTINCT student_fees.student_id) as total_students, SUM(student_fees.total_fees) as total_fees, SUM(student_fees.amount_paid) as total_paid, SUM(student_fees.outstanding) as total_outstanding").
		Joins("JOIN students ON student_fees.student_id = students.id").
		Joins("JOIN enrollments ON students.id = enrollments.student_id AND enrollments.status = 'active'").
		Joins("JOIN classes ON enrollments.class_id = classes.id").
		Where("student_fees.school_id = ?", schoolID)
	if reportType == "termly" && term != "" {
		classQuery = classQuery.Where("student_fees.term = ?", term)
	}
	if (reportType == "termly" || reportType == "yearly") && year != "" {
		classQuery = classQuery.Where("student_fees.year = ?", year)
	}
	if level != "" {
		classQuery = classQuery.Where("classes.level = ?", level)
		if classID != "" {
			classQuery = classQuery.Where("classes.id = ?", classID)
		}
	}
	classQuery.Group("classes.id, classes.name").Order("class").Scan(&feesByClass)

	// Get payment methods summary
	var paymentMethods []struct {
		Method string  `json:"method"`
		Count  int64   `json:"count"`
		Total  float64 `json:"total"`
	}
	methodQuery := h.db.Table("fees_payments").
		Select("fees_payments.payment_method as method, COUNT(*) as count, SUM(fees_payments.amount) as total").
		Joins("JOIN student_fees ON fees_payments.student_fees_id = student_fees.id").
		Where("student_fees.school_id = ?", schoolID)
	if reportType == "daily" || reportType == "weekly" || reportType == "monthly" {
		methodQuery = methodQuery.Where("fees_payments.payment_date >= ? AND fees_payments.payment_date < ?", startDate, endDate)
	}
	if reportType == "termly" && term != "" {
		methodQuery = methodQuery.Where("student_fees.term = ?", term)
	}
	if (reportType == "termly" || reportType == "yearly") && year != "" {
		methodQuery = methodQuery.Where("student_fees.year = ?", year)
	}
	methodQuery.Group("fees_payments.payment_method").Scan(&paymentMethods)

	c.JSON(http.StatusOK, gin.H{
		"fees":             fees,
		"payments":         payments,
		"fees_by_class":    feesByClass,
		"payment_methods":  paymentMethods,
		"report_type":      reportType,
		"term":             term,
		"year":             year,
		"start_date":       startDate,
		"end_date":         endDate,
	})
}
