package repositories

import (
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type BudgetRepository interface {
	// Budget operations
	CreateBudget(budget *models.Budget) error
	UpdateBudget(budget *models.Budget) error
	FindBudgetByID(id, schoolID string) (*models.Budget, error)
	FindBudgetsByFilters(schoolID, year, term, department string) ([]models.Budget, error)
	DeleteBudget(id, schoolID string) error
	GetBudgetSummary(schoolID, year, term, department string) (map[string]interface{}, error)

	// Requisition operations
	CreateRequisition(req *models.Requisition) error
	UpdateRequisition(req *models.Requisition) error
	FindRequisitionByID(id, schoolID string) (*models.Requisition, error)
	FindRequisitionsByFilters(schoolID, userID, userRole, status, department, priority string) ([]models.Requisition, error)
	DeleteRequisition(id, schoolID string) error
	GetRequisitionStats(schoolID string) (map[string]interface{}, error)
}

type budgetRepository struct {
	db *gorm.DB
}

func NewBudgetRepository(db *gorm.DB) BudgetRepository {
	return &budgetRepository{db: db}
}

// Budget operations
func (r *budgetRepository) CreateBudget(budget *models.Budget) error {
	return r.db.Create(budget).Error
}

func (r *budgetRepository) UpdateBudget(budget *models.Budget) error {
	return r.db.Save(budget).Error
}

func (r *budgetRepository) FindBudgetByID(id, schoolID string) (*models.Budget, error) {
	var budget models.Budget
	err := r.db.Where("id = ? AND school_id = ?", id, schoolID).First(&budget).Error
	return &budget, err
}

func (r *budgetRepository) FindBudgetsByFilters(schoolID, year, term, department string) ([]models.Budget, error) {
	var budgets []models.Budget
	query := r.db.Where("school_id = ?", schoolID)

	if year != "" {
		query = query.Where("year = ?", year)
	}
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if department != "" {
		query = query.Where("department = ?", department)
	}

	err := query.Order("year DESC, term DESC, department, category").Find(&budgets).Error
	return budgets, err
}

func (r *budgetRepository) DeleteBudget(id, schoolID string) error {
	return r.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.Budget{}).Error
}

func (r *budgetRepository) GetBudgetSummary(schoolID, year, term, department string) (map[string]interface{}, error) {
	type Summary struct {
		Department      string  `json:"department"`
		AllocatedTotal  float64 `json:"allocated_total"`
		SpentTotal      float64 `json:"spent_total"`
		CommittedTotal  float64 `json:"committed_total"`
		AvailableTotal  float64 `json:"available_total"`
		UtilizationRate float64 `json:"utilization_rate"`
	}

	var summary []Summary
	query := r.db.Model(&models.Budget{}).
		Select("department, SUM(allocated_amount) as allocated_total, SUM(spent_amount) as spent_total, SUM(committed_amount) as committed_total, SUM(available_amount) as available_total").
		Where("school_id = ?", schoolID).
		Group("department")

	if year != "" {
		query = query.Where("year = ?", year)
	}
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if department != "" {
		query = query.Where("department = ?", department)
	}

	if err := query.Find(&summary).Error; err != nil {
		return nil, err
	}

	// Calculate utilization rate
	for i := range summary {
		if summary[i].AllocatedTotal > 0 {
			summary[i].UtilizationRate = (summary[i].SpentTotal / summary[i].AllocatedTotal) * 100
		}
	}

	return map[string]interface{}{"summary": summary}, nil
}

// Requisition operations
func (r *budgetRepository) CreateRequisition(req *models.Requisition) error {
	return r.db.Create(req).Error
}

func (r *budgetRepository) UpdateRequisition(req *models.Requisition) error {
	return r.db.Save(req).Error
}

func (r *budgetRepository) FindRequisitionByID(id, schoolID string) (*models.Requisition, error) {
	var req models.Requisition
	err := r.db.Where("id = ? AND school_id = ?", id, schoolID).
		Preload("Items").
		Preload("Requester").
		Preload("Approver").
		First(&req).Error
	return &req, err
}

func (r *budgetRepository) FindRequisitionsByFilters(schoolID, userID, userRole, status, department, priority string) ([]models.Requisition, error) {
	var requisitions []models.Requisition
	query := r.db.Where("school_id = ?", schoolID).
		Preload("Items").
		Preload("Requester")

	// Non-admin users can only see their own requisitions
	if userRole != "bursar" && userRole != "school_admin" && userRole != "system_admin" {
		query = query.Where("requested_by = ?", userID)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if department != "" {
		query = query.Where("department = ?", department)
	}
	if priority != "" {
		query = query.Where("priority = ?", priority)
	}

	err := query.Order("requested_date DESC").Find(&requisitions).Error
	return requisitions, err
}

func (r *budgetRepository) DeleteRequisition(id, schoolID string) error {
	tx := r.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Where("requisition_id = ?", id).Delete(&models.RequisitionItem{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.Requisition{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

func (r *budgetRepository) GetRequisitionStats(schoolID string) (map[string]interface{}, error) {
	var stats struct {
		TotalRequisitions int64   `json:"total_requisitions"`
		PendingCount      int64   `json:"pending_count"`
		ApprovedCount     int64   `json:"approved_count"`
		RejectedCount     int64   `json:"rejected_count"`
		TotalAmount       float64 `json:"total_amount"`
		ApprovedAmount    float64 `json:"approved_amount"`
		PendingAmount     float64 `json:"pending_amount"`
	}

	r.db.Model(&models.Requisition{}).Where("school_id = ?", schoolID).Count(&stats.TotalRequisitions)
	r.db.Model(&models.Requisition{}).Where("school_id = ? AND status = ?", schoolID, "pending").Count(&stats.PendingCount)
	r.db.Model(&models.Requisition{}).Where("school_id = ? AND status = ?", schoolID, "approved").Count(&stats.ApprovedCount)
	r.db.Model(&models.Requisition{}).Where("school_id = ? AND status = ?", schoolID, "rejected").Count(&stats.RejectedCount)

	r.db.Model(&models.Requisition{}).Where("school_id = ?", schoolID).Select("COALESCE(SUM(total_amount), 0)").Scan(&stats.TotalAmount)
	r.db.Model(&models.Requisition{}).Where("school_id = ? AND status = ?", schoolID, "approved").Select("COALESCE(SUM(total_amount), 0)").Scan(&stats.ApprovedAmount)
	r.db.Model(&models.Requisition{}).Where("school_id = ? AND status = ?", schoolID, "pending").Select("COALESCE(SUM(total_amount), 0)").Scan(&stats.PendingAmount)

	return map[string]interface{}{
		"total_requisitions": stats.TotalRequisitions,
		"pending_count":      stats.PendingCount,
		"approved_count":     stats.ApprovedCount,
		"rejected_count":     stats.RejectedCount,
		"total_amount":       stats.TotalAmount,
		"approved_amount":    stats.ApprovedAmount,
		"pending_amount":     stats.PendingAmount,
	}, nil
}
