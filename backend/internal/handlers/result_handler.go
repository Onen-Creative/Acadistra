package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
)

type ResultHandler struct {
	resultService *services.ResultService
}

func NewResultHandler(resultService *services.ResultService) *ResultHandler {
	return &ResultHandler{
		resultService: resultService,
	}
}

func (h *ResultHandler) GetByStudent(c *gin.Context) {
	studentID := c.Param("id")
	term := c.Query("term")
	year := c.Query("year")
	examType := c.Query("exam_type")
	schoolID := c.GetString("tenant_school_id")

	results, outstandingFees, err := h.resultService.GetStudentResults(studentID, schoolID, term, year, examType)
	if err != nil {
		if err.Error() == "student not found" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Student not found or access denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"results": results, "outstanding_fees": outstandingFees})
}

func (h *ResultHandler) CreateOrUpdate(c *gin.Context) {
	var req models.SubjectResult
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID required"})
		return
	}

	userID := c.GetString("user_id")
	result, err := h.resultService.CreateOrUpdateResult(&req, schoolID, userID)

	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "Student not found or access denied" {
			status = http.StatusForbidden
		} else if err.Error() == "Student not enrolled in any class" {
			status = http.StatusBadRequest
		} else if err.Error() == "Invalid subject - only standard curriculum subjects are allowed" {
			status = http.StatusBadRequest
		} else if err.Error() == "Class not found" {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *ResultHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")
	if err := h.resultService.DeleteResult(id, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Result deleted"})
}

func (h *ResultHandler) RecalculateGrades(c *gin.Context) {
	userRole := c.GetString("user_role")
	if userRole != "system_admin" && userRole != "school_admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only admins can recalculate grades"})
		return
	}

	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")
	level := c.Query("level")

	updated, errors, skipped, err := h.resultService.RecalculateGrades(schoolID, term, year, level)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Grade recalculation completed",
		"updated": updated,
		"errors":  errors,
		"skipped": skipped,
		"total":   updated + errors + skipped,
	})
}

func (h *ResultHandler) GetBulkMarks(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	classID := c.Query("class_id")
	subjectID := c.Query("subject_id")
	term := c.Query("term")
	year := c.Query("year")
	examType := c.Query("exam_type")
	paperStr := c.Query("paper")

	if classID == "" || subjectID == "" || term == "" || year == "" || examType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_id, subject_id, term, year, and exam_type are required"})
		return
	}

	paper := 0
	if paperStr != "" {
		if p, err := strconv.Atoi(paperStr); err == nil {
			paper = p
		}
	}

	marksMap, err := h.resultService.GetBulkMarks(schoolID, classID, subjectID, term, year, examType, paper)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"marks": marksMap})
}

func (h *ResultHandler) GetPerformanceSummary(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")

	if term == "" || year == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "term and year are required"})
		return
	}

	allPerformance, err := h.resultService.GetPerformanceSummary(schoolID, term, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"results": allPerformance})
}

func (h *ResultHandler) GetExamTypes(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	classID := c.Query("class_id")
	term := c.Query("term")
	year := c.Query("year")

	if classID == "" || term == "" || year == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_id, term and year are required"})
		return
	}

	var examTypes []string
	err := h.resultService.GetDB().Raw(`
		SELECT DISTINCT exam_type 
		FROM subject_results 
		WHERE school_id = ? 
			AND class_id = ? 
			AND term = ? 
			AND year = ? 
			AND exam_type IS NOT NULL 
			AND exam_type != ''
			AND deleted_at IS NULL
		ORDER BY exam_type
	`, schoolID, classID, term, year).Scan(&examTypes).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"exam_types": examTypes})
}
