package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/services"
)

type BudgetHandler struct {
	service *services.BudgetRequisitionService
}

func NewBudgetHandler(service *services.BudgetRequisitionService) *BudgetHandler {
	return &BudgetHandler{service: service}
}

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

	budget := &models.Budget{
		SchoolID:        uuid.MustParse(schoolID),
		Year:            req.Year,
		Term:            req.Term,
		Department:      req.Department,
		Category:        req.Category,
		AllocatedAmount: req.AllocatedAmount,
		Notes:           req.Notes,
		CreatedBy:       uuid.MustParse(userID),
	}

	if err := h.service.CreateBudget(budget); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create budget"})
		return
	}

	c.JSON(http.StatusCreated, budget)
}

func (h *BudgetHandler) ListBudgets(c *gin.Context) {
	schoolID := c.GetString("school_id")
	year := c.Query("year")
	term := c.Query("term")
	department := c.Query("department")

	budgets, err := h.service.ListBudgets(schoolID, year, term, department)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch budgets"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"budgets": budgets})
}

func (h *BudgetHandler) GetBudget(c *gin.Context) {
	schoolID := c.GetString("school_id")
	budgetID := c.Param("id")

	budget, err := h.service.GetBudget(budgetID, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Budget not found"})
		return
	}

	c.JSON(http.StatusOK, budget)
}

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

	budget, err := h.service.UpdateBudget(budgetID, schoolID, req.AllocatedAmount, req.Notes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, budget)
}

func (h *BudgetHandler) DeleteBudget(c *gin.Context) {
	schoolID := c.GetString("school_id")
	budgetID := c.Param("id")

	if err := h.service.DeleteBudget(budgetID, schoolID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Budget deleted successfully"})
}

func (h *BudgetHandler) GetBudgetSummary(c *gin.Context) {
	schoolID := c.GetString("school_id")
	year := c.Query("year")
	term := c.Query("term")
	department := c.Query("department")

	summary, err := h.service.GetBudgetSummary(schoolID, year, term, department)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch summary"})
		return
	}

	c.JSON(http.StatusOK, summary)
}

type RequisitionHandler struct {
	service *services.BudgetRequisitionService
}

func NewRequisitionHandler(service *services.BudgetRequisitionService) *RequisitionHandler {
	return &RequisitionHandler{service: service}
}

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

	requisition := &models.Requisition{
		SchoolID:      uuid.MustParse(schoolID),
		Department:    req.Department,
		Category:      req.Category,
		Title:         req.Title,
		Description:   req.Description,
		Justification: req.Justification,
		Priority:      req.Priority,
		RequestedBy:   uuid.MustParse(userID),
	}

	if req.BudgetID != nil {
		budgetID := uuid.MustParse(*req.BudgetID)
		requisition.BudgetID = &budgetID
	}

	items := make([]models.RequisitionItem, len(req.Items))
	for i, item := range req.Items {
		items[i] = models.RequisitionItem{
			ItemName:       item.ItemName,
			Description:    item.Description,
			Quantity:       item.Quantity,
			Unit:           item.Unit,
			UnitPrice:      item.UnitPrice,
			Specifications: item.Specifications,
		}
	}

	result, err := h.service.CreateRequisition(requisition, items)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, result)
}

func (h *RequisitionHandler) ListRequisitions(c *gin.Context) {
	schoolID := c.GetString("school_id")
	userID := c.GetString("user_id")
	userRole := c.GetString("user_role")
	status := c.Query("status")
	department := c.Query("department")
	priority := c.Query("priority")

	requisitions, err := h.service.ListRequisitions(schoolID, userID, userRole, status, department, priority)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch requisitions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"requisitions": requisitions})
}

func (h *RequisitionHandler) GetRequisition(c *gin.Context) {
	schoolID := c.GetString("school_id")
	reqID := c.Param("id")

	requisition, err := h.service.GetRequisition(reqID, schoolID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Requisition not found"})
		return
	}

	c.JSON(http.StatusOK, requisition)
}

func (h *RequisitionHandler) UpdateRequisition(c *gin.Context) {
	schoolID := c.GetString("school_id")
	reqID := c.Param("id")

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

	requisition, err := h.service.UpdateRequisition(reqID, schoolID, req.Title, req.Description, req.Justification, req.Priority)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, requisition)
}

func (h *RequisitionHandler) DeleteRequisition(c *gin.Context) {
	schoolID := c.GetString("school_id")
	reqID := c.Param("id")

	if err := h.service.DeleteRequisition(reqID, schoolID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Requisition deleted successfully"})
}

func (h *RequisitionHandler) ApproveRequisition(c *gin.Context) {
	schoolID := c.GetString("school_id")
	userID := c.GetString("user_id")
	reqID := c.Param("id")

	var req struct {
		Notes    string  `json:"notes"`
		BudgetID *string `json:"budget_id"`
	}
	c.ShouldBindJSON(&req)

	requisition, err := h.service.ApproveRequisition(reqID, schoolID, userID, req.Notes, req.BudgetID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, requisition)
}

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

	requisition, err := h.service.RejectRequisition(reqID, schoolID, userID, req.Notes)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, requisition)
}

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

	result, err := h.service.MarkRequisitionPaid(reqID, schoolID, userID, req.PaymentMethod, req.PaymentDate, req.Notes)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *RequisitionHandler) GetRequisitionStats(c *gin.Context) {
	schoolID := c.GetString("school_id")

	stats, err := h.service.GetRequisitionStats(schoolID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}
