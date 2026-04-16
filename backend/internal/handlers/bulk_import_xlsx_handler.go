package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/services"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type BulkImportXLSXHandler struct {
	service *services.BulkImportXLSXService
	db      *gorm.DB
}

func NewBulkImportXLSXHandler(db *gorm.DB) *BulkImportXLSXHandler {
	return &BulkImportXLSXHandler{
		service: services.NewBulkImportXLSXService(db),
		db:      db,
	}
}

// DownloadStudentTemplate generates XLSX template
func (h *BulkImportXLSXHandler) DownloadStudentTemplate(c *gin.Context) {
	classID := c.Query("class_id")
	year := c.Query("year")
	term := c.Query("term")
	
	log.Printf("[DEBUG] DownloadStudentTemplate - classID: %s, year: %s, term: %s", classID, year, term)
	
	if classID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_id is required"})
		return
	}

	// Get class info for filename
	var class struct {
		Name  string `gorm:"column:name"`
		Level string `gorm:"column:level"`
	}
	if err := h.db.Table("classes").Select("name, level").Where("id = ?", classID).First(&class).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Class not found"})
		return
	}
	
	log.Printf("[DEBUG] Class info - Name: %s, Level: %s", class.Name, class.Level)

	file, err := h.service.GenerateStudentTemplate(uuid.MustParse(classID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Generate descriptive filename
	var filename string
	if year != "" && term != "" {
		// Format: student_import_ClassName_Level_Year_Term.xlsx
		filename = fmt.Sprintf("student_import_%s_%s_%s_%s.xlsx", class.Name, class.Level, year, term)
	} else {
		// Format: student_import_ClassName_Level.xlsx
		filename = fmt.Sprintf("student_import_%s_%s.xlsx", class.Name, class.Level)
	}
	// Sanitize filename (remove spaces and special chars)
	filename = sanitizeFilename(filename)
	
	log.Printf("[DEBUG] Generated filename: %s", filename)

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	
	if err := file.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write file"})
	}
}

// DownloadMarksTemplate generates XLSX template with student list
func (h *BulkImportXLSXHandler) DownloadMarksTemplate(c *gin.Context) {
	classID := c.Query("class_id")
	classLevel := c.Query("class_level") // Fallback for backward compatibility
	subjectID := c.Query("subject_id")
	examType := c.DefaultQuery("exam_type", "BOT")
	term := c.Query("term")
	yearStr := c.Query("year")
	schoolID := c.GetString("tenant_school_id")

	// If class_id is provided, get the level from the class
	if classID != "" {
		var class struct {
			Level string `gorm:"column:level"`
		}
		if err := h.db.Table("classes").Select("level").Where("id = ?", classID).First(&class).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Class not found"})
			return
		}
		classLevel = class.Level
	}

	if classLevel == "" || subjectID == "" || term == "" || yearStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_id or class_level, subject_id, term, and year are required"})
		return
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid year"})
		return
	}

	file, err := h.service.GenerateMarksTemplateByLevel(
		uuid.MustParse(schoolID),
		classLevel,
		uuid.MustParse(subjectID),
		examType,
		term,
		year,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=marks_import_template.xlsx")
	
	if err := file.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write file"})
	}
}

// UploadStudents uploads and validates student XLSX
func (h *BulkImportXLSXHandler) UploadStudents(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")
	classID := c.PostForm("class_id")

	if classID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_id is required"})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		return
	}

	if !isXLSXFile(fileHeader.Filename) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only XLSX files are allowed"})
		return
	}

	if fileHeader.Size > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 10MB"})
		return
	}

	f, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer f.Close()

	file, err := excelize.OpenReader(f)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid XLSX file"})
		return
	}

	result, err := h.service.ParseStudentXLSX(file, uuid.MustParse(schoolID), uuid.MustParse(classID), uuid.MustParse(userID))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "File uploaded and validated",
		"import":  result,
	})
}

// UploadMarks uploads and validates marks XLSX
func (h *BulkImportXLSXHandler) UploadMarks(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")

	classID := c.PostForm("class_id")
	classLevel := c.PostForm("class_level") // Fallback for backward compatibility
	subjectID := c.PostForm("subject_id")
	examType := c.PostForm("exam_type")
	term := c.PostForm("term")
	yearStr := c.PostForm("year")

	// If class_id is provided, get the level from the class
	if classID != "" {
		var class struct {
			Level string `gorm:"column:level"`
		}
		if err := h.db.Table("classes").Select("level").Where("id = ?", classID).First(&class).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Class not found"})
			return
		}
		classLevel = class.Level
	}

	if classLevel == "" || subjectID == "" || examType == "" || term == "" || yearStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_id or class_level, subject_id, exam_type, term, and year are required"})
		return
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid year"})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		return
	}

	if !isXLSXFile(fileHeader.Filename) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only XLSX files are allowed"})
		return
	}

	if fileHeader.Size > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 10MB"})
		return
	}

	f, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer f.Close()

	file, err := excelize.OpenReader(f)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid XLSX file"})
		return
	}

	result, err := h.service.ParseMarksXLSXByLevel(
		file,
		uuid.MustParse(schoolID),
		classLevel,
		uuid.MustParse(subjectID),
		examType,
		term,
		year,
		uuid.MustParse(userID),
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "File uploaded and validated",
		"import":  result,
	})
}

// ListImports lists pending imports
func (h *BulkImportXLSXHandler) ListImports(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	status := c.DefaultQuery("status", "pending")

	var imports []struct {
		ID          string `json:"id"`
		ImportType  string `json:"import_type"`
		Status      string `json:"status"`
		TotalRows   int    `json:"total_rows"`
		ValidRows   int    `json:"valid_rows"`
		InvalidRows int    `json:"invalid_rows"`
		UploadedBy  string `json:"uploaded_by"`
		CreatedAt   string `json:"created_at"`
	}

	h.db.Table("bulk_imports").
		Select("id, import_type, status, total_rows, valid_rows, invalid_rows, uploaded_by, created_at").
		Where("school_id = ? AND status = ?", schoolID, status).
		Order("created_at DESC").
		Scan(&imports)

	c.JSON(http.StatusOK, gin.H{"imports": imports})
}

// GetImportDetails gets import details for review
func (h *BulkImportXLSXHandler) GetImportDetails(c *gin.Context) {
	importID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var bulkImport struct {
		ID          string `json:"id"`
		ImportType  string `json:"import_type"`
		Status      string `json:"status"`
		TotalRows   int    `json:"total_rows"`
		ValidRows   int    `json:"valid_rows"`
		InvalidRows int    `json:"invalid_rows"`
		Errors      string `json:"errors"`
		Data        string `json:"data"`
		Metadata    string `json:"metadata"`
		CreatedAt   string `json:"created_at"`
	}

	if err := h.db.Table("bulk_imports").
		Where("id = ? AND school_id = ?", importID, schoolID).
		First(&bulkImport).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Import not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"import": bulkImport})
}

// ApproveImport approves and executes import
func (h *BulkImportXLSXHandler) ApproveImport(c *gin.Context) {
	importID := c.Param("id")
	userID := c.GetString("user_id")

	if err := h.service.ApproveImport(uuid.MustParse(importID), uuid.MustParse(userID)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Import approved and executed successfully"})
}

// RejectImport rejects import
func (h *BulkImportXLSXHandler) RejectImport(c *gin.Context) {
	importID := c.Param("id")

	if err := h.service.RejectImport(uuid.MustParse(importID)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Import rejected"})
}

func isXLSXFile(filename string) bool {
	return len(filename) > 5 && (filename[len(filename)-5:] == ".xlsx" || filename[len(filename)-4:] == ".xls")
}

func sanitizeFilename(filename string) string {
	// Replace spaces with underscores and remove special characters
	filename = strings.ReplaceAll(filename, " ", "_")
	filename = strings.ReplaceAll(filename, "/", "_")
	filename = strings.ReplaceAll(filename, "\\", "_")
	return filename
}
