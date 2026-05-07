package repositories

import (
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type TeacherExportRepository struct {
	db *gorm.DB
}

func NewTeacherExportRepository(db *gorm.DB) *TeacherExportRepository {
	return &TeacherExportRepository{db: db}
}

func (r *TeacherExportRepository) FindTeachersBySchool(schoolID string) ([]models.Staff, error) {
	var teachers []models.Staff
	err := r.db.Where("school_id = ? AND role = ?", schoolID, "Teacher").
		Order("first_name, last_name").
		Find(&teachers).Error
	return teachers, err
}
