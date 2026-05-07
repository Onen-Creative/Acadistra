package repositories

import (
	"time"

	"gorm.io/gorm"
)

type ReportsRepository interface {
	GetStudentsReportData(schoolID, classID, year, term string) ([]StudentReportData, error)
	GetStaffReportData(schoolID, role string) ([]StaffReportData, error)
	GetAttendanceReportData(schoolID, startDate, endDate, classID string) ([]AttendanceReportData, error)
	GetPerformanceReportData(schoolID, year, term, classID string) ([]PerformanceReportData, error)
}

type StudentReportData struct {
	ID          string
	AdmissionNo string
	FirstName   string
	MiddleName  string
	LastName    string
	Gender      string
	DateOfBirth string
	ClassName   string
	Status      string
	CreatedAt   time.Time
}

type StaffReportData struct {
	EmployeeID     string
	FirstName      string
	LastName       string
	Email          string
	Phone          string
	Role           string
	Status         string
	EmploymentType string
	DateHired      *time.Time
}

type AttendanceReportData struct {
	FirstName   string
	LastName    string
	AdmissionNo string
	ClassName   string
	TotalDays   int
	Present     int
	Absent      int
	Late        int
}

type PerformanceReportData struct {
	FirstName         string
	LastName          string
	AdmissionNo       string
	ClassName         string
	SubjectName       string
	NumPapers         int
	Paper1            *float64
	Paper2            *float64
	Paper3            *float64
	Paper4            *float64
	FinalGrade        string
	ComputationReason string
}

type reportsRepository struct {
	db *gorm.DB
}

func NewReportsRepository(db *gorm.DB) ReportsRepository {
	return &reportsRepository{db: db}
}

func (r *reportsRepository) GetStudentsReportData(schoolID, classID, year, term string) ([]StudentReportData, error) {
	query := r.db.Table("students").
		Select("students.*, classes.name as class_name").
		Joins("LEFT JOIN enrollments ON students.id = enrollments.student_id").
		Joins("LEFT JOIN classes ON enrollments.class_id = classes.id").
		Where("students.school_id = ?", schoolID)

	if classID != "" {
		query = query.Where("classes.id = ?", classID)
	}
	if year != "" {
		query = query.Where("classes.year = ?", year)
	}
	if term != "" {
		query = query.Where("classes.term = ?", term)
	}

	var students []StudentReportData
	err := query.Order("students.first_name ASC").Find(&students).Error
	return students, err
}

func (r *reportsRepository) GetStaffReportData(schoolID, role string) ([]StaffReportData, error) {
	query := r.db.Table("staff").Where("school_id = ?", schoolID)
	if role != "" {
		query = query.Where("role = ?", role)
	}

	var staff []StaffReportData
	err := query.Order("first_name ASC").Find(&staff).Error
	return staff, err
}

func (r *reportsRepository) GetAttendanceReportData(schoolID, startDate, endDate, classID string) ([]AttendanceReportData, error) {
	query := r.db.Table("attendance").
		Select("students.first_name, students.last_name, students.admission_no, classes.name as class_name, COUNT(*) as total_days, SUM(CASE WHEN attendance.status = 'present' THEN 1 ELSE 0 END) as present, SUM(CASE WHEN attendance.status = 'absent' THEN 1 ELSE 0 END) as absent, SUM(CASE WHEN attendance.status = 'late' THEN 1 ELSE 0 END) as late").
		Joins("JOIN students ON attendance.student_id = students.id").
		Joins("JOIN enrollments ON students.id = enrollments.student_id").
		Joins("JOIN classes ON enrollments.class_id = classes.id").
		Where("attendance.school_id = ? AND attendance.date BETWEEN ? AND ?", schoolID, startDate, endDate).
		Group("students.id, students.first_name, students.last_name, students.admission_no, classes.name")

	if classID != "" {
		query = query.Where("classes.id = ?", classID)
	}

	var records []AttendanceReportData
	err := query.Scan(&records).Error
	return records, err
}

func (r *reportsRepository) GetPerformanceReportData(schoolID, year, term, classID string) ([]PerformanceReportData, error) {
	query := `
		SELECT 
			s.first_name,
			s.last_name,
			s.admission_no,
			c.name as class_name,
			ss.name as subject_name,
			ss.papers as num_papers,
			MAX(CASE WHEN sr.paper = 0 THEN (sr.raw_marks->>'mark')::float END) as paper1,
			MAX(CASE WHEN sr.paper = 1 THEN (sr.raw_marks->>'mark')::float END) as paper2,
			MAX(CASE WHEN sr.paper = 2 THEN (sr.raw_marks->>'mark')::float END) as paper3,
			MAX(CASE WHEN sr.paper = 3 THEN (sr.raw_marks->>'mark')::float END) as paper4,
			MAX(sr.final_grade) as final_grade,
			MAX(sr.computation_reason) as computation_reason
		FROM subject_results sr
		JOIN students s ON sr.student_id = s.id
		JOIN classes c ON sr.class_id = c.id
		JOIN standard_subjects ss ON sr.subject_id = ss.id
		WHERE sr.school_id = $1 
			AND sr.year = $2 
			AND sr.term = $3
			AND sr.deleted_at IS NULL
	`

	if classID != "" {
		query += " AND c.id = $4"
	}

	query += `
		GROUP BY s.id, s.first_name, s.last_name, s.admission_no, 
				 c.name, ss.name, ss.papers
		ORDER BY c.name, s.first_name, ss.name
	`

	var results []PerformanceReportData
	var err error

	if classID != "" {
		err = r.db.Raw(query, schoolID, year, term, classID).Scan(&results).Error
	} else {
		err = r.db.Raw(query, schoolID, year, term).Scan(&results).Error
	}

	return results, err
}
