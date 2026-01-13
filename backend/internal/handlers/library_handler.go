package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/utils"
	ws "github.com/school-system/backend/internal/websocket"
	"gorm.io/gorm"
)

type LibraryHandler struct {
	db *gorm.DB
}

func NewLibraryHandler(db *gorm.DB) *LibraryHandler {
	return &LibraryHandler{db: db}
}

// Books CRUD
func (h *LibraryHandler) ListBooks(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	subject := c.Query("subject")
	search := c.Query("search")
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")

	var books []models.Book
	query := h.db.Where("school_id = ?", schoolID)

	if subject != "" {
		query = query.Where("subject = ?", subject)
	}
	if search != "" {
		query = query.Where("title ILIKE ? OR author ILIKE ? OR isbn ILIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Model(&models.Book{}).Count(&total)

	offset := (utils.Atoi(page) - 1) * utils.Atoi(limit)
	if err := query.Offset(offset).Limit(utils.Atoi(limit)).Order("title").Find(&books).Error; err != nil {
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

	book := models.Book{
		SchoolID:        uuid.MustParse(schoolID),
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

	if err := h.db.Create(&book).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("library:book:created", book, schoolID)
	c.JSON(http.StatusCreated, book)
}

func (h *LibraryHandler) UpdateBook(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var book models.Book
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&book).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
		return
	}

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

	// Calculate available copies based on new total
	copiesDiff := req.TotalCopies - book.TotalCopies
	newAvailable := book.AvailableCopies + copiesDiff
	if newAvailable < 0 {
		newAvailable = 0
	}

	book.ISBN = req.ISBN
	book.Title = req.Title
	book.Author = req.Author
	book.Publisher = req.Publisher
	book.Category = req.Subject
	book.Subject = req.Subject
	book.Class = req.Class
	book.PublishedYear = req.PublishedYear
	book.TotalCopies = req.TotalCopies
	book.AvailableCopies = newAvailable
	book.Location = req.Location
	book.Description = req.Description

	if err := h.db.Save(&book).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("library:book:updated", book, schoolID)
	c.JSON(http.StatusOK, book)
}

func (h *LibraryHandler) DeleteBook(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	// Check if book has active issues
	var activeIssues int64
	h.db.Model(&models.BookIssue{}).Where("book_id = ? AND status = 'issued'", id).Count(&activeIssues)
	if activeIssues > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete book with active issues"})
		return
	}

	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.Book{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.GlobalHub.Broadcast("library:book:deleted", gin.H{"id": id}, schoolID)
	c.JSON(http.StatusOK, gin.H{"message": "Book deleted"})
}

func (h *LibraryHandler) GetAvailableCopies(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var book models.Book
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&book).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
		return
	}

	// Get issued copy numbers (excluding lost and damaged)
	var issuedCopies []string
	h.db.Model(&models.BookIssue{}).Where("book_id = ? AND status = ?", id, "issued").Pluck("copy_number", &issuedCopies)

	c.JSON(http.StatusOK, gin.H{
		"available_copies": book.AvailableCopies,
		"total_copies":     book.TotalCopies,
		"issued_copies":    book.IssuedCopies,
		"lost_copies":      book.LostCopies,
		"damaged_copies":   book.DamagedCopies,
		"issued_copy_numbers": issuedCopies,
	})
}

// Single book issue
func (h *LibraryHandler) IssueBook(c *gin.Context) {
	fmt.Println("[DEBUG] IssueBook called")
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
		fmt.Printf("[DEBUG] Bind error: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fmt.Printf("[DEBUG] Request data: %+v\n", req)

	userID := c.GetString("user_id")
	schoolID := c.GetString("tenant_school_id")
	fmt.Printf("[DEBUG] UserID: %s, SchoolID: %s\n", userID, schoolID)

	if userID == "" || schoolID == "" {
		fmt.Println("[DEBUG] Missing userID or schoolID")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authentication data"})
		return
	}

	// Get book
	var book models.Book
	if err := h.db.Where("id = ? AND school_id = ?", req.BookID, schoolID).First(&book).Error; err != nil {
		fmt.Printf("[DEBUG] Book not found: %v\n", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
		return
	}

	if book.AvailableCopies <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No available copies"})
		return
	}

	// Get borrower details
	var borrowerName, borrowerClass string
	if req.BorrowerType == "student" {
		var student models.Student
		if err := h.db.Where("id = ? AND school_id = ?", req.BorrowerID, schoolID).First(&student).Error; err != nil {
			fmt.Printf("[DEBUG] Student not found: %v\n", err)
			c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
			return
		}
		borrowerName = student.FirstName + " " + student.LastName
		
		// Try to get class from enrollment, fallback to extracting from admission number
		var enrollment models.Enrollment
		if err := h.db.Preload("Class").Where("student_id = ? AND status = ?", req.BorrowerID, "active").First(&enrollment).Error; err == nil && enrollment.Class != nil {
			borrowerClass = enrollment.Class.Name
		} else {
			// Extract class from admission number (e.g., TSS/S2/2026/001 -> S2)
			parts := strings.Split(student.AdmissionNo, "/")
			if len(parts) > 1 {
				borrowerClass = parts[1]
			} else {
				borrowerClass = "Unknown"
			}
		}
	} else {
		var teacher models.Teacher
		if err := h.db.Where("id = ? AND school_id = ?", req.BorrowerID, schoolID).First(&teacher).Error; err != nil {
			fmt.Printf("[DEBUG] Teacher not found: %v\n", err)
			c.JSON(http.StatusNotFound, gin.H{"error": "Teacher not found"})
			return
		}
		borrowerName = teacher.FirstName + " " + teacher.LastName
		if teacher.Specialization != "" {
			borrowerClass = "Teacher - " + teacher.Specialization
		} else {
			borrowerClass = "Teacher"
		}
	}

	// Check if copy is already issued
	var existingIssue models.BookIssue
	if err := h.db.Where("book_id = ? AND copy_number = ? AND status = ?", req.BookID, req.CopyNumber, "issued").First(&existingIssue).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This copy is already issued"})
		return
	}

	// Set year and term
	year := req.Year
	if year == 0 {
		year = time.Now().Year()
	}
	term := req.Term
	if term == "" {
		term = "1"
	}

	// Parse UUIDs safely
	bookUUID, err := uuid.Parse(req.BookID)
	if err != nil {
		fmt.Printf("[DEBUG] Invalid book UUID: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
		return
	}

	borrowerUUID, err := uuid.Parse(req.BorrowerID)
	if err != nil {
		fmt.Printf("[DEBUG] Invalid borrower UUID: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid borrower ID"})
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		fmt.Printf("[DEBUG] Invalid user UUID: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Create issue
	issue := models.BookIssue{
		BookID:        bookUUID,
		BookTitle:     book.Title,
		BorrowerID:    borrowerUUID,
		BorrowerName:  borrowerName,
		BorrowerType:  req.BorrowerType,
		BorrowerClass: borrowerClass,
		IssuedBy:      userUUID,
		CopyNumber:    req.CopyNumber,
		Year:          year,
		Term:          term,
		IssuedDate:    time.Now(),
		DueDate:       time.Now().AddDate(0, 0, req.DueDays),
		Status:        "issued",
		Notes:         req.Notes,
	}

	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("[DEBUG] Panic in transaction: %v\n", r)
			tx.Rollback()
		}
	}()

	if err := tx.Create(&issue).Error; err != nil {
		fmt.Printf("[DEBUG] Create issue error: %v\n", err)
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := tx.Model(&book).Updates(map[string]interface{}{
		"available_copies": book.AvailableCopies - 1,
		"issued_copies":    book.IssuedCopies + 1,
	}).Error; err != nil {
		fmt.Printf("[DEBUG] Update book error: %v\n", err)
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := tx.Commit().Error; err != nil {
		fmt.Printf("[DEBUG] Commit error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	fmt.Println("[DEBUG] Book issued successfully")
	ws.GlobalHub.Broadcast("library:issue:created", issue, schoolID)
	c.JSON(http.StatusCreated, issue)
}

func (h *LibraryHandler) GetCopyHistory(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	// First verify the book belongs to this school
	var book models.Book
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&book).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Book not found"})
		return
	}

	var issues []models.BookIssue
	if err := h.db.Where("book_id = ?", id).Order("issued_date DESC").Find(&issues).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	var issue models.BookIssue
	if err := h.db.Preload("Book").Joins("JOIN books ON books.id = book_issues.book_id").Where("book_issues.copy_number = ? AND books.school_id = ? AND book_issues.status = 'issued'", copyNumber, schoolID).First(&issue).Error; err != nil {
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
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "20")

	var issues []models.BookIssue
	query := h.db.Table("book_issues").Joins("JOIN books ON books.id = book_issues.book_id").Where("books.school_id = ?", schoolID)

	if status != "" {
		query = query.Where("book_issues.status = ?", status)
	}
	if term != "" {
		query = query.Where("book_issues.term = ?", term)
	}
	if year != "" {
		query = query.Where("book_issues.year = ?", year)
	}
	if search != "" {
		query = query.Where("book_issues.borrower_name ILIKE ? OR book_issues.book_title ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	offset := (utils.Atoi(page) - 1) * utils.Atoi(limit)
	if err := query.Select("book_issues.*").Offset(offset).Limit(utils.Atoi(limit)).Order("book_issues.issued_date DESC").Find(&issues).Error; err != nil {
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

	// Get borrower details
	var borrowerName, borrowerClass string
	if req.BorrowerType == "student" {
		var student models.Student
		if err := h.db.Where("id = ?", req.BorrowerID).Where("school_id = ?", schoolID).First(&student).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
			return
		}
		borrowerName = student.FirstName + " " + student.LastName
		
		// Try to get class from enrollment, fallback to extracting from admission number
		var enrollment models.Enrollment
		if err := h.db.Preload("Class").Where("student_id = ?", req.BorrowerID).Where("status = ?", "active").First(&enrollment).Error; err == nil && enrollment.Class != nil {
			borrowerClass = enrollment.Class.Name
		} else {
			// Extract class from admission number (e.g., TSS/S2/2026/001 -> S2)
			parts := strings.Split(student.AdmissionNo, "/")
			if len(parts) > 1 {
				borrowerClass = parts[1]
			} else {
				borrowerClass = "Unknown"
			}
		}
	} else {
		var teacher models.Teacher
		if err := h.db.Where("id = ?", req.BorrowerID).Where("school_id = ?", schoolID).First(&teacher).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Teacher not found"})
			return
		}
		borrowerName = teacher.FirstName + " " + teacher.LastName
		if teacher.Specialization != "" {
			borrowerClass = "Teacher - " + teacher.Specialization
		} else {
			borrowerClass = "Teacher"
		}
	}

	// Set year and term
	year := req.Year
	if year == 0 {
		year = time.Now().Year()
	}
	term := req.Term
	if term == "" {
		term = "Term1"
	}

	tx := h.db.Begin()
	var issues []models.BookIssue

	for _, bookReq := range req.Books {
		var book models.Book
		if err := tx.Where("id = ?", bookReq.BookID).Where("school_id = ?", schoolID).First(&book).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"error": "Book not found: " + bookReq.BookID})
			return
		}

		if book.AvailableCopies <= 0 {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "No available copies for: " + book.Title})
			return
		}

		// Check if copy is already issued
		var existingIssue models.BookIssue
		if err := tx.Where("book_id = ?", bookReq.BookID).Where("copy_number = ?", bookReq.CopyNumber).Where("status = ?", "issued").First(&existingIssue).Error; err == nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Copy %s of '%s' is already issued", bookReq.CopyNumber, book.Title)})
			return
		}

		// Parse UUIDs safely
		bookUUID, err := uuid.Parse(bookReq.BookID)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
			return
		}

		borrowerUUID, err := uuid.Parse(req.BorrowerID)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid borrower ID"})
			return
		}

		userUUID, err := uuid.Parse(userID)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		issue := models.BookIssue{
			BookID:        bookUUID,
			BookTitle:     book.Title,
			BorrowerID:    borrowerUUID,
			BorrowerName:  borrowerName,
			BorrowerType:  req.BorrowerType,
			BorrowerClass: borrowerClass,
			IssuedBy:      userUUID,
			CopyNumber:    bookReq.CopyNumber,
			Year:          year,
			Term:          term,
			IssuedDate:    time.Now(),
			DueDate:       time.Now().AddDate(0, 0, req.DueDays),
			Status:        "issued",
			Notes:         req.Notes,
		}

		if err := tx.Create(&issue).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if err := tx.Model(&book).Updates(map[string]interface{}{
			"available_copies": book.AvailableCopies - 1,
			"issued_copies":    book.IssuedCopies + 1,
		}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		issues = append(issues, issue)
	}

	tx.Commit()
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

	var issue models.BookIssue
	if err := h.db.Preload("Book").Joins("JOIN books ON books.id = book_issues.book_id").Where("book_issues.id = ? AND books.school_id = ? AND book_issues.status = 'issued'", id, schoolID).First(&issue).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Issue not found"})
		return
	}

	tx := h.db.Begin()

	// Update issue status
	now := time.Now()
	updates := map[string]interface{}{
		"status": req.Status,
	}

	if req.Status == "returned" {
		updates["return_date"] = &now
	}

	if req.Notes != "" {
		updates["notes"] = req.Notes
	}

	if err := tx.Model(&issue).Updates(updates).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update book counters based on status
	bookUpdates := map[string]interface{}{
		"issued_copies": issue.Book.IssuedCopies - 1,
	}

	switch req.Status {
	case "returned":
		bookUpdates["available_copies"] = issue.Book.AvailableCopies + 1
	case "lost":
		bookUpdates["lost_copies"] = issue.Book.LostCopies + 1
	case "damaged":
		bookUpdates["damaged_copies"] = issue.Book.DamagedCopies + 1
	}

	if err := tx.Model(&issue.Book).Updates(bookUpdates).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	tx.Commit()
	ws.GlobalHub.Broadcast("library:book:status_changed", issue, schoolID)
	c.JSON(http.StatusOK, gin.H{"message": "Book status updated successfully", "status": req.Status})
}

func (h *LibraryHandler) GetStats(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	term := c.Query("term")
	year := c.Query("year")

	var stats struct {
		TotalBooks      int64 `json:"total_books"`
		AvailableBooks  int64 `json:"available_books"`
		IssuedBooks     int64 `json:"issued_books"`
		OverdueBooks    int64 `json:"overdue_books"`
		ActiveIssues    int64 `json:"active_issues"`
	}

	h.db.Model(&models.Book{}).Where("school_id = ?", schoolID).Count(&stats.TotalBooks)
	h.db.Model(&models.Book{}).Where("school_id = ? AND available_copies > 0", schoolID).Count(&stats.AvailableBooks)
	
	issueQuery := h.db.Table("book_issues").Joins("JOIN books ON books.id = book_issues.book_id").Where("books.school_id = ? AND book_issues.status = 'issued'", schoolID)
	if term != "" {
		issueQuery = issueQuery.Where("book_issues.term = ?", term)
	}
	if year != "" {
		issueQuery = issueQuery.Where("book_issues.year = ?", year)
	}
	issueQuery.Count(&stats.ActiveIssues)
	
	overdueQuery := h.db.Table("book_issues").Joins("JOIN books ON books.id = book_issues.book_id").Where("books.school_id = ? AND book_issues.status = 'issued' AND book_issues.due_date < ?", schoolID, time.Now())
	if term != "" {
		overdueQuery = overdueQuery.Where("book_issues.term = ?", term)
	}
	if year != "" {
		overdueQuery = overdueQuery.Where("book_issues.year = ?", year)
	}
	overdueQuery.Count(&stats.OverdueBooks)

	c.JSON(http.StatusOK, stats)
}

func (h *LibraryHandler) GetStatsBySubject(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")

	var stats []struct {
		Subject        string `json:"subject"`
		TotalBooks     int64  `json:"total_books"`
		AvailableBooks int64  `json:"available_books"`
		IssuedBooks    int64  `json:"issued_books"`
	}

	if err := h.db.Raw(`
		SELECT 
			subject,
			COUNT(*) as total_books,
			SUM(available_copies) as available_books,
			SUM(issued_copies) as issued_books
		FROM books 
		WHERE school_id = ? 
		GROUP BY subject
		ORDER BY subject
	`, schoolID).Scan(&stats).Error; err != nil {
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

	var startDate, endDate time.Time
	now := time.Now()

	switch reportType {
	case "daily":
		startDate = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		endDate = startDate.AddDate(0, 0, 1)
	case "weekly":
		weekday := int(now.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		startDate = now.AddDate(0, 0, -weekday+1)
		startDate = time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
		endDate = startDate.AddDate(0, 0, 7)
	case "monthly":
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		endDate = startDate.AddDate(0, 1, 0)
	case "termly":
		// For termly, use term and year filters
		startDate = time.Time{}
		endDate = now
	case "yearly":
		// For yearly, use year filter
		startDate = time.Time{}
		endDate = now
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report type"})
		return
	}

	// Get all books with details
	var books []models.Book
	h.db.Where("school_id = ?", schoolID).Order("title").Find(&books)

	// Get issues based on date range and filters
	issueQuery := h.db.Table("book_issues").Joins("JOIN books ON books.id = book_issues.book_id").Where("books.school_id = ?", schoolID)

	if reportType == "daily" || reportType == "weekly" || reportType == "monthly" {
		issueQuery = issueQuery.Where("book_issues.issued_date >= ? AND book_issues.issued_date < ?", startDate, endDate)
	}

	if reportType == "termly" && term != "" {
		issueQuery = issueQuery.Where("book_issues.term = ?", term)
	}

	if (reportType == "termly" || reportType == "yearly") && year != "" {
		issueQuery = issueQuery.Where("book_issues.year = ?", year)
	}

	var issues []models.BookIssue
	issueQuery.Select("book_issues.*").Order("book_issues.issued_date DESC").Find(&issues)

	// Get issues by class
	var issuesByClass []struct {
		Class       string `json:"class"`
		TotalIssues int64  `json:"total_issues"`
	}
	classQuery := h.db.Table("book_issues").Joins("JOIN books ON books.id = book_issues.book_id").Where("books.school_id = ? AND book_issues.borrower_type = 'student'", schoolID)
	if reportType == "daily" || reportType == "weekly" || reportType == "monthly" {
		classQuery = classQuery.Where("book_issues.issued_date >= ? AND book_issues.issued_date < ?", startDate, endDate)
	}
	if reportType == "termly" && term != "" {
		classQuery = classQuery.Where("book_issues.term = ?", term)
	}
	if (reportType == "termly" || reportType == "yearly") && year != "" {
		classQuery = classQuery.Where("book_issues.year = ?", year)
	}
	classQuery.Select("book_issues.borrower_class as class, COUNT(*) as total_issues").Group("book_issues.borrower_class").Order("class").Scan(&issuesByClass)

	// Get issues by teachers
	var issuesByTeacher []struct {
		Teacher     string `json:"teacher"`
		TotalIssues int64  `json:"total_issues"`
	}
	teacherQuery := h.db.Table("book_issues").Joins("JOIN books ON books.id = book_issues.book_id").Where("books.school_id = ? AND book_issues.borrower_type = 'teacher'", schoolID)
	if reportType == "daily" || reportType == "weekly" || reportType == "monthly" {
		teacherQuery = teacherQuery.Where("book_issues.issued_date >= ? AND book_issues.issued_date < ?", startDate, endDate)
	}
	if reportType == "termly" && term != "" {
		teacherQuery = teacherQuery.Where("book_issues.term = ?", term)
	}
	if (reportType == "termly" || reportType == "yearly") && year != "" {
		teacherQuery = teacherQuery.Where("book_issues.year = ?", year)
	}
	teacherQuery.Select("book_issues.borrower_name as teacher, COUNT(*) as total_issues").Group("book_issues.borrower_name").Order("teacher").Scan(&issuesByTeacher)

	c.JSON(http.StatusOK, gin.H{
		"books":             books,
		"issues":            issues,
		"issues_by_class":   issuesByClass,
		"issues_by_teacher": issuesByTeacher,
		"report_type":       reportType,
		"term":              term,
		"year":              year,
		"start_date":        startDate,
		"end_date":          endDate,
	})
}