package handlers

import (
	"net/http"
	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
)

type LessonHandler struct {
	lessonService *services.LessonService
}

func NewLessonHandler(lessonService *services.LessonService) *LessonHandler {
	return &LessonHandler{lessonService: lessonService}
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
	
	subjects, err := h.lessonService.GetSchoolSubjects(schoolID)
	if err != nil {
		if err.Error() == "school not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
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
	
	teachers, err := h.lessonService.GetSchoolTeachers(schoolID)
	if err != nil {
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

	lessonReq := services.CreateLessonRequest{
		ClassID:         req.ClassID,
		SubjectID:       req.SubjectID,
		TeacherID:       req.TeacherID,
		LessonDate:      req.LessonDate,
		LessonTime:      req.LessonTime,
		DurationMinutes: req.DurationMinutes,
		Topic:           req.Topic,
		SubTopic:        req.SubTopic,
		Status:          req.Status,
		ReasonMissed:    req.ReasonMissed,
		Notes:           req.Notes,
	}

	lesson, err := h.lessonService.CreateLessonRecord(schoolID, userID, lessonReq)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "invalid lesson date format" || err.Error() == "invalid teacher ID" || err.Error() == "invalid user ID" {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

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

	lessons, err := h.lessonService.ListLessonRecords(schoolID, classID, subjectID, teacherID, status, dateFrom, dateTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch lessons"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"lessons": lessons})
}

func (h *LessonHandler) GetLesson(c *gin.Context) {
	schoolID := c.GetString("school_id")
	lessonID := c.Param("id")

	lesson, err := h.lessonService.GetLessonRecord(schoolID, lessonID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, lesson)
}

func (h *LessonHandler) UpdateLesson(c *gin.Context) {
	schoolID := c.GetString("school_id")
	lessonID := c.Param("id")

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

	updates := make(map[string]interface{})
	if req.LessonTime != "" {
		updates["lesson_time"] = req.LessonTime
	}
	if req.DurationMinutes > 0 {
		updates["duration_minutes"] = req.DurationMinutes
	}
	if req.Topic != "" {
		updates["topic"] = req.Topic
	}
	if req.SubTopic != "" {
		updates["sub_topic"] = req.SubTopic
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.ReasonMissed != "" {
		updates["reason_missed"] = req.ReasonMissed
	}
	if req.Notes != "" {
		updates["notes"] = req.Notes
	}

	lesson, err := h.lessonService.UpdateLessonRecord(schoolID, lessonID, updates)
	if err != nil {
		if err.Error() == "lesson not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update lesson"})
		return
	}

	c.JSON(http.StatusOK, lesson)
}

func (h *LessonHandler) DeleteLesson(c *gin.Context) {
	schoolID := c.GetString("school_id")
	lessonID := c.Param("id")

	if err := h.lessonService.DeleteLessonRecord(schoolID, lessonID); err != nil {
		if err.Error() == "lesson not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete lesson"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Lesson deleted successfully"})
}

func (h *LessonHandler) GetStats(c *gin.Context) {
	schoolID := c.GetString("school_id")
	period := c.Query("period")

	stats, err := h.lessonService.GetLessonStats(schoolID, period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

func (h *LessonHandler) ExportReport(c *gin.Context) {
	schoolID := c.GetString("school_id")
	period := c.Query("period")

	lessons, dateFrom, dateTo, err := h.lessonService.ExportLessonReport(schoolID, period)
	if err != nil {
		if err.Error() == "invalid period" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch lessons"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"lessons":   lessons,
		"period":    period,
		"date_from": dateFrom,
		"date_to":   dateTo,
	})
}
