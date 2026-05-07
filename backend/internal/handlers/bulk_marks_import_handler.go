package handlers

import (
	"io"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
)

type BulkMarksImportHandler struct {
	service *services.BulkMarksImportService
}

func NewBulkMarksImportHandler(service *services.BulkMarksImportService) *BulkMarksImportHandler {
	return &BulkMarksImportHandler{service: service}
}

// UploadMarksForApproval handles Excel upload and creates pending import
func (h *BulkMarksImportHandler) UploadMarksForApproval(c *gin.Context) {
	// First, try to get the file to ensure multipart parsing works
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Now get form values (after multipart is parsed)
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")
	userRole := c.GetString("user_role")

	// Validate authentication context first
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing school context"})
		return
	}
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing user context"})
		return
	}

	// Get form values
	classID := c.PostForm("class_id")
	subjectID := c.PostForm("subject_id")
	term := c.PostForm("term")
	yearStr := c.PostForm("year")
	examType := c.PostForm("exam_type")
	paperStr := c.DefaultPostForm("paper", "0")

	if classID == "" || subjectID == "" || term == "" || yearStr == "" || examType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required fields"})
		return
	}

	year, _ := strconv.Atoi(yearStr)
	paper, _ := strconv.Atoi(paperStr)

	// Open and read the file
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer src.Close()

	fileData, err := io.ReadAll(src)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	result, err := h.service.ProcessExcelUpload(fileData, schoolID, classID, subjectID, term, year, examType, userID, userRole, paper)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build response with valid rows count
	response := gin.H{
		"message":      "Import uploaded successfully",
		"import_id":    result.ImportID.String(),
		"status":       result.Status,
		"total_rows":   result.TotalRows,
		"valid_rows":   result.ValidRows,
		"invalid_rows": result.InvalidRows,
	}
	
	// Only add errors if there are any
	if len(result.Errors) > 0 {
		response["errors"] = result.Errors
	} else {
		response["errors"] = []string{}
	}
	
	c.JSON(http.StatusOK, response)
}

// ListImports lists all marks imports
func (h *BulkMarksImportHandler) ListImports(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	status := c.Query("status")

	imports, err := h.service.ListImports(schoolID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch imports"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"imports": imports})
}

// GetImportDetails gets details of a specific import
func (h *BulkMarksImportHandler) GetImportDetails(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	importID := c.Param("id")

	marksImport, marks, errors, err := h.service.GetImportDetails(importID, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Import not found"})
		return
	}

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

	if err := h.service.ApproveImport(importID, schoolID, userID); err != nil {
		if err.Error() == "import already processed" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve import"})
		}
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

	if err := h.service.RejectImport(importID, schoolID, userID, req.Reason); err != nil {
		if err.Error() == "import already processed" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject import"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Import rejected successfully"})
}

// DownloadTemplate generates Excel template
func (h *BulkMarksImportHandler) DownloadTemplate(c *gin.Context) {
	classID := c.Query("class_id")
	schoolID := c.GetString("tenant_school_id")
	year := c.Query("year")
	term := c.Query("term")
	subjectID := c.Query("subject_id")
	examType := c.Query("exam_type")
	paper := c.Query("paper")

	f, err := h.service.GenerateTemplate(classID, schoolID, year, term, subjectID, examType, paper)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate template"})
		return
	}
	defer f.Close()

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=marks_template.xlsx")

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate template"})
	}
}
