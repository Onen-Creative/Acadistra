package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type ClassRankingRepository interface {
	FindClassByID(classID string) (*models.Class, error)
	FindStudentsByClassID(classID string) ([]models.Student, error)
	FindResultsByStudentsAndTerm(studentIDs []uuid.UUID, term string, year int, examType string) ([]models.SubjectResult, error)
	FindSubjectByID(subjectID uuid.UUID) (*models.StandardSubject, error)
	FindAvailableTermsYears(classID string) ([]map[string]interface{}, error)
}

type classRankingRepository struct {
	db *gorm.DB
}

func NewClassRankingRepository(db *gorm.DB) ClassRankingRepository {
	return &classRankingRepository{db: db}
}

func (r *classRankingRepository) FindClassByID(classID string) (*models.Class, error) {
	var class models.Class
	err := r.db.Where("id = ?", classID).First(&class).Error
	return &class, err
}

func (r *classRankingRepository) FindStudentsByClassID(classID string) ([]models.Student, error) {
	var students []models.Student
	err := r.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
		Where("enrollments.class_id = ? AND enrollments.status = ?", classID, "active").
		Find(&students).Error
	return students, err
}

func (r *classRankingRepository) FindResultsByStudentsAndTerm(studentIDs []uuid.UUID, term string, year int, examType string) ([]models.SubjectResult, error) {
	var results []models.SubjectResult
	err := r.db.Where("student_id IN ? AND term = ? AND year = ? AND exam_type = ?",
		studentIDs, term, year, examType).Find(&results).Error
	return results, err
}

func (r *classRankingRepository) FindSubjectByID(subjectID uuid.UUID) (*models.StandardSubject, error) {
	var subject models.StandardSubject
	err := r.db.Where("id = ?", subjectID).First(&subject).Error
	return &subject, err
}

func (r *classRankingRepository) FindAvailableTermsYears(classID string) ([]map[string]interface{}, error) {
	type TermYear struct {
		Term string `json:"term"`
		Year int    `json:"year"`
	}

	var termYears []TermYear
	err := r.db.Model(&models.SubjectResult{}).
		Select("DISTINCT subject_results.term, subject_results.year").
		Where("subject_results.class_id = ?", classID).
		Order("subject_results.year DESC, subject_results.term DESC").
		Scan(&termYears).Error

	result := make([]map[string]interface{}, len(termYears))
	for i, ty := range termYears {
		result[i] = map[string]interface{}{
			"term": ty.Term,
			"year": ty.Year,
		}
	}

	return result, err
}
