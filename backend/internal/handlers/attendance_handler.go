package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"gorm.io/gorm"
)

type AttendanceHandler struct {
	db           *gorm.DB
	emailService *services.EmailService
}

func NewAttendanceHandler(db *gorm.DB, emailService *services.EmailService) *AttendanceHandler {
	return &AttendanceHandler{
		db:           db,
		emailService: emailService,
	}
}

// getDefaultRemark returns default remark based on attendance status
func getDefaultRemark(status string) string {
	switch status {
	case "present":
		return "Student attended class"
	case "absent":
		return "Student was absent without notice"
	case "late":
		return "Student arrived late to class"
	case "sick":
		return "Student was absent due to illness"
	case "excused":
		return "Student absence was excused"
	default:
		return ""
	}
}

// MarkAttendance - Mark attendance for a single student
func (h *AttendanceHandler) MarkAttendance(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")

	var req struct {
		StudentID uuid.UUID `json:"student_id" binding:"required"`
		ClassID   uuid.UUID `json:"class_id" binding:"required"`
		Date      string    `json:"date" binding:"required"`
		Status    string    `json:"status" binding:"required"`
		Remarks   string    `json:"remarks"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse date
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	// Get class to retrieve year and term - if class not found, try to get from student's enrollment
	var class models.Class
	if err := h.db.First(&class, req.ClassID).Error; err != nil {
		// Try to get class from student's active enrollment
		var enrollment models.Enrollment
		if err := h.db.Where("class_id = ? AND status = 'active'", req.ClassID).First(&enrollment).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Class not found"})
			return
		}
		// Get the class from enrollment
		if err := h.db.First(&class, enrollment.ClassID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Class not found"})
			return
		}
	}

	// Auto-generate remarks if empty
	if req.Remarks == "" {
		req.Remarks = getDefaultRemark(req.Status)
	}

	attendance := models.Attendance{
		StudentID: req.StudentID,
		SchoolID:  uuid.MustParse(schoolID),
		ClassID:   req.ClassID,
		Year:      class.Year,
		Term:      class.Term,
		Date:      date,
		Status:    req.Status,
		Remarks:   req.Remarks,
		MarkedBy:  uuid.MustParse(userID),
		MarkedAt:  time.Now(),
	}

	// Check if attendance already exists for this student on this date
	var existing models.Attendance
	result := h.db.Where("student_id = ? AND date = ?", req.StudentID, date).First(&existing)
	
	if result.Error == nil {
		// Update existing
		existing.Status = req.Status
		existing.Remarks = req.Remarks
		existing.MarkedBy = attendance.MarkedBy
		existing.MarkedAt = attendance.MarkedAt
		if err := h.db.Save(&existing).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, existing)
		return
	}

	// Create new
	if err := h.db.Create(&attendance).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.db.Preload("Student").First(&attendance, attendance.ID)
	
	// Send attendance alert if absent
	if attendance.Status == "absent" && attendance.Student != nil {
		go func(studentID uuid.UUID, studentName string) {
			var guardians []models.Guardian
			h.db.Where("student_id = ?", studentID).Find(&guardians)
			
			for _, guardian := range guardians {
				if guardian.Email != "" {
					// Get attendance stats
					var presentCount int64
					h.db.Model(&models.Attendance{}).Where("student_id = ? AND status = 'present'", studentID).Count(&presentCount)
					var totalDays int64
					h.db.Model(&models.Attendance{}).Where("student_id = ?", studentID).Count(&totalDays)
					
					if err := h.emailService.SendAttendanceAlert(guardian.Email, studentName, time.Now().Format("2006-01-02"), int(presentCount), int(totalDays)); err != nil {
						log.Printf("Failed to send attendance alert: %v", err)
					}
				}
			}
		}(attendance.StudentID, fmt.Sprintf("%s %s", attendance.Student.FirstName, attendance.Student.LastName))
	}
	
	c.JSON(http.StatusCreated, attendance)
}

// BulkMarkAttendance - Mark attendance for entire class
func (h *AttendanceHandler) BulkMarkAttendance(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")
	userRole := c.GetString("user_role")

	var req struct {
		ClassID     string                       `json:"class_id" binding:"required"`
		Date        string                       `json:"date" binding:"required"`
		Attendances []map[string]interface{}     `json:"attendances" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	classUUID := uuid.MustParse(req.ClassID)

	// Check if teacher is assigned to this class
	if userRole == "teacher" {
		var class models.Class
		if err := h.db.First(&class, classUUID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Class not found"})
			return
		}
		
		// Get teacher profile for this user
		var staff models.Staff
		if err := h.db.Where("user_id = ? AND school_id = ?", userID, schoolID).First(&staff).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to mark attendance for this class"})
			return
		}
		
		var teacherProfile models.TeacherProfile
		if err := h.db.Where("staff_id = ?", staff.ID).First(&teacherProfile).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to mark attendance for this class"})
			return
		}
		
		// Check if this teacher is the class teacher
		if class.TeacherProfileID == nil || *class.TeacherProfileID != teacherProfile.ID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not the class teacher for this class. Only the assigned class teacher can mark attendance."})
			return
		}
	}

	// Parse date
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	// Check if date is weekend or holiday
	if date.Weekday() == time.Saturday || date.Weekday() == time.Sunday {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot mark attendance on weekends"})
		return
	}

	var holiday models.SchoolCalendar
	if err := h.db.Where("school_id = ? AND date = ?", schoolID, date).First(&holiday).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot mark attendance on holidays: " + holiday.Name})
		return
	}

	// Check if attendance already exists for this class and date
	var existingCount int64
	h.db.Model(&models.Attendance{}).Where("class_id = ? AND date::date = ?::date", classUUID, date).Count(&existingCount)

	// If attendance exists and user is not school_admin, prevent editing
	if existingCount > 0 && userRole != "school_admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Attendance already marked for this date. Only school admin can edit."})
		return
	}

	// Get class to retrieve year and term
	var class models.Class
	if err := h.db.First(&class, classUUID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Class not found"})
		return
	}

	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, att := range req.Attendances {
		studentID := att["student_id"].(string)
		status := att["status"].(string)
		remarks := ""
		if att["remarks"] != nil {
			remarks = att["remarks"].(string)
		}
		if remarks == "" {
			remarks = getDefaultRemark(status)
		}

		var existing models.Attendance
		result := tx.Where("student_id = ? AND date = ?", studentID, date).First(&existing)

		if result.Error == nil {
			// Update
			existing.Status = status
			existing.Remarks = remarks
			existing.MarkedBy = uuid.MustParse(userID)
			existing.MarkedAt = time.Now()
			tx.Save(&existing)
		} else {
			// Create
			attendance := models.Attendance{
				StudentID: uuid.MustParse(studentID),
				SchoolID:  uuid.MustParse(schoolID),
				ClassID:   classUUID,
				Year:      class.Year,
				Term:      class.Term,
				Date:      date,
				Status:    status,
				Remarks:   remarks,
				MarkedBy:  uuid.MustParse(userID),
				MarkedAt:  time.Now(),
			}
			tx.Create(&attendance)
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Attendance marked successfully"})
}

// GetAttendance - Get attendance records
func (h *AttendanceHandler) GetAttendance(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	classID := c.Query("class_id")
	studentID := c.Query("student_id")
	date := c.Query("date")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))

	query := h.db.Where("attendances.school_id = ?", schoolID)

	if classID != "" {
		query = query.Where("attendances.class_id = ?", classID)
	}
	if studentID != "" {
		query = query.Where("attendances.student_id = ?", studentID)
	}
	if date != "" {
		query = query.Where("attendances.date::date = ?", date)
	}
	if startDate != "" && endDate != "" {
		query = query.Where("attendances.date BETWEEN ? AND ?", startDate, endDate)
	}

	var total int64
	query.Model(&models.Attendance{}).Count(&total)

	var attendances []models.Attendance
	if err := query.Preload("Student").Preload("Class").
		Order("date DESC, student_id").
		Limit(limit).Offset((page - 1) * limit).
		Find(&attendances).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"attendances": attendances,
		"total":       total,
		"page":        page,
		"limit":       limit,
	})
}

// GetAttendanceByDate - Get all students attendance for a specific date and class
func (h *AttendanceHandler) GetAttendanceByDate(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	classID := c.Query("class_id")
	dateStr := c.Query("date")

	if classID == "" || dateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_id and date are required"})
		return
	}

	// Parse date
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}

	// Get all students in the class
	var students []models.Student
	h.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
		Where("enrollments.class_id = ? AND enrollments.status = 'active' AND students.school_id = ? AND students.deleted_at IS NULL AND enrollments.deleted_at IS NULL", classID, schoolID).
		Find(&students)

	// Get attendance records for this date
	var attendances []models.Attendance
	h.db.Where("class_id = ? AND date::date = ?::date", classID, date).Find(&attendances)

	// Create map for quick lookup
	attMap := make(map[string]models.Attendance)
	for _, att := range attendances {
		attMap[att.StudentID.String()] = att
	}

	// Build response with all students
	type StudentAttendance struct {
		Student    models.Student     `json:"student"`
		Attendance *models.Attendance `json:"attendance"`
	}

	var result []StudentAttendance
	for _, student := range students {
		sa := StudentAttendance{Student: student}
		if att, exists := attMap[student.ID.String()]; exists {
			sa.Attendance = &att
		}
		result = append(result, sa)
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// GetAttendanceStats - Get attendance statistics
func (h *AttendanceHandler) GetAttendanceStats(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	classID := c.Query("class_id")
	studentID := c.Query("student_id")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	period := c.Query("period")

	// Calculate date range
	var start, end time.Time
	now := time.Now()
	
	if period == "today" {
		// For today, only count if attendance was marked
		start = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		end = now
	} else if startDate != "" && endDate != "" {
		start, _ = time.Parse("2006-01-02", startDate)
		end, _ = time.Parse("2006-01-02", endDate)
	} else {
		// Default to current month
		start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		end = now
	}

	// Get holidays in this period
	var holidays []models.SchoolCalendar
	h.db.Where("school_id = ? AND date BETWEEN ? AND ? AND day_type IN ('holiday', 'weekend')", schoolID, start, end).
		Find(&holidays)

	holidayMap := make(map[string]bool)
	for _, h := range holidays {
		holidayMap[h.Date.Format("2006-01-02")] = true
	}

	// Calculate total school days (excluding weekends and holidays)
	var totalSchoolDays int64
	for d := start; d.Before(end) || d.Equal(end); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		if !holidayMap[dateStr] && d.Weekday() != time.Saturday && d.Weekday() != time.Sunday {
			totalSchoolDays++
		}
	}

	query := h.db.Table("attendances").Where("school_id = ?", schoolID)

	if classID != "" {
		query = query.Where("class_id = ?", classID)
	}
	if studentID != "" {
		query = query.Where("student_id = ?", studentID)
	}
	query = query.Where("date BETWEEN ? AND ?", start, end)

	var stats struct {
		TotalDays   int64 `json:"total_days"`
		Present     int64 `json:"present"`
		Absent      int64 `json:"absent"`
		Late        int64 `json:"late"`
		Sick        int64 `json:"sick"`
		Excused     int64 `json:"excused"`
		Percentage  float64 `json:"percentage"`
	}

	stats.TotalDays = totalSchoolDays
	query.Where("status = 'present'").Count(&stats.Present)
	query.Where("status = 'late'").Count(&stats.Late)
	query.Where("status = 'sick'").Count(&stats.Sick)
	query.Where("status = 'excused'").Count(&stats.Excused)
	query.Where("status = 'absent'").Count(&stats.Absent)

	// For today, only show percentage if attendance was marked
	if period == "today" {
		markedToday := stats.Present + stats.Absent + stats.Late + stats.Sick + stats.Excused
		if markedToday > 0 {
			stats.Percentage = float64(stats.Present) / float64(markedToday) * 100
		} else {
			stats.Percentage = 0
		}
	} else {
		if stats.TotalDays > 0 {
			stats.Percentage = float64(stats.Present) / float64(stats.TotalDays) * 100
		}
	}

	c.JSON(http.StatusOK, stats)
}

// GetClassAttendanceSummary - Get attendance summary for entire class
func (h *AttendanceHandler) GetClassAttendanceSummary(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	classID := c.Query("class_id")
	period := c.Query("period")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if classID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_id is required"})
		return
	}

	// Calculate date range
	var start, end time.Time
	if startDate != "" && endDate != "" {
		start, _ = time.Parse("2006-01-02", startDate)
		end, _ = time.Parse("2006-01-02", endDate)
	} else {
		now := time.Now()
		switch period {
		case "week":
			start = now.AddDate(0, 0, -int(now.Weekday()))
			start = time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, start.Location())
			end = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, now.Location())
		case "last_week":
			start = now.AddDate(0, 0, -int(now.Weekday())-7)
			start = time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, start.Location())
			end = now.AddDate(0, 0, -int(now.Weekday())-1)
			end = time.Date(end.Year(), end.Month(), end.Day(), 23, 59, 59, 0, end.Location())
		case "month":
			start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
			end = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, now.Location())
		case "last_month":
			start = time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, now.Location())
			end = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, 0, -1)
			end = time.Date(end.Year(), end.Month(), end.Day(), 23, 59, 59, 0, end.Location())
		case "term":
			var termDates models.TermDates
			h.db.Where("school_id = ? AND start_date <= ? AND end_date >= ?", schoolID, now, now).First(&termDates)
			if termDates.ID != uuid.Nil {
				start = time.Date(termDates.StartDate.Year(), termDates.StartDate.Month(), termDates.StartDate.Day(), 0, 0, 0, 0, termDates.StartDate.Location())
				end = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, now.Location())
			} else {
				start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
				end = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, now.Location())
			}
		case "last_term":
			var termDates []models.TermDates
			h.db.Where("school_id = ? AND end_date < ?", schoolID, now).Order("end_date DESC").Limit(1).Find(&termDates)
			if len(termDates) > 0 {
				start = time.Date(termDates[0].StartDate.Year(), termDates[0].StartDate.Month(), termDates[0].StartDate.Day(), 0, 0, 0, 0, termDates[0].StartDate.Location())
				end = time.Date(termDates[0].EndDate.Year(), termDates[0].EndDate.Month(), termDates[0].EndDate.Day(), 23, 59, 59, 0, termDates[0].EndDate.Location())
			} else {
				start = time.Date(now.Year(), now.Month()-3, 1, 0, 0, 0, 0, now.Location())
				end = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, 0, -1)
				end = time.Date(end.Year(), end.Month(), end.Day(), 23, 59, 59, 0, end.Location())
			}
		case "year":
			start = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
			end = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, now.Location())
		case "last_year":
			start = time.Date(now.Year()-1, 1, 1, 0, 0, 0, 0, now.Location())
			end = time.Date(now.Year()-1, 12, 31, 23, 59, 59, 0, now.Location())
		default:
			start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
			end = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, now.Location())
		}
	}

	// Get holidays in this period
	var holidays []models.SchoolCalendar
	h.db.Where("school_id = ? AND date BETWEEN ? AND ? AND day_type IN ('holiday', 'weekend')", schoolID, start, end).
		Find(&holidays)

	holidayMap := make(map[string]bool)
	for _, h := range holidays {
		holidayMap[h.Date.Format("2006-01-02")] = true
	}

	// Calculate total school days (excluding weekends and holidays)
	var totalSchoolDays int64
	for d := start; d.Before(end) || d.Equal(end); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		if !holidayMap[dateStr] && d.Weekday() != time.Saturday && d.Weekday() != time.Sunday {
			totalSchoolDays++
		}
	}

	// Get all students in class
	var students []models.Student
	h.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
		Where("enrollments.class_id = ? AND enrollments.status = 'active' AND students.school_id = ? AND students.deleted_at IS NULL", classID, schoolID).
		Find(&students)

	type StudentSummary struct {
		StudentID   string  `json:"student_id"`
		StudentName string  `json:"student_name"`
		TotalDays   int64   `json:"total_days"`
		Present     int64   `json:"present"`
		Absent      int64   `json:"absent"`
		Late        int64   `json:"late"`
		Percentage  float64 `json:"percentage"`
	}

	var summary []StudentSummary
	for _, student := range students {
		var s StudentSummary
		s.StudentID = student.ID.String()
		s.StudentName = student.FirstName
		if student.MiddleName != "" {
			s.StudentName += " " + student.MiddleName
		}
		s.StudentName += " " + student.LastName
		s.TotalDays = totalSchoolDays

		// Count present days
		h.db.Table("attendances").
			Where("student_id = ? AND class_id = ? AND date BETWEEN ? AND ? AND status = 'present'", student.ID, classID, start, end).
			Count(&s.Present)
		
		// Count late days
		h.db.Table("attendances").
			Where("student_id = ? AND class_id = ? AND date BETWEEN ? AND ? AND status = 'late'", student.ID, classID, start, end).
			Count(&s.Late)
		
		// Count absent days
		h.db.Table("attendances").
			Where("student_id = ? AND class_id = ? AND date BETWEEN ? AND ? AND status = 'absent'", student.ID, classID, start, end).
			Count(&s.Absent)

		if s.TotalDays > 0 {
			s.Percentage = float64(s.Present) / float64(s.TotalDays) * 100
		}

		summary = append(summary, s)
	}

	c.JSON(http.StatusOK, gin.H{"summary": summary})
}

// DeleteAttendance - Delete attendance record
func (h *AttendanceHandler) DeleteAttendance(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.Attendance{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Attendance deleted successfully"})
}

// GetStudentAttendanceHistory - Get student attendance for week/month/term/year
func (h *AttendanceHandler) GetStudentAttendanceHistory(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	studentID := c.Param("student_id")
	period := c.Query("period") // week, month, term, year
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if studentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "student_id is required"})
		return
	}

	// Calculate date range based on period
	var start, end time.Time
	now := time.Now()

	if startDate != "" && endDate != "" {
		start, _ = time.Parse("2006-01-02", startDate)
		end, _ = time.Parse("2006-01-02", endDate)
	} else {
		switch period {
		case "week":
			// Get start of current week (Sunday)
			weekday := int(now.Weekday())
			start = now.AddDate(0, 0, -weekday)
			end = now
		case "last_week":
			// Get last week (Sunday to Saturday)
			weekday := int(now.Weekday())
			start = now.AddDate(0, 0, -weekday-7)
			end = now.AddDate(0, 0, -weekday-1)
		case "month":
			// Get start of current month
			start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
			end = now
		case "term":
			// Assume 3 months per term
			start = now.AddDate(0, -3, 0)
			end = now
		case "year":
			// Get start of current year
			start = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
			end = now
		default:
			start = now.AddDate(0, -1, 0)
			end = now
		}
	}

	// Get attendance records
	var attendances []models.Attendance
	h.db.Where("student_id = ? AND school_id = ? AND date BETWEEN ? AND ?", 
		studentID, schoolID, start, end).
		Order("date DESC").
		Find(&attendances)

	// Get holidays in this period
	var holidays []models.SchoolCalendar
	h.db.Where("school_id = ? AND date BETWEEN ? AND ? AND day_type IN ('holiday', 'weekend')",
		schoolID, start, end).
		Order("date").
		Find(&holidays)

	// Calculate stats excluding holidays/weekends
	holidayMap := make(map[string]bool)
	for _, h := range holidays {
		holidayMap[h.Date.Format("2006-01-02")] = true
	}

	var stats struct {
		TotalSchoolDays int64   `json:"total_school_days"`
		Present         int64   `json:"present"`
		Absent          int64   `json:"absent"`
		Late            int64   `json:"late"`
		Sick            int64   `json:"sick"`
		Excused         int64   `json:"excused"`
		Percentage      float64 `json:"percentage"`
	}

	// Count school days (excluding weekends and holidays)
	for d := start; d.Before(end) || d.Equal(end); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		if !holidayMap[dateStr] && d.Weekday() != time.Saturday && d.Weekday() != time.Sunday {
			stats.TotalSchoolDays++
		}
	}

	for _, att := range attendances {
		switch att.Status {
		case "present":
			stats.Present++
		case "late":
			stats.Late++
		case "sick":
			stats.Sick++
		case "excused":
			stats.Excused++
		}
	}

	// Count absent days from actual records
	for _, att := range attendances {
		if att.Status == "absent" {
			stats.Absent++
		}
	}

	if stats.TotalSchoolDays > 0 {
		stats.Percentage = float64(stats.Present) / float64(stats.TotalSchoolDays) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"attendances": attendances,
		"stats":       stats,
		"holidays":    holidays,
		"period":      period,
		"start_date":  start.Format("2006-01-02"),
		"end_date":    end.Format("2006-01-02"),
	})
}

// AddHoliday - Add holiday or non-school day
func (h *AttendanceHandler) AddHoliday(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	var req struct {
		Date        string `json:"date" binding:"required"`
		DayType     string `json:"day_type" binding:"required"` // holiday, weekend
		Name        string `json:"name"`
		Description string `json:"description"`
		Year        int    `json:"year" binding:"required"`
		Term        string `json:"term"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	calendar := models.SchoolCalendar{
		SchoolID:    uuid.MustParse(schoolID),
		Date:        date,
		DayType:     req.DayType,
		Name:        req.Name,
		Description: req.Description,
		Year:        req.Year,
		Term:        req.Term,
	}

	if err := h.db.Create(&calendar).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, calendar)
}

// GetHolidays - Get holidays for a period
func (h *AttendanceHandler) GetHolidays(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	year := c.Query("year")
	term := c.Query("term")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	query := h.db.Where("school_id = ?", schoolID)

	if year != "" {
		query = query.Where("year = ?", year)
	}
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if startDate != "" && endDate != "" {
		query = query.Where("date BETWEEN ? AND ?", startDate, endDate)
	}

	var holidays []models.SchoolCalendar
	if err := query.Order("date").Find(&holidays).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"holidays": holidays})
}

// DeleteHoliday - Delete holiday
func (h *AttendanceHandler) DeleteHoliday(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.SchoolCalendar{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Holiday deleted successfully"})
}

// GetAttendanceReport - Comprehensive attendance report
func (h *AttendanceHandler) GetAttendanceReport(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	classID := c.Query("class_id")
	period := c.Query("period") // today, this_week, last_week, this_month, last_month, this_term, this_year, custom
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if classID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_id is required"})
		return
	}

	var start, end time.Time
	now := time.Now()

	if period == "custom" && startDate != "" && endDate != "" {
		start, _ = time.Parse("2006-01-02", startDate)
		end, _ = time.Parse("2006-01-02", endDate)
	} else {
		switch period {
		case "today":
			start = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
			end = now
		case "this_week":
			weekday := int(now.Weekday())
			start = now.AddDate(0, 0, -weekday)
			end = now
		case "last_week":
			weekday := int(now.Weekday())
			start = now.AddDate(0, 0, -weekday-7)
			end = now.AddDate(0, 0, -weekday-1)
		case "this_month":
			start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
			end = now
		case "last_month":
			start = time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, now.Location())
			end = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, 0, -1)
		case "this_term":
			start = now.AddDate(0, -3, 0)
			end = now
		case "this_year":
			start = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
			end = now
		default:
			start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
			end = now
		}
	}

	var students []models.Student
	h.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
		Where("enrollments.class_id = ? AND enrollments.status = 'active' AND students.school_id = ? AND students.deleted_at IS NULL", classID, schoolID).
		Order("students.first_name, students.last_name").
		Find(&students)

	var holidays []models.SchoolCalendar
	h.db.Where("school_id = ? AND date BETWEEN ? AND ? AND day_type IN ('holiday', 'weekend')", schoolID, start, end).
		Find(&holidays)

	holidayMap := make(map[string]bool)
	for _, h := range holidays {
		holidayMap[h.Date.Format("2006-01-02")] = true
	}

	var totalSchoolDays int64
	for d := start; d.Before(end) || d.Equal(end); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		if !holidayMap[dateStr] && d.Weekday() != time.Saturday && d.Weekday() != time.Sunday {
			totalSchoolDays++
		}
	}

	type StudentReport struct {
		StudentID      string  `json:"student_id"`
		FullName       string  `json:"full_name"`
		DaysAttended   int64   `json:"days_attended"`
		DaysAbsent     int64   `json:"days_absent"`
		Percentage     float64 `json:"percentage"`
	}

	var report []StudentReport
	for _, student := range students {
		fullName := student.FirstName
		if student.MiddleName != "" {
			fullName += " " + student.MiddleName
		}
		fullName += " " + student.LastName

		var present, absent int64
		h.db.Model(&models.Attendance{}).
			Where("student_id = ? AND class_id = ? AND date BETWEEN ? AND ? AND status = 'present'", student.ID, classID, start, end).
			Count(&present)
		
		// Count absent days from actual records
		h.db.Model(&models.Attendance{}).
			Where("student_id = ? AND class_id = ? AND date BETWEEN ? AND ? AND status = 'absent'", student.ID, classID, start, end).
			Count(&absent)

		percentage := 0.0
		if totalSchoolDays > 0 {
			percentage = float64(present) / float64(totalSchoolDays) * 100
		}

		report = append(report, StudentReport{
			StudentID:    student.ID.String(),
			FullName:     fullName,
			DaysAttended: present,
			DaysAbsent:   absent,
			Percentage:   percentage,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"report":            report,
		"total_school_days": totalSchoolDays,
		"period":            period,
		"start_date":        start.Format("2006-01-02"),
		"end_date":          end.Format("2006-01-02"),
	})
}
