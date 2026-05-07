package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
	"gorm.io/gorm"
)

type BudgetRequisitionService struct {
	repo         repositories.BudgetRepository
	emailService *EmailService
	db           *gorm.DB
}

func NewBudgetRequisitionService(repo repositories.BudgetRepository, emailService *EmailService, db *gorm.DB) *BudgetRequisitionService {
	return &BudgetRequisitionService{
		repo:         repo,
		emailService: emailService,
		db:           db,
	}
}

// Budget operations
func (s *BudgetRequisitionService) CreateBudget(budget *models.Budget) error {
	budget.AvailableAmount = budget.AllocatedAmount
	return s.repo.CreateBudget(budget)
}

func (s *BudgetRequisitionService) ListBudgets(schoolID, year, term, department string) ([]models.Budget, error) {
	return s.repo.FindBudgetsByFilters(schoolID, year, term, department)
}

func (s *BudgetRequisitionService) GetBudget(budgetID, schoolID string) (*models.Budget, error) {
	return s.repo.FindBudgetByID(budgetID, schoolID)
}

func (s *BudgetRequisitionService) UpdateBudget(budgetID, schoolID string, allocatedAmount float64, notes string) (*models.Budget, error) {
	budget, err := s.repo.FindBudgetByID(budgetID, schoolID)
	if err != nil {
		return nil, fmt.Errorf("budget not found")
	}

	diff := allocatedAmount - budget.AllocatedAmount
	budget.AllocatedAmount = allocatedAmount
	budget.AvailableAmount += diff
	budget.Notes = notes

	if err := s.repo.UpdateBudget(budget); err != nil {
		return nil, err
	}
	return budget, nil
}

func (s *BudgetRequisitionService) DeleteBudget(budgetID, schoolID string) error {
	budget, err := s.repo.FindBudgetByID(budgetID, schoolID)
	if err != nil {
		return fmt.Errorf("budget not found")
	}

	if budget.SpentAmount > 0 || budget.CommittedAmount > 0 {
		return fmt.Errorf("cannot delete budget with spent or committed amounts")
	}

	return s.repo.DeleteBudget(budgetID, schoolID)
}

func (s *BudgetRequisitionService) GetBudgetSummary(schoolID, year, term, department string) (map[string]interface{}, error) {
	return s.repo.GetBudgetSummary(schoolID, year, term, department)
}

// Requisition operations
func (s *BudgetRequisitionService) CreateRequisition(req *models.Requisition, items []models.RequisitionItem) (*models.Requisition, error) {
	// Calculate total amount
	var totalAmount float64
	for _, item := range items {
		totalAmount += float64(item.Quantity) * item.UnitPrice
	}
	req.TotalAmount = totalAmount

	// Generate requisition number
	reqNo, err := s.generateRequisitionNumber(req.SchoolID.String())
	if err != nil {
		return nil, err
	}
	req.RequisitionNo = reqNo
	req.Status = "pending"
	req.RequestedDate = time.Now()

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Create(req).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create requisition")
	}

	// Create items
	for i := range items {
		items[i].RequisitionID = req.ID
		items[i].TotalPrice = float64(items[i].Quantity) * items[i].UnitPrice
		if err := tx.Create(&items[i]).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to create requisition items")
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// Load items for response
	s.db.Preload("Items").First(req, req.ID)

	// Send email notification
	go s.sendRequisitionEmail(req.ID.String(), reqNo, "submitted", "Your requisition has been submitted and is pending approval.")

	return req, nil
}

func (s *BudgetRequisitionService) ListRequisitions(schoolID, userID, userRole, status, department, priority string) ([]models.Requisition, error) {
	return s.repo.FindRequisitionsByFilters(schoolID, userID, userRole, status, department, priority)
}

func (s *BudgetRequisitionService) GetRequisition(reqID, schoolID string) (*models.Requisition, error) {
	return s.repo.FindRequisitionByID(reqID, schoolID)
}

func (s *BudgetRequisitionService) UpdateRequisition(reqID, schoolID, title, description, justification, priority string) (*models.Requisition, error) {
	req, err := s.repo.FindRequisitionByID(reqID, schoolID)
	if err != nil {
		return nil, fmt.Errorf("requisition not found")
	}

	if req.Status != "pending" {
		return nil, fmt.Errorf("can only update pending requisitions")
	}

	req.Title = title
	req.Description = description
	req.Justification = justification
	req.Priority = priority

	if err := s.repo.UpdateRequisition(req); err != nil {
		return nil, err
	}
	return req, nil
}

func (s *BudgetRequisitionService) DeleteRequisition(reqID, schoolID string) error {
	req, err := s.repo.FindRequisitionByID(reqID, schoolID)
	if err != nil {
		return fmt.Errorf("requisition not found")
	}

	if req.Status != "pending" {
		return fmt.Errorf("can only delete pending requisitions")
	}

	return s.repo.DeleteRequisition(reqID, schoolID)
}

func (s *BudgetRequisitionService) ApproveRequisition(reqID, schoolID, userID, notes string, budgetID *string) (*models.Requisition, error) {
	req, err := s.repo.FindRequisitionByID(reqID, schoolID)
	if err != nil {
		return nil, fmt.Errorf("requisition not found")
	}

	if req.Status != "pending" {
		return nil, fmt.Errorf("requisition already processed")
	}

	now := time.Now()
	approverID := uuid.MustParse(userID)
	req.Status = "approved"
	req.ApprovedBy = &approverID
	req.ApprovedDate = &now
	req.ApprovalNotes = notes

	if budgetID != nil && *budgetID != "" {
		bid := uuid.MustParse(*budgetID)
		req.BudgetID = &bid
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Save(req).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to approve requisition")
	}

	// Update budget if linked
	if req.BudgetID != nil {
		result := tx.Model(&models.Budget{}).Where("id = ?", req.BudgetID).
			Updates(map[string]interface{}{
				"committed_amount": gorm.Expr("committed_amount + ?", req.TotalAmount),
				"available_amount": gorm.Expr("available_amount - ?", req.TotalAmount),
			})
		if result.Error != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to update budget")
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// Send email notification
	go s.sendRequisitionEmail(req.ID.String(), req.RequisitionNo, "approved", notes)

	return req, nil
}

func (s *BudgetRequisitionService) RejectRequisition(reqID, schoolID, userID, notes string) (*models.Requisition, error) {
	req, err := s.repo.FindRequisitionByID(reqID, schoolID)
	if err != nil {
		return nil, fmt.Errorf("requisition not found")
	}

	if req.Status != "pending" {
		return nil, fmt.Errorf("requisition already processed")
	}

	now := time.Now()
	reviewerID := uuid.MustParse(userID)
	req.Status = "rejected"
	req.ReviewedBy = &reviewerID
	req.ReviewedDate = &now
	req.ReviewNotes = notes

	if err := s.repo.UpdateRequisition(req); err != nil {
		return nil, err
	}

	// Send email notification
	go s.sendRequisitionEmail(req.ID.String(), req.RequisitionNo, "rejected", notes)

	return req, nil
}

func (s *BudgetRequisitionService) MarkRequisitionPaid(reqID, schoolID, userID, paymentMethod, paymentDate, notes string) (map[string]interface{}, error) {
	req, err := s.repo.FindRequisitionByID(reqID, schoolID)
	if err != nil {
		return nil, fmt.Errorf("requisition not found")
	}

	if req.Status != "approved" {
		return nil, fmt.Errorf("only approved requisitions can be marked as paid")
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create expenditure
	expenditure := &models.Expenditure{
		SchoolID:    req.SchoolID,
		Category:    req.Category,
		Amount:      req.TotalAmount,
		Description: fmt.Sprintf("Payment for requisition %s: %s", req.RequisitionNo, req.Title),
		Date:        time.Now(),
		Term:        getCurrentTerm(),
		Year:        time.Now().Year(),
		RecordedBy:  uuid.MustParse(userID),
		Status:      "paid",
	}

	if paymentDate != "" {
		if parsedDate, err := time.Parse("2006-01-02", paymentDate); err == nil {
			expenditure.Date = parsedDate
		}
	}

	if err := tx.Create(expenditure).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create expenditure")
	}

	// Update requisition
	now := time.Now()
	req.Status = "completed"
	req.CompletedDate = &now
	req.ExpenditureID = &expenditure.ID

	if err := tx.Save(req).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to update requisition")
	}

	// Update budget: move from committed to spent
	if req.BudgetID != nil {
		result := tx.Model(&models.Budget{}).Where("id = ?", req.BudgetID).
			Updates(map[string]interface{}{
				"committed_amount": gorm.Expr("committed_amount - ?", req.TotalAmount),
				"spent_amount":     gorm.Expr("spent_amount + ?", req.TotalAmount),
			})
		if result.Error != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to update budget")
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// Load full requisition data
	s.db.Preload("Items").Preload("Requester").First(req, req.ID)

	return map[string]interface{}{
		"message":     "Requisition marked as paid",
		"requisition": req,
		"expenditure": expenditure,
	}, nil
}

func (s *BudgetRequisitionService) GetRequisitionStats(schoolID string) (map[string]interface{}, error) {
	return s.repo.GetRequisitionStats(schoolID)
}

// Helper functions
func (s *BudgetRequisitionService) generateRequisitionNumber(schoolID string) (string, error) {
	var count int64
	s.db.Model(&models.Requisition{}).
		Where("school_id = ? AND EXTRACT(YEAR FROM created_at) = ?", schoolID, time.Now().Year()).
		Count(&count)
	return fmt.Sprintf("REQ-%d-%03d", time.Now().Year(), count+1), nil
}

func (s *BudgetRequisitionService) sendRequisitionEmail(reqID, reqNo, status, message string) {
	var req models.Requisition
	if err := s.db.Preload("Requester").First(&req, reqID).Error; err == nil {
		if req.Requester != nil && req.Requester.Email != "" {
			s.emailService.SendRequisitionStatusEmail(req.Requester.Email, reqNo, status, message)
		}
	}
}

func getCurrentTerm() string {
	month := time.Now().Month()
	if month >= 2 && month <= 5 {
		return "Term 1"
	} else if month >= 6 && month <= 9 {
		return "Term 2"
	}
	return "Term 3"
}
