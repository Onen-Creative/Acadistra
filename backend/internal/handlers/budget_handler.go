package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
)

func getCurrentTerm() string {
	month := time.Now().Month()
	if month >= 2 && month <= 5 {
		return "Term 1"
	} else if month >= 6 && month <= 9 {
		return "Term 2"
	}
	return "Term 3"
}

type BudgetHandler struct {
	db *gorm.DB
}

func NewBudgetHandler(db *gorm.DB) *BudgetHandler {
	return &BudgetHandler{db: db}
}

// CreateBudget creates a new budget allocation
func (h *BudgetHandler) CreateBudget(c *gin.Context) {
	schoolID := c.GetString("school_id")
	userID := c.GetString("user_id")

	var req struct {
		Year            int     `json:"year" binding:"required"`
		Term            string  `json:"term"`
		Department      string  `json:"department" binding:"required"`
		Category        string  `json:"category" binding:"required"`
		AllocatedAmount float64 `json:"allocated_amount" binding:"required,gt=0"`
		Notes           string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	budget := models.Budget{
		SchoolID:        uuid.MustParse(schoolID),
		Year:            req.Year,
		Term:            req.Term,
		Department:      req.Department,
		Category:        req.Category,
		AllocatedAmount: req.AllocatedAmount,
		AvailableAmount: req.AllocatedAmount,
		Notes:           req.Notes,
		CreatedBy:       uuid.MustParse(userID),
	}

	if err := h.db.Create(&budget).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create budget"})
		return
	}

	c.JSON(http.StatusCreated, budget)
}

// ListBudgets lists all budgets with filters
func (h *BudgetHandler) ListBudgets(c *gin.Context) {
	schoolID := c.GetString("school_id")
	year := c.Query("year")
	term := c.Query("term")
	department := c.Query("department")

	query := h.db.Where("school_id = ?", schoolID)
	
	if year != "" {
		query = query.Where("year = ?", year)
	}
	if term != "" {
		query = query.Where("term = ?", term)
	}
	if department != "" {
		query = query.Where("department = ?", department)
	}

	var budgets []models.Budget
	if err := query.Order("year DESC, term DESC, department, category").Find(&budgets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch budgets"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"budgets": budgets})
}

// GetBudget returns a single budget by ID
func (h *BudgetHandler) GetBudget(c *gin.Context) {
	schoolID := c.GetString("school_id")
	budgetID := c.Param("id")

	var budget models.Budget
	if err := h.db.Where("id = ? AND school_id = ?", budgetID, schoolID).First(&budget).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Budget not found"})
		return
	}

	c.JSON(http.StatusOK, budget)
}

// GetBudgetSummary returns budget vs actual spending summary
func (h *BudgetHandler) GetBudgetSummary(c *gin.Context) {
	schoolID := c.GetString("school_id")
	year := c.Query("year")
	term := c.Query("term")

	var summary []struct {
		Department      string  `json:"department"`
		AllocatedTotal  float64 `json:"allocated_total"`
		SpentTotal      float64 `json:"spent_total"`
		CommittedTotal  float64 `json:"committed_total"`
		AvailableTotal  float64 `json:"available_total"`
		UtilizationRate float64 `json:"utilization_rate"`
	}

	query := h.db.Model(&models.Budget{}).
		Select("department, SUM(allocated_amount) as allocated_total, SUM(spent_amount) as spent_total, SUM(committed_amount) as committed_total, SUM(available_amount) as available_total").
		Where("school_id = ?", schoolID).
		Group("department")

	if year != "" {
		query = query.Where("year = ?", year)
	}
	if term != "" {
		query = query.Where("term = ?", term)
	}

	if err := query.Find(&summary).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch summary"})
		return
	}

	// Calculate utilization rate
	for i := range summary {
		if summary[i].AllocatedTotal > 0 {
			summary[i].UtilizationRate = (summary[i].SpentTotal / summary[i].AllocatedTotal) * 100
		}
	}

	c.JSON(http.StatusOK, gin.H{"summary": summary})
}

type RequisitionHandler struct {
	db           *gorm.DB
	emailService *services.EmailService
}

func NewRequisitionHandler(db *gorm.DB, emailService *services.EmailService) *RequisitionHandler {
	return &RequisitionHandler{
		db:           db,
		emailService: emailService,
	}
}

// CreateRequisition creates a new requisition request
func (h *RequisitionHandler) CreateRequisition(c *gin.Context) {
	schoolID := c.GetString("school_id")
	userID := c.GetString("user_id")

	var req struct {
		Department    string  `json:"department" binding:"required"`
		Category      string  `json:"category" binding:"required"`
		Title         string  `json:"title" binding:"required"`
		Description   string  `json:"description" binding:"required"`
		Justification string  `json:"justification"`
		Priority      string  `json:"priority" binding:"required,oneof=urgent high medium low"`
		BudgetID      *string `json:"budget_id"`
		Items         []struct {
			ItemName       string  `json:"item_name" binding:"required"`
			Description    string  `json:"description"`
			Quantity       int     `json:"quantity" binding:"required,gt=0"`
			Unit           string  `json:"unit"`
			UnitPrice      float64 `json:"unit_price" binding:"required,gt=0"`
			Specifications string  `json:"specifications"`
		} `json:"items" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Calculate total amount
	var totalAmount float64
	for _, item := range req.Items {
		totalAmount += float64(item.Quantity) * item.UnitPrice
	}

	// Generate requisition number
	var count int64
	h.db.Model(&models.Requisition{}).Where("school_id = ? AND YEAR(created_at) = YEAR(NOW())", schoolID).Count(&count)
	reqNo := fmt.Sprintf("REQ-%d-%03d", time.Now().Year(), count+1)

	requisition := models.Requisition{
		SchoolID:      uuid.MustParse(schoolID),
		RequisitionNo: reqNo,
		Department:    req.Department,
		Category:      req.Category,
		Title:         req.Title,
		Description:   req.Description,
		Justification: req.Justification,
		TotalAmount:   totalAmount,
		Priority:      req.Priority,
		Status:        "pending",
		RequestedBy:   uuid.MustParse(userID),
		RequestedDate: time.Now(),
	}

	if req.BudgetID != nil {
		budgetID := uuid.MustParse(*req.BudgetID)
		requisition.BudgetID = &budgetID
	}

	// Start transaction
	tx := h.db.Begin()

	if err := tx.Create(&requisition).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create requisition"})
		return
	}

	// Create items
	for _, item := range req.Items {
		reqItem := models.RequisitionItem{
			RequisitionID:  requisition.ID,
			ItemName:       item.ItemName,
			Description:    item.Description,
			Quantity:       item.Quantity,
			Unit:           item.Unit,
			UnitPrice:      item.UnitPrice,
			TotalPrice:     float64(item.Quantity) * item.UnitPrice,
			Specifications: item.Specifications,
		}
		if err := tx.Create(&reqItem).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create requisition items"})
			return
		}
	}

	tx.Commit()

	// Load items for response
	h.db.Preload("Items").First(&requisition, requisition.ID)
	
	// Send requisition confirmation email
	go func(reqID uuid.UUID, reqNo string) {
		var req models.Requisition
		if err := h.db.Preload("Requester").First(&req, reqID).Error; err == nil && req.Requester != nil && req.Requester.Email != "" {
			if err := h.emailService.SendRequisitionStatusEmail(req.Requester.Email, reqNo, "submitted", "Your requisition has been submitted and is pending approval."); err != nil {
				log.Printf("Failed to send requisition confirmation: %v", err)
			}
		}
	}(requisition.ID, reqNo)

	c.JSON(http.StatusCreated, requisition)
}

// ListRequisitions lists requisitions with filters
func (h *RequisitionHandler) ListRequisitions(c *gin.Context) {
	schoolID := c.GetString("school_id")
	userID := c.GetString("user_id")
	userRole := c.GetString("user_role")
	status := c.Query("status")
	department := c.Query("department")
	priority := c.Query("priority")

	query := h.db.Where("school_id = ?", schoolID).Preload("Items").Preload("Requester")

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

	var requisitions []models.Requisition
	if err := query.Order("requested_date DESC").Find(&requisitions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch requisitions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"requisitions": requisitions})
}

// ApproveRequisition approves a requisition
func (h *RequisitionHandler) ApproveRequisition(c *gin.Context) {
	schoolID := c.GetString("school_id")
	userID := c.GetString("user_id")
	reqID := c.Param("id")

	var req struct {
		Notes    string  `json:"notes"`
		BudgetID *string `json:"budget_id"`
	}
	c.ShouldBindJSON(&req)

	var requisition models.Requisition
	if err := h.db.Where("id = ? AND school_id = ?", reqID, schoolID).First(&requisition).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Requisition not found"})
		return
	}

	if requisition.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Requisition already processed"})
		return
	}

	now := time.Now()
	approverID := uuid.MustParse(userID)
	
	requisition.Status = "approved"
	requisition.ApprovedBy = &approverID
	requisition.ApprovedDate = &now
	requisition.ApprovalNotes = req.Notes

	// Link to budget if provided
	if req.BudgetID != nil && *req.BudgetID != "" {
		budgetID := uuid.MustParse(*req.BudgetID)
		requisition.BudgetID = &budgetID
	}

	// Update budget committed amount if linked
	tx := h.db.Begin()
	
	if err := tx.Save(&requisition).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve requisition"})
		return
	}

	if requisition.BudgetID != nil {
		result := tx.Model(&models.Budget{}).Where("id = ?", requisition.BudgetID).
			Updates(map[string]interface{}{
				"committed_amount": gorm.Expr("committed_amount + ?", requisition.TotalAmount),
				"available_amount": gorm.Expr("available_amount - ?", requisition.TotalAmount),
			})
		if result.Error != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update budget"})
			return
		}
	}

	tx.Commit()
	
	// Send approval notification email
	go func(reqID uuid.UUID, reqNo string) {
		var req models.Requisition
		if err := h.db.Preload("Requester").First(&req, reqID).Error; err == nil && req.Requester != nil && req.Requester.Email != "" {
			if err := h.emailService.SendRequisitionStatusEmail(req.Requester.Email, reqNo, "approved", requisition.ApprovalNotes); err != nil {
				log.Printf("Failed to send requisition approval email: %v", err)
			}
		}
	}(requisition.ID, requisition.RequisitionNo)

	c.JSON(http.StatusOK, requisition)
}

// RejectRequisition rejects a requisition
func (h *RequisitionHandler) RejectRequisition(c *gin.Context) {
	schoolID := c.GetString("school_id")
	userID := c.GetString("user_id")
	reqID := c.Param("id")

	var req struct {
		Notes string `json:"notes" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var requisition models.Requisition
	if err := h.db.Where("id = ? AND school_id = ?", reqID, schoolID).First(&requisition).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Requisition not found"})
		return
	}

	if requisition.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Requisition already processed"})
		return
	}

	now := time.Now()
	reviewerID := uuid.MustParse(userID)
	
	requisition.Status = "rejected"
	requisition.ReviewedBy = &reviewerID
	requisition.ReviewedDate = &now
	requisition.ReviewNotes = req.Notes

	if err := h.db.Save(&requisition).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject requisition"})
		return
	}
	
	// Send rejection notification email
	go func(reqID uuid.UUID, reqNo string, reason string) {
		var req models.Requisition
		if err := h.db.Preload("Requester").First(&req, reqID).Error; err == nil && req.Requester != nil && req.Requester.Email != "" {
			if err := h.emailService.SendRequisitionStatusEmail(req.Requester.Email, reqNo, "rejected", reason); err != nil {
				log.Printf("Failed to send requisition rejection email: %v", err)
			}
		}
	}(requisition.ID, requisition.RequisitionNo, req.Notes)

	c.JSON(http.StatusOK, requisition)
}

// GetRequisitionStats returns requisition statistics
func (h *RequisitionHandler) GetRequisitionStats(c *gin.Context) {
	schoolID := c.GetString("school_id")

	var stats struct {
		TotalRequisitions   int64   `json:"total_requisitions"`
		PendingCount        int64   `json:"pending_count"`
		ApprovedCount       int64   `json:"approved_count"`
		RejectedCount       int64   `json:"rejected_count"`
		TotalAmount         float64 `json:"total_amount"`
		ApprovedAmount      float64 `json:"approved_amount"`
		PendingAmount       float64 `json:"pending_amount"`
	}

	h.db.Model(&models.Requisition{}).Where("school_id = ?", schoolID).Count(&stats.TotalRequisitions)
	h.db.Model(&models.Requisition{}).Where("school_id = ? AND status = ?", schoolID, "pending").Count(&stats.PendingCount)
	h.db.Model(&models.Requisition{}).Where("school_id = ? AND status = ?", schoolID, "approved").Count(&stats.ApprovedCount)
	h.db.Model(&models.Requisition{}).Where("school_id = ? AND status = ?", schoolID, "rejected").Count(&stats.RejectedCount)
	
	h.db.Model(&models.Requisition{}).Where("school_id = ?", schoolID).Select("COALESCE(SUM(total_amount), 0)").Scan(&stats.TotalAmount)
	h.db.Model(&models.Requisition{}).Where("school_id = ? AND status = ?", schoolID, "approved").Select("COALESCE(SUM(total_amount), 0)").Scan(&stats.ApprovedAmount)
	h.db.Model(&models.Requisition{}).Where("school_id = ? AND status = ?", schoolID, "pending").Select("COALESCE(SUM(total_amount), 0)").Scan(&stats.PendingAmount)

	c.JSON(http.StatusOK, stats)
}


// UpdateBudget updates an existing budget
func (h *BudgetHandler) UpdateBudget(c *gin.Context) {
	schoolID := c.GetString("school_id")
	budgetID := c.Param("id")

	var req struct {
		AllocatedAmount float64 `json:"allocated_amount"`
		Notes           string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var budget models.Budget
	if err := h.db.Where("id = ? AND school_id = ?", budgetID, schoolID).First(&budget).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Budget not found"})
		return
	}

	diff := req.AllocatedAmount - budget.AllocatedAmount
	budget.AllocatedAmount = req.AllocatedAmount
	budget.AvailableAmount += diff
	budget.Notes = req.Notes

	if err := h.db.Save(&budget).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update budget"})
		return
	}

	c.JSON(http.StatusOK, budget)
}

// DeleteBudget deletes a budget
func (h *BudgetHandler) DeleteBudget(c *gin.Context) {
	schoolID := c.GetString("school_id")
	budgetID := c.Param("id")

	var budget models.Budget
	if err := h.db.Where("id = ? AND school_id = ?", budgetID, schoolID).First(&budget).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Budget not found"})
		return
	}

	if budget.SpentAmount > 0 || budget.CommittedAmount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete budget with spent or committed amounts"})
		return
	}

	if err := h.db.Delete(&budget).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete budget"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Budget deleted successfully"})
}

// GetRequisition gets a single requisition
func (h *RequisitionHandler) GetRequisition(c *gin.Context) {
	schoolID := c.GetString("school_id")
	reqID := c.Param("id")

	var requisition models.Requisition
	if err := h.db.Where("id = ? AND school_id = ?", reqID, schoolID).
		Preload("Items").
		Preload("Requester").
		Preload("Approver").
		First(&requisition).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Requisition not found"})
		return
	}

	c.JSON(http.StatusOK, requisition)
}

// UpdateRequisition updates a requisition (only if pending)
func (h *RequisitionHandler) UpdateRequisition(c *gin.Context) {
	schoolID := c.GetString("school_id")
	reqID := c.Param("id")

	var requisition models.Requisition
	if err := h.db.Where("id = ? AND school_id = ?", reqID, schoolID).First(&requisition).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Requisition not found"})
		return
	}

	if requisition.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only update pending requisitions"})
		return
	}

	var req struct {
		Title         string `json:"title"`
		Description   string `json:"description"`
		Justification string `json:"justification"`
		Priority      string `json:"priority"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	requisition.Title = req.Title
	requisition.Description = req.Description
	requisition.Justification = req.Justification
	requisition.Priority = req.Priority

	if err := h.db.Save(&requisition).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update requisition"})
		return
	}

	c.JSON(http.StatusOK, requisition)
}

// DeleteRequisition deletes a requisition (only if pending)
func (h *RequisitionHandler) DeleteRequisition(c *gin.Context) {
	schoolID := c.GetString("school_id")
	reqID := c.Param("id")

	var requisition models.Requisition
	if err := h.db.Where("id = ? AND school_id = ?", reqID, schoolID).First(&requisition).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Requisition not found"})
		return
	}

	if requisition.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only delete pending requisitions"})
		return
	}

	tx := h.db.Begin()

	if err := tx.Where("requisition_id = ?", reqID).Delete(&models.RequisitionItem{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete requisition items"})
		return
	}

	if err := tx.Delete(&requisition).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete requisition"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Requisition deleted successfully"})
}

// MarkRequisitionPaid marks requisition as paid and creates expenditure
func (h *RequisitionHandler) MarkRequisitionPaid(c *gin.Context) {
	schoolID := c.GetString("school_id")
	userID := c.GetString("user_id")
	reqID := c.Param("id")

	var req struct {
		PaymentMethod string `json:"payment_method"`
		PaymentDate   string `json:"payment_date"`
		Notes         string `json:"notes"`
	}
	c.ShouldBindJSON(&req)

	var requisition models.Requisition
	if err := h.db.Where("id = ? AND school_id = ?", reqID, schoolID).First(&requisition).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Requisition not found"})
		return
	}

	if requisition.Status != "approved" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only approved requisitions can be marked as paid"})
		return
	}

	tx := h.db.Begin()

	// Create expenditure
	expenditure := models.Expenditure{
		SchoolID:    uuid.MustParse(schoolID),
		Category:    requisition.Category,
		Amount:      requisition.TotalAmount,
		Description: fmt.Sprintf("Payment for requisition %s: %s", requisition.RequisitionNo, requisition.Title),
		Date:        time.Now(),
		Term:        getCurrentTerm(),
		Year:        time.Now().Year(),
		RecordedBy:  uuid.MustParse(userID),
		Status:      "paid",
	}

	if req.PaymentDate != "" {
		if parsedDate, err := time.Parse("2006-01-02", req.PaymentDate); err == nil {
			expenditure.Date = parsedDate
		}
	}

	if err := tx.Create(&expenditure).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create expenditure"})
		return
	}

	// Update requisition
	now := time.Now()
	requisition.Status = "completed"
	requisition.CompletedDate = &now
	requisition.ExpenditureID = &expenditure.ID

	if err := tx.Save(&requisition).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update requisition"})
		return
	}

	// Update budget: move from committed to spent
	if requisition.BudgetID != nil {
		result := tx.Model(&models.Budget{}).Where("id = ?", requisition.BudgetID).
			Updates(map[string]interface{}{
				"committed_amount": gorm.Expr("committed_amount - ?", requisition.TotalAmount),
				"spent_amount":     gorm.Expr("spent_amount + ?", requisition.TotalAmount),
			})
		if result.Error != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update budget"})
			return
		}
	}

	tx.Commit()

	// Load full requisition data with items and requester for receipt
	h.db.Preload("Items").Preload("Requester").First(&requisition, requisition.ID)

	c.JSON(http.StatusOK, gin.H{
		"message":      "Requisition marked as paid",
		"requisition":  requisition,
		"expenditure":  expenditure,
	})
}
