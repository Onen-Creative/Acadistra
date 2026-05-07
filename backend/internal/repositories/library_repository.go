package repositories

import (
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

// LibraryRepository defines library-specific database operations
type LibraryRepository interface {
	BaseRepository
	// Book operations
	FindBooksBySchool(schoolID uuid.UUID) ([]models.Book, error)
	FindBookByISBN(isbn string, schoolID uuid.UUID) (*models.Book, error)
	SearchBooks(schoolID uuid.UUID, query string) ([]models.Book, error)
	UpdateBookCopies(bookID uuid.UUID, available, issued, lost, damaged int) error
	
	// Issue operations
	FindActiveIssues(schoolID uuid.UUID) ([]models.BookIssue, error)
	FindIssuesByBorrower(borrowerID uuid.UUID, borrowerType string) ([]models.BookIssue, error)
	FindOverdueIssues(schoolID uuid.UUID) ([]models.BookIssue, error)
	CreateIssue(issue *models.BookIssue) error
	UpdateIssueStatus(issueID uuid.UUID, status string, returnDate *string) error
}

type libraryRepository struct {
	*baseRepository
}

// NewLibraryRepository creates a new library repository
func NewLibraryRepository(db *gorm.DB) LibraryRepository {
	return &libraryRepository{
		baseRepository: &baseRepository{db: db},
	}
}

func (r *libraryRepository) FindBooksBySchool(schoolID uuid.UUID) ([]models.Book, error) {
	var books []models.Book
	err := r.db.Where("school_id = ?", schoolID).
		Order("title ASC").
		Find(&books).Error
	return books, err
}

func (r *libraryRepository) FindBookByISBN(isbn string, schoolID uuid.UUID) (*models.Book, error) {
	var book models.Book
	err := r.db.Where("isbn = ? AND school_id = ?", isbn, schoolID).First(&book).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &book, nil
}

func (r *libraryRepository) SearchBooks(schoolID uuid.UUID, query string) ([]models.Book, error) {
	var books []models.Book
	err := r.db.Where("school_id = ?", schoolID).
		Where("title ILIKE ? OR author ILIKE ? OR isbn ILIKE ?",
			"%"+query+"%", "%"+query+"%", "%"+query+"%").
		Order("title ASC").
		Find(&books).Error
	return books, err
}

func (r *libraryRepository) UpdateBookCopies(bookID uuid.UUID, available, issued, lost, damaged int) error {
	return r.db.Model(&models.Book{}).
		Where("id = ?", bookID).
		Updates(map[string]interface{}{
			"available_copies": available,
			"issued_copies":    issued,
			"lost_copies":      lost,
			"damaged_copies":   damaged,
		}).Error
}

func (r *libraryRepository) FindActiveIssues(schoolID uuid.UUID) ([]models.BookIssue, error) {
	var issues []models.BookIssue
	err := r.db.Where("school_id = ? AND status = ?", schoolID, "issued").
		Preload("Book").
		Order("issued_date DESC").
		Find(&issues).Error
	return issues, err
}

func (r *libraryRepository) FindIssuesByBorrower(borrowerID uuid.UUID, borrowerType string) ([]models.BookIssue, error) {
	var issues []models.BookIssue
	err := r.db.Where("borrower_id = ? AND borrower_type = ?", borrowerID, borrowerType).
		Preload("Book").
		Order("issued_date DESC").
		Find(&issues).Error
	return issues, err
}

func (r *libraryRepository) FindOverdueIssues(schoolID uuid.UUID) ([]models.BookIssue, error) {
	var issues []models.BookIssue
	err := r.db.Where("school_id = ? AND status = ? AND due_date < NOW()", schoolID, "issued").
		Preload("Book").
		Order("due_date ASC").
		Find(&issues).Error
	return issues, err
}

func (r *libraryRepository) CreateIssue(issue *models.BookIssue) error {
	return r.db.Create(issue).Error
}

func (r *libraryRepository) UpdateIssueStatus(issueID uuid.UUID, status string, returnDate *string) error {
	updates := map[string]interface{}{
		"status": status,
	}
	if returnDate != nil {
		updates["return_date"] = returnDate
	}
	return r.db.Model(&models.BookIssue{}).
		Where("id = ?", issueID).
		Updates(updates).Error
}
