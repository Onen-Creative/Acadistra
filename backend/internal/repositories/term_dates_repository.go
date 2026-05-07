package repositories

import (
	"fmt"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type TermDatesRepository struct {
	db *gorm.DB
}

func NewTermDatesRepository(db *gorm.DB) *TermDatesRepository {
	return &TermDatesRepository{db: db}
}

func (r *TermDatesRepository) Create(termDates *models.TermDates) (*models.TermDates, error) {
	if err := r.db.Create(termDates).Error; err != nil {
		return nil, err
	}
	return termDates, nil
}

func (r *TermDatesRepository) Update(termDates *models.TermDates) (*models.TermDates, error) {
	if err := r.db.Save(termDates).Error; err != nil {
		return nil, err
	}
	return termDates, nil
}

func (r *TermDatesRepository) FindBySchool(schoolID, year string) ([]models.TermDates, error) {
	var termDates []models.TermDates
	query := r.db.Where("school_id = ?", schoolID)
	
	if year != "" {
		yearInt, err := strconv.Atoi(year)
		if err == nil {
			query = query.Where("year = ?", yearInt)
		}
	}
	
	if err := query.Order("year DESC, term ASC").Find(&termDates).Error; err != nil {
		return nil, err
	}
	return termDates, nil
}

func (r *TermDatesRepository) FindBySchoolYearTerm(schoolID string, year int, term string) (*models.TermDates, error) {
	var termDates models.TermDates
	query := r.db.Where("school_id = ? AND term = ?", schoolID, term)
	
	if year > 0 {
		query = query.Where("year = ?", year)
	}
	
	if err := query.First(&termDates).Error; err != nil {
		return nil, err
	}
	return &termDates, nil
}

func (r *TermDatesRepository) FindCurrentTerm(schoolID string) (*models.TermDates, error) {
	var termDates models.TermDates
	today := time.Now()
	
	if err := r.db.Where("school_id = ? AND start_date <= ? AND end_date >= ?", 
		schoolID, today, today).First(&termDates).Error; err != nil {
		return nil, err
	}
	return &termDates, nil
}

func (r *TermDatesRepository) Delete(id, schoolID string) error {
	termID, err := uuid.Parse(id)
	if err != nil {
		return fmt.Errorf("invalid term ID")
	}
	
	return r.db.Where("id = ? AND school_id = ?", termID, schoolID).Delete(&models.TermDates{}).Error
}
