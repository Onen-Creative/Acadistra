package handlers

import (
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
	level := c.Query("level")
	search := c.Query("search")
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")

	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
		return
	}

	type FeeWithClass struct {
		ID          uuid.UUID `json:"id"`
		CreatedAt   time.Time `json:"created_at"`
		UpdatedAt   time.Time `json:"updated_at"`
		StudentID   uuid.UUID `json:"student_id"`
		SchoolID    uuid.UUID `json:"school_id"`
		Term        string    `json:"term"`
		Year        int       `json:"year"`
		TotalFees   float64   `json:"total_fees"`
		AmountPaid  float64   `json:"amount_paid"`
		Outstanding float64   `json:"outstanding"`
		ClassLevel  string    `json:"class_level"`
		Student     *models.Student `json:"student,omitempty"`
	}

	var fees []FeeWithClass
	query := h.db.Table("student_fees").
		Select("student_fees.*, classes.level as class_level").
		Joins("LEFT JOIN students ON student_fees.student_id = students.id").
		Joins("LEFT JOIN enrollments ON students.id = enrollments.student_id AND enrollments.status = 'active'").
		Joins("LEFT JOIN classes ON enrollments.class_id = classes.id").
		Where("student_fees.school_id = ?", schoolID)

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

	if level != "" {
		query = query.Where("classes.level = ?", level)
	}

	var total int64
	query.Count(&total)

	offset := (utils.Atoi(page) - 1) * utils.Atoi(limit)
	if err := query.Offset(offset).Limit(utils.Atoi(limit)).Scan(&fees).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Load student data for each fee
	for i := range fees {
		var student models.Student
		if err := h.db.First(&student, "id = ?", fees[i].StudentID).Error; err == nil {
			fees[i].Student = &student
		}
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
		StudentID string  `json:"student_id" binding:"required"`
		Term      string  `json:"term" binding:"required"`
		Year      int     `json:"year" binding:"required"`
		TotalFees float64 `json:"total_fees" binding:"required"`
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

	// Check if fees record exists
	var fees models.StudentFees
	err = h.db.Where("student_id = ? AND term = ? AND year = ?", studentID, req.Term, req.Year).First(&fees).Error

	if err == gorm.ErrRecordNotFound {
		// Create new record
		fees = models.StudentFees{
			StudentID:   studentID,
			SchoolID:    uuid.MustParse(schoolID),
			Term:        req.Term,
			Year:        req.Year,
			TotalFees:   req.TotalFees,
			AmountPaid:  0,
			Outstanding: req.TotalFees,
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
		fees.Outstanding = req.TotalFees - fees.AmountPaid
		if err := h.db.Save(&fees).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		ws.GlobalHub.Broadcast("fees:updated", fees, schoolID)
	}

	c.JSON(http.StatusOK, fees)
}

// Record payment
func (h *FeesHandler) RecordPayment(c *gin.Context) {
	var req struct {
		StudentFeesID string  `json:"student_fees_id" binding:"required"`
		Amount        float64 `json:"amount" binding:"required,gt=0"`
		PaymentMethod string  `json:"payment_method"`
		ReceiptNo     string  `json:"receipt_no"`
		Notes         string  `json:"notes"`
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
	if err := h.db.First(&studentFees, "id = ?", studentFeesID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student fees record not found"})
		return
	}

	payment := models.FeesPayment{
		StudentFeesID: studentFeesID,
		Amount:        req.Amount,
		PaymentDate:   time.Now(),
		PaymentMethod: req.PaymentMethod,
		ReceiptNo:     req.ReceiptNo,
		Notes:         req.Notes,
		RecordedBy:    userID,
	}

	if err := h.db.Create(&payment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update student fees totals
	studentFees.AmountPaid += req.Amount
	studentFees.Outstanding = studentFees.TotalFees - studentFees.AmountPaid
	if err := h.db.Save(&studentFees).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("fees:payment:recorded", gin.H{"payment": payment, "updated_fees": studentFees}, studentFees.SchoolID.String())
	c.JSON(http.StatusOK, gin.H{"payment": payment, "updated_fees": studentFees})
}

// Get student fees details
func (h *FeesHandler) GetStudentFeesDetails(c *gin.Context) {
	studentFeesID := c.Param("id")

	var fees models.StudentFees
	if err := h.db.Preload("Student").First(&fees, "id = ?", studentFeesID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student fees record not found"})
		return
	}

	var payments []models.FeesPayment
	h.db.Where("student_fees_id = ?", studentFeesID).Find(&payments)

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

	// Get all student fees
	var fees []models.StudentFees
	feesQuery := h.db.Preload("Student").Where("student_fees.school_id = ?", schoolID)
	if reportType == "termly" && term != "" {
		feesQuery = feesQuery.Where("student_fees.term = ?", term)
	}
	if (reportType == "termly" || reportType == "yearly") && year != "" {
		feesQuery = feesQuery.Where("student_fees.year = ?", year)
	}
	feesQuery.Find(&fees)

	// Get payments based on date range
	var payments []models.FeesPayment
	paymentsQuery := h.db.Preload("StudentFees.Student").Joins("JOIN student_fees ON fees_payments.student_fees_id = student_fees.id").Where("student_fees.school_id = ?", schoolID)
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

	// Get fees by class
	var feesByClass []struct {
		Class          string  `json:"class"`
		TotalStudents  int64   `json:"total_students"`
		TotalFees      float64 `json:"total_fees"`
		TotalPaid      float64 `json:"total_paid"`
		TotalOutstanding float64 `json:"total_outstanding"`
	}
	classQuery := h.db.Table("student_fees").
		Select("classes.level as class, COUNT(DISTINCT student_fees.student_id) as total_students, SUM(student_fees.total_fees) as total_fees, SUM(student_fees.amount_paid) as total_paid, SUM(student_fees.outstanding) as total_outstanding").
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
	classQuery.Group("classes.level").Order("class").Scan(&feesByClass)

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
