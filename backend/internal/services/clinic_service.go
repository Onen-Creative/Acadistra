package services

import (
	"fmt"
	"log"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type ClinicService struct {
	repo         repositories.ClinicRepository
	db           *gorm.DB
	emailService *EmailService
}

func NewClinicService(db *gorm.DB, emailService *EmailService) *ClinicService {
	return &ClinicService{
		repo:         repositories.NewClinicRepository(db),
		db:           db,
		emailService: emailService,
	}
}

func (s *ClinicService) CreateHealthProfile(profile *models.StudentHealthProfile, schoolID string) error {
	profile.SchoolID = uuid.MustParse(schoolID)
	return s.repo.CreateHealthProfile(profile)
}

func (s *ClinicService) GetHealthProfile(studentID, schoolID string) (*models.StudentHealthProfile, error) {
	var profile models.StudentHealthProfile
	err := s.db.Preload("Student").Where("student_id = ? AND school_id = ?", studentID, schoolID).First(&profile).Error
	return &profile, err
}

func (s *ClinicService) GetHealthProfileByID(id, schoolID string) (*models.StudentHealthProfile, error) {
	var profile models.StudentHealthProfile
	err := s.db.Preload("Student").Where("id = ? AND school_id = ?", id, schoolID).First(&profile).Error
	return &profile, err
}

func (s *ClinicService) GetStudentHealthData(studentID, schoolID string) (map[string]interface{}, error) {
	var student models.Student
	if err := s.db.Where("id = ? AND school_id = ?", studentID, schoolID).First(&student).Error; err != nil {
		return nil, err
	}
	
	var guardians []models.Guardian
	s.db.Where("student_id = ?", studentID).Find(&guardians)
	
	var emergencyContact, emergencyPhone string
	for _, g := range guardians {
		if g.IsEmergency {
			emergencyContact = g.FullName
			emergencyPhone = g.Phone
			break
		}
	}
	
	return map[string]interface{}{
		"special_needs":      student.SpecialNeeds,
		"disability_status":  student.DisabilityStatus,
		"emergency_contact":  emergencyContact,
		"emergency_phone":    emergencyPhone,
	}, nil
}

func (s *ClinicService) UpdateHealthProfile(id, schoolID string, updates *models.StudentHealthProfile) error {
	return s.db.Model(&models.StudentHealthProfile{}).Where("id = ? AND school_id = ?", id, schoolID).Updates(updates).Error
}

func (s *ClinicService) DeleteHealthProfile(id, schoolID string) error {
	return s.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.StudentHealthProfile{}).Error
}

func (s *ClinicService) CreateVisit(visit *models.ClinicVisit, tests []models.MedicalTest, medications []models.MedicationAdministration, schoolID, userID string) error {
	visit.SchoolID = uuid.MustParse(schoolID)
	visit.AttendedBy = uuid.MustParse(userID)

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.CreateVisit(visit); err != nil {
			return err
		}

		for i := range tests {
			tests[i].VisitID = visit.ID
			tests[i].StudentID = visit.StudentID
			tests[i].SchoolID = uuid.MustParse(schoolID)
			tests[i].Year = visit.Year
			tests[i].Term = visit.Term
			tests[i].PerformedBy = uuid.MustParse(userID)
			if err := tx.Create(&tests[i]).Error; err != nil {
				return err
			}
		}

		for i := range medications {
			medications[i].VisitID = visit.ID
			medications[i].StudentID = visit.StudentID
			medications[i].SchoolID = uuid.MustParse(schoolID)
			medications[i].AdministeredBy = uuid.MustParse(userID)
			medications[i].AdministeredAt = time.Now()

			var medicine models.Medicine
			if err := tx.First(&medicine, medications[i].MedicineID).Error; err == nil {
				medicine.Quantity -= medications[i].QuantityGiven
				tx.Save(&medicine)
			}

			if err := s.repo.CreateMedicationAdmin(&medications[i]); err != nil {
				return err
			}
		}

		return nil
	})
}

func (s *ClinicService) SendHealthAlert(visit *models.ClinicVisit) {
	if visit.Outcome != "referred" && visit.Outcome != "emergency" && visit.Outcome != "sent_home" {
		return
	}

	go func(studentID uuid.UUID, symptoms string, visitDate time.Time) {
		var student models.Student
		if err := s.db.First(&student, studentID).Error; err == nil {
			var guardians []models.Guardian
			s.db.Where("student_id = ?", studentID).Find(&guardians)

			studentName := fmt.Sprintf("%s %s", student.FirstName, student.LastName)
			for _, guardian := range guardians {
				if guardian.Email != "" && s.emailService != nil {
					if err := s.emailService.SendHealthAlert(guardian.Email, studentName, symptoms, visitDate.Format("2006-01-02")); err != nil {
						log.Printf("Failed to send health alert: %v", err)
					}
				}
			}
		}
	}(visit.StudentID, visit.Symptoms, visit.VisitDate)
}

func (s *ClinicService) GetVisits(schoolID, term, year string, page, limit int) ([]models.ClinicVisit, int64, error) {
	query := s.db.Where("school_id = ?", schoolID)
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}

	var total int64
	query.Model(&models.ClinicVisit{}).Count(&total)

	var visits []models.ClinicVisit
	err := query.Preload("Student").Order("visit_date DESC").Limit(limit).Offset((page - 1) * limit).Find(&visits).Error
	return visits, total, err
}

func (s *ClinicService) GetVisit(id, schoolID string) (*models.ClinicVisit, error) {
	var visit models.ClinicVisit
	err := s.db.Preload("Student").Preload("Nurse").Where("id = ? AND school_id = ?", id, schoolID).First(&visit).Error
	return &visit, err
}

func (s *ClinicService) UpdateVisit(id, schoolID string, updates *models.ClinicVisit) error {
	return s.db.Model(&models.ClinicVisit{}).Where("id = ? AND school_id = ?", id, schoolID).Updates(updates).Error
}

func (s *ClinicService) DeleteVisit(id, schoolID string) error {
	return s.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.ClinicVisit{}).Error
}

func (s *ClinicService) CreateMedicine(medicine *models.Medicine, schoolID string) error {
	medicine.SchoolID = uuid.MustParse(schoolID)
	if medicine.InitialQuantity == 0 {
		medicine.InitialQuantity = medicine.Quantity
	}
	return s.db.Create(medicine).Error
}

func (s *ClinicService) ListMedicines(schoolID, term, year, search string, page, limit int) ([]models.Medicine, int64, error) {
	query := s.db.Where("school_id = ?", schoolID)
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}
	if search != "" {
		query = query.Where("name LIKE ? OR category LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Model(&models.Medicine{}).Count(&total)

	var medicines []models.Medicine
	err := query.Order("name ASC").Limit(limit).Offset((page - 1) * limit).Find(&medicines).Error
	return medicines, total, err
}

func (s *ClinicService) UpdateMedicine(id, schoolID string, updates *models.Medicine) error {
	return s.db.Model(&models.Medicine{}).Where("id = ? AND school_id = ?", id, schoolID).Updates(updates).Error
}

func (s *ClinicService) DeleteMedicine(id, schoolID string) error {
	return s.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.Medicine{}).Error
}

func (s *ClinicService) GetSummary(schoolID, term, year, startDate string) (map[string]interface{}, error) {
	now := time.Now()
	weekAgo := now.AddDate(0, 0, -7)
	
	// Total visits (all time)
	var totalVisits int64
	s.db.Where("school_id = ?", schoolID).Model(&models.ClinicVisit{}).Count(&totalVisits)
	
	// Visits this week
	var visitsThisWeek int64
	s.db.Where("school_id = ? AND visit_date >= ?", schoolID, weekAgo).Model(&models.ClinicVisit{}).Count(&visitsThisWeek)
	
	// Total medicines
	var totalMedicines int64
	s.db.Where("school_id = ?", schoolID).Model(&models.Medicine{}).Count(&totalMedicines)
	
	// Low stock medicines
	var lowStockCount int64
	s.db.Where("school_id = ? AND quantity <= minimum_stock", schoolID).Model(&models.Medicine{}).Count(&lowStockCount)
	
	// Expired medicines
	var expiredCount int64
	s.db.Where("school_id = ? AND expiry_date < ?", schoolID, now).Model(&models.Medicine{}).Count(&expiredCount)
	
	// Recent visits with student and class info
	var recentVisits []models.ClinicVisit
	s.db.Where("school_id = ?", schoolID).
		Preload("Student").
		Order("visit_date DESC").
		Limit(10).
		Find(&recentVisits)
	
	// Load current class for each student
	for i := range recentVisits {
		if recentVisits[i].Student != nil {
			var class models.Class
			err := s.db.Table("classes").
				Select("classes.*").
				Joins("INNER JOIN enrollments ON enrollments.class_id = classes.id").
				Where("enrollments.student_id = ? AND enrollments.status = ?", recentVisits[i].Student.ID, "active").
				Order("enrollments.year DESC, enrollments.term DESC").
				First(&class).Error
			if err == nil {
				recentVisits[i].Student.Class = &class
			}
		}
	}
	
	// Low stock medicines list
	var lowStockMedicines []models.Medicine
	s.db.Where("school_id = ? AND quantity <= minimum_stock", schoolID).
		Order("quantity ASC").
		Limit(10).
		Find(&lowStockMedicines)
	
	return map[string]interface{}{
		"total_visits":        totalVisits,
		"visits_this_week":    visitsThisWeek,
		"total_medicines":     totalMedicines,
		"low_stock_medicines": lowStockCount,
		"expired_medicines":   expiredCount,
		"recent_visits":       recentVisits,
		"low_stock_items":     lowStockMedicines,
	}, nil
}


func (s *ClinicService) CreateTest(test *models.MedicalTest) error {
	// Get visit to copy year/term
	if test.VisitID != uuid.Nil {
		var visit models.ClinicVisit
		if err := s.db.First(&visit, test.VisitID).Error; err == nil {
			test.Year = visit.Year
			test.Term = visit.Term
		}
	}
	
	if err := s.db.Create(test).Error; err != nil {
		return err
	}
	
	s.db.Preload("Student").First(test, test.ID)
	return nil
}

func (s *ClinicService) ListTests(schoolID, studentID, term, year string, page, limit int) ([]models.MedicalTest, int64, error) {
	query := s.db.Where("medical_tests.school_id = ?", schoolID)
	
	if studentID != "" {
		query = query.Where("medical_tests.student_id = ?", studentID)
	}
	if term != "" {
		query = query.Where("medical_tests.term = ?", term)
	}
	if year != "" {
		query = query.Where("medical_tests.year = ?", year)
	}
	
	var total int64
	query.Model(&models.MedicalTest{}).Count(&total)
	
	offset := (page - 1) * limit
	var tests []models.MedicalTest
	err := query.Preload("Student").Preload("Nurse").
		Offset(offset).Limit(limit).
		Order("test_date DESC").Find(&tests).Error
	
	return tests, total, err
}

func (s *ClinicService) GetMedicine(id, schoolID string) (*models.Medicine, error) {
	var medicine models.Medicine
	err := s.db.Where("id = ? AND school_id = ?", id, schoolID).First(&medicine).Error
	return &medicine, err
}


func (s *ClinicService) AdministerMedication(admin *models.MedicationAdministration) error {
	// Update medicine quantity
	var medicine models.Medicine
	if err := s.db.First(&medicine, admin.MedicineID).Error; err == nil {
		medicine.Quantity -= admin.QuantityGiven
		s.db.Save(&medicine)
	}
	
	if err := s.db.Create(admin).Error; err != nil {
		return err
	}
	
	s.db.Preload("Medicine").Preload("Student").First(admin, admin.ID)
	return nil
}

func (s *ClinicService) GetMedicationHistory(schoolID, studentID, visitID string) ([]models.MedicationAdministration, error) {
	query := s.db.Where("medication_administrations.school_id = ?", schoolID)
	if studentID != "" {
		query = query.Where("medication_administrations.student_id = ?", studentID)
	}
	if visitID != "" {
		query = query.Where("medication_administrations.visit_id = ?", visitID)
	}
	
	var history []models.MedicationAdministration
	err := query.Preload("Medicine").Preload("Student").
		Order("administered_at DESC").Find(&history).Error
	
	return history, err
}

func (s *ClinicService) ListConsumables(schoolID, term, year, search string, page, limit int) ([]models.ClinicConsumable, int64, error) {
	query := s.db.Where("school_id = ?", schoolID)
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}
	if search != "" {
		query = query.Where("name LIKE ? OR category LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	
	var total int64
	query.Model(&models.ClinicConsumable{}).Count(&total)
	
	var consumables []models.ClinicConsumable
	err := query.Order("name ASC").Limit(limit).Offset((page - 1) * limit).Find(&consumables).Error
	
	return consumables, total, err
}

func (s *ClinicService) CreateConsumable(consumable *models.ClinicConsumable, schoolID string) error {
	consumable.SchoolID = uuid.MustParse(schoolID)
	return s.db.Create(consumable).Error
}

func (s *ClinicService) GetConsumable(id, schoolID string) (*models.ClinicConsumable, error) {
	var consumable models.ClinicConsumable
	err := s.db.Where("id = ? AND school_id = ?", id, schoolID).First(&consumable).Error
	return &consumable, err
}

func (s *ClinicService) UpdateConsumable(id, schoolID string, updates *models.ClinicConsumable) error {
	return s.db.Model(&models.ClinicConsumable{}).Where("id = ? AND school_id = ?", id, schoolID).Updates(updates).Error
}

func (s *ClinicService) DeleteConsumable(id, schoolID string) error {
	return s.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.ClinicConsumable{}).Error
}

func (s *ClinicService) CreateIncident(incident *models.EmergencyIncident) error {
	if err := s.db.Create(incident).Error; err != nil {
		return err
	}
	s.db.Preload("Student").First(incident, incident.ID)
	return nil
}

func (s *ClinicService) GetIncidents(schoolID, term, year, studentID string) ([]models.EmergencyIncident, error) {
	query := s.db.Where("school_id = ?", schoolID)
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if year != "" {
		query = query.Where("year = ?", year)
	}
	if studentID != "" {
		query = query.Where("student_id = ?", studentID)
	}
	
	var incidents []models.EmergencyIncident
	err := query.Preload("Student").Order("incident_date DESC").Find(&incidents).Error
	
	// Load current class for each student
	for i := range incidents {
		if incidents[i].Student != nil {
			var class models.Class
			err := s.db.Table("classes").
				Select("classes.*").
				Joins("INNER JOIN enrollments ON enrollments.class_id = classes.id").
				Where("enrollments.student_id = ? AND enrollments.status = ?", incidents[i].Student.ID, "active").
				Order("enrollments.year DESC, enrollments.term DESC").
				First(&class).Error
			if err == nil {
				incidents[i].Student.Class = &class
			}
		}
	}
	return incidents, err
}

func (s *ClinicService) GetIncident(id, schoolID string) (*models.EmergencyIncident, error) {
	var incident models.EmergencyIncident
	if err := s.db.Preload("Student").Where("id = ? AND school_id = ?", id, schoolID).First(&incident).Error; err != nil {
		return nil, err
	}
	
	// Load student class
	if incident.Student != nil {
		var class models.Class
		err := s.db.Table("classes").
			Select("classes.*").
			Joins("INNER JOIN enrollments ON enrollments.class_id = classes.id").
			Where("enrollments.student_id = ? AND enrollments.status = ?", incident.Student.ID, "active").
			Order("enrollments.year DESC, enrollments.term DESC").
			First(&class).Error
		if err == nil {
			incident.Student.Class = &class
		}
	}
	return &incident, nil
}

func (s *ClinicService) UpdateIncident(id, schoolID string, updates *models.EmergencyIncident) error {
	return s.db.Model(&models.EmergencyIncident{}).Where("id = ? AND school_id = ?", id, schoolID).Updates(updates).Error
}

func (s *ClinicService) DeleteIncident(id, schoolID string) error {
	return s.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.EmergencyIncident{}).Error
}

func (s *ClinicService) RecordConsumableUsage(usage *models.ConsumableUsage) error {
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()
	
	// Update consumable quantity
	var consumable models.ClinicConsumable
	if err := tx.First(&consumable, usage.ConsumableID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("Consumable not found")
	}
	
	if consumable.Quantity < usage.QuantityUsed {
		tx.Rollback()
		return fmt.Errorf("Insufficient quantity")
	}
	
	consumable.Quantity -= usage.QuantityUsed
	if err := tx.Save(&consumable).Error; err != nil {
		tx.Rollback()
		return err
	}
	
	// Create usage record
	if err := tx.Create(usage).Error; err != nil {
		tx.Rollback()
		return err
	}
	
	if err := tx.Commit().Error; err != nil {
		return err
	}
	
	s.db.Preload("Consumable").First(usage, usage.ID)
	return nil
}

func (s *ClinicService) GetConsumableUsage(schoolID, consumableID, visitID string, page, limit int) ([]models.ConsumableUsage, int64, error) {
	query := s.db.Where("consumable_usages.school_id = ?", schoolID)
	if consumableID != "" {
		query = query.Where("consumable_usages.consumable_id = ?", consumableID)
	}
	if visitID != "" {
		query = query.Where("consumable_usages.visit_id = ?", visitID)
	}
	
	var total int64
	query.Model(&models.ConsumableUsage{}).Count(&total)
	
	var usages []models.ConsumableUsage
	err := query.Preload("Consumable").Preload("Nurse").
		Order("used_at DESC").Limit(limit).Offset((page - 1) * limit).Find(&usages).Error
	
	return usages, total, err
}

func (s *ClinicService) GetReportData(schoolID, reportType, term, year string) (map[string]interface{}, error) {
	var startDate time.Time
	now := time.Now()
	applyDateFilter := true
	
	// Adjust date ranges to capture more data
	switch reportType {
	case "all":
		// No date filter for all time
		applyDateFilter = false
	case "daily":
		startDate = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	case "weekly":
		startDate = now.AddDate(0, 0, -7)
	case "monthly":
		startDate = now.AddDate(0, -1, 0)
	case "termly":
		// For termly, get all data from the current academic year
		startDate = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
	default:
		// Default to all time
		applyDateFilter = false
	}
	
	// Get visits
	var visits []models.ClinicVisit
	visitQuery := s.db.Where("clinic_visits.school_id = ?", schoolID).
		Preload("Student").Preload("Student.Class")
	
	// Only apply date filter if needed
	if applyDateFilter {
		visitQuery = visitQuery.Where("clinic_visits.visit_date >= ?", startDate)
	}
	
	if term != "" {
		visitQuery = visitQuery.Where("clinic_visits.term = ?", term)
	}
	if year != "" {
		visitQuery = visitQuery.Where("clinic_visits.year = ?", year)
	}
	visitQuery.Order("visit_date DESC").Find(&visits)
	
	// Load current class for each student
	for i := range visits {
		if visits[i].Student != nil {
			var class models.Class
			err := s.db.Table("classes").
				Select("classes.*").
				Joins("INNER JOIN enrollments ON enrollments.class_id = classes.id").
				Where("enrollments.student_id = ? AND enrollments.status = ?", visits[i].Student.ID, "active").
				Order("enrollments.year DESC, enrollments.term DESC").
				First(&class).Error
			if err == nil {
				visits[i].Student.Class = &class
			}
		}
	}
	
	// Get visits by complaint - parse comma-separated symptoms
	type ComplaintCount struct {
		Complaint string `json:"complaint"`
		Count     int64  `json:"count"`
	}
	
	// First, get all visits with symptoms
	var visitsWithSymptoms []struct {
		Symptoms string
	}
	symptomsQuery := s.db.Table("clinic_visits").
		Select("symptoms").
		Where("school_id = ? AND symptoms IS NOT NULL AND symptoms != ''", schoolID)
	
	if applyDateFilter {
		symptomsQuery = symptomsQuery.Where("visit_date >= ?", startDate)
	}
	
	symptomsQuery.Scan(&visitsWithSymptoms)
	
	// Parse and count individual complaints
	complaintMap := make(map[string]int64)
	for _, visit := range visitsWithSymptoms {
		// Split by comma and count each symptom
		symptoms := strings.Split(visit.Symptoms, ",")
		for _, symptom := range symptoms {
			// Trim whitespace and normalize to title case
			symptom = strings.TrimSpace(symptom)
			if symptom != "" {
				// Normalize: lowercase first, then title case for consistent counting
				normalizedSymptom := strings.Title(strings.ToLower(symptom))
				complaintMap[normalizedSymptom]++
			}
		}
	}
	
	// Convert map to slice and sort by count
	var visitsByComplaint []ComplaintCount
	for complaint, count := range complaintMap {
		visitsByComplaint = append(visitsByComplaint, ComplaintCount{
			Complaint: complaint,
			Count:     count,
		})
	}
	
	// Sort by count descending
	sort.Slice(visitsByComplaint, func(i, j int) bool {
		return visitsByComplaint[i].Count > visitsByComplaint[j].Count
	})
	
	// Limit to top 10
	if len(visitsByComplaint) > 10 {
		visitsByComplaint = visitsByComplaint[:10]
	}
	
	// Get medication usage
	type MedicationUsage struct {
		MedicineName string `json:"medicine_name"`
		TotalGiven   int64  `json:"total_given"`
	}
	var medicationUsage []MedicationUsage
	medQuery := s.db.Table("medication_administrations").
		Select("medicines.name as medicine_name, SUM(medication_administrations.quantity_given) as total_given").
		Joins("INNER JOIN medicines ON medicines.id = medication_administrations.medicine_id").
		Where("medication_administrations.school_id = ?", schoolID)
	
	if applyDateFilter {
		medQuery = medQuery.Where("medication_administrations.administered_at >= ?", startDate)
	}
	
	medQuery.Group("medicines.name").
		Order("total_given DESC").
		Limit(10).
		Scan(&medicationUsage)
	
	// Get medicines inventory
	var medicines []models.Medicine
	s.db.Where("school_id = ?", schoolID).Order("name ASC").Find(&medicines)
	
	// Get emergency incidents
	var incidents []models.EmergencyIncident
	incidentQuery := s.db.Where("emergency_incidents.school_id = ?", schoolID).
		Preload("Student")
	
	if applyDateFilter {
		incidentQuery = incidentQuery.Where("emergency_incidents.incident_date >= ?", startDate)
	}
	
	if term != "" {
		incidentQuery = incidentQuery.Where("emergency_incidents.term = ?", term)
	}
	if year != "" {
		incidentQuery = incidentQuery.Where("emergency_incidents.year = ?", year)
	}
	incidentQuery.Order("incident_date DESC").Find(&incidents)
	
	// Load current class for each incident student
	for i := range incidents {
		if incidents[i].Student != nil {
			var class models.Class
			err := s.db.Table("classes").
				Select("classes.*").
				Joins("INNER JOIN enrollments ON enrollments.class_id = classes.id").
				Where("enrollments.student_id = ? AND enrollments.status = ?", incidents[i].Student.ID, "active").
				Order("enrollments.year DESC, enrollments.term DESC").
				First(&class).Error
			if err == nil {
				incidents[i].Student.Class = &class
			}
		}
	}
	
	return map[string]interface{}{
		"visits":              visits,
		"visits_by_complaint": visitsByComplaint,
		"medication_usage":    medicationUsage,
		"medicines":           medicines,
		"incidents":           incidents,
		"report_type":         reportType,
		"start_date":          startDate,
		"generated_at":        time.Now(),
	}, nil
}
