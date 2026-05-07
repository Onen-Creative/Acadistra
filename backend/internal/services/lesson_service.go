package services

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type LessonService struct {
	repo repositories.LessonRepository
	db   *gorm.DB
}

func NewLessonService(repo repositories.LessonRepository, db *gorm.DB) *LessonService {
	return &LessonService{repo: repo, db: db}
}

func (s *LessonService) CreateLesson(lesson *models.Lesson) error {
	return s.repo.Create(lesson)
}

func (s *LessonService) GetLessons(schoolID, teacherID, classID, subjectID, term, year string) ([]models.Lesson, error) {
	schoolUUID, _ := uuid.Parse(schoolID)
	filters := make(map[string]interface{})
	
	if teacherID != "" {
		filters["teacher_id"] = teacherID
	}
	if classID != "" {
		filters["class_id"] = classID
	}
	if subjectID != "" {
		filters["subject_id"] = subjectID
	}
	if term != "" {
		filters["term"] = term
	}
	if year != "" {
		filters["year"] = year
	}
	
	return s.repo.FindByFilters(schoolUUID, filters)
}

func (s *LessonService) GetLessonByID(id, schoolID string) (*models.Lesson, error) {
	idUUID, _ := uuid.Parse(id)
	schoolUUID, _ := uuid.Parse(schoolID)
	return s.repo.FindByID(idUUID, schoolUUID)
}

func (s *LessonService) UpdateLesson(id, schoolID string, updates map[string]interface{}) error {
	idUUID, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	schoolUUID, err := uuid.Parse(schoolID)
	if err != nil {
		return err
	}
	
	lesson, err := s.repo.FindByID(idUUID, schoolUUID)
	if err != nil {
		return err
	}
	
	for key, value := range updates {
		switch key {
		case "date":
			if v, ok := value.(string); ok {
				lesson.Date = v
			}
		case "period":
			if v, ok := value.(int); ok {
				lesson.Period = v
			}
		case "status":
			if v, ok := value.(string); ok {
				lesson.Status = v
			}
		case "notes":
			if v, ok := value.(string); ok {
				lesson.Notes = v
			}
		}
	}
	
	return s.repo.Update(lesson)
}

func (s *LessonService) DeleteLesson(id, schoolID string) error {
	idUUID, _ := uuid.Parse(id)
	schoolUUID, _ := uuid.Parse(schoolID)
	return s.repo.Delete(idUUID, schoolUUID)
}

func (s *LessonService) GetTeacherSchedule(teacherID, schoolID, date string) ([]models.Lesson, error) {
	teacherUUID, _ := uuid.Parse(teacherID)
	schoolUUID, _ := uuid.Parse(schoolID)
	return s.repo.FindByTeacher(teacherUUID, schoolUUID, date)
}

func (s *LessonService) GetClassSchedule(classID, schoolID, date string) ([]models.Lesson, error) {
	classUUID, _ := uuid.Parse(classID)
	schoolUUID, _ := uuid.Parse(schoolID)
	return s.repo.FindByClass(classUUID, schoolUUID, date)
}

func (s *LessonService) CreateLessonPlan(plan *models.LessonPlan) error {
	return s.repo.CreatePlan(plan)
}

func (s *LessonService) GetLessonPlans(schoolID, teacherID, subjectID, term, year string) ([]models.LessonPlan, error) {
	schoolUUID, _ := uuid.Parse(schoolID)
	filters := make(map[string]interface{})
	
	if teacherID != "" {
		filters["teacher_id"] = teacherID
	}
	if subjectID != "" {
		filters["subject_id"] = subjectID
	}
	if term != "" {
		filters["term"] = term
	}
	if year != "" {
		filters["year"] = year
	}
	
	return s.repo.FindPlansByFilters(schoolUUID, filters)
}

func (s *LessonService) UpdateLessonPlan(id, schoolID string, updates map[string]interface{}) error {
	idUUID, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	schoolUUID, err := uuid.Parse(schoolID)
	if err != nil {
		return err
	}
	
	filters := map[string]interface{}{"id": idUUID}
	plans, err := s.repo.FindPlansByFilters(schoolUUID, filters)
	if err != nil || len(plans) == 0 {
		return err
	}
	
	plan := &plans[0]
	for key, value := range updates {
		switch key {
		case "week":
			if v, ok := value.(int); ok {
				plan.Week = v
			}
		case "topic":
			if v, ok := value.(string); ok {
				plan.Topic = v
			}
		case "objectives":
			if v, ok := value.(string); ok {
				plan.Objectives = v
			}
		case "activities":
			if v, ok := value.(string); ok {
				plan.Activities = v
			}
		}
	}
	
	return s.repo.UpdatePlan(plan)
}

func (s *LessonService) DeleteLessonPlan(id, schoolID string) error {
	idUUID, _ := uuid.Parse(id)
	schoolUUID, _ := uuid.Parse(schoolID)
	return s.repo.DeletePlan(idUUID, schoolUUID)
}

func (s *LessonService) GetTeacherLessonStats(teacherID, schoolID, term, year string) (map[string]interface{}, error) {
	teacherUUID, _ := uuid.Parse(teacherID)
	schoolUUID, _ := uuid.Parse(schoolID)
	return s.repo.GetTeacherStats(teacherUUID, schoolUUID, term, year)
}


func (s *LessonService) GetSchoolSubjects(schoolID string) ([]models.StandardSubject, error) {
	var school models.School
	if err := s.db.First(&school, "id = ?", schoolID).Error; err != nil {
		return nil, errors.New("school not found")
	}
	var levels []string
	if school.Config != nil {
		if configLevels, ok := school.Config["levels"].([]interface{}); ok {
			for _, lvl := range configLevels {
				if level, ok := lvl.(string); ok {
					levels = append(levels, level)
				}
			}
		}
	}
	if len(levels) == 0 && school.Type != "" {
		switch school.Type {
		case "nursery":
			levels = []string{"Baby", "Middle", "Top"}
		case "primary":
			levels = []string{"P1", "P2", "P3", "P4", "P5", "P6", "P7"}
		case "ordinary":
			levels = []string{"S1", "S2", "S3", "S4"}
		case "advanced":
			levels = []string{"S5", "S6"}
		case "secondary":
			levels = []string{"S1", "S2", "S3", "S4", "S5", "S6"}
		}
	}
	if len(levels) == 0 {
		return []models.StandardSubject{}, nil
	}
	var allSubjects []models.StandardSubject
	if err := s.db.Where("level IN ?", levels).Order("name").Find(&allSubjects).Error; err != nil {
		return nil, err
	}
	seen := make(map[string]bool)
	var subjects []models.StandardSubject
	for _, subject := range allSubjects {
		if !seen[subject.Name] {
			seen[subject.Name] = true
			subjects = append(subjects, subject)
		}
	}
	return subjects, nil
}

func (s *LessonService) GetSchoolTeachers(schoolID string) ([]models.Staff, error) {
	var teachers []models.Staff
	err := s.db.Where("school_id = ? AND role = ? AND status = ?", schoolID, "teacher", "active").Find(&teachers).Error
	return teachers, err
}

type CreateLessonRequest struct {
	ClassID         string
	SubjectID       string
	TeacherID       string
	LessonDate      string
	LessonTime      string
	DurationMinutes int
	Topic           string
	SubTopic        string
	Status          string
	ReasonMissed    string
	Notes           string
}

func (s *LessonService) CreateLessonRecord(schoolID, userID string, req CreateLessonRequest) (*models.LessonRecord, error) {
	lessonDate, err := time.Parse("2006-01-02", req.LessonDate)
	if err != nil {
		return nil, errors.New("invalid lesson date format")
	}
	teacherID, err := uuid.Parse(req.TeacherID)
	if err != nil {
		return nil, errors.New("invalid teacher ID")
	}
	recorderID, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}
	duration := req.DurationMinutes
	if duration == 0 {
		duration = 40
	}
	lesson := models.LessonRecord{
		SchoolID:        schoolID,
		ClassID:         req.ClassID,
		SubjectID:       req.SubjectID,
		TeacherID:       teacherID,
		LessonDate:      lessonDate,
		LessonTime:      req.LessonTime,
		DurationMinutes: duration,
		Topic:           req.Topic,
		SubTopic:        req.SubTopic,
		Status:          req.Status,
		ReasonMissed:    req.ReasonMissed,
		Notes:           req.Notes,
		RecordedBy:      recorderID,
	}
	if err := s.db.Create(&lesson).Error; err != nil {
		return nil, err
	}
	s.db.Preload("Class").Preload("Subject").Preload("Teacher").First(&lesson, lesson.ID)
	return &lesson, nil
}

func (s *LessonService) ListLessonRecords(schoolID, classID, subjectID, teacherID, status, dateFrom, dateTo string) ([]models.LessonRecord, error) {
	query := s.db.Where("school_id = ?", schoolID).
		Preload("Class").
		Preload("Subject").
		Preload("Teacher")
	if classID != "" {
		query = query.Where("class_id = ?", classID)
	}
	if subjectID != "" {
		query = query.Where("subject_id = ?", subjectID)
	}
	if teacherID != "" {
		query = query.Where("teacher_id = ?", teacherID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if dateFrom != "" {
		query = query.Where("lesson_date >= ?", dateFrom)
	}
	if dateTo != "" {
		query = query.Where("lesson_date <= ?", dateTo)
	}
	var lessons []models.LessonRecord
	err := query.Order("lesson_date DESC, lesson_time DESC").Find(&lessons).Error
	return lessons, err
}

func (s *LessonService) GetLessonRecord(schoolID, lessonID string) (*models.LessonRecord, error) {
	var lesson models.LessonRecord
	err := s.db.Where("id = ? AND school_id = ?", lessonID, schoolID).
		Preload("Class").
		Preload("Subject").
		Preload("Teacher").
		Preload("Recorder").
		First(&lesson).Error
	if err != nil {
		return nil, errors.New("lesson not found")
	}
	return &lesson, nil
}

func (s *LessonService) UpdateLessonRecord(schoolID, lessonID string, updates map[string]interface{}) (*models.LessonRecord, error) {
	var lesson models.LessonRecord
	if err := s.db.Where("id = ? AND school_id = ?", lessonID, schoolID).First(&lesson).Error; err != nil {
		return nil, errors.New("lesson not found")
	}
	if err := s.db.Model(&lesson).Updates(updates).Error; err != nil {
		return nil, err
	}
	s.db.Preload("Class").Preload("Subject").Preload("Teacher").First(&lesson, lesson.ID)
	return &lesson, nil
}

func (s *LessonService) DeleteLessonRecord(schoolID, lessonID string) error {
	result := s.db.Where("id = ? AND school_id = ?", lessonID, schoolID).Delete(&models.LessonRecord{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("lesson not found")
	}
	return nil
}

func (s *LessonService) GetLessonStats(schoolID, period string) (map[string]int64, error) {
	var dateFrom time.Time
	now := time.Now()
	switch period {
	case "today":
		dateFrom = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	case "this_week":
		weekday := int(now.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		dateFrom = now.AddDate(0, 0, -weekday+1)
		dateFrom = time.Date(dateFrom.Year(), dateFrom.Month(), dateFrom.Day(), 0, 0, 0, 0, dateFrom.Location())
	case "this_month":
		dateFrom = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	default:
		dateFrom = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
	}
	stats := make(map[string]int64)
	var total, completed, missed int64
	s.db.Model(&models.LessonRecord{}).Where("school_id = ? AND lesson_date >= ?", schoolID, dateFrom).Count(&total)
	s.db.Model(&models.LessonRecord{}).Where("school_id = ? AND lesson_date >= ? AND status = ?", schoolID, dateFrom, "completed").Count(&completed)
	s.db.Model(&models.LessonRecord{}).Where("school_id = ? AND lesson_date >= ? AND status = ?", schoolID, dateFrom, "missed").Count(&missed)
	stats["total_lessons"] = total
	stats["completed_lessons"] = completed
	stats["missed_lessons"] = missed
	return stats, nil
}

func (s *LessonService) ExportLessonReport(schoolID, period string) ([]models.LessonRecord, string, string, error) {
	var dateFrom, dateTo time.Time
	now := time.Now()
	switch period {
	case "today":
		dateFrom = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		dateTo = dateFrom.AddDate(0, 0, 1)
	case "this_week":
		weekday := int(now.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		dateFrom = now.AddDate(0, 0, -weekday+1)
		dateFrom = time.Date(dateFrom.Year(), dateFrom.Month(), dateFrom.Day(), 0, 0, 0, 0, dateFrom.Location())
		dateTo = dateFrom.AddDate(0, 0, 7)
	case "last_week":
		weekday := int(now.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		dateFrom = now.AddDate(0, 0, -weekday-6)
		dateFrom = time.Date(dateFrom.Year(), dateFrom.Month(), dateFrom.Day(), 0, 0, 0, 0, dateFrom.Location())
		dateTo = dateFrom.AddDate(0, 0, 7)
	case "this_month":
		dateFrom = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		dateTo = dateFrom.AddDate(0, 1, 0)
	case "last_month":
		dateFrom = time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, now.Location())
		dateTo = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	case "this_year":
		dateFrom = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
		dateTo = time.Date(now.Year()+1, 1, 1, 0, 0, 0, 0, now.Location())
	default:
		return nil, "", "", errors.New("invalid period")
	}
	var lessons []models.LessonRecord
	err := s.db.Where("school_id = ? AND lesson_date >= ? AND lesson_date < ?", schoolID, dateFrom, dateTo).
		Preload("Class").
		Preload("Subject").
		Preload("Teacher").
		Order("lesson_date DESC, lesson_time DESC").
		Find(&lessons).Error
	return lessons, dateFrom.Format("2006-01-02"), dateTo.Format("2006-01-02"), err
}
