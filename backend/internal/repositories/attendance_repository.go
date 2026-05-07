package repositories

import (
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

// AttendanceRepository defines attendance-specific database operations
type AttendanceRepository interface {
	BaseRepository
	FindByStudent(studentID uuid.UUID, startDate, endDate time.Time) ([]models.Attendance, error)
	FindByClass(classID uuid.UUID, date time.Time) ([]models.Attendance, error)
	FindByClassAndDateRange(classID uuid.UUID, startDate, endDate time.Time) ([]models.Attendance, error)
	FindExisting(studentID uuid.UUID, date time.Time) (*models.Attendance, error)
	CountByStatus(classID uuid.UUID, status string, startDate, endDate time.Time) (int64, error)
	BulkCreate(attendance []models.Attendance) error
	CountByClassAndDate(classID uuid.UUID, date time.Time) (int64, error)
	FindHolidays(schoolID uuid.UUID, start, end time.Time) ([]models.SchoolCalendar, error)
	FindStudentsInClass(classID string, schoolID string) ([]models.Student, error)
	CountStudentByStatus(studentID uuid.UUID, classID string, status string, start, end time.Time) (int64, error)
	DeleteBySchoolAndID(id string, schoolID string) error
	DeleteHoliday(id string, schoolID string) error
	CreateHoliday(calendar *models.SchoolCalendar) error
	FindHolidaysByFilter(schoolID, year, term, startDate, endDate string) ([]models.SchoolCalendar, error)
	FindBySchoolAndFilters(schoolID, classID, studentID, date, startDate, endDate string, page, limit int) ([]models.Attendance, int64, error)
	FindByStudentAndSchool(studentID, schoolID string, start, end time.Time) ([]models.Attendance, error)
}

type attendanceRepository struct {
	*baseRepository
}

// NewAttendanceRepository creates a new attendance repository
func NewAttendanceRepository(db *gorm.DB) AttendanceRepository {
	return &attendanceRepository{
		baseRepository: &baseRepository{db: db},
	}
}

func (r *attendanceRepository) FindByStudent(studentID uuid.UUID, startDate, endDate time.Time) ([]models.Attendance, error) {
	var attendance []models.Attendance
	err := r.db.Where("student_id = ? AND date BETWEEN ? AND ?", studentID, startDate, endDate).
		Order("date DESC").
		Find(&attendance).Error
	return attendance, err
}

func (r *attendanceRepository) FindByClass(classID uuid.UUID, date time.Time) ([]models.Attendance, error) {
	var attendance []models.Attendance
	err := r.db.Where("class_id = ? AND date = ?", classID, date).
		Preload("Student").
		Order("student_id ASC").
		Find(&attendance).Error
	return attendance, err
}

func (r *attendanceRepository) FindByClassAndDateRange(classID uuid.UUID, startDate, endDate time.Time) ([]models.Attendance, error) {
	var attendance []models.Attendance
	err := r.db.Where("class_id = ? AND date BETWEEN ? AND ?", classID, startDate, endDate).
		Order("date DESC, student_id ASC").
		Find(&attendance).Error
	return attendance, err
}

func (r *attendanceRepository) FindExisting(studentID uuid.UUID, date time.Time) (*models.Attendance, error) {
	var attendance models.Attendance
	err := r.db.Where("student_id = ? AND date = ?", studentID, date).First(&attendance).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &attendance, nil
}

func (r *attendanceRepository) CountByStatus(classID uuid.UUID, status string, startDate, endDate time.Time) (int64, error) {
	var count int64
	err := r.db.Model(&models.Attendance{}).
		Where("class_id = ? AND status = ? AND date BETWEEN ? AND ?", classID, status, startDate, endDate).
		Count(&count).Error
	return count, err
}

func (r *attendanceRepository) BulkCreate(attendance []models.Attendance) error {
	return r.db.Create(&attendance).Error
}

func (r *attendanceRepository) CountByClassAndDate(classID uuid.UUID, date time.Time) (int64, error) {
	var count int64
	err := r.db.Model(&models.Attendance{}).
		Where("class_id = ? AND date::date = ?::date", classID, date).
		Count(&count).Error
	return count, err
}

func (r *attendanceRepository) FindHolidays(schoolID uuid.UUID, start, end time.Time) ([]models.SchoolCalendar, error) {
	var holidays []models.SchoolCalendar
	err := r.db.Where("school_id = ? AND date BETWEEN ? AND ? AND day_type IN ('holiday', 'weekend')", schoolID, start, end).
		Find(&holidays).Error
	return holidays, err
}

func (r *attendanceRepository) FindStudentsInClass(classID string, schoolID string) ([]models.Student, error) {
	var students []models.Student
	err := r.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
		Where("enrollments.class_id = ? AND enrollments.status = 'active' AND students.school_id = ? AND students.deleted_at IS NULL AND enrollments.deleted_at IS NULL", classID, schoolID).
		Find(&students).Error
	return students, err
}

func (r *attendanceRepository) CountStudentByStatus(studentID uuid.UUID, classID string, status string, start, end time.Time) (int64, error) {
	var count int64
	err := r.db.Table("attendances").
		Where("student_id = ? AND class_id = ? AND date BETWEEN ? AND ? AND status = ?", studentID, classID, start, end, status).
		Count(&count).Error
	return count, err
}

func (r *attendanceRepository) DeleteBySchoolAndID(id string, schoolID string) error {
	return r.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.Attendance{}).Error
}

func (r *attendanceRepository) DeleteHoliday(id string, schoolID string) error {
	return r.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.SchoolCalendar{}).Error
}

func (r *attendanceRepository) CreateHoliday(calendar *models.SchoolCalendar) error {
	return r.db.Create(calendar).Error
}

func (r *attendanceRepository) FindHolidaysByFilter(schoolID, year, term, startDate, endDate string) ([]models.SchoolCalendar, error) {
	query := r.db.Where("school_id = ?", schoolID)
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
	err := query.Order("date").Find(&holidays).Error
	return holidays, err
}

func (r *attendanceRepository) FindBySchoolAndFilters(schoolID, classID, studentID, date, startDate, endDate string, page, limit int) ([]models.Attendance, int64, error) {
	query := r.db.Where("attendances.school_id = ?", schoolID)
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
	err := query.Preload("Student").Preload("Class").
		Order("date DESC, student_id").
		Limit(limit).Offset((page - 1) * limit).
		Find(&attendances).Error
	return attendances, total, err
}

func (r *attendanceRepository) FindByStudentAndSchool(studentID, schoolID string, start, end time.Time) ([]models.Attendance, error) {
	var attendances []models.Attendance
	err := r.db.Where("student_id = ? AND school_id = ? AND date BETWEEN ? AND ?", studentID, schoolID, start, end).
		Order("date DESC").
		Find(&attendances).Error
	return attendances, err
}
