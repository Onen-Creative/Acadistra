package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

// StudentListFilter holds all filter options for listing students
type StudentListFilter struct {
	SchoolID uuid.UUID
	Level    string
	ClassID  string
	Year     string
	Term     string
	Search   string
	Gender   string
	Page     int
	Limit    int // 0 = no limit
}

// StudentRepository defines student-specific database operations
type StudentRepository interface {
	BaseRepository
	FindBySchoolID(schoolID uuid.UUID, page, limit int) ([]models.Student, int64, error)
	FindByClassID(classID uuid.UUID) ([]models.Student, error)
	FindByAdmissionNo(admissionNo string, schoolID uuid.UUID) (*models.Student, error)
	Search(schoolID uuid.UUID, query string, page, limit int) ([]models.Student, int64, error)
	CountBySchoolID(schoolID uuid.UUID) (int64, error)
	FindWithGuardians(studentID uuid.UUID) (*models.Student, []models.Guardian, error)
	ListWithFilters(f StudentListFilter) ([]models.Student, int64, error)
	FindByIDs(ids []uuid.UUID, schoolID uuid.UUID) ([]models.Student, error)
	LoadGuardiansAndClass(students []models.Student, db interface{}) error
}

type studentRepository struct {
	*baseRepository
}

// NewStudentRepository creates a new student repository
func NewStudentRepository(db *gorm.DB) StudentRepository {
	return &studentRepository{
		baseRepository: &baseRepository{db: db},
	}
}

func (r *studentRepository) FindBySchoolID(schoolID uuid.UUID, page, limit int) ([]models.Student, int64, error) {
	var students []models.Student
	var total int64

	query := r.db.Where("school_id = ?", schoolID)
	
	if err := query.Model(&models.Student{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Find(&students).Error; err != nil {
		return nil, 0, err
	}

	return students, total, nil
}

func (r *studentRepository) FindByClassID(classID uuid.UUID) ([]models.Student, error) {
	var students []models.Student
	err := r.db.Joins("JOIN enrollments ON students.id = enrollments.student_id").
		Where("enrollments.class_id = ? AND enrollments.status = ?", classID, "active").
		Find(&students).Error
	return students, err
}

func (r *studentRepository) FindByAdmissionNo(admissionNo string, schoolID uuid.UUID) (*models.Student, error) {
	var student models.Student
	err := r.db.Where("admission_no = ? AND school_id = ?", admissionNo, schoolID).First(&student).Error
	if err != nil {
		return nil, err
	}
	return &student, nil
}

func (r *studentRepository) Search(schoolID uuid.UUID, query string, page, limit int) ([]models.Student, int64, error) {
	var students []models.Student
	var total int64

	searchQuery := r.db.Where("school_id = ?", schoolID).
		Where("first_name ILIKE ? OR last_name ILIKE ? OR admission_no ILIKE ?",
			"%"+query+"%", "%"+query+"%", "%"+query+"%")

	if err := searchQuery.Model(&models.Student{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := searchQuery.Offset(offset).Limit(limit).Find(&students).Error; err != nil {
		return nil, 0, err
	}

	return students, total, nil
}

func (r *studentRepository) CountBySchoolID(schoolID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&models.Student{}).Where("school_id = ?", schoolID).Count(&count).Error
	return count, err
}

func (r *studentRepository) FindWithGuardians(studentID uuid.UUID) (*models.Student, []models.Guardian, error) {
	var student models.Student
	var guardians []models.Guardian

	if err := r.db.First(&student, studentID).Error; err != nil {
		return nil, nil, err
	}

	if err := r.db.Where("student_id = ?", studentID).Find(&guardians).Error; err != nil {
		return nil, nil, err
	}

	return &student, guardians, nil
}

func (r *studentRepository) ListWithFilters(f StudentListFilter) ([]models.Student, int64, error) {
	query := r.db.Table("students").Where("students.school_id = ? AND students.deleted_at IS NULL", f.SchoolID)

	needsJoin := f.Level != "" || f.ClassID != "" || f.Year != "" || f.Term != ""
	if needsJoin {
		query = query.
			Joins("INNER JOIN enrollments ON enrollments.student_id = students.id AND enrollments.status = 'active'").
			Joins("INNER JOIN classes ON classes.id = enrollments.class_id")
		if f.Level != "" {
			query = query.Where("classes.level = ?", f.Level)
		}
		if f.ClassID != "" {
			query = query.Where("enrollments.class_id = ?", f.ClassID)
		}
		if f.Year != "" {
			query = query.Where("enrollments.year = ?", f.Year)
		}
		if f.Term != "" {
			query = query.Where("enrollments.term = ?", f.Term)
		}
	}

	if f.Search != "" {
		query = query.Where("(LOWER(students.first_name) LIKE LOWER(?) OR LOWER(students.middle_name) LIKE LOWER(?) OR LOWER(students.last_name) LIKE LOWER(?) OR LOWER(students.admission_no) LIKE LOWER(?))",
			"%"+f.Search+"%", "%"+f.Search+"%", "%"+f.Search+"%", "%"+f.Search+"%")
	}
	if f.Gender != "" {
		query = query.Where("students.gender = ?", f.Gender)
	}

	query = query.Select("DISTINCT students.*")

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	query = query.Order("students.first_name ASC, students.last_name ASC")
	if f.Limit > 0 {
		query = query.Offset((f.Page - 1) * f.Limit).Limit(f.Limit)
	}

	var students []models.Student
	if err := query.Find(&students).Error; err != nil {
		return nil, 0, err
	}
	return students, total, nil
}

func (r *studentRepository) FindByIDs(ids []uuid.UUID, schoolID uuid.UUID) ([]models.Student, error) {
	var students []models.Student
	err := r.db.Where("id IN ? AND school_id = ?", ids, schoolID).
		Order("first_name ASC, last_name ASC").
		Find(&students).Error
	return students, err
}

// LoadGuardiansAndClass enriches students with guardians and current class name.
// db must be *gorm.DB — typed as interface{} to avoid circular import if needed.
func (r *studentRepository) LoadGuardiansAndClass(students []models.Student, db interface{}) error {
	gdb := db.(*gorm.DB)
	for i := range students {
		gdb.Where("student_id = ?", students[i].ID).Find(&students[i].Guardians)
		var enrollment models.Enrollment
		if err := gdb.Preload("Class").Where("student_id = ? AND status = 'active'", students[i].ID).First(&enrollment).Error; err == nil {
			if enrollment.Class != nil {
				students[i].ClassName = enrollment.Class.Name
			}
		}
	}
	return nil
}
