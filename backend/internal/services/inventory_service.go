package services

import (
	"time"

	"github.com/school-system/backend/internal/models"
	"github.com/school-system/backend/internal/repositories"
)

type InventoryService struct {
	repo repositories.InventoryRepository
}

func NewInventoryService(repo repositories.InventoryRepository) *InventoryService {
	return &InventoryService{repo: repo}
}

func (s *InventoryService) ListCategories() ([]models.InventoryCategory, error) {
	return s.repo.ListCategories()
}

func (s *InventoryService) ListItems(schoolID, categoryID, search string, lowStock bool) ([]models.InventoryItem, error) {
	return s.repo.ListItems(schoolID, categoryID, search, lowStock)
}

func (s *InventoryService) CreateItem(schoolID, userID, categoryID, name, description, unit string, quantity, reorderLevel, unitPrice float64, location, supplier, barcode string, expiryDate *time.Time) (*models.InventoryItem, error) {
	return s.repo.CreateItemWithTransaction(schoolID, userID, categoryID, name, description, unit, quantity, reorderLevel, unitPrice, location, supplier, barcode, expiryDate)
}

func (s *InventoryService) UpdateItem(id, schoolID, categoryID, name, description, unit string, reorderLevel, unitPrice float64, location string) (*models.InventoryItem, error) {
	return s.repo.UpdateItem(id, schoolID, categoryID, name, description, unit, reorderLevel, unitPrice, location)
}

func (s *InventoryService) DeleteItem(id, schoolID string) error {
	return s.repo.DeleteItem(id, schoolID)
}

func (s *InventoryService) RecordTransaction(itemID, schoolID, userID, transactionType string, quantity, unitPrice float64, referenceNo, notes, supplier string) (*models.InventoryTransaction, *models.InventoryItem, bool, error) {
	return s.repo.RecordTransaction(itemID, schoolID, userID, transactionType, quantity, unitPrice, referenceNo, notes, supplier)
}

func (s *InventoryService) ListTransactions(itemID, transactionType string) ([]models.InventoryTransaction, error) {
	return s.repo.ListTransactions(itemID, transactionType)
}

func (s *InventoryService) GetStats(schoolID string) (map[string]interface{}, error) {
	return s.repo.GetStats(schoolID)
}

func (s *InventoryService) GetPurchaseReceipt(transactionID, schoolID string) (map[string]interface{}, error) {
	return s.repo.GetPurchaseReceipt(transactionID, schoolID)
}
