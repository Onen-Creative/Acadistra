package repositories

import (
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

// ClinicRepository defines clinic-specific database operations
type ClinicRepository interface {
	BaseRepository
	// Health Profile operations
	FindHealthProfile(studentID uuid.UUID) (*models.StudentHealthProfile, error)
	CreateHealthProfile(profile *models.StudentHealthProfile) error
	
	// Visit operations
	FindVisitsByStudent(studentID uuid.UUID, startDate, endDate time.Time) ([]models.ClinicVisit, error)
	FindVisitsBySchool(schoolID uuid.UUID, startDate, endDate time.Time) ([]models.ClinicVisit, error)
	CreateVisit(visit *models.ClinicVisit) error
	
	// Medicine operations
	FindMedicinesBySchool(schoolID uuid.UUID, term string, year int) ([]models.Medicine, error)
	FindLowStockMedicines(schoolID uuid.UUID) ([]models.Medicine, error)
	UpdateMedicineQuantity(medicineID uuid.UUID, quantity int) error
	
	// Medication Administration
	CreateMedicationAdmin(admin *models.MedicationAdministration) error
	FindMedicationsByVisit(visitID uuid.UUID) ([]models.MedicationAdministration, error)
}

type clinicRepository struct {
	*baseRepository
}

// NewClinicRepository creates a new clinic repository
func NewClinicRepository(db *gorm.DB) ClinicRepository {
	return &clinicRepository{
		baseRepository: &baseRepository{db: db},
	}
}

func (r *clinicRepository) FindHealthProfile(studentID uuid.UUID) (*models.StudentHealthProfile, error) {
	var profile models.StudentHealthProfile
	err := r.db.Where("student_id = ?", studentID).
		Preload("Student").
		First(&profile).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &profile, nil
}

func (r *clinicRepository) CreateHealthProfile(profile *models.StudentHealthProfile) error {
	return r.db.Create(profile).Error
}

func (r *clinicRepository) FindVisitsByStudent(studentID uuid.UUID, startDate, endDate time.Time) ([]models.ClinicVisit, error) {
	var visits []models.ClinicVisit
	err := r.db.Where("student_id = ? AND visit_date BETWEEN ? AND ?", studentID, startDate, endDate).
		Preload("Student").
		Order("visit_date DESC").
		Find(&visits).Error
	return visits, err
}

func (r *clinicRepository) FindVisitsBySchool(schoolID uuid.UUID, startDate, endDate time.Time) ([]models.ClinicVisit, error) {
	var visits []models.ClinicVisit
	err := r.db.Where("school_id = ? AND visit_date BETWEEN ? AND ?", schoolID, startDate, endDate).
		Preload("Student").
		Order("visit_date DESC").
		Find(&visits).Error
	return visits, err
}

func (r *clinicRepository) CreateVisit(visit *models.ClinicVisit) error {
	return r.db.Create(visit).Error
}

func (r *clinicRepository) FindMedicinesBySchool(schoolID uuid.UUID, term string, year int) ([]models.Medicine, error) {
	var medicines []models.Medicine
	err := r.db.Where("school_id = ? AND term = ? AND year = ?", schoolID, term, year).
		Order("name ASC").
		Find(&medicines).Error
	return medicines, err
}

func (r *clinicRepository) FindLowStockMedicines(schoolID uuid.UUID) ([]models.Medicine, error) {
	var medicines []models.Medicine
	err := r.db.Where("school_id = ? AND quantity <= minimum_stock", schoolID).
		Order("quantity ASC").
		Find(&medicines).Error
	return medicines, err
}

func (r *clinicRepository) UpdateMedicineQuantity(medicineID uuid.UUID, quantity int) error {
	return r.db.Model(&models.Medicine{}).
		Where("id = ?", medicineID).
		Update("quantity", quantity).Error
}

func (r *clinicRepository) CreateMedicationAdmin(admin *models.MedicationAdministration) error {
	return r.db.Create(admin).Error
}

func (r *clinicRepository) FindMedicationsByVisit(visitID uuid.UUID) ([]models.MedicationAdministration, error) {
	var medications []models.MedicationAdministration
	err := r.db.Where("visit_id = ?", visitID).
		Preload("Medicine").
		Find(&medications).Error
	return medications, err
}
