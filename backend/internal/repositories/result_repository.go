package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type ResultRepository interface {
	Create(result *models.SubjectResult) error
	Update(result *models.SubjectResult) error
	Delete(id uuid.UUID) error
	FindByID(id uuid.UUID) (*models.SubjectResult, error)
	FindByStudent(studentID, schoolID uuid.UUID, term, year, examType string) ([]models.SubjectResult, error)
	FindByFilters(schoolID uuid.UUID, filters map[string]interface{}) ([]models.SubjectResult, error)
	FindExisting(studentID, subjectID uuid.UUID, term, year, examType string, paper int) (*models.SubjectResult, error)
	FindBySubjectPapers(studentID, subjectID uuid.UUID, term, year, examType string) ([]models.SubjectResult, error)
	BulkCreate(results []models.SubjectResult) error
	GetClassRankings(classID uuid.UUID, term, year, examType, schoolID string) ([]map[string]interface{}, error)
	GetBulkMarks(classID, subjectID uuid.UUID, term, year, examType, schoolID string, paper int) (map[string]models.JSONB, error)
}

type resultRepository struct {
	db *gorm.DB
}

func NewResultRepository(db *gorm.DB) ResultRepository {
	return &resultRepository{db: db}
}

func (r *resultRepository) Create(result *models.SubjectResult) error {
	return r.db.Create(result).Error
}

func (r *resultRepository) Update(result *models.SubjectResult) error {
	return r.db.Save(result).Error
}

func (r *resultRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.SubjectResult{}, "id = ?", id).Error
}

func (r *resultRepository) FindByID(id uuid.UUID) (*models.SubjectResult, error) {
	var result models.SubjectResult
	err := r.db.Preload("Subject").Preload("StandardSubject").First(&result, "id = ?", id).Error
	return &result, err
}

func (r *resultRepository) FindByStudent(studentID, schoolID uuid.UUID, term, year, examType string) ([]models.SubjectResult, error) {
	query := r.db.Where("student_id = ? AND school_id = ?", studentID, schoolID)
	
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}
	if examType != "" {
		query = query.Where("exam_type = ?", examType)
	}
	
	var results []models.SubjectResult
	err := query.Preload("StandardSubject").Order("created_at DESC").Find(&results).Error
	return results, err
}

func (r *resultRepository) FindByFilters(schoolID uuid.UUID, filters map[string]interface{}) ([]models.SubjectResult, error) {
	query := r.db.Where("school_id = ?", schoolID)
	
	for key, value := range filters {
		if value != "" && value != nil {
			query = query.Where(key+" = ?", value)
		}
	}
	
	var results []models.SubjectResult
	err := query.Preload("StandardSubject").Find(&results).Error
	return results, err
}

func (r *resultRepository) FindExisting(studentID, subjectID uuid.UUID, term, year, examType string, paper int) (*models.SubjectResult, error) {
	var result models.SubjectResult
	err := r.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ? AND exam_type = ? AND paper = ?",
		studentID, subjectID, term, year, examType, paper).First(&result).Error
	return &result, err
}

func (r *resultRepository) FindBySubjectPapers(studentID, subjectID uuid.UUID, term, year, examType string) ([]models.SubjectResult, error) {
	var results []models.SubjectResult
	err := r.db.Where("student_id = ? AND subject_id = ? AND term = ? AND year = ? AND exam_type = ? AND deleted_at IS NULL",
		studentID, subjectID, term, year, examType).Find(&results).Error
	return results, err
}

func (r *resultRepository) BulkCreate(results []models.SubjectResult) error {
	return r.db.Create(&results).Error
}

func (r *resultRepository) GetClassRankings(classID uuid.UUID, term, year, examType, schoolID string) ([]map[string]interface{}, error) {
	type StudentTotal struct {
		StudentID string
		Total     float64
	}
	
	var studentTotals []StudentTotal
	err := r.db.Raw(`
		SELECT 
			sr.student_id,
			SUM(COALESCE((sr.raw_marks->>'ca')::float, 0) + COALESCE((sr.raw_marks->>'exam')::float, 0)) as total
		FROM subject_results sr
		JOIN enrollments e ON sr.student_id = e.student_id
		WHERE e.class_id = ?
			AND sr.term = ?
			AND sr.year = ?
			AND sr.exam_type = ?
			AND sr.school_id = ?
		GROUP BY sr.student_id
		ORDER BY total DESC
	`, classID, term, year, examType, schoolID).Scan(&studentTotals).Error
	
	if err != nil {
		return nil, err
	}
	
	rankings := make([]map[string]interface{}, len(studentTotals))
	for i, st := range studentTotals {
		rankings[i] = map[string]interface{}{
			"student_id": st.StudentID,
			"total":      st.Total,
			"position":   i + 1,
		}
	}
	
	return rankings, nil
}

func (r *resultRepository) GetBulkMarks(classID, subjectID uuid.UUID, term, year, examType, schoolID string, paper int) (map[string]models.JSONB, error) {
	type StudentMark struct {
		StudentID string
		RawMarks  models.JSONB
	}
	
	var results []StudentMark
	query := r.db.Table("subject_results").
		Select("student_id, raw_marks").
		Where("school_id = ? AND class_id = ? AND subject_id = ? AND term = ? AND year = ? AND exam_type = ?",
			schoolID, classID, subjectID, term, year, examType)
	
	if paper > 0 {
		query = query.Where("paper = ?", paper)
	}
	
	if err := query.Scan(&results).Error; err != nil {
		return nil, err
	}
	
	marksMap := make(map[string]models.JSONB)
	for _, result := range results {
		marksMap[result.StudentID] = result.RawMarks
	}
	
	return marksMap, nil
}
