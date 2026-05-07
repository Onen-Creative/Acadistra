package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
)

type StudentExportHandler struct {
	service *services.StudentExportService
}

func NewStudentExportHandler(service *services.StudentExportService) *StudentExportHandler {
	return &StudentExportHandler{service: service}
}

func (h *StudentExportHandler) ExportStudents(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	level := c.Query("level")
	classID := c.Query("class_id")
	year := c.Query("year")
	term := c.Query("term")
	gender := c.Query("gender")
	search := c.Query("search")

	f, err := h.service.ExportStudentsToExcel(schoolID, level, classID, year, term, gender, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to export students"})
		return
	}

	filename := fmt.Sprintf("students_%s_%s_%s.xlsx", level, year, term)
	if level == "" {
		filename = "students_export.xlsx"
	}

	c.Writer.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Writer.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Writer.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Writer.WriteHeader(http.StatusOK)
	f.Write(c.Writer)
}
