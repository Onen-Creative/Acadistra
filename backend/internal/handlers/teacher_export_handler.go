package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
)

type TeacherExportHandler struct {
	service *services.TeacherExportService
}

func NewTeacherExportHandler(service *services.TeacherExportService) *TeacherExportHandler {
	return &TeacherExportHandler{service: service}
}

func (h *TeacherExportHandler) ExportTeachers(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	f, err := h.service.ExportTeachersToExcel(schoolID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to export teachers"})
		return
	}

	filename := "teachers_export.xlsx"
	c.Writer.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Writer.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Writer.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Writer.WriteHeader(http.StatusOK)
	f.Write(c.Writer)
}
