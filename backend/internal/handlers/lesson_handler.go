package handlers

import (
	"net/http"
	"time"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type LessonHandler struct {
	db *gorm.DB
}

func NewLessonHandler(db *gorm.DB) *LessonHandler {
	return &LessonHandler{db: db}
}

func (h *LessonHandler) GetSchoolSubjects(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		schoolID = c.GetString("school_id")
	}
	
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID not found"})
		return
	}
	
	var school models.School
	if err := h.db.First(&school, "id = ?", schoolID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "School not found"})
		return
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
	
	// Auto-fix: If no levels configured, set them based on school type
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
	
	// If still no levels, return empty array
	if len(levels) == 0 {
		c.JSON(http.StatusOK, []models.StandardSubject{})
		return
	}
	
	// Fetch subjects for configured levels
	var allSubjects []models.StandardSubject
	if err := h.db.Where("level IN ?", levels).Order("name").Find(&allSubjects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	// Deduplicate by name (keep first occurrence)
	seen := make(map[string]bool)
	var subjects []models.StandardSubject
	for _, subject := range allSubjects {
		if !seen[subject.Name] {
			seen[subject.Name] = true
			subjects = append(subjects, subject)
		}
	}
	
	c.JSON(http.StatusOK, subjects)
}

func (h *LessonHandler) GetSchoolTeachers(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		schoolID = c.GetString("school_id")
	}
	
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID not found"})
		return
	}
	
	var teachers []models.Staff
	if err := h.db.Where("school_id = ? AND role = ? AND status = ?", schoolID, "teacher", "active").Find(&teachers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch teachers"})
		return
	}
	
	c.JSON(http.StatusOK, teachers)
}

func (h *LessonHandler) CreateLesson(c *gin.Context) {
	schoolID := c.GetString("school_id")
	userID := c.GetString("user_id")

	var req struct {
		ClassID         string `json:"class_id" binding:"required"`
		SubjectID       string `json:"subject_id" binding:"required"`
		TeacherID       string `json:"teacher_id" binding:"required"`
		LessonDate      string `json:"lesson_date" binding:"required"`
		LessonTime      string `json:"lesson_time" binding:"required"`
		DurationMinutes int    `json:"duration_minutes"`
		Topic           string `json:"topic" binding:"required"`
		SubTopic        string `json:"sub_topic"`
		Status          string `json:"status" binding:"required,oneof=completed missed"`
		ReasonMissed    string `json:"reason_missed"`
		Notes           string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	lessonDate, err := time.Parse("2006-01-02", req.LessonDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid lesson date format"})
		return
	}

	teacherID, err := uuid.Parse(req.TeacherID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid teacher ID"})
		return
	}

	recorderID, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
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

	if err := h.db.Create(&lesson).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create lesson record"})
		return
	}

	h.db.Preload("Class").Preload("Subject").Preload("Teacher").First(&lesson, lesson.ID)
	c.JSON(http.StatusCreated, lesson)
}

func (h *LessonHandler) ListLessons(c *gin.Context) {
	schoolID := c.GetString("school_id")
	classID := c.Query("class_id")
	subjectID := c.Query("subject_id")
	teacherID := c.Query("teacher_id")
	status := c.Query("status")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	query := h.db.Where("school_id = ?", schoolID).
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
	if err := query.Order("lesson_date DESC, lesson_time DESC").Find(&lessons).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch lessons"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"lessons": lessons})
}

func (h *LessonHandler) GetLesson(c *gin.Context) {
	schoolID := c.GetString("school_id")
	lessonID := c.Param("id")

	var lesson models.LessonRecord
	if err := h.db.Where("id = ? AND school_id = ?", lessonID, schoolID).
		Preload("Class").
		Preload("Subject").
		Preload("Teacher").
		Preload("Recorder").
		First(&lesson).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lesson not found"})
		return
	}

	c.JSON(http.StatusOK, lesson)
}

func (h *LessonHandler) UpdateLesson(c *gin.Context) {
	schoolID := c.GetString("school_id")
	lessonID := c.Param("id")

	var lesson models.LessonRecord
	if err := h.db.Where("id = ? AND school_id = ?", lessonID, schoolID).First(&lesson).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lesson not found"})
		return
	}

	var req struct {
		LessonTime      string `json:"lesson_time"`
		DurationMinutes int    `json:"duration_minutes"`
		Topic           string `json:"topic"`
		SubTopic        string `json:"sub_topic"`
		Status          string `json:"status"`
		ReasonMissed    string `json:"reason_missed"`
		Notes           string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.LessonTime != "" {
		lesson.LessonTime = req.LessonTime
	}
	if req.DurationMinutes > 0 {
		lesson.DurationMinutes = req.DurationMinutes
	}
	if req.Topic != "" {
		lesson.Topic = req.Topic
	}
	if req.SubTopic != "" {
		lesson.SubTopic = req.SubTopic
	}
	if req.Status != "" {
		lesson.Status = req.Status
	}
	if req.ReasonMissed != "" {
		lesson.ReasonMissed = req.ReasonMissed
	}
	if req.Notes != "" {
		lesson.Notes = req.Notes
	}

	if err := h.db.Save(&lesson).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update lesson"})
		return
	}

	h.db.Preload("Class").Preload("Subject").Preload("Teacher").First(&lesson, lesson.ID)
	c.JSON(http.StatusOK, lesson)
}

func (h *LessonHandler) DeleteLesson(c *gin.Context) {
	schoolID := c.GetString("school_id")
	lessonID := c.Param("id")

	result := h.db.Where("id = ? AND school_id = ?", lessonID, schoolID).Delete(&models.LessonRecord{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete lesson"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lesson not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Lesson deleted successfully"})
}

func (h *LessonHandler) GetStats(c *gin.Context) {
	schoolID := c.GetString("school_id")
	period := c.Query("period") // today, this_week, this_month, this_term

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

	var stats struct {
		TotalLessons     int64 `json:"total_lessons"`
		CompletedLessons int64 `json:"completed_lessons"`
		MissedLessons    int64 `json:"missed_lessons"`
	}

	h.db.Model(&models.LessonRecord{}).
		Where("school_id = ? AND lesson_date >= ?", schoolID, dateFrom).
		Count(&stats.TotalLessons)

	h.db.Model(&models.LessonRecord{}).
		Where("school_id = ? AND lesson_date >= ? AND status = ?", schoolID, dateFrom, "completed").
		Count(&stats.CompletedLessons)

	h.db.Model(&models.LessonRecord{}).
		Where("school_id = ? AND lesson_date >= ? AND status = ?", schoolID, dateFrom, "missed").
		Count(&stats.MissedLessons)

	c.JSON(http.StatusOK, stats)
}

func (h *LessonHandler) ExportReport(c *gin.Context) {
	schoolID := c.GetString("school_id")
	period := c.Query("period") // today, this_week, last_week, this_month, last_month, this_term, last_term, this_year

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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period"})
		return
	}

	var lessons []models.LessonRecord
	if err := h.db.Where("school_id = ? AND lesson_date >= ? AND lesson_date < ?", schoolID, dateFrom, dateTo).
		Preload("Class").
		Preload("Subject").
		Preload("Teacher").
		Order("lesson_date DESC, lesson_time DESC").
		Find(&lessons).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch lessons"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"lessons":   lessons,
		"period":    period,
		"date_from": dateFrom.Format("2006-01-02"),
		"date_to":   dateTo.Format("2006-01-02"),
	})
}
