package services

import (
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type AttendanceService struct {
	repo         repositories.AttendanceRepository
	db           *gorm.DB
	emailService *EmailService
}

func NewAttendanceService(repo repositories.AttendanceRepository, db *gorm.DB, emailService *EmailService) *AttendanceService {
	return &AttendanceService{repo: repo, db: db, emailService: emailService}
}

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

// MarkSingle marks or updates attendance for a single student.
func (s *AttendanceService) MarkSingle(schoolID, userID string, req MarkAttendanceRequest) (*models.Attendance, bool, error) {
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return nil, false, errors.New("invalid date format")
	}

	var class models.Class
	if err := s.db.First(&class, req.ClassID).Error; err != nil {
		return nil, false, errors.New("class not found")
	}

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

	existing, _ := s.repo.FindExisting(req.StudentID, date)
	if existing != nil {
		existing.Status = req.Status
		existing.Remarks = req.Remarks
		existing.MarkedBy = attendance.MarkedBy
		existing.MarkedAt = attendance.MarkedAt
		if err := s.db.Save(existing).Error; err != nil {
			return nil, true, err
		}
		return existing, true, nil
	}

	if err := s.db.Create(&attendance).Error; err != nil {
		return nil, false, err
	}

	s.db.Preload("Student").First(&attendance, attendance.ID)

	if attendance.Status == "absent" && attendance.Student != nil {
		go s.sendAbsenceAlert(attendance.StudentID, fmt.Sprintf("%s %s", attendance.Student.FirstName, attendance.Student.LastName))
	}

	return &attendance, false, nil
}

// BulkMark marks attendance for an entire class with role-based authorization.
func (s *AttendanceService) BulkMark(schoolID, userID, userRole string, req BulkMarkRequest) error {
	classUUID := uuid.MustParse(req.ClassID)

	if userRole == "teacher" {
		if err := s.validateTeacherForClass(userID, schoolID, classUUID); err != nil {
			return err
		}
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return errors.New("invalid date format")
	}

	if date.Weekday() == time.Saturday || date.Weekday() == time.Sunday {
		return errors.New("cannot mark attendance on weekends")
	}

	var holiday models.SchoolCalendar
	if err := s.db.Where("school_id = ? AND date = ?", schoolID, date).First(&holiday).Error; err == nil {
		return fmt.Errorf("cannot mark attendance on holidays: %s", holiday.Name)
	}

	existingCount, _ := s.repo.CountByClassAndDate(classUUID, date)
	if existingCount > 0 && userRole != "school_admin" {
		return errors.New("attendance already marked for this date. Only school admin can edit")
	}

	var class models.Class
	if err := s.db.First(&class, classUUID).Error; err != nil {
		return errors.New("class not found")
	}

	tx := s.db.Begin()
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
		if tx.Where("student_id = ? AND date = ?", studentID, date).First(&existing).Error == nil {
			existing.Status = status
			existing.Remarks = remarks
			existing.MarkedBy = uuid.MustParse(userID)
			existing.MarkedAt = time.Now()
			tx.Save(&existing)
		} else {
			tx.Create(&models.Attendance{
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
			})
		}
	}

	return tx.Commit().Error
}

// GetAttendance returns paginated attendance records with filters.
func (s *AttendanceService) GetAttendance(schoolID, classID, studentID, date, startDate, endDate string, page, limit int) ([]models.Attendance, int64, error) {
	return s.repo.FindBySchoolAndFilters(schoolID, classID, studentID, date, startDate, endDate, page, limit)
}

// GetAttendanceByDate returns all students with their attendance for a specific date.
func (s *AttendanceService) GetAttendanceByDate(schoolID, classID, dateStr string) ([]StudentAttendanceResult, error) {
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, errors.New("invalid date format. Use YYYY-MM-DD")
	}

	students, err := s.repo.FindStudentsInClass(classID, schoolID)
	if err != nil {
		return nil, err
	}

	attendances, err := s.repo.FindByClass(uuid.MustParse(classID), date)
	if err != nil {
		return nil, err
	}

	attMap := make(map[string]models.Attendance)
	for _, att := range attendances {
		attMap[att.StudentID.String()] = att
	}

	result := make([]StudentAttendanceResult, len(students))
	for i, student := range students {
		r := StudentAttendanceResult{Student: student}
		if att, exists := attMap[student.ID.String()]; exists {
			r.Attendance = &att
		}
		result[i] = r
	}
	return result, nil
}

// GetStats returns attendance statistics for a school/class/student.
func (s *AttendanceService) GetStats(schoolID, classID, studentID, startDate, endDate, period string) (*AttendanceStats, error) {
	start, end := resolveDateRange(period, startDate, endDate, schoolID, s.db)

	holidays, _ := s.repo.FindHolidays(uuid.MustParse(schoolID), start, end)
	holidayMap := buildHolidayMap(holidays)
	totalSchoolDays := countSchoolDays(start, end, holidayMap)

	query := s.db.Table("attendances").Where("school_id = ?", schoolID)
	if classID != "" {
		query = query.Where("class_id = ?", classID)
	}
	if studentID != "" {
		query = query.Where("student_id = ?", studentID)
	}
	query = query.Where("date BETWEEN ? AND ?", start, end)

	stats := &AttendanceStats{TotalDays: totalSchoolDays}
	query.Where("status = 'present'").Count(&stats.Present)
	query.Where("status = 'late'").Count(&stats.Late)
	query.Where("status = 'sick'").Count(&stats.Sick)
	query.Where("status = 'excused'").Count(&stats.Excused)
	query.Where("status = 'absent'").Count(&stats.Absent)

	marked := stats.Present + stats.Absent + stats.Late + stats.Sick + stats.Excused
	if period == "today" {
		if marked > 0 {
			stats.Percentage = float64(stats.Present) / float64(marked) * 100
		}
	} else if totalSchoolDays > 0 {
		stats.Percentage = float64(stats.Present) / float64(totalSchoolDays) * 100
	}

	return stats, nil
}

// GetClassSummary returns per-student attendance summary for a class.
func (s *AttendanceService) GetClassSummary(schoolID, classID, period, startDate, endDate string) ([]StudentSummary, error) {
	start, end := resolveDateRange(period, startDate, endDate, schoolID, s.db)

	holidays, _ := s.repo.FindHolidays(uuid.MustParse(schoolID), start, end)
	holidayMap := buildHolidayMap(holidays)
	totalSchoolDays := countSchoolDays(start, end, holidayMap)

	students, err := s.repo.FindStudentsInClass(classID, schoolID)
	if err != nil {
		return nil, err
	}

	summary := make([]StudentSummary, 0, len(students))
	for _, student := range students {
		name := student.FirstName
		if student.MiddleName != "" {
			name += " " + student.MiddleName
		}
		name += " " + student.LastName

		var present, late, absent int64
		s.repo.CountStudentByStatus(student.ID, classID, "present", start, end)
		s.db.Table("attendances").Where("student_id = ? AND class_id = ? AND date BETWEEN ? AND ? AND status = 'present'", student.ID, classID, start, end).Count(&present)
		s.db.Table("attendances").Where("student_id = ? AND class_id = ? AND date BETWEEN ? AND ? AND status = 'late'", student.ID, classID, start, end).Count(&late)
		s.db.Table("attendances").Where("student_id = ? AND class_id = ? AND date BETWEEN ? AND ? AND status = 'absent'", student.ID, classID, start, end).Count(&absent)

		pct := 0.0
		if totalSchoolDays > 0 {
			pct = float64(present) / float64(totalSchoolDays) * 100
		}

		summary = append(summary, StudentSummary{
			StudentID:   student.ID.String(),
			StudentName: name,
			TotalDays:   totalSchoolDays,
			Present:     present,
			Absent:      absent,
			Late:        late,
			Percentage:  pct,
		})
	}
	return summary, nil
}

// GetStudentHistory returns attendance history and stats for a student.
func (s *AttendanceService) GetStudentHistory(schoolID, studentID, period, startDate, endDate string) (*StudentHistoryResult, error) {
	start, end := resolveStudentDateRange(period, startDate, endDate)

	attendances, err := s.repo.FindByStudentAndSchool(studentID, schoolID, start, end)
	if err != nil {
		return nil, err
	}

	holidays, _ := s.repo.FindHolidays(uuid.MustParse(schoolID), start, end)
	holidayMap := buildHolidayMap(holidays)

	stats := StudentHistoryStats{}
	stats.TotalSchoolDays = countSchoolDays(start, end, holidayMap)

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
		case "absent":
			stats.Absent++
		}
	}

	if stats.TotalSchoolDays > 0 {
		stats.Percentage = float64(stats.Present) / float64(stats.TotalSchoolDays) * 100
	}

	return &StudentHistoryResult{
		Attendances: attendances,
		Stats:       stats,
		Holidays:    holidays,
		Period:      period,
		StartDate:   start.Format("2006-01-02"),
		EndDate:     end.Format("2006-01-02"),
	}, nil
}

// GetReport returns a comprehensive attendance report for a class.
func (s *AttendanceService) GetReport(schoolID, classID, period, startDate, endDate string) (*AttendanceReport, error) {
	start, end := resolveReportDateRange(period, startDate, endDate)

	var students []models.Student
	s.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
		Where("enrollments.class_id = ? AND enrollments.status = 'active' AND students.school_id = ? AND students.deleted_at IS NULL", classID, schoolID).
		Order("students.first_name, students.last_name").
		Find(&students)

	holidays, _ := s.repo.FindHolidays(uuid.MustParse(schoolID), start, end)
	holidayMap := buildHolidayMap(holidays)
	totalSchoolDays := countSchoolDays(start, end, holidayMap)

	report := make([]StudentReport, 0, len(students))
	for _, student := range students {
		fullName := student.FirstName
		if student.MiddleName != "" {
			fullName += " " + student.MiddleName
		}
		fullName += " " + student.LastName

		var present, absent int64
		s.db.Model(&models.Attendance{}).Where("student_id = ? AND class_id = ? AND date BETWEEN ? AND ? AND status = 'present'", student.ID, classID, start, end).Count(&present)
		s.db.Model(&models.Attendance{}).Where("student_id = ? AND class_id = ? AND date BETWEEN ? AND ? AND status = 'absent'", student.ID, classID, start, end).Count(&absent)

		pct := 0.0
		if totalSchoolDays > 0 {
			pct = float64(present) / float64(totalSchoolDays) * 100
		}

		report = append(report, StudentReport{
			StudentID:    student.ID.String(),
			FullName:     fullName,
			DaysAttended: present,
			DaysAbsent:   absent,
			Percentage:   pct,
		})
	}

	return &AttendanceReport{
		Report:          report,
		TotalSchoolDays: totalSchoolDays,
		Period:          period,
		StartDate:       start.Format("2006-01-02"),
		EndDate:         end.Format("2006-01-02"),
	}, nil
}

func (s *AttendanceService) AddHoliday(schoolID string, req HolidayRequest) (*models.SchoolCalendar, error) {
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return nil, errors.New("invalid date format")
	}
	calendar := &models.SchoolCalendar{
		SchoolID:    uuid.MustParse(schoolID),
		Date:        date,
		DayType:     req.DayType,
		Name:        req.Name,
		Description: req.Description,
		Year:        req.Year,
		Term:        req.Term,
	}
	if err := s.repo.CreateHoliday(calendar); err != nil {
		return nil, err
	}
	return calendar, nil
}

func (s *AttendanceService) GetHolidays(schoolID, year, term, startDate, endDate string) ([]models.SchoolCalendar, error) {
	return s.repo.FindHolidaysByFilter(schoolID, year, term, startDate, endDate)
}

func (s *AttendanceService) DeleteHoliday(id, schoolID string) error {
	return s.repo.DeleteHoliday(id, schoolID)
}

func (s *AttendanceService) DeleteAttendance(id, schoolID string) error {
	return s.repo.DeleteBySchoolAndID(id, schoolID)
}

// --- internal helpers ---

func (s *AttendanceService) validateTeacherForClass(userID, schoolID string, classID uuid.UUID) error {
	var class models.Class
	if err := s.db.First(&class, classID).Error; err != nil {
		return errors.New("class not found")
	}
	var staff models.Staff
	if err := s.db.Where("user_id = ? AND school_id = ?", userID, schoolID).First(&staff).Error; err != nil {
		return errors.New("you are not authorized to mark attendance for this class")
	}
	var tp models.TeacherProfile
	if err := s.db.Where("staff_id = ?", staff.ID).First(&tp).Error; err != nil {
		return errors.New("you are not authorized to mark attendance for this class")
	}
	if class.TeacherProfileID == nil || *class.TeacherProfileID != tp.ID {
		return errors.New("you are not the class teacher for this class. Only the assigned class teacher can mark attendance")
	}
	return nil
}

func (s *AttendanceService) sendAbsenceAlert(studentID uuid.UUID, studentName string) {
	var guardians []models.Guardian
	s.db.Where("student_id = ?", studentID).Find(&guardians)
	for _, guardian := range guardians {
		if guardian.Email != "" {
			var present, total int64
			s.db.Model(&models.Attendance{}).Where("student_id = ? AND status = 'present'", studentID).Count(&present)
			s.db.Model(&models.Attendance{}).Where("student_id = ?", studentID).Count(&total)
			if err := s.emailService.SendAttendanceAlert(guardian.Email, studentName, time.Now().Format("2006-01-02"), int(present), int(total)); err != nil {
				log.Printf("Failed to send attendance alert: %v", err)
			}
		}
	}
}

func buildHolidayMap(holidays []models.SchoolCalendar) map[string]bool {
	m := make(map[string]bool)
	for _, h := range holidays {
		m[h.Date.Format("2006-01-02")] = true
	}
	return m
}

func countSchoolDays(start, end time.Time, holidayMap map[string]bool) int64 {
	var count int64
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		if !holidayMap[d.Format("2006-01-02")] && d.Weekday() != time.Saturday && d.Weekday() != time.Sunday {
			count++
		}
	}
	return count
}

func resolveDateRange(period, startDate, endDate, schoolID string, db *gorm.DB) (time.Time, time.Time) {
	if startDate != "" && endDate != "" {
		s, _ := time.Parse("2006-01-02", startDate)
		e, _ := time.Parse("2006-01-02", endDate)
		return s, e
	}
	now := time.Now()
	switch period {
	case "today":
		s := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		return s, now
	case "term":
		var td models.TermDates
		if db.Where("school_id = ? AND start_date <= ? AND end_date >= ?", schoolID, now, now).First(&td).Error == nil {
			return td.StartDate, now
		}
	case "last_term":
		var tds []models.TermDates
		if db.Where("school_id = ? AND end_date < ?", schoolID, now).Order("end_date DESC").Limit(1).Find(&tds).Error == nil && len(tds) > 0 {
			return tds[0].StartDate, tds[0].EndDate
		}
	}
	return resolveCommonPeriod(period, now)
}

func resolveStudentDateRange(period, startDate, endDate string) (time.Time, time.Time) {
	if startDate != "" && endDate != "" {
		s, _ := time.Parse("2006-01-02", startDate)
		e, _ := time.Parse("2006-01-02", endDate)
		return s, e
	}
	now := time.Now()
	switch period {
	case "week":
		return now.AddDate(0, 0, -int(now.Weekday())), now
	case "last_week":
		return now.AddDate(0, 0, -int(now.Weekday())-7), now.AddDate(0, 0, -int(now.Weekday())-1)
	case "month":
		return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()), now
	case "term":
		return now.AddDate(0, -3, 0), now
	case "year":
		return time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location()), now
	default:
		return now.AddDate(0, -1, 0), now
	}
}

func resolveReportDateRange(period, startDate, endDate string) (time.Time, time.Time) {
	if period == "custom" && startDate != "" && endDate != "" {
		s, _ := time.Parse("2006-01-02", startDate)
		e, _ := time.Parse("2006-01-02", endDate)
		return s, e
	}
	now := time.Now()
	return resolveCommonPeriod(period, now)
}

func resolveCommonPeriod(period string, now time.Time) (time.Time, time.Time) {
	switch period {
	case "week", "this_week":
		return now.AddDate(0, 0, -int(now.Weekday())), now
	case "last_week":
		return now.AddDate(0, 0, -int(now.Weekday())-7), now.AddDate(0, 0, -int(now.Weekday())-1)
	case "month", "this_month":
		return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()), now
	case "last_month":
		s := time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, now.Location())
		e := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, 0, -1)
		return s, e
	case "this_term":
		return now.AddDate(0, -3, 0), now
	case "year", "this_year":
		return time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location()), now
	case "last_year":
		return time.Date(now.Year()-1, 1, 1, 0, 0, 0, 0, now.Location()),
			time.Date(now.Year()-1, 12, 31, 23, 59, 59, 0, now.Location())
	default:
		return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()), now
	}
}

// --- Request/Response types ---

type MarkAttendanceRequest struct {
	StudentID uuid.UUID `json:"student_id" binding:"required"`
	ClassID   uuid.UUID `json:"class_id" binding:"required"`
	Date      string    `json:"date" binding:"required"`
	Status    string    `json:"status" binding:"required"`
	Remarks   string    `json:"remarks"`
}

type BulkMarkRequest struct {
	ClassID     string                   `json:"class_id" binding:"required"`
	Date        string                   `json:"date" binding:"required"`
	Attendances []map[string]interface{} `json:"attendances" binding:"required"`
}

type HolidayRequest struct {
	Date        string `json:"date" binding:"required"`
	DayType     string `json:"day_type" binding:"required"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Year        int    `json:"year" binding:"required"`
	Term        string `json:"term"`
}

type StudentAttendanceResult struct {
	Student    models.Student     `json:"student"`
	Attendance *models.Attendance `json:"attendance"`
}

type AttendanceStats struct {
	TotalDays  int64   `json:"total_days"`
	Present    int64   `json:"present"`
	Absent     int64   `json:"absent"`
	Late       int64   `json:"late"`
	Sick       int64   `json:"sick"`
	Excused    int64   `json:"excused"`
	Percentage float64 `json:"percentage"`
}

type StudentSummary struct {
	StudentID   string  `json:"student_id"`
	StudentName string  `json:"student_name"`
	TotalDays   int64   `json:"total_days"`
	Present     int64   `json:"present"`
	Absent      int64   `json:"absent"`
	Late        int64   `json:"late"`
	Percentage  float64 `json:"percentage"`
}

type StudentHistoryStats struct {
	TotalSchoolDays int64   `json:"total_school_days"`
	Present         int64   `json:"present"`
	Absent          int64   `json:"absent"`
	Late            int64   `json:"late"`
	Sick            int64   `json:"sick"`
	Excused         int64   `json:"excused"`
	Percentage      float64 `json:"percentage"`
}

type StudentHistoryResult struct {
	Attendances []models.Attendance      `json:"attendances"`
	Stats       StudentHistoryStats      `json:"stats"`
	Holidays    []models.SchoolCalendar  `json:"holidays"`
	Period      string                   `json:"period"`
	StartDate   string                   `json:"start_date"`
	EndDate     string                   `json:"end_date"`
}

type StudentReport struct {
	StudentID    string  `json:"student_id"`
	FullName     string  `json:"full_name"`
	DaysAttended int64   `json:"days_attended"`
	DaysAbsent   int64   `json:"days_absent"`
	Percentage   float64 `json:"percentage"`
}

type AttendanceReport struct {
	Report          []StudentReport `json:"report"`
	TotalSchoolDays int64           `json:"total_school_days"`
	Period          string          `json:"period"`
	StartDate       string          `json:"start_date"`
	EndDate         string          `json:"end_date"`
}

// Keep original simple methods for backward compatibility
func (s *AttendanceService) Create(attendance *models.Attendance) error {
	return s.repo.Create(attendance)
}

func (s *AttendanceService) FindByStudent(studentID uuid.UUID, startDate, endDate time.Time) ([]models.Attendance, error) {
	return s.repo.FindByStudent(studentID, startDate, endDate)
}

func (s *AttendanceService) FindByClass(classID uuid.UUID, date time.Time) ([]models.Attendance, error) {
	return s.repo.FindByClass(classID, date)
}

func (s *AttendanceService) FindExisting(studentID uuid.UUID, date time.Time) (*models.Attendance, error) {
	return s.repo.FindExisting(studentID, date)
}

func (s *AttendanceService) BulkCreate(attendance []models.Attendance) error {
	return s.repo.BulkCreate(attendance)
}
