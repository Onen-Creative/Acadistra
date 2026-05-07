package repositories

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/school-system/backend/internal/models"
	"gorm.io/gorm"
)

type InventoryRepository interface {
	CreateItem(item *models.InventoryItem) error
	FindItemByID(id uint) (*models.InventoryItem, error)
	FindItemsBySchool(schoolID uint) ([]models.InventoryItem, error)
	FindLowStockItems(schoolID uint) ([]models.InventoryItem, error)
	
	CreateTransaction(transaction *models.InventoryTransaction) error
	FindTransactionsByItem(itemID uint) ([]models.InventoryTransaction, error)

	ListCategories() ([]models.InventoryCategory, error)
	ListItems(schoolID, categoryID, search string, lowStock bool) ([]models.InventoryItem, error)
	CreateItemWithTransaction(schoolID, userID, categoryID, name, description, unit string, quantity, reorderLevel, unitPrice float64, location, supplier, barcode string, expiryDate *time.Time) (*models.InventoryItem, error)
	UpdateItem(id, schoolID, categoryID, name, description, unit string, reorderLevel, unitPrice float64, location string) (*models.InventoryItem, error)
	DeleteItem(id, schoolID string) error
	RecordTransaction(itemID, schoolID, userID, transactionType string, quantity, unitPrice float64, referenceNo, notes, supplier string) (*models.InventoryTransaction, *models.InventoryItem, bool, error)
	ListTransactions(itemID, transactionType string) ([]models.InventoryTransaction, error)
	GetStats(schoolID string) (map[string]interface{}, error)
	GetPurchaseReceipt(transactionID, schoolID string) (map[string]interface{}, error)
}

type inventoryRepository struct {
	db *gorm.DB
}

func NewInventoryRepository(db *gorm.DB) InventoryRepository {
	return &inventoryRepository{db: db}
}

func (r *inventoryRepository) CreateItem(item *models.InventoryItem) error {
	return r.db.Create(item).Error
}

func (r *inventoryRepository) FindItemByID(id uint) (*models.InventoryItem, error) {
	var item models.InventoryItem
	err := r.db.First(&item, id).Error
	return &item, err
}

func (r *inventoryRepository) FindItemsBySchool(schoolID uint) ([]models.InventoryItem, error) {
	var items []models.InventoryItem
	err := r.db.Where("school_id = ?", schoolID).Find(&items).Error
	return items, err
}

func (r *inventoryRepository) FindLowStockItems(schoolID uint) ([]models.InventoryItem, error) {
	var items []models.InventoryItem
	err := r.db.Where("school_id = ? AND quantity <= reorder_level", schoolID).Find(&items).Error
	return items, err
}

func (r *inventoryRepository) CreateTransaction(transaction *models.InventoryTransaction) error {
	return r.db.Create(transaction).Error
}

func (r *inventoryRepository) FindTransactionsByItem(itemID uint) ([]models.InventoryTransaction, error) {
	var transactions []models.InventoryTransaction
	err := r.db.Where("item_id = ?", itemID).
		Order("created_at DESC").
		Find(&transactions).Error
	return transactions, err
}

func (r *inventoryRepository) ListCategories() ([]models.InventoryCategory, error) {
	var categories []models.InventoryCategory
	err := r.db.Order("name").Find(&categories).Error
	return categories, err
}

func (r *inventoryRepository) ListItems(schoolID, categoryID, search string, lowStock bool) ([]models.InventoryItem, error) {
	var items []models.InventoryItem
	query := r.db.Preload("Category").Where("school_id = ?", schoolID)

	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}
	if search != "" {
		query = query.Where("name ILIKE ? OR description ILIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if lowStock {
		query = query.Where("quantity <= reorder_level")
	}

	err := query.Order("name").Find(&items).Error
	return items, err
}

func (r *inventoryRepository) CreateItemWithTransaction(schoolID, userID, categoryID, name, description, unit string, quantity, reorderLevel, unitPrice float64, location, supplier, barcode string, expiryDate *time.Time) (*models.InventoryItem, error) {
	var count int64
	r.db.Model(&models.InventoryItem{}).Where("school_id = ?", schoolID).Count(&count)
	itemNumber := fmt.Sprintf("INV-%04d", count+1)

	item := models.InventoryItem{
		SchoolID:               uuid.MustParse(schoolID),
		ItemNumber:             itemNumber,
		Name:                   name,
		Description:            description,
		Unit:                   unit,
		Quantity:               quantity,
		TotalQuantityPurchased: quantity,
		ReorderLevel:           reorderLevel,
		UnitPrice:              unitPrice,
		TotalPurchaseCost:      quantity * unitPrice,
		Location:               location,
		Supplier:               supplier,
		Barcode:                barcode,
		ExpiryDate:             expiryDate,
	}

	if categoryID != "" {
		catID := uuid.MustParse(categoryID)
		item.CategoryID = &catID
	}

	if err := r.db.Create(&item).Error; err != nil {
		return nil, err
	}

	if quantity > 0 && unitPrice > 0 {
		tx := r.db.Begin()
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

		transaction := models.InventoryTransaction{
			ItemID:          item.ID,
			TransactionType: "purchase",
			Quantity:        quantity,
			UnitPrice:       unitPrice,
			TotalCost:       quantity * unitPrice,
			Notes:           "Initial stock",
			TransactionDate: now,
			RecordedBy:      uuid.MustParse(userID),
		}
		if err := tx.Create(&transaction).Error; err != nil {
			tx.Rollback()
		} else {
			expenditure := models.Expenditure{
				SchoolID:    uuid.MustParse(schoolID),
				Category:    "Supplies",
				Vendor:      supplier,
				Amount:      quantity * unitPrice,
				Description: fmt.Sprintf("Purchase of %s (%.2f %s)", name, quantity, unit),
				Date:        now,
				Term:        term,
				Year:        year,
				RecordedBy:  uuid.MustParse(userID),
				Status:      "paid",
			}
			userUUID := uuid.MustParse(userID)
			expenditure.ApprovedBy = &userUUID
			if err := tx.Create(&expenditure).Error; err != nil {
				tx.Rollback()
			} else {
				tx.Commit()
			}
		}
	}

	r.db.Preload("Category").First(&item, item.ID)
	return &item, nil
}

func (r *inventoryRepository) UpdateItem(id, schoolID, categoryID, name, description, unit string, reorderLevel, unitPrice float64, location string) (*models.InventoryItem, error) {
	var item models.InventoryItem
	if err := r.db.Where("id = ? AND school_id = ?", id, schoolID).First(&item).Error; err != nil {
		return nil, err
	}

	if name != "" {
		item.Name = name
	}
	if description != "" {
		item.Description = description
	}
	if unit != "" {
		item.Unit = unit
	}
	item.ReorderLevel = reorderLevel
	item.UnitPrice = unitPrice
	item.Location = location

	if categoryID != "" {
		catID := uuid.MustParse(categoryID)
		item.CategoryID = &catID
	}

	if err := r.db.Save(&item).Error; err != nil {
		return nil, err
	}

	r.db.Preload("Category").First(&item, item.ID)
	return &item, nil
}

func (r *inventoryRepository) DeleteItem(id, schoolID string) error {
	return r.db.Where("id = ? AND school_id = ?", id, schoolID).Delete(&models.InventoryItem{}).Error
}

func (r *inventoryRepository) RecordTransaction(itemID, schoolID, userID, transactionType string, quantity, unitPrice float64, referenceNo, notes, supplier string) (*models.InventoryTransaction, *models.InventoryItem, bool, error) {
	itemUUID := uuid.MustParse(itemID)
	var item models.InventoryItem
	if err := r.db.First(&item, itemUUID).Error; err != nil {
		return nil, nil, false, fmt.Errorf("Item not found")
	}

	tx := r.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	switch transactionType {
	case "purchase", "donation", "return":
		item.Quantity += quantity
		if transactionType == "purchase" {
			item.TotalQuantityPurchased += quantity
			item.TotalPurchaseCost += quantity * unitPrice
		}
	case "issue", "spoilage", "loss", "damage":
		if item.Quantity < quantity {
			tx.Rollback()
			return nil, nil, false, fmt.Errorf("Insufficient quantity")
		}
		item.Quantity -= quantity
	case "adjustment":
		item.Quantity = quantity
	}

	transaction := models.InventoryTransaction{
		ItemID:          itemUUID,
		TransactionType: transactionType,
		Quantity:        quantity,
		UnitPrice:       unitPrice,
		TotalCost:       quantity * unitPrice,
		ReferenceNo:     referenceNo,
		Notes:           notes,
		TransactionDate: time.Now(),
		RecordedBy:      uuid.MustParse(userID),
	}

	if err := tx.Create(&transaction).Error; err != nil {
		tx.Rollback()
		return nil, nil, false, err
	}

	if err := tx.Save(&item).Error; err != nil {
		tx.Rollback()
		return nil, nil, false, err
	}

	expenditureCreated := false
	if transactionType == "purchase" && unitPrice > 0 {
		now := time.Now()
		year := now.Year()
		term := "Term1"
		if now.Month() >= 5 && now.Month() <= 8 {
			term = "Term2"
		} else if now.Month() >= 9 {
			term = "Term3"
		}

		expenditure := models.Expenditure{
			SchoolID:    uuid.MustParse(schoolID),
			Category:    "Supplies",
			Vendor:      supplier,
			Amount:      quantity * unitPrice,
			Description: fmt.Sprintf("Purchase of %s (%.2f %s)", item.Name, quantity, item.Unit),
			Date:        transaction.TransactionDate,
			Term:        term,
			Year:        year,
			InvoiceNo:   referenceNo,
			RecordedBy:  uuid.MustParse(userID),
			Status:      "paid",
		}
		userUUID := uuid.MustParse(userID)
		expenditure.ApprovedBy = &userUUID

		if err := tx.Create(&expenditure).Error; err != nil {
			tx.Rollback()
			return nil, nil, false, err
		}
		expenditureCreated = true
	}

	if err := tx.Commit().Error; err != nil {
		return nil, nil, false, err
	}

	return &transaction, &item, expenditureCreated, nil
}

func (r *inventoryRepository) ListTransactions(itemID, transactionType string) ([]models.InventoryTransaction, error) {
	var transactions []models.InventoryTransaction
	query := r.db.Preload("Item.Category")

	if itemID != "" {
		query = query.Where("item_id = ?", itemID)
	}
	if transactionType != "" {
		query = query.Where("transaction_type = ?", transactionType)
	}

	err := query.Order("transaction_date DESC").Limit(100).Find(&transactions).Error
	return transactions, err
}

func (r *inventoryRepository) GetStats(schoolID string) (map[string]interface{}, error) {
	var totalItems int64
	var lowStockItems int64
	var totalValue float64

	r.db.Model(&models.InventoryItem{}).Where("school_id = ?", schoolID).Count(&totalItems)
	r.db.Model(&models.InventoryItem{}).Where("school_id = ? AND quantity <= reorder_level", schoolID).Count(&lowStockItems)
	r.db.Model(&models.InventoryItem{}).Where("school_id = ?", schoolID).Select("COALESCE(SUM(quantity * unit_price), 0)").Scan(&totalValue)

	return map[string]interface{}{
		"total_items":     totalItems,
		"low_stock_items": lowStockItems,
		"total_value":     totalValue,
	}, nil
}

func (r *inventoryRepository) GetPurchaseReceipt(transactionID, schoolID string) (map[string]interface{}, error) {
	var transaction models.InventoryTransaction
	if err := r.db.Preload("Item.Category").First(&transaction, "id = ?", transactionID).Error; err != nil {
		return nil, fmt.Errorf("Transaction not found")
	}

	if transaction.TransactionType != "purchase" {
		return nil, fmt.Errorf("Not a purchase transaction")
	}

	var school models.School
	r.db.First(&school, "id = ?", schoolID)

	var expenditure models.Expenditure
	r.db.Where("school_id = ? AND description LIKE ? AND date = ?", schoolID, "%"+transaction.Item.Name+"%", transaction.TransactionDate).First(&expenditure)

	return map[string]interface{}{
		"transaction": transaction,
		"school":      school,
		"expenditure": expenditure,
	}, nil
}
