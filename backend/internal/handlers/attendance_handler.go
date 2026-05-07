package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
)

type AttendanceHandler struct {
	svc *services.AttendanceService
}

func NewAttendanceHandler(svc *services.AttendanceService) *AttendanceHandler {
	return &AttendanceHandler{svc: svc}
}

func (h *AttendanceHandler) MarkAttendance(c *gin.Context) {
	var req services.MarkAttendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	attendance, updated, err := h.svc.MarkSingle(c.GetString("tenant_school_id"), c.GetString("user_id"), req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "invalid date format" || err.Error() == "class not found" {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	if updated {
		c.JSON(http.StatusOK, attendance)
	} else {
		c.JSON(http.StatusCreated, attendance)
	}
}

func (h *AttendanceHandler) BulkMarkAttendance(c *gin.Context) {
	var req services.BulkMarkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.BulkMark(
		c.GetString("tenant_school_id"),
		c.GetString("user_id"),
		c.GetString("user_role"),
		req,
	); err != nil {
		status := http.StatusInternalServerError
		msg := err.Error()
		if msg == "invalid date format" || msg == "class not found" {
			status = http.StatusBadRequest
		} else if msg == "cannot mark attendance on weekends" || containsPrefix(msg, "cannot mark attendance on holidays") {
			status = http.StatusBadRequest
		} else if containsPrefix(msg, "you are not") || containsPrefix(msg, "attendance already marked") {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": msg})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Attendance marked successfully"})
}

func (h *AttendanceHandler) GetAttendance(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))

	attendances, total, err := h.svc.GetAttendance(
		c.GetString("tenant_school_id"),
		c.Query("class_id"),
		c.Query("student_id"),
		c.Query("date"),
		c.Query("start_date"),
		c.Query("end_date"),
		page, limit,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"attendances": attendances,
		"total":       total,
		"page":        page,
		"limit":       limit,
	})
}

func (h *AttendanceHandler) GetAttendanceByDate(c *gin.Context) {
	classID := c.Query("class_id")
	dateStr := c.Query("date")
	if classID == "" || dateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_id and date are required"})
		return
	}

	result, err := h.svc.GetAttendanceByDate(c.GetString("tenant_school_id"), classID, dateStr)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "invalid date format. Use YYYY-MM-DD" {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

func (h *AttendanceHandler) GetAttendanceStats(c *gin.Context) {
	stats, err := h.svc.GetStats(
		c.GetString("tenant_school_id"),
		c.Query("class_id"),
		c.Query("student_id"),
		c.Query("start_date"),
		c.Query("end_date"),
		c.Query("period"),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *AttendanceHandler) GetClassAttendanceSummary(c *gin.Context) {
	classID := c.Query("class_id")
	if classID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_id is required"})
		return
	}

	summary, err := h.svc.GetClassSummary(
		c.GetString("tenant_school_id"),
		classID,
		c.Query("period"),
		c.Query("start_date"),
		c.Query("end_date"),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"summary": summary})
}

func (h *AttendanceHandler) GetStudentAttendanceHistory(c *gin.Context) {
	studentID := c.Param("student_id")
	if studentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "student_id is required"})
		return
	}

	result, err := h.svc.GetStudentHistory(
		c.GetString("tenant_school_id"),
		studentID,
		c.Query("period"),
		c.Query("start_date"),
		c.Query("end_date"),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *AttendanceHandler) GetAttendanceReport(c *gin.Context) {
	classID := c.Query("class_id")
	if classID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_id is required"})
		return
	}

	report, err := h.svc.GetReport(
		c.GetString("tenant_school_id"),
		classID,
		c.Query("period"),
		c.Query("start_date"),
		c.Query("end_date"),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, report)
}

func (h *AttendanceHandler) DeleteAttendance(c *gin.Context) {
	if err := h.svc.DeleteAttendance(c.Param("id"), c.GetString("tenant_school_id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Attendance deleted successfully"})
}

func (h *AttendanceHandler) AddHoliday(c *gin.Context) {
	var req services.HolidayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	calendar, err := h.svc.AddHoliday(c.GetString("tenant_school_id"), req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "invalid date format" {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, calendar)
}

func (h *AttendanceHandler) GetHolidays(c *gin.Context) {
	holidays, err := h.svc.GetHolidays(
		c.GetString("tenant_school_id"),
		c.Query("year"),
		c.Query("term"),
		c.Query("start_date"),
		c.Query("end_date"),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"holidays": holidays})
}

func (h *AttendanceHandler) DeleteHoliday(c *gin.Context) {
	if err := h.svc.DeleteHoliday(c.Param("id"), c.GetString("tenant_school_id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Holiday deleted successfully"})
}

func containsPrefix(s, prefix string) bool {
	return len(s) >= len(prefix) && s[:len(prefix)] == prefix
}
