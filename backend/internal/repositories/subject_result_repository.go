package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

// SubjectResultRepository defines subject result database operations
type SubjectResultRepository interface {
	BaseRepository
	FindByStudent(studentID uuid.UUID, term string, year int, examType string) ([]models.SubjectResult, error)
	FindByClass(classID uuid.UUID, term string, year int, examType string) ([]models.SubjectResult, error)
	FindBySubject(subjectID uuid.UUID, classID uuid.UUID, term string, year int) ([]models.SubjectResult, error)
	FindExisting(studentID, subjectID uuid.UUID, term string, year int, examType string, paper int) (*models.SubjectResult, error)
	CreateOrUpdate(result *models.SubjectResult) (*models.SubjectResult, error)
	BulkCreate(results []models.SubjectResult) error
	UpdateGrade(resultID uuid.UUID, grade, reason, hash string) error
}

type subjectResultRepository struct {
	*baseRepository
}

// NewSubjectResultRepository creates a new subject result repository
func NewSubjectResultRepository(db *gorm.DB) SubjectResultRepository {
	return &subjectResultRepository{
		baseRepository: &baseRepository{db: db},
	}
}

func (r *subjectResultRepository) FindByStudent(studentID uuid.UUID, term string, year int, examType string) ([]models.SubjectResult, error) {
	var results []models.SubjectResult
	query := r.db.Where("student_id = ?", studentID)
	
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year > 0 {
		query = query.Where("year = ?", year)
	}
	if examType != "" {
		query = query.Where("exam_type = ?", examType)
	}
	
	err := query.Find(&results).Error
	return results, err
}

func (r *subjectResultRepository) FindByClass(classID uuid.UUID, term string, year int, examType string) ([]models.SubjectResult, error) {
	var results []models.SubjectResult
	query := r.db.Where("class_id = ?", classID)
	
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year > 0 {
		query = query.Where("year = ?", year)
	}
	if examType != "" {
		query = query.Where("exam_type = ?", examType)
	}
	
	err := query.Find(&results).Error
	return results, err
}

func (r *subjectResultRepository) FindBySubject(subjectID uuid.UUID, classID uuid.UUID, term string, year int) ([]models.SubjectResult, error) {
	var results []models.SubjectResult
	err := r.db.Where("subject_id = ? AND class_id = ? AND term = ? AND year = ?",
		subjectID, classID, term, year).Find(&results).Error
	return results, err
}

func (r *subjectResultRepository) FindExisting(studentID, subjectID uuid.UUID, term string, year int, examType string, paper int) (*models.SubjectResult, error) {
	var result models.SubjectResult
	err := r.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ? AND exam_type = ? AND paper = ?",
		studentID, subjectID, term, year, examType, paper).First(&result).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *subjectResultRepository) CreateOrUpdate(result *models.SubjectResult) (*models.SubjectResult, error) {
	existing, err := r.FindExisting(result.StudentID, result.SubjectID, result.Term, result.Year, result.ExamType, result.Paper)
	if err != nil {
		return nil, err
	}
	
	if existing != nil {
		result.ID = existing.ID
		if err := r.db.Save(result).Error; err != nil {
			return nil, err
		}
	} else {
		if err := r.db.Create(result).Error; err != nil {
			return nil, err
		}
	}
	
	return result, nil
}

func (r *subjectResultRepository) BulkCreate(results []models.SubjectResult) error {
	return r.db.Create(&results).Error
}

func (r *subjectResultRepository) UpdateGrade(resultID uuid.UUID, grade, reason, hash string) error {
	return r.db.Model(&models.SubjectResult{}).
		Where("id = ?", resultID).
		Updates(map[string]interface{}{
			"final_grade":        grade,
			"computation_reason": reason,
			"rule_version_hash":  hash,
		}).Error
}
