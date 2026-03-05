package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type InventoryCategory struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string         `gorm:"type:varchar(100);not null" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

type InventoryItem struct {
	ID                uuid.UUID          `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SchoolID          uuid.UUID          `gorm:"type:uuid;not null;index" json:"school_id"`
	CategoryID        *uuid.UUID         `gorm:"type:uuid;index" json:"category_id"`
	ItemNumber        string             `gorm:"type:varchar(50);uniqueIndex:idx_school_item_number" json:"item_number"`
	Name              string             `gorm:"type:varchar(255);not null" json:"name"`
	Description       string             `gorm:"type:text" json:"description"`
	Unit              string             `gorm:"type:varchar(50);not null" json:"unit"`
	Quantity                float64            `gorm:"type:decimal(10,2);default:0" json:"quantity"`
	TotalQuantityPurchased  float64            `gorm:"type:decimal(10,2);default:0" json:"total_quantity_purchased"`
	ReorderLevel            float64            `gorm:"type:decimal(10,2);default:0" json:"reorder_level"`
	UnitPrice               float64            `gorm:"type:decimal(10,2);default:0" json:"unit_price"`
	TotalPurchaseCost       float64            `gorm:"type:decimal(12,2);default:0" json:"total_purchase_cost"`
	Location          string             `gorm:"type:varchar(100)" json:"location"`
	Supplier          string             `gorm:"type:varchar(255)" json:"supplier"`
	Barcode           string             `gorm:"type:varchar(100)" json:"barcode"`
	ExpiryDate        *time.Time         `json:"expiry_date"`
	CreatedAt         time.Time          `json:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at"`
	DeletedAt         gorm.DeletedAt     `gorm:"index" json:"-"`
	Category          *InventoryCategory `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

type InventoryTransaction struct {
	ID              uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ItemID          uuid.UUID `gorm:"type:uuid;not null;index" json:"item_id"`
	TransactionType string    `gorm:"type:varchar(20);not null" json:"transaction_type"`
	Quantity        float64   `gorm:"type:decimal(10,2);not null" json:"quantity"`
	UnitPrice       float64   `gorm:"type:decimal(10,2)" json:"unit_price"`
	TotalCost       float64   `gorm:"type:decimal(10,2)" json:"total_cost"`
	ReferenceNo     string    `gorm:"type:varchar(100)" json:"reference_no"`
	Notes           string    `gorm:"type:text" json:"notes"`
	TransactionDate time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"transaction_date"`
	RecordedBy      uuid.UUID `gorm:"type:uuid" json:"recorded_by"`
	CreatedAt       time.Time `json:"created_at"`
	Item            *InventoryItem `gorm:"foreignKey:ItemID" json:"item,omitempty"`
}
