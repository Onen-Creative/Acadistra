package services

import (
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type ParentService struct {
	repo repositories.ParentRepository
	db   *gorm.DB
}

func NewParentService(repo repositories.ParentRepository, db *gorm.DB) *ParentService {
	return &ParentService{
		repo: repo,
		db:   db,
	}
}

func (s *ParentService) buildPhoneVariants(phone string) []string {
	variants := []string{phone}
	if strings.HasPrefix(phone, "+256") {
		variants = append(variants, "0"+phone[4:])
	} else if strings.HasPrefix(phone, "0") {
		variants = append(variants, "+256"+phone[1:])
	}
	return variants
}

func (s *ParentService) GetDashboardSummary(guardianPhone, schoolID, term, year string) ([]models.Student, gin.H, error) {
	phoneVariants := s.buildPhoneVariants(guardianPhone)

	var guardians []models.Guardian
	if err := s.db.Where("(phone IN ? OR alternative_phone IN ?) AND school_id = ?", phoneVariants, phoneVariants, schoolID).Find(&guardians).Error; err != nil {
		return nil, nil, err
	}

	if len(guardians) == 0 {
		return []models.Student{}, gin.H{}, nil
	}

	studentIDs := make([]uuid.UUID, len(guardians))
	for i, g := range guardians {
		studentIDs[i] = g.StudentID
	}

	var students []models.Student
	if err := s.db.Where("id IN ? AND school_id = ?", studentIDs, schoolID).Find(&students).Error; err != nil {
		return nil, nil, err
	}

	totalFees := 0.0
	totalOutstanding := 0.0

	for i := range students {
		var enrollment models.Enrollment
		if err := s.db.Preload("Class").Where("student_id = ? AND status = 'active'", students[i].ID).First(&enrollment).Error; err == nil {
			if enrollment.Class != nil {
				students[i].ClassName = enrollment.Class.Name
			}
		}

		var fees models.StudentFees
		if err := s.db.Where("student_id = ? AND term = ? AND year = ?", students[i].ID, term, year).First(&fees).Error; err == nil {
			totalFees += fees.TotalFees
			totalOutstanding += fees.Outstanding
		}
	}

	summary := gin.H{
		"total_children":    len(students),
		"total_fees":        totalFees,
		"total_outstanding": totalOutstanding,
		"total_paid":        totalFees - totalOutstanding,
	}

	return students, summary, nil
}

func (s *ParentService) VerifyAccess(guardianPhone, studentID, schoolID string) error {
	phoneVariants := s.buildPhoneVariants(guardianPhone)

	var guardian models.Guardian
	if err := s.db.Where("student_id = ? AND (phone IN ? OR alternative_phone IN ?) AND school_id = ?", studentID, phoneVariants, phoneVariants, schoolID).First(&guardian).Error; err != nil {
		return err
	}
	return nil
}

func (s *ParentService) GetChildDetails(guardianPhone, studentID, schoolID, term, year string) (gin.H, error) {
	if err := s.VerifyAccess(guardianPhone, studentID, schoolID); err != nil {
		return nil, err
	}

	var student models.Student
	if err := s.db.Preload("Guardians").Where("id = ? AND school_id = ?", studentID, schoolID).First(&student).Error; err != nil {
		return nil, err
	}

	var enrollment models.Enrollment
	if err := s.db.Preload("Class").Where("student_id = ? AND status = 'active'", student.ID).First(&enrollment).Error; err == nil {
		if enrollment.Class != nil {
			student.ClassName = enrollment.Class.Name
		}
	}

	var fees models.StudentFees
	s.db.Where("student_id = ? AND term = ? AND year = ?", studentID, term, year).First(&fees)

	var results []models.SubjectResult
	s.db.Preload("StandardSubject").Where("student_id = ? AND term = ? AND year = ?", studentID, term, year).Find(&results)

	var attendance []models.Attendance
	s.db.Where("student_id = ? AND term = ? AND year = ?", studentID, term, year).Find(&attendance)

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
	s.db.Where("student_id = ?", studentID).First(&health)

	return gin.H{
		"student": student,
		"fees":    fees,
		"results": results,
		"attendance": gin.H{
			"total":           len(attendance),
			"present":         presentCount,
			"absent":          absentCount,
			"attendance_rate": attendanceRate,
			"recent_records":  attendance,
		},
		"health": health,
	}, nil
}

func (s *ParentService) GetChildAttendance(guardianPhone, studentID, schoolID, term, year string) ([]models.Attendance, gin.H, error) {
	if err := s.VerifyAccess(guardianPhone, studentID, schoolID); err != nil {
		return nil, nil, err
	}

	now := time.Now()
	startOfWeek := now.AddDate(0, 0, -int(now.Weekday()))
	startOfLastWeek := startOfWeek.AddDate(0, 0, -7)
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	startOfLastMonth := startOfMonth.AddDate(0, -1, 0)

	countSchoolDays := func(startDate, endDate time.Time) int {
		var holidays []models.SchoolCalendar
		s.db.Where("school_id = ? AND date >= ? AND date <= ?", schoolID, startDate, endDate).Find(&holidays)
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
	s.db.Where("student_id = ? AND school_id = ?", studentID, schoolID).Order("date DESC").Find(&allAttendance)

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

	periods := gin.H{
		"this_week":  calcStats(thisWeek, startOfWeek, now),
		"last_week":  calcStats(lastWeek, startOfLastWeek, startOfWeek.AddDate(0, 0, -1)),
		"this_month": calcStats(thisMonth, startOfMonth, now),
		"last_month": calcStats(lastMonth, startOfLastMonth, startOfMonth.AddDate(0, 0, -1)),
		"this_term":  calcStats(thisTerm, startOfMonth, now),
		"last_term":  calcStats(lastTerm, startOfLastMonth, startOfMonth.AddDate(0, 0, -1)),
		"this_year":  calcStats(thisYear, time.Date(yearInt, 1, 1, 0, 0, 0, 0, now.Location()), now),
	}

	return thisTerm, periods, nil
}

func (s *ParentService) GetChildResults(guardianPhone, studentID, schoolID, term, year string) ([]models.SubjectResult, error) {
	if err := s.VerifyAccess(guardianPhone, studentID, schoolID); err != nil {
		return nil, err
	}

	var results []models.SubjectResult
	if err := s.db.Preload("StandardSubject").Where("student_id = ? AND term = ? AND year = ? AND school_id = ?", studentID, term, year, schoolID).Find(&results).Error; err != nil {
		return nil, err
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

	return results, nil
}

func (s *ParentService) GetChildFees(guardianPhone, studentID, schoolID, term, year string) (*models.StudentFees, []models.FeesPayment, error) {
	if err := s.VerifyAccess(guardianPhone, studentID, schoolID); err != nil {
		return nil, nil, err
	}

	var fees models.StudentFees
	if err := s.db.Where("student_id = ? AND term = ? AND year = ? AND school_id = ?", studentID, term, year, schoolID).First(&fees).Error; err != nil {
		return nil, nil, err
	}

	var payments []models.FeesPayment
	s.db.Where("student_fees_id = ?", fees.ID).Order("payment_date DESC").Find(&payments)

	return &fees, payments, nil
}

func (s *ParentService) GetChildHealth(guardianPhone, studentID, schoolID string) (*models.StudentHealthProfile, []models.ClinicVisit, error) {
	if err := s.VerifyAccess(guardianPhone, studentID, schoolID); err != nil {
		return nil, nil, err
	}

	var health models.StudentHealthProfile
	s.db.Where("student_id = ? AND school_id = ?", studentID, schoolID).First(&health)

	var visits []models.ClinicVisit
	s.db.Where("student_id = ? AND school_id = ?", studentID, schoolID).Order("visit_date DESC").Limit(10).Find(&visits)

	return &health, visits, nil
}

func (s *ParentService) GetChildReportCard(guardianPhone, studentID, term, year string) (*models.ReportCard, error) {
	if err := s.VerifyAccess(guardianPhone, studentID, ""); err != nil {
		return nil, err
	}

	var reportCard models.ReportCard
	if err := s.db.Where("student_id = ? AND term = ? AND year = ? AND status = 'completed'", studentID, term, year).First(&reportCard).Error; err != nil {
		return nil, err
	}

	return &reportCard, nil
}

func (s *ParentService) GetChildTimetable(guardianPhone, studentID, schoolID string) (*models.Class, error) {
	if err := s.VerifyAccess(guardianPhone, studentID, schoolID); err != nil {
		return nil, err
	}

	var enrollment models.Enrollment
	if err := s.db.Preload("Class").Where("student_id = ? AND status = 'active'", studentID).First(&enrollment).Error; err != nil {
		return nil, err
	}

	return enrollment.Class, nil
}

// Legacy methods for backward compatibility
func (s *ParentService) GetChildren(guardianEmail string) ([]models.Student, error) {
	return s.repo.GetChildren(guardianEmail)
}

func (s *ParentService) VerifyParentAccess(guardianEmail, studentID string) (bool, error) {
	studentUUID, _ := uuid.Parse(studentID)
	return s.repo.VerifyAccess(guardianEmail, studentUUID)
}
