package repositories

import (
	"time"

	"gorm.io/gorm"
)

type SystemReportsRepository struct {
	db *gorm.DB
}

type SystemSchoolReportData struct {
	ID        string
	Name      string
	Type      string
	IsActive  bool
	CreatedAt time.Time
}

type SystemUserReportData struct {
	ID        string
	Email     string
	Name      string
	Role      string
	IsActive  bool
	CreatedAt time.Time
}

type SystemStudentReportData struct {
	ID          string
	Name        string
	AdmissionNo string
	ClassLevel  string
	SchoolName  string
	CreatedAt   time.Time
}

type SystemActivityReportData struct {
	ID        string
	Action    string
	UserEmail string
	Timestamp time.Time
}

type SystemPerformanceStats struct {
	TotalSchools  int64
	TotalUsers    int64
	TotalStudents int64
	ActiveSchools int64
	ActiveUsers   int64
}

func NewSystemReportsRepository(db *gorm.DB) *SystemReportsRepository {
	return &SystemReportsRepository{db: db}
}

func (r *SystemReportsRepository) GetSchoolsData() ([]SystemSchoolReportData, error) {
	var schools []SystemSchoolReportData
	err := r.db.Table("schools").
		Select("id, name, type, is_active, created_at").
		Order("created_at DESC").
		Find(&schools).Error
	return schools, err
}

func (r *SystemReportsRepository) GetUsersData() ([]SystemUserReportData, error) {
	var users []SystemUserReportData
	err := r.db.Table("users").
		Select("id, email, full_name as name, role, is_active, created_at").
		Order("created_at DESC").
		Find(&users).Error
	return users, err
}

func (r *SystemReportsRepository) GetStudentsData() ([]SystemStudentReportData, error) {
	var students []SystemStudentReportData
	err := r.db.Table("students").
		Select(`students.id, 
			CONCAT(students.first_name, ' ', COALESCE(students.middle_name, ''), ' ', students.last_name) as name, 
			students.admission_no, 
			enrollments.year as class_level, 
			schools.name as school_name, 
			students.created_at`).
		Joins("LEFT JOIN schools ON students.school_id = schools.id").
		Joins("LEFT JOIN enrollments ON students.id = enrollments.student_id AND enrollments.status = 'active'").
		Order("students.created_at DESC").
		Find(&students).Error
	return students, err
}

func (r *SystemReportsRepository) GetActivityData() ([]SystemActivityReportData, error) {
	var activities []SystemActivityReportData
	err := r.db.Table("audit_logs").
		Select("audit_logs.id, audit_logs.action, users.email as user_email, audit_logs.timestamp").
		Joins("LEFT JOIN users ON audit_logs.actor_user_id = users.id").
		Order("audit_logs.timestamp DESC").
		Limit(1000).
		Find(&activities).Error
	return activities, err
}

func (r *SystemReportsRepository) GetPerformanceStats() (*SystemPerformanceStats, error) {
	var stats SystemPerformanceStats
	r.db.Table("schools").Count(&stats.TotalSchools)
	r.db.Table("users").Count(&stats.TotalUsers)
	r.db.Table("students").Count(&stats.TotalStudents)
	r.db.Table("schools").Where("is_active = ?", true).Count(&stats.ActiveSchools)
	r.db.Table("users").Where("is_active = ?", true).Count(&stats.ActiveUsers)
	return &stats, nil
}
