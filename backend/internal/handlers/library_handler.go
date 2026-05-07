package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
	"github.com/school-system/backend/internal/utils"
	ws "github.com/school-system/backend/internal/websocket"
)

type LibraryHandler struct {
	service *services.LibraryService
}

func NewLibraryHandler(service *services.LibraryService) *LibraryHandler {
	return &LibraryHandler{service: service}
}

// Books CRUD
func (h *LibraryHandler) ListBooks(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	subject := c.Query("subject")
	search := c.Query("search")
	page := utils.Atoi(c.DefaultQuery("page", "1"))
	limit := utils.Atoi(c.DefaultQuery("limit", "10"))

	books, total, err := h.service.ListBooks(schoolID, subject, search, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"books": books,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *LibraryHandler) CreateBook(c *gin.Context) {
	var req struct {
		ISBN          string `json:"isbn"`
		Title         string `json:"title" binding:"required"`
		Author        string `json:"author" binding:"required"`
		Publisher     string `json:"publisher"`
		Subject       string `json:"subject" binding:"required"`
		Class         string `json:"class"`
		PublishedYear int    `json:"published_year"`
		TotalCopies   int    `json:"total_copies" binding:"required,min=1"`
		Location      string `json:"location"`
		Description   string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	schoolID := c.GetString("tenant_school_id")

	book := &models.Book{
		ISBN:            req.ISBN,
		Title:           req.Title,
		Author:          req.Author,
		Publisher:       req.Publisher,
		Category:        req.Subject,
		Subject:         req.Subject,
		Class:           req.Class,
		PublishedYear:   req.PublishedYear,
		TotalCopies:     req.TotalCopies,
		AvailableCopies: req.TotalCopies,
		IssuedCopies:    0,
		LostCopies:      0,
		DamagedCopies:   0,
		Location:        req.Location,
		Description:     req.Description,
	}

	if err := h.service.CreateBook(book, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("library:book:created", book, schoolID)
	c.JSON(http.StatusCreated, book)
}

func (h *LibraryHandler) UpdateBook(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var req struct {
		ISBN          string `json:"isbn"`
		Title         string `json:"title" binding:"required"`
		Author        string `json:"author" binding:"required"`
		Publisher     string `json:"publisher"`
		Subject       string `json:"subject" binding:"required"`
		Class         string `json:"class"`
		PublishedYear int    `json:"published_year"`
		TotalCopies   int    `json:"total_copies" binding:"required,min=1"`
		Location      string `json:"location"`
		Description   string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := &models.Book{
		ISBN:          req.ISBN,
		Title:         req.Title,
		Author:        req.Author,
		Publisher:     req.Publisher,
		Category:      req.Subject,
		Subject:       req.Subject,
		Class:         req.Class,
		PublishedYear: req.PublishedYear,
		TotalCopies:   req.TotalCopies,
		Location:      req.Location,
		Description:   req.Description,
	}

	book, err := h.service.UpdateBook(id, schoolID, updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("library:book:updated", book, schoolID)
	c.JSON(http.StatusOK, book)
}

func (h *LibraryHandler) DeleteBook(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	if err := h.service.DeleteBook(id, schoolID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("library:book:deleted", gin.H{"id": id}, schoolID)
	c.JSON(http.StatusOK, gin.H{"message": "Book deleted"})
}

func (h *LibraryHandler) GetAvailableCopies(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	result, err := h.service.GetAvailableCopies(id, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// Single book issue
func (h *LibraryHandler) IssueBook(c *gin.Context) {
	var req struct {
		BookID       string `json:"book_id" binding:"required"`
		BorrowerID   string `json:"borrower_id" binding:"required"`
		BorrowerType string `json:"borrower_type" binding:"required"`
		CopyNumber   string `json:"copy_number" binding:"required"`
		DueDays      int    `json:"due_days" binding:"required,min=1"`
		Year         int    `json:"year"`
		Term         string `json:"term"`
		Notes        string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	schoolID := c.GetString("tenant_school_id")

	if userID == "" || schoolID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authentication data"})
		return
	}

	// Set year and term
	year := req.Year
	if year == 0 {
		year = time.Now().Year()
	}
	term := req.Term
	if term == "" {
		term = "Term 1"
	}

	// Parse UUIDs
	bookUUID, err := uuid.Parse(req.BookID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
		return
	}

	borrowerUUID, err := uuid.Parse(req.BorrowerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid borrower ID"})
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	issue := &models.BookIssue{
		BookID:       bookUUID,
		BorrowerID:   borrowerUUID,
		BorrowerType: req.BorrowerType,
		IssuedBy:     userUUID,
		CopyNumber:   req.CopyNumber,
		Year:         year,
		Term:         term,
		IssuedDate:   time.Now(),
		DueDate:      time.Now().AddDate(0, 0, req.DueDays),
		Status:       "issued",
		Notes:        req.Notes,
	}

	if err := h.service.IssueBook(issue, schoolID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("library:issue:created", issue, schoolID)
	c.JSON(http.StatusCreated, issue)
}

func (h *LibraryHandler) GetCopyHistory(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	issues, err := h.service.GetCopyHistory(id, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"history": issues})
}

func (h *LibraryHandler) SearchByCopyNumber(c *gin.Context) {
	copyNumber := c.Query("copy_number")
	schoolID := c.GetString("tenant_school_id")

	if copyNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Copy number is required"})
		return
	}

	issue, err := h.service.SearchByCopyNumber(copyNumber, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Copy not found or not issued"})
		return
	}

	c.JSON(http.StatusOK, issue)
}

func (h *LibraryHandler) ListIssues(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	status := c.Query("status")
	term := c.Query("term")
	year := c.Query("year")
	search := c.Query("search")
	page := utils.Atoi(c.DefaultQuery("page", "1"))
	limit := utils.Atoi(c.DefaultQuery("limit", "20"))

	issues, total, err := h.service.ListIssues(schoolID, status, term, year, search, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"issues": issues,
		"total":  total,
		"page":   page,
		"limit":  limit,
	})
}

func (h *LibraryHandler) BulkIssueBooks(c *gin.Context) {
	var req struct {
		BorrowerID   string `json:"borrower_id" binding:"required"`
		BorrowerType string `json:"borrower_type" binding:"required"`
		Books        []struct {
			BookID     string `json:"book_id"`
			CopyNumber string `json:"copy_number"`
		} `json:"books" binding:"required"`
		DueDays int    `json:"due_days" binding:"required,min=1"`
		Year    int    `json:"year"`
		Term    string `json:"term"`
		Notes   string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	schoolID := c.GetString("tenant_school_id")

	// Convert books to service format
	books := make([]struct {
		BookID     string
		CopyNumber string
	}, len(req.Books))
	for i, b := range req.Books {
		books[i].BookID = b.BookID
		books[i].CopyNumber = b.CopyNumber
	}

	issues, err := h.service.BulkIssueBooks(req.BorrowerID, req.BorrowerType, schoolID, userID, books, req.DueDays, req.Year, req.Term, req.Notes)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("library:bulk:issued", issues, schoolID)
	c.JSON(http.StatusCreated, gin.H{"issues": issues})
}

func (h *LibraryHandler) ReturnBook(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var req struct {
		Status string `json:"status" binding:"required,oneof=returned lost damaged"`
		Notes  string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.ReturnBook(id, schoolID, req.Status, req.Notes); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("library:book:status_changed", gin.H{"id": id, "status": req.Status}, schoolID)
	c.JSON(http.StatusOK, gin.H{"message": "Book status updated successfully", "status": req.Status})
}

func (h *LibraryHandler) GetStats(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")

	stats, err := h.service.GetStats(schoolID, term, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

func (h *LibraryHandler) GetStatsBySubject(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	stats, err := h.service.GetStatsBySubject(schoolID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"stats": stats})
}

func (h *LibraryHandler) GetReportData(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	reportType := c.Query("type")
	term := c.Query("term")
	year := c.Query("year")

	result, err := h.service.GetReportData(schoolID, reportType, term, year)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}