package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type BulkMarksImportHandler struct {
	db *gorm.DB
}

func NewBulkMarksImportHandler(db *gorm.DB) *BulkMarksImportHandler {
	return &BulkMarksImportHandler{db: db}
}

type MarkRow struct {
	StudentID     string  `json:"student_id"`
	AdmissionNo   string  `json:"admission_no"`
	StudentName   string  `json:"student_name"`
	CA            float64 `json:"ca"`
	Exam          float64 `json:"exam"`
}

// UploadMarksForApproval handles Excel upload and creates pending import
func (h *BulkMarksImportHandler) UploadMarksForApproval(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")
	userRole := c.GetString("user_role")

	classID := c.PostForm("class_id")
	subjectID := c.PostForm("subject_id")
	term := c.PostForm("term")
	yearStr := c.PostForm("year")
	examType := c.PostForm("exam_type")

	if classID == "" || subjectID == "" || term == "" || yearStr == "" || examType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required fields"})
		return
	}

	year, _ := strconv.Atoi(yearStr)

	// Check if marks already exist for this combination
	var existingCount int64
	h.db.Model(&models.SubjectResult{}).
		Where("school_id = ? AND class_id = ? AND subject_id = ? AND term = ? AND year = ? AND exam_type = ?",
			schoolID, classID, subjectID, term, year, examType).
		Count(&existingCount)

	if existingCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Marks already exist for this class, subject, term, year, and exam type. Cannot import."})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer src.Close()

	f, err := excelize.OpenReader(src)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Excel file"})
		return
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No sheets found"})
		return
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil || len(rows) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file format"})
		return
	}

	var validMarks []MarkRow
	var errors []string
	totalRows := len(rows) - 1

	for i, row := range rows[1:] {
		if len(row) < 4 {
			errors = append(errors, fmt.Sprintf("Row %d: Insufficient columns", i+2))
			continue
		}

		admissionNo := row[0]
		caStr := row[2]
		examStr := row[3]

		var student models.Student
		if err := h.db.Where("admission_no = ? AND school_id = ?", admissionNo, schoolID).First(&student).Error; err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Student %s not found", i+2, admissionNo))
			continue
		}

		ca, _ := strconv.ParseFloat(caStr, 64)
		exam, _ := strconv.ParseFloat(examStr, 64)

		validMarks = append(validMarks, MarkRow{
			StudentID:   student.ID.String(),
			AdmissionNo: admissionNo,
			StudentName: fmt.Sprintf("%s %s", student.FirstName, student.LastName),
			CA:          ca,
			Exam:        exam,
		})
	}

	marksJSON, _ := json.Marshal(validMarks)
	errorsJSON, _ := json.Marshal(errors)

	marksImport := models.MarksImport{
		SchoolID:    uuid.MustParse(schoolID),
		ClassID:     uuid.MustParse(classID),
		SubjectID:   uuid.MustParse(subjectID),
		Term:        term,
		Year:        year,
		ExamType:    examType,
		Status:      "pending",
		UploadedBy:  uuid.MustParse(userID),
		TotalRows:   totalRows,
		ValidRows:   len(validMarks),
		InvalidRows: len(errors),
		Errors:      string(errorsJSON),
		Data:        string(marksJSON),
	}

	// Teachers need approval, school admins can auto-approve
	if userRole == "school_admin" {
		marksImport.Status = "approved"
		now := time.Now()
		marksImport.ApprovedBy = &marksImport.UploadedBy
		marksImport.ApprovedAt = &now
	}

	if err := h.db.Create(&marksImport).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save import"})
		return
	}

	// If auto-approved, process immediately
	if marksImport.Status == "approved" {
		if err := h.processMarksImport(&marksImport); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process marks"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Import uploaded successfully",
		"import_id":    marksImport.ID,
		"status":       marksImport.Status,
		"total_rows":   totalRows,
		"valid_rows":   len(validMarks),
		"invalid_rows": len(errors),
		"errors":       errors,
	})
}

// ListImports lists all marks imports
func (h *BulkMarksImportHandler) ListImports(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	status := c.Query("status")

	var imports []models.MarksImport
	query := h.db.Where("school_id = ?", schoolID).
		Preload("Class").
		Preload("Subject").
		Preload("Uploader").
		Preload("Approver").
		Order("created_at DESC")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&imports).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch imports"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"imports": imports})
}

// GetImportDetails gets details of a specific import
func (h *BulkMarksImportHandler) GetImportDetails(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	importID := c.Param("id")

	var marksImport models.MarksImport
	if err := h.db.Where("id = ? AND school_id = ?", importID, schoolID).
		Preload("Class").
		Preload("Subject").
		Preload("Uploader").
		Preload("Approver").
		First(&marksImport).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Import not found"})
		return
	}

	var marks []MarkRow
	json.Unmarshal([]byte(marksImport.Data), &marks)

	var errors []string
	json.Unmarshal([]byte(marksImport.Errors), &errors)

	c.JSON(http.StatusOK, gin.H{
		"import": marksImport,
		"marks":  marks,
		"errors": errors,
	})
}

// ApproveImport approves and processes marks import
func (h *BulkMarksImportHandler) ApproveImport(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")
	importID := c.Param("id")

	var marksImport models.MarksImport
	if err := h.db.Where("id = ? AND school_id = ?", importID, schoolID).First(&marksImport).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Import not found"})
		return
	}

	if marksImport.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Import already processed"})
		return
	}

	now := time.Now()
	approverID := uuid.MustParse(userID)
	marksImport.Status = "approved"
	marksImport.ApprovedBy = &approverID
	marksImport.ApprovedAt = &now

	if err := h.db.Save(&marksImport).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve import"})
		return
	}

	if err := h.processMarksImport(&marksImport); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process marks"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Import approved and processed successfully"})
}

// RejectImport rejects marks import
func (h *BulkMarksImportHandler) RejectImport(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")
	importID := c.Param("id")

	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var marksImport models.MarksImport
	if err := h.db.Where("id = ? AND school_id = ?", importID, schoolID).First(&marksImport).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Import not found"})
		return
	}

	if marksImport.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Import already processed"})
		return
	}

	now := time.Now()
	rejectorID := uuid.MustParse(userID)
	marksImport.Status = "rejected"
	marksImport.RejectedBy = &rejectorID
	marksImport.RejectedAt = &now
	marksImport.RejectionReason = req.Reason

	if err := h.db.Save(&marksImport).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject import"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Import rejected successfully"})
}

// processMarksImport processes approved marks and creates results
func (h *BulkMarksImportHandler) processMarksImport(marksImport *models.MarksImport) error {
	var marks []MarkRow
	if err := json.Unmarshal([]byte(marksImport.Data), &marks); err != nil {
		return err
	}

	for _, mark := range marks {
		result := models.SubjectResult{
			StudentID: uuid.MustParse(mark.StudentID),
			SubjectID: marksImport.SubjectID,
			ClassID:   marksImport.ClassID,
			Term:      marksImport.Term,
			Year:      marksImport.Year,
			ExamType:  marksImport.ExamType,
			SchoolID:  marksImport.SchoolID,
			RawMarks: models.JSONB{
				"ca":   mark.CA,
				"exam": mark.Exam,
			},
		}

		if err := h.db.Create(&result).Error; err != nil {
			return err
		}
	}

	return nil
}

// DownloadTemplate generates Excel template
func (h *BulkMarksImportHandler) DownloadTemplate(c *gin.Context) {
	classID := c.Query("class_id")
	
	f := excelize.NewFile()
	defer f.Close()

	sheet := "Marks"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"admission_no", "student_name", "ca", "exam"}
	for i, header := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheet, cell, header)
	}

	// Add sample data if class_id provided
	if classID != "" {
		schoolID := c.GetString("tenant_school_id")
		var students []models.Student
		h.db.Joins("JOIN enrollments ON enrollments.student_id = students.id").
			Where("enrollments.class_id = ? AND students.school_id = ?", classID, schoolID).
			Find(&students)

		for i, student := range students {
			row := i + 2
			f.SetCellValue(sheet, fmt.Sprintf("A%d", row), student.AdmissionNo)
			f.SetCellValue(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("%s %s", student.FirstName, student.LastName))
		}
	}

	style, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#4472C4"}, Pattern: 1},
	})
	f.SetCellStyle(sheet, "A1", "D1", style)
	f.SetColWidth(sheet, "A", "D", 20)

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=marks_template.xlsx")

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate template"})
	}
}
