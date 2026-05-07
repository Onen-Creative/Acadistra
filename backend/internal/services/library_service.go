package services

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	ws "github.com/school-system/backend/internal/websocket"
	"gorm.io/gorm"
)

type LibraryService struct {
	repo repositories.LibraryRepository
	db   *gorm.DB
}

func NewLibraryService(repo repositories.LibraryRepository, db *gorm.DB) *LibraryService {
	return &LibraryService{
		repo: repo,
		db:   db,
	}
}

func (s *LibraryService) ListBooks(schoolID, subject, search string, page, limit int) ([]models.Book, int64, error) {
	query := s.db.Where("school_id = ?", schoolID)

	if subject != "" {
		query = query.Where("subject = ?", subject)
	}
	if search != "" {
		query = query.Where("title ILIKE ? OR author ILIKE ? OR isbn ILIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Model(&models.Book{}).Count(&total)

	offset := (page - 1) * limit
	var books []models.Book
	err := query.Offset(offset).Limit(limit).Order("title").Find(&books).Error
	return books, total, err
}

func (s *LibraryService) CreateBook(book *models.Book, schoolID string) error {
	book.SchoolID = uuid.MustParse(schoolID)
	book.AvailableCopies = book.TotalCopies
	book.IssuedCopies = 0
	book.LostCopies = 0
	book.DamagedCopies = 0
	book.Category = book.Subject

	if err := s.db.Create(book).Error; err != nil {
		return err
	}

	ws.GlobalHub.Broadcast("library:book:created", book, schoolID)
	return nil
}

func (s *LibraryService) UpdateBook(id, schoolID string, updates *models.Book) (*models.Book, error) {
	var book models.Book
	if err := s.db.Where("id = ? AND school_id = ?", id, schoolID).First(&book).Error; err != nil {
		return nil, fmt.Errorf("book not found")
	}

	copiesDiff := updates.TotalCopies - book.TotalCopies
	newAvailable := book.AvailableCopies + copiesDiff
	if newAvailable < 0 {
		newAvailable = 0
	}

	book.ISBN = updates.ISBN
	book.Title = updates.Title
	book.Author = updates.Author
	book.Publisher = updates.Publisher
	book.Category = updates.Subject
	book.Subject = updates.Subject
	book.Class = updates.Class
	book.PublishedYear = updates.PublishedYear
	book.TotalCopies = updates.TotalCopies
	book.AvailableCopies = newAvailable
	book.Location = updates.Location
	book.Description = updates.Description

	if err := s.db.Save(&book).Error; err != nil {
		return nil, err
	}

	ws.GlobalHub.Broadcast("library:book:updated", book, schoolID)
	return &book, nil
}

func (s *LibraryService) DeleteBook(id, schoolID string) error {
	var activeIssues int64
	s.db.Model(&models.BookIssue{}).Where("book_id = ? AND status = 'issued'", id).Count(&activeIssues)
	if activeIssues > 0 {
		return fmt.Errorf("cannot delete book with active issues")
	}

	if err := s.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.Book{}).Error; err != nil {
		return err
	}

	ws.GlobalHub.Broadcast("library:book:deleted", map[string]string{"id": id}, schoolID)
	return nil
}

func (s *LibraryService) IssueBook(issue *models.BookIssue, schoolID, userID string) error {
	var book models.Book
	if err := s.db.Where("id = ? AND school_id = ?", issue.BookID, schoolID).First(&book).Error; err != nil {
		return fmt.Errorf("book not found")
	}

	if book.AvailableCopies <= 0 {
		return fmt.Errorf("no available copies")
	}

	var existingIssue models.BookIssue
	if err := s.db.Where("book_id = ? AND copy_number = ? AND status = ?", issue.BookID, issue.CopyNumber, "issued").First(&existingIssue).Error; err == nil {
		return fmt.Errorf("this copy is already issued")
	}

	borrowerName, borrowerClass, err := s.getBorrowerDetails(issue.BorrowerID.String(), issue.BorrowerType, schoolID)
	if err != nil {
		return err
	}

	issue.BookTitle = book.Title
	issue.BorrowerName = borrowerName
	issue.BorrowerClass = borrowerClass
	issue.IssuedBy = uuid.MustParse(userID)
	issue.IssuedDate = time.Now()
	issue.Status = "issued"

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(issue).Error; err != nil {
			return err
		}

		if err := tx.Model(&book).Updates(map[string]interface{}{
			"available_copies": book.AvailableCopies - 1,
			"issued_copies":    book.IssuedCopies + 1,
		}).Error; err != nil {
			return err
		}

		ws.GlobalHub.Broadcast("library:issue:created", issue, schoolID)
		return nil
	})
}

func (s *LibraryService) BulkIssueBooks(borrowerID, borrowerType, schoolID, userID string, books []struct {
	BookID     string
	CopyNumber string
}, dueDays int, year int, term, notes string) ([]models.BookIssue, error) {
	borrowerName, borrowerClass, err := s.getBorrowerDetails(borrowerID, borrowerType, schoolID)
	if err != nil {
		return nil, err
	}

	if year == 0 {
		year = time.Now().Year()
	}
	if term == "" {
		term = "Term1"
	}

	var issues []models.BookIssue

	err = s.db.Transaction(func(tx *gorm.DB) error {
		for _, bookReq := range books {
			var book models.Book
			if err := tx.Where("id = ? AND school_id = ?", bookReq.BookID, schoolID).First(&book).Error; err != nil {
				return fmt.Errorf("book not found: %s", bookReq.BookID)
			}

			if book.AvailableCopies <= 0 {
				return fmt.Errorf("no available copies for: %s", book.Title)
			}

			var existingIssue models.BookIssue
			if err := tx.Where("book_id = ? AND copy_number = ? AND status = ?", bookReq.BookID, bookReq.CopyNumber, "issued").First(&existingIssue).Error; err == nil {
				return fmt.Errorf("copy %s of '%s' is already issued", bookReq.CopyNumber, book.Title)
			}

			issue := models.BookIssue{
				BookID:        uuid.MustParse(bookReq.BookID),
				BookTitle:     book.Title,
				BorrowerID:    uuid.MustParse(borrowerID),
				BorrowerName:  borrowerName,
				BorrowerType:  borrowerType,
				BorrowerClass: borrowerClass,
				IssuedBy:      uuid.MustParse(userID),
				CopyNumber:    bookReq.CopyNumber,
				Year:          year,
				Term:          term,
				IssuedDate:    time.Now(),
				DueDate:       time.Now().AddDate(0, 0, dueDays),
				Status:        "issued",
				Notes:         notes,
			}

			if err := tx.Create(&issue).Error; err != nil {
				return err
			}

			if err := tx.Model(&book).Updates(map[string]interface{}{
				"available_copies": book.AvailableCopies - 1,
				"issued_copies":    book.IssuedCopies + 1,
			}).Error; err != nil {
				return err
			}

			issues = append(issues, issue)
		}

		ws.GlobalHub.Broadcast("library:bulk:issued", issues, schoolID)
		return nil
	})

	return issues, err
}

func (s *LibraryService) ReturnBook(id, schoolID, status, notes string) error {
	var issue models.BookIssue
	if err := s.db.Preload("Book").Joins("JOIN books ON books.id = book_issues.book_id").
		Where("book_issues.id = ? AND books.school_id = ? AND book_issues.status = 'issued'", id, schoolID).
		First(&issue).Error; err != nil {
		return fmt.Errorf("issue not found")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		updates := map[string]interface{}{
			"status": status,
		}

		if status == "returned" {
			updates["return_date"] = &now
		}

		if notes != "" {
			updates["notes"] = notes
		}

		if err := tx.Model(&issue).Updates(updates).Error; err != nil {
			return err
		}

		bookUpdates := map[string]interface{}{
			"issued_copies": issue.Book.IssuedCopies - 1,
		}

		switch status {
		case "returned":
			bookUpdates["available_copies"] = issue.Book.AvailableCopies + 1
		case "lost":
			bookUpdates["lost_copies"] = issue.Book.LostCopies + 1
		case "damaged":
			bookUpdates["damaged_copies"] = issue.Book.DamagedCopies + 1
		}

		if err := tx.Model(&issue.Book).Updates(bookUpdates).Error; err != nil {
			return err
		}

		ws.GlobalHub.Broadcast("library:book:status_changed", issue, schoolID)
		return nil
	})
}

func (s *LibraryService) ListIssues(schoolID, status, term, year, search string, page, limit int) ([]models.BookIssue, int64, error) {
	query := s.db.Table("book_issues").Joins("JOIN books ON books.id = book_issues.book_id").Where("books.school_id = ?", schoolID)

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

	offset := (page - 1) * limit
	var issues []models.BookIssue
	err := query.Select("book_issues.*").Offset(offset).Limit(limit).Order("book_issues.issued_date DESC").Find(&issues).Error
	return issues, total, err
}

func (s *LibraryService) GetStats(schoolID, term, year string) (map[string]interface{}, error) {
	var totalBooks, availableBooks, activeIssues, overdueBooks int64

	s.db.Model(&models.Book{}).Where("school_id = ?", schoolID).Count(&totalBooks)
	s.db.Model(&models.Book{}).Where("school_id = ? AND available_copies > 0", schoolID).Count(&availableBooks)

	issueQuery := s.db.Table("book_issues").Joins("JOIN books ON books.id = book_issues.book_id").
		Where("books.school_id = ? AND book_issues.status = 'issued'", schoolID)
	if term != "" {
		issueQuery = issueQuery.Where("book_issues.term = ?", term)
	}
	if year != "" {
		issueQuery = issueQuery.Where("book_issues.year = ?", year)
	}
	issueQuery.Count(&activeIssues)

	overdueQuery := s.db.Table("book_issues").Joins("JOIN books ON books.id = book_issues.book_id").
		Where("books.school_id = ? AND book_issues.status = 'issued' AND book_issues.due_date < ?", schoolID, time.Now())
	if term != "" {
		overdueQuery = overdueQuery.Where("book_issues.term = ?", term)
	}
	if year != "" {
		overdueQuery = overdueQuery.Where("book_issues.year = ?", year)
	}
	overdueQuery.Count(&overdueBooks)

	return map[string]interface{}{
		"total_books":     totalBooks,
		"available_books": availableBooks,
		"active_issues":   activeIssues,
		"overdue_books":   overdueBooks,
	}, nil
}

func (s *LibraryService) getBorrowerDetails(borrowerID, borrowerType, schoolID string) (string, string, error) {
	var borrowerName, borrowerClass string

	if borrowerType == "student" {
		var student models.Student
		if err := s.db.Where("id = ? AND school_id = ?", borrowerID, schoolID).First(&student).Error; err != nil {
			return "", "", fmt.Errorf("student not found")
		}
		borrowerName = student.FirstName
		if student.MiddleName != "" {
			borrowerName += " " + student.MiddleName
		}
		borrowerName += " " + student.LastName

		var enrollment models.Enrollment
		if err := s.db.Preload("Class").Where("student_id = ? AND status = ?", borrowerID, "active").First(&enrollment).Error; err == nil && enrollment.Class != nil {
			borrowerClass = enrollment.Class.Name
		} else {
			parts := strings.Split(student.AdmissionNo, "/")
			if len(parts) > 1 {
				borrowerClass = parts[1]
			} else {
				borrowerClass = "Unknown"
			}
		}
	} else {
		var staff models.Staff
		if err := s.db.Where("id = ? AND school_id = ? AND role = ?", borrowerID, schoolID, "Teacher").First(&staff).Error; err != nil {
			return "", "", fmt.Errorf("teacher not found")
		}
		borrowerName = staff.FirstName
		if staff.MiddleName != "" {
			borrowerName += " " + staff.MiddleName
		}
		borrowerName += " " + staff.LastName
		if staff.Specialization != "" {
			borrowerClass = "Teacher - " + staff.Specialization
		} else {
			borrowerClass = "Teacher"
		}
	}

	return borrowerName, borrowerClass, nil
}


func (s *LibraryService) GetAvailableCopies(id, schoolID string) (map[string]interface{}, error) {
	var book models.Book
	if err := s.db.Where("id = ? AND school_id = ?", id, schoolID).First(&book).Error; err != nil {
		return nil, err
	}

	var issuedCopies []string
	s.db.Model(&models.BookIssue{}).Where("book_id = ? AND status = ?", id, "issued").Pluck("copy_number", &issuedCopies)

	var lostCopies []string
	s.db.Model(&models.BookIssue{}).Where("book_id = ? AND status IN ?", id, []string{"lost", "damaged"}).Pluck("copy_number", &lostCopies)

	return map[string]interface{}{
		"available_copies":         book.AvailableCopies,
		"total_copies":             book.TotalCopies,
		"issued_copies":            book.IssuedCopies,
		"lost_copies":              book.LostCopies,
		"damaged_copies":           book.DamagedCopies,
		"issued_copy_numbers":      issuedCopies,
		"unavailable_copy_numbers": append(issuedCopies, lostCopies...),
	}, nil
}

func (s *LibraryService) GetCopyHistory(id, schoolID string) ([]models.BookIssue, error) {
	var book models.Book
	if err := s.db.Where("id = ? AND school_id = ?", id, schoolID).First(&book).Error; err != nil {
		return nil, err
	}

	var issues []models.BookIssue
	if err := s.db.Where("book_id = ?", id).Order("issued_date DESC").Find(&issues).Error; err != nil {
		return nil, err
	}

	return issues, nil
}

func (s *LibraryService) SearchByCopyNumber(copyNumber, schoolID string) (*models.BookIssue, error) {
	var issue models.BookIssue
	if err := s.db.Preload("Book").
		Joins("JOIN books ON books.id = book_issues.book_id").
		Where("book_issues.copy_number = ? AND books.school_id = ? AND book_issues.status = 'issued'", copyNumber, schoolID).
		First(&issue).Error; err != nil {
		return nil, err
	}

	return &issue, nil
}

func (s *LibraryService) GetStatsBySubject(schoolID string) ([]map[string]interface{}, error) {
	var stats []struct {
		Subject        string `json:"subject"`
		TotalBooks     int64  `json:"total_books"`
		AvailableBooks int64  `json:"available_books"`
		IssuedBooks    int64  `json:"issued_books"`
	}

	if err := s.db.Raw(`
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
		return nil, err
	}

	result := make([]map[string]interface{}, len(stats))
	for i, s := range stats {
		result[i] = map[string]interface{}{
			"subject":         s.Subject,
			"total_books":     s.TotalBooks,
			"available_books": s.AvailableBooks,
			"issued_books":    s.IssuedBooks,
		}
	}

	return result, nil
}

func (s *LibraryService) GetReportData(schoolID, reportType, term, year string) (map[string]interface{}, error) {
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
		startDate = time.Time{}
		endDate = now
	case "yearly":
		startDate = time.Time{}
		endDate = now
	default:
		return nil, fmt.Errorf("invalid report type")
	}

	var books []models.Book
	s.db.Where("school_id = ?", schoolID).Order("title").Find(&books)

	issueQuery := s.db.Table("book_issues").
		Joins("JOIN books ON books.id = book_issues.book_id").
		Where("books.school_id = ?", schoolID)

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

	var issuesByClass []struct {
		Class       string `json:"class"`
		TotalIssues int64  `json:"total_issues"`
	}
	classQuery := s.db.Table("book_issues").
		Joins("JOIN books ON books.id = book_issues.book_id").
		Where("books.school_id = ? AND book_issues.borrower_type = 'student'", schoolID)
	if reportType == "daily" || reportType == "weekly" || reportType == "monthly" {
		classQuery = classQuery.Where("book_issues.issued_date >= ? AND book_issues.issued_date < ?", startDate, endDate)
	}
	if reportType == "termly" && term != "" {
		classQuery = classQuery.Where("book_issues.term = ?", term)
	}
	if (reportType == "termly" || reportType == "yearly") && year != "" {
		classQuery = classQuery.Where("book_issues.year = ?", year)
	}
	classQuery.Select("book_issues.borrower_class as class, COUNT(*) as total_issues").
		Group("book_issues.borrower_class").Order("class").Scan(&issuesByClass)

	var issuesByTeacher []struct {
		Teacher     string `json:"teacher"`
		TotalIssues int64  `json:"total_issues"`
	}
	teacherQuery := s.db.Table("book_issues").
		Joins("JOIN books ON books.id = book_issues.book_id").
		Where("books.school_id = ? AND book_issues.borrower_type = 'teacher'", schoolID)
	if reportType == "daily" || reportType == "weekly" || reportType == "monthly" {
		teacherQuery = teacherQuery.Where("book_issues.issued_date >= ? AND book_issues.issued_date < ?", startDate, endDate)
	}
	if reportType == "termly" && term != "" {
		teacherQuery = teacherQuery.Where("book_issues.term = ?", term)
	}
	if (reportType == "termly" || reportType == "yearly") && year != "" {
		teacherQuery = teacherQuery.Where("book_issues.year = ?", year)
	}
	teacherQuery.Select("book_issues.borrower_name as teacher, COUNT(*) as total_issues").
		Group("book_issues.borrower_name").Order("teacher").Scan(&issuesByTeacher)

	return map[string]interface{}{
		"books":             books,
		"issues":            issues,
		"issues_by_class":   issuesByClass,
		"issues_by_teacher": issuesByTeacher,
		"report_type":       reportType,
		"term":              term,
		"year":              year,
		"start_date":        startDate,
		"end_date":          endDate,
	}, nil
}
