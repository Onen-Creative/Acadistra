package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/school-system/backend/internal/services"
)

type InventoryHandler struct {
	service *services.InventoryService
}

func NewInventoryHandler(service *services.InventoryService) *InventoryHandler {
	return &InventoryHandler{service: service}
}

func (h *InventoryHandler) ListCategories(c *gin.Context) {
	categories, err := h.service.ListCategories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, categories)
}

func (h *InventoryHandler) ListItems(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID not found in context"})
		return
	}

	items, err := h.service.ListItems(schoolID, c.Query("category_id"), c.Query("search"), c.Query("low_stock") == "true")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *InventoryHandler) CreateItem(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID not found in context"})
		return
	}

	var req struct {
		CategoryID   string  `json:"category_id"`
		Name         string  `json:"name" binding:"required"`
		Description  string  `json:"description"`
		Unit         string  `json:"unit" binding:"required"`
		Quantity     float64 `json:"quantity"`
		ReorderLevel float64 `json:"reorder_level"`
		UnitPrice    float64 `json:"unit_price"`
		Location     string  `json:"location"`
		Supplier     string  `json:"supplier"`
		Barcode      string  `json:"barcode"`
		ExpiryDate   string  `json:"expiry_date"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var expiryDate *time.Time
	if req.ExpiryDate != "" {
		if expiry, err := time.Parse("2006-01-02", req.ExpiryDate); err == nil {
			expiryDate = &expiry
		}
	}

	item, err := h.service.CreateItem(schoolID, userID, req.CategoryID, req.Name, req.Description, req.Unit, req.Quantity, req.ReorderLevel, req.UnitPrice, req.Location, req.Supplier, req.Barcode, expiryDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func (h *InventoryHandler) UpdateItem(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var req struct {
		CategoryID   string  `json:"category_id"`
		Name         string  `json:"name"`
		Description  string  `json:"description"`
		Unit         string  `json:"unit"`
		ReorderLevel float64 `json:"reorder_level"`
		UnitPrice    float64 `json:"unit_price"`
		Location     string  `json:"location"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item, err := h.service.UpdateItem(id, schoolID, req.CategoryID, req.Name, req.Description, req.Unit, req.ReorderLevel, req.UnitPrice, req.Location)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	c.JSON(http.StatusOK, item)
}

func (h *InventoryHandler) DeleteItem(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	if err := h.service.DeleteItem(id, schoolID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item deleted"})
}

func (h *InventoryHandler) RecordTransaction(c *gin.Context) {
	userID := c.GetString("user_id")
	schoolID := c.GetString("tenant_school_id")

	var req struct {
		ItemID          string  `json:"item_id" binding:"required"`
		TransactionType string  `json:"transaction_type" binding:"required"`
		Quantity        float64 `json:"quantity" binding:"required"`
		UnitPrice       float64 `json:"unit_price"`
		ReferenceNo     string  `json:"reference_no"`
		Notes           string  `json:"notes"`
		Supplier        string  `json:"supplier"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	transaction, item, expenditureCreated, err := h.service.RecordTransaction(req.ItemID, schoolID, userID, req.TransactionType, req.Quantity, req.UnitPrice, req.ReferenceNo, req.Notes, req.Supplier)
	if err != nil {
		if err.Error() == "Insufficient quantity" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else if err.Error() == "Item not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{"transaction": transaction, "item": item, "expenditure_created": expenditureCreated})
}

func (h *InventoryHandler) ListTransactions(c *gin.Context) {
	transactions, err := h.service.ListTransactions(c.Query("item_id"), c.Query("type"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, transactions)
}

func (h *InventoryHandler) GetStats(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID not found in context"})
		return
	}

	stats, err := h.service.GetStats(schoolID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

func (h *InventoryHandler) GetPurchaseReceipt(c *gin.Context) {
	transactionID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	receipt, err := h.service.GetPurchaseReceipt(transactionID, schoolID)
	if err != nil {
		if err.Error() == "Transaction not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if err.Error() == "Not a purchase transaction" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, receipt)
}
