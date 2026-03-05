package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type ParentHandler struct {
	db *gorm.DB
}

func NewParentHandler(db *gorm.DB) *ParentHandler {
	return &ParentHandler{db: db}
}

// GetDashboardSummary returns parent dashboard overview
func (h *ParentHandler) GetDashboardSummary(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	schoolID := c.GetString("tenant_school_id")
	term := c.DefaultQuery("term", "Term 1")
	year := c.DefaultQuery("year", "2025")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	phoneVariants := []string{guardianPhone}
	if strings.HasPrefix(guardianPhone, "+256") {
		phoneVariants = append(phoneVariants, "0"+guardianPhone[4:])
	} else if strings.HasPrefix(guardianPhone, "0") {
		phoneVariants = append(phoneVariants, "+256"+guardianPhone[1:])
	}

	var guardians []models.Guardian
	if err := h.db.Where("(phone IN ? OR alternative_phone IN ?) AND school_id = ?", phoneVariants, phoneVariants, schoolID).Find(&guardians).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch children"})
		return
	}

	if len(guardians) == 0 {
		c.JSON(http.StatusOK, gin.H{"children": []interface{}{}, "summary": gin.H{}})
		return
	}

	studentIDs := make([]uuid.UUID, len(guardians))
	for i, g := range guardians {
		studentIDs[i] = g.StudentID
	}

	var students []models.Student
	if err := h.db.Where("id IN ? AND school_id = ?", studentIDs, schoolID).Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students"})
		return
	}

	totalFees := 0.0
	totalOutstanding := 0.0
	totalChildren := len(students)

	for i := range students {
		var enrollment models.Enrollment
		if err := h.db.Preload("Class").Where("student_id = ? AND status = 'active'", students[i].ID).First(&enrollment).Error; err == nil {
			if enrollment.Class != nil {
				students[i].ClassName = enrollment.Class.Name
			}
		}

		var fees models.StudentFees
		if err := h.db.Where("student_id = ? AND term = ? AND year = ?", students[i].ID, term, year).First(&fees).Error; err == nil {
			totalFees += fees.TotalFees
			totalOutstanding += fees.Outstanding
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"children": students,
		"summary": gin.H{
			"total_children":    totalChildren,
			"total_fees":        totalFees,
			"total_outstanding": totalOutstanding,
			"total_paid":        totalFees - totalOutstanding,
		},
	})
}

// GetChildDetails returns detailed information for a specific child
func (h *ParentHandler) GetChildDetails(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Param("student_id")
	term := c.DefaultQuery("term", "Term 1")
	year := c.DefaultQuery("year", "2025")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	phoneVariants := []string{guardianPhone}
	if strings.HasPrefix(guardianPhone, "+256") {
		phoneVariants = append(phoneVariants, "0"+guardianPhone[4:])
	} else if strings.HasPrefix(guardianPhone, "0") {
		phoneVariants = append(phoneVariants, "+256"+guardianPhone[1:])
	}

	var guardian models.Guardian
	if err := h.db.Where("student_id = ? AND (phone IN ? OR alternative_phone IN ?) AND school_id = ?", studentID, phoneVariants, phoneVariants, schoolID).First(&guardian).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var student models.Student
	if err := h.db.Preload("Guardians").Where("id = ? AND school_id = ?", studentID, schoolID).First(&student).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	var enrollment models.Enrollment
	if err := h.db.Preload("Class").Where("student_id = ? AND status = 'active'", student.ID).First(&enrollment).Error; err == nil {
		if enrollment.Class != nil {
			student.ClassName = enrollment.Class.Name
		}
	}

	var fees models.StudentFees
	h.db.Where("student_id = ? AND term = ? AND year = ?", studentID, term, year).First(&fees)

	var results []models.SubjectResult
	h.db.Preload("StandardSubject").Where("student_id = ? AND term = ? AND year = ?", studentID, term, year).Find(&results)

	var attendance []models.Attendance
	h.db.Where("student_id = ? AND term = ? AND year = ?", studentID, term, year).Find(&attendance)

	presentCount := 0
	absentCount := 0
	for _, a := range attendance {
		switch a.Status {
		case "present":
			presentCount++
		case "absent":
			absentCount++
		}
	}

	attendanceRate := 0.0
	if len(attendance) > 0 {
		attendanceRate = float64(presentCount) / float64(len(attendance)) * 100
	}

	var health models.StudentHealthProfile
	h.db.Where("student_id = ?", studentID).First(&health)

	c.JSON(http.StatusOK, gin.H{
		"student": student,
		"fees":    fees,
		"results": results,
		"attendance": gin.H{
			"total":            len(attendance),
			"present":          presentCount,
			"absent":           absentCount,
			"attendance_rate":  attendanceRate,
			"recent_records":   attendance,
		},
		"health": health,
	})
}

// GetChildAttendance returns attendance records for a child
func (h *ParentHandler) GetChildAttendance(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Param("student_id")
	term := c.DefaultQuery("term", "Term 1")
	year := c.DefaultQuery("year", "2025")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	phoneVariants := []string{guardianPhone}
	if strings.HasPrefix(guardianPhone, "+256") {
		phoneVariants = append(phoneVariants, "0"+guardianPhone[4:])
	} else if strings.HasPrefix(guardianPhone, "0") {
		phoneVariants = append(phoneVariants, "+256"+guardianPhone[1:])
	}

	var guardian models.Guardian
	if err := h.db.Where("student_id = ? AND (phone IN ? OR alternative_phone IN ?) AND school_id = ?", studentID, phoneVariants, phoneVariants, schoolID).First(&guardian).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	now := time.Now()
	startOfWeek := now.AddDate(0, 0, -int(now.Weekday()))
	startOfLastWeek := startOfWeek.AddDate(0, 0, -7)
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	startOfLastMonth := startOfMonth.AddDate(0, -1, 0)

	// Helper function to count school days (weekdays) in a date range, excluding holidays
	countSchoolDays := func(startDate, endDate time.Time) int {
		var holidays []models.SchoolCalendar
		h.db.Where("school_id = ? AND date >= ? AND date <= ?", schoolID, startDate, endDate).Find(&holidays)
		holidayMap := make(map[string]bool)
		for _, h := range holidays {
			holidayMap[h.Date.Format("2006-01-02")] = true
		}
		
		schoolDays := 0
		for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
			weekday := d.Weekday()
			if weekday != time.Saturday && weekday != time.Sunday && !holidayMap[d.Format("2006-01-02")] {
				schoolDays++
			}
		}
		return schoolDays
	}

	calcStats := func(records []models.Attendance, startDate, endDate time.Time) gin.H {
		present, absent, late := 0, 0, 0
		for _, a := range records {
			switch a.Status {
			case "present":
				present++
			case "absent":
				absent++
			case "late":
				late++
			}
		}
		totalSchoolDays := countSchoolDays(startDate, endDate)
		rate := 0.0
		if totalSchoolDays > 0 {
			rate = float64(present) / float64(totalSchoolDays) * 100
		}
		return gin.H{"total": totalSchoolDays, "present": present, "absent": absent, "late": late, "rate": rate}
	}

	var allAttendance []models.Attendance
	h.db.Where("student_id = ? AND school_id = ?", studentID, schoolID).Order("date DESC").Find(&allAttendance)

	yearInt, _ := strconv.Atoi(year)
	var thisWeek, lastWeek, thisMonth, lastMonth, thisTerm, lastTerm, thisYear []models.Attendance
	for _, a := range allAttendance {
		if a.Date.After(startOfWeek) || a.Date.Equal(startOfWeek) {
			thisWeek = append(thisWeek, a)
		}
		if (a.Date.After(startOfLastWeek) || a.Date.Equal(startOfLastWeek)) && a.Date.Before(startOfWeek) {
			lastWeek = append(lastWeek, a)
		}
		if a.Date.After(startOfMonth) || a.Date.Equal(startOfMonth) {
			thisMonth = append(thisMonth, a)
		}
		if (a.Date.After(startOfLastMonth) || a.Date.Equal(startOfLastMonth)) && a.Date.Before(startOfMonth) {
			lastMonth = append(lastMonth, a)
		}
		if a.Term == term && a.Year == yearInt {
			thisTerm = append(thisTerm, a)
		}
		if a.Year == yearInt {
			thisYear = append(thisYear, a)
		}
	}

	prevTerm := "Term 3"
	prevYear := yearInt
	switch term {
	case "Term 1":
		prevYear = yearInt - 1
	case "Term 2":
		prevTerm = "Term 1"
	case "Term 3":
		prevTerm = "Term 2"
	}
	for _, a := range allAttendance {
		if a.Term == prevTerm && a.Year == prevYear {
			lastTerm = append(lastTerm, a)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"attendance": thisTerm,
		"periods": gin.H{
			"this_week":  calcStats(thisWeek, startOfWeek, now),
			"last_week":  calcStats(lastWeek, startOfLastWeek, startOfWeek.AddDate(0, 0, -1)),
			"this_month": calcStats(thisMonth, startOfMonth, now),
			"last_month": calcStats(lastMonth, startOfLastMonth, startOfMonth.AddDate(0, 0, -1)),
			"this_term":  calcStats(thisTerm, startOfMonth, now),
			"last_term":  calcStats(lastTerm, startOfLastMonth, startOfMonth.AddDate(0, 0, -1)),
			"this_year":  calcStats(thisYear, time.Date(yearInt, 1, 1, 0, 0, 0, 0, now.Location()), now),
		},
	})
}

// GetChildResults returns academic results for a child
func (h *ParentHandler) GetChildResults(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Param("student_id")
	term := c.DefaultQuery("term", "Term 1")
	year := c.DefaultQuery("year", "2025")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	phoneVariants := []string{guardianPhone}
	if strings.HasPrefix(guardianPhone, "+256") {
		phoneVariants = append(phoneVariants, "0"+guardianPhone[4:])
	} else if strings.HasPrefix(guardianPhone, "0") {
		phoneVariants = append(phoneVariants, "+256"+guardianPhone[1:])
	}

	var guardian models.Guardian
	if err := h.db.Where("student_id = ? AND (phone IN ? OR alternative_phone IN ?) AND school_id = ?", studentID, phoneVariants, phoneVariants, schoolID).First(&guardian).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var results []models.SubjectResult
	if err := h.db.Preload("StandardSubject").Where("student_id = ? AND term = ? AND year = ? AND school_id = ?", studentID, term, year, schoolID).Find(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch results"})
		return
	}

	// Fix grades for subsidiary subjects
	for i := range results {
		if results[i].StandardSubject != nil {
			subjectName := results[i].StandardSubject.Name
			if subjectName == "ICT" || subjectName == "General Paper" ||
				strings.Contains(strings.ToLower(subjectName), "ict") ||
				strings.Contains(strings.ToLower(subjectName), "general paper") ||
				strings.Contains(strings.ToLower(subjectName), "subsidiary") {
				if results[i].RawMarks != nil {
					ca := 0.0
					exam := 0.0
					if c, ok := results[i].RawMarks["ca"].(float64); ok {
						ca = c
					}
					if e, ok := results[i].RawMarks["exam"].(float64); ok {
						exam = e
					}
					total := ca + exam
					if total >= 50 {
						results[i].FinalGrade = "O"
					} else if total > 0 {
						results[i].FinalGrade = "F"
					}
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}

// GetChildFees returns fees information for a child
func (h *ParentHandler) GetChildFees(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Param("student_id")
	term := c.DefaultQuery("term", "Term 1")
	year := c.DefaultQuery("year", "2025")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	phoneVariants := []string{guardianPhone}
	if strings.HasPrefix(guardianPhone, "+256") {
		phoneVariants = append(phoneVariants, "0"+guardianPhone[4:])
	} else if strings.HasPrefix(guardianPhone, "0") {
		phoneVariants = append(phoneVariants, "+256"+guardianPhone[1:])
	}

	var guardian models.Guardian
	if err := h.db.Where("student_id = ? AND (phone IN ? OR alternative_phone IN ?) AND school_id = ?", studentID, phoneVariants, phoneVariants, schoolID).First(&guardian).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var fees models.StudentFees
	if err := h.db.Where("student_id = ? AND term = ? AND year = ? AND school_id = ?", studentID, term, year, schoolID).First(&fees).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fees record not found"})
		return
	}

	var payments []models.FeesPayment
	h.db.Where("student_fees_id = ?", fees.ID).Order("payment_date DESC").Find(&payments)

	c.JSON(http.StatusOK, gin.H{
		"fees":     fees,
		"payments": payments,
	})
}

// GetChildHealth returns health information for a child
func (h *ParentHandler) GetChildHealth(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Param("student_id")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	phoneVariants := []string{guardianPhone}
	if strings.HasPrefix(guardianPhone, "+256") {
		phoneVariants = append(phoneVariants, "0"+guardianPhone[4:])
	} else if strings.HasPrefix(guardianPhone, "0") {
		phoneVariants = append(phoneVariants, "+256"+guardianPhone[1:])
	}

	var guardian models.Guardian
	if err := h.db.Where("student_id = ? AND (phone IN ? OR alternative_phone IN ?) AND school_id = ?", studentID, phoneVariants, phoneVariants, schoolID).First(&guardian).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var health models.StudentHealthProfile
	h.db.Where("student_id = ? AND school_id = ?", studentID, schoolID).First(&health)

	var visits []models.ClinicVisit
	h.db.Where("student_id = ? AND school_id = ?", studentID, schoolID).Order("visit_date DESC").Limit(10).Find(&visits)

	c.JSON(http.StatusOK, gin.H{
		"health_profile": health,
		"recent_visits":  visits,
	})
}

// GetChildReportCard returns report card for a child
func (h *ParentHandler) GetChildReportCard(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Param("student_id")
	term := c.DefaultQuery("term", "Term 1")
	year := c.DefaultQuery("year", "2025")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	phoneVariants := []string{guardianPhone}
	if strings.HasPrefix(guardianPhone, "+256") {
		phoneVariants = append(phoneVariants, "0"+guardianPhone[4:])
	} else if strings.HasPrefix(guardianPhone, "0") {
		phoneVariants = append(phoneVariants, "+256"+guardianPhone[1:])
	}

	var guardian models.Guardian
	if err := h.db.Where("student_id = ? AND (phone IN ? OR alternative_phone IN ?) AND school_id = ?", studentID, phoneVariants, phoneVariants, schoolID).First(&guardian).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var reportCard models.ReportCard
	if err := h.db.Where("student_id = ? AND term = ? AND year = ? AND status = 'completed'", studentID, term, year).First(&reportCard).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Report card not available"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"report_card": reportCard})
}

// GetChildTimetable returns class timetable for a child
func (h *ParentHandler) GetChildTimetable(c *gin.Context) {
	guardianPhone := c.GetString("guardian_phone")
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Param("student_id")

	if guardianPhone == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Parent access only"})
		return
	}

	phoneVariants := []string{guardianPhone}
	if strings.HasPrefix(guardianPhone, "+256") {
		phoneVariants = append(phoneVariants, "0"+guardianPhone[4:])
	} else if strings.HasPrefix(guardianPhone, "0") {
		phoneVariants = append(phoneVariants, "+256"+guardianPhone[1:])
	}

	var guardian models.Guardian
	if err := h.db.Where("student_id = ? AND (phone IN ? OR alternative_phone IN ?) AND school_id = ?", studentID, phoneVariants, phoneVariants, schoolID).First(&guardian).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var enrollment models.Enrollment
	if err := h.db.Preload("Class").Where("student_id = ? AND status = 'active'", studentID).First(&enrollment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not enrolled in any class"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"class":     enrollment.Class,
		"timetable": gin.H{"message": "Timetable feature coming soon"},
	})
}
