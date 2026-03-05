package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type InventoryHandler struct {
	db *gorm.DB
}

func NewInventoryHandler(db *gorm.DB) *InventoryHandler {
	return &InventoryHandler{db: db}
}

// List Categories
func (h *InventoryHandler) ListCategories(c *gin.Context) {
	var categories []models.InventoryCategory
	if err := h.db.Order("name").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, categories)
}

// List Items
func (h *InventoryHandler) ListItems(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID not found in context"})
		return
	}
	categoryID := c.Query("category_id")
	search := c.Query("search")
	lowStock := c.Query("low_stock")

	var items []models.InventoryItem
	query := h.db.Preload("Category").Where("school_id = ?", schoolID)

	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}
	if search != "" {
		query = query.Where("name ILIKE ? OR description ILIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if lowStock == "true" {
		query = query.Where("quantity <= reorder_level")
	}

	if err := query.Order("name").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

// Create Item
func (h *InventoryHandler) CreateItem(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	userID := c.GetString("user_id")
	fmt.Printf("[INVENTORY] CreateItem - SchoolID: %s, UserID: %s\n", schoolID, userID)
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

	// Generate item number
	var count int64
	h.db.Model(&models.InventoryItem{}).Where("school_id = ?", schoolID).Count(&count)
	itemNumber := fmt.Sprintf("INV-%04d", count+1)

	item := models.InventoryItem{
		SchoolID:               uuid.MustParse(schoolID),
		ItemNumber:             itemNumber,
		Name:                   req.Name,
		Description:            req.Description,
		Unit:                   req.Unit,
		Quantity:               req.Quantity,
		TotalQuantityPurchased: req.Quantity,
		ReorderLevel:           req.ReorderLevel,
		UnitPrice:              req.UnitPrice,
		TotalPurchaseCost:      req.Quantity * req.UnitPrice,
		Location:               req.Location,
		Supplier:               req.Supplier,
		Barcode:                req.Barcode,
	}

	if req.CategoryID != "" {
		catID := uuid.MustParse(req.CategoryID)
		item.CategoryID = &catID
	}

	if req.ExpiryDate != "" {
		if expiry, err := time.Parse("2006-01-02", req.ExpiryDate); err == nil {
			item.ExpiryDate = &expiry
		}
	}

	if err := h.db.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Automatically create purchase transaction and expenditure if initial quantity > 0
	if req.Quantity > 0 && req.UnitPrice > 0 {
		tx := h.db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		now := time.Now()
		year := now.Year()
		term := "Term1"
		if now.Month() >= 5 && now.Month() <= 8 {
			term = "Term2"
		} else if now.Month() >= 9 {
			term = "Term3"
		}

		// Create transaction
		transaction := models.InventoryTransaction{
			ItemID:          item.ID,
			TransactionType: "purchase",
			Quantity:        req.Quantity,
			UnitPrice:       req.UnitPrice,
			TotalCost:       req.Quantity * req.UnitPrice,
			ReferenceNo:     "",
			Notes:           "Initial stock",
			TransactionDate: now,
			RecordedBy:      uuid.MustParse(c.GetString("user_id")),
		}
		if err := tx.Create(&transaction).Error; err != nil {
			tx.Rollback()
		} else {
			// Create expenditure
			expenditure := models.Expenditure{
				SchoolID:    uuid.MustParse(schoolID),
				Category:    "Supplies",
				Vendor:      req.Supplier,
				Amount:      req.Quantity * req.UnitPrice,
				Description: fmt.Sprintf("Purchase of %s (%.2f %s)", req.Name, req.Quantity, req.Unit),
				Date:        now,
				Term:        term,
				Year:        year,
				InvoiceNo:   "",
				RecordedBy:  uuid.MustParse(c.GetString("user_id")),
				Status:      "paid",
			}
			userUUID := uuid.MustParse(c.GetString("user_id"))
			expenditure.ApprovedBy = &userUUID
			if err := tx.Create(&expenditure).Error; err != nil {
				tx.Rollback()
			} else {
				tx.Commit()
			}
		}
	}

	h.db.Preload("Category").First(&item, item.ID)
	c.JSON(http.StatusCreated, item)
}

// Update Item
func (h *InventoryHandler) UpdateItem(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var item models.InventoryItem
	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).First(&item).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

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

	if req.Name != "" {
		item.Name = req.Name
	}
	if req.Description != "" {
		item.Description = req.Description
	}
	if req.Unit != "" {
		item.Unit = req.Unit
	}
	item.ReorderLevel = req.ReorderLevel
	item.UnitPrice = req.UnitPrice
	item.Location = req.Location

	if req.CategoryID != "" {
		catID := uuid.MustParse(req.CategoryID)
		item.CategoryID = &catID
	}

	if err := h.db.Save(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.db.Preload("Category").First(&item, item.ID)
	c.JSON(http.StatusOK, item)
}

// Delete Item
func (h *InventoryHandler) DeleteItem(c *gin.Context) {
	id := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	if err := h.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.InventoryItem{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item deleted"})
}

// Record Transaction
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

	itemID := uuid.MustParse(req.ItemID)
	var item models.InventoryItem
	if err := h.db.First(&item, itemID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	// Start transaction
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update quantity based on transaction type
	switch req.TransactionType {
	case "purchase", "donation", "return":
		item.Quantity += req.Quantity
		// Only purchases increase totals
		if req.TransactionType == "purchase" {
			item.TotalQuantityPurchased += req.Quantity
			item.TotalPurchaseCost += req.Quantity * req.UnitPrice
		}
	case "issue", "spoilage", "loss", "damage":
		if item.Quantity < req.Quantity {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient quantity"})
			return
		}
		item.Quantity -= req.Quantity
	case "adjustment":
		item.Quantity = req.Quantity
	}

	transaction := models.InventoryTransaction{
		ItemID:          itemID,
		TransactionType: req.TransactionType,
		Quantity:        req.Quantity,
		UnitPrice:       req.UnitPrice,
		TotalCost:       req.Quantity * req.UnitPrice,
		ReferenceNo:     req.ReferenceNo,
		Notes:           req.Notes,
		TransactionDate: time.Now(),
		RecordedBy:      uuid.MustParse(userID),
	}

	if err := tx.Create(&transaction).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := tx.Save(&item).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Automatically create expenditure record for purchases
	if req.TransactionType == "purchase" && req.UnitPrice > 0 {
		// Get current term and year from school config or use defaults
		now := time.Now()
		year := now.Year()
		term := "Term1" // Default term
		if now.Month() >= 5 && now.Month() <= 8 {
			term = "Term2"
		} else if now.Month() >= 9 {
			term = "Term3"
		}

		expenditure := models.Expenditure{
			SchoolID:    uuid.MustParse(schoolID),
			Category:    "Supplies",
			Vendor:      req.Supplier,
			Amount:      req.Quantity * req.UnitPrice,
			Description: fmt.Sprintf("Purchase of %s (%.2f %s)", item.Name, req.Quantity, item.Unit),
			Date:        transaction.TransactionDate,
			Term:        term,
			Year:        year,
			InvoiceNo:   req.ReferenceNo,
			RecordedBy:  uuid.MustParse(userID),
			Status:      "paid",
		}
		userUUID := uuid.MustParse(userID)
		expenditure.ApprovedBy = &userUUID

		if err := tx.Create(&expenditure).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create expenditure record: " + err.Error()})
			return
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"transaction": transaction, "item": item, "expenditure_created": req.TransactionType == "purchase"})
}

// List Transactions
func (h *InventoryHandler) ListTransactions(c *gin.Context) {
	itemID := c.Query("item_id")
	transactionType := c.Query("type")

	var transactions []models.InventoryTransaction
	query := h.db.Preload("Item.Category")

	if itemID != "" {
		query = query.Where("item_id = ?", itemID)
	}
	if transactionType != "" {
		query = query.Where("transaction_type = ?", transactionType)
	}

	if err := query.Order("transaction_date DESC").Limit(100).Find(&transactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, transactions)
}

// Get Dashboard Stats
func (h *InventoryHandler) GetStats(c *gin.Context) {
	schoolID := c.GetString("tenant_school_id")
	if schoolID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "School ID not found in context"})
		return
	}

	var totalItems int64
	var lowStockItems int64
	var totalValue float64

	h.db.Model(&models.InventoryItem{}).Where("school_id = ?", schoolID).Count(&totalItems)
	h.db.Model(&models.InventoryItem{}).Where("school_id = ? AND quantity <= reorder_level", schoolID).Count(&lowStockItems)
	h.db.Model(&models.InventoryItem{}).Where("school_id = ?", schoolID).Select("COALESCE(SUM(quantity * unit_price), 0)").Scan(&totalValue)

	c.JSON(http.StatusOK, gin.H{
		"total_items":     totalItems,
		"low_stock_items": lowStockItems,
		"total_value":     totalValue,
	})
}

// Get Purchase Receipt
func (h *InventoryHandler) GetPurchaseReceipt(c *gin.Context) {
	transactionID := c.Param("id")
	schoolID := c.GetString("tenant_school_id")

	var transaction models.InventoryTransaction
	if err := h.db.Preload("Item.Category").First(&transaction, "id = ?", transactionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	if transaction.TransactionType != "purchase" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Not a purchase transaction"})
		return
	}

	// Get school details
	var school models.School
	h.db.First(&school, "id = ?", schoolID)

	// Get expenditure record if exists
	var expenditure models.Expenditure
	h.db.Where("school_id = ? AND description LIKE ? AND date = ?", schoolID, "%"+transaction.Item.Name+"%", transaction.TransactionDate).First(&expenditure)

	c.JSON(http.StatusOK, gin.H{
		"transaction": transaction,
		"school":       school,
		"expenditure":  expenditure,
	})
}
