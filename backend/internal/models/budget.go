package models

import (
	"time"
	"github.com/google/uuid"
)

// Budget represents annual/term budget allocation per department
type Budget struct {
	BaseModel
	SchoolID       uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	Year           int       `gorm:"not null;index" json:"year"`
	Term           string    `gorm:"type:varchar(10);index" json:"term"` // empty for annual
	Department     string    `gorm:"type:varchar(100);not null" json:"department"` // Administration, Academic, Sports, Maintenance, etc.
	Category       string    `gorm:"type:varchar(100);not null" json:"category"` // Salaries, Supplies, Utilities, etc.
	AllocatedAmount float64  `gorm:"type:decimal(15,2);not null" json:"allocated_amount"`
	SpentAmount    float64   `gorm:"type:decimal(15,2);default:0" json:"spent_amount"`
	CommittedAmount float64  `gorm:"type:decimal(15,2);default:0" json:"committed_amount"` // Approved requisitions
	AvailableAmount float64  `gorm:"type:decimal(15,2);default:0" json:"available_amount"` // Allocated - Spent - Committed
	Notes          string    `gorm:"type:text" json:"notes"`
	CreatedBy      uuid.UUID `gorm:"type:char(36);not null" json:"created_by"`
	School         *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Creator        *User     `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
}

// Requisition represents purchase/expense requests
type Requisition struct {
	BaseModel
	SchoolID        uuid.UUID  `gorm:"type:char(36);not null;index" json:"school_id"`
	RequisitionNo   string     `gorm:"type:varchar(50);uniqueIndex" json:"requisition_no"` // REQ-2024-001
	Department      string     `gorm:"type:varchar(100);not null" json:"department"`
	Category        string     `gorm:"type:varchar(100);not null" json:"category"`
	Title           string     `gorm:"type:varchar(255);not null" json:"title"`
	Description     string     `gorm:"type:text;not null" json:"description"`
	Justification   string     `gorm:"type:text" json:"justification"`
	TotalAmount     float64    `gorm:"type:decimal(15,2);not null" json:"total_amount"`
	Priority        string     `gorm:"type:varchar(20);not null" json:"priority"` // urgent, high, medium, low
	Status          string     `gorm:"type:varchar(20);default:'pending';index" json:"status"` // pending, approved, rejected, completed, cancelled
	RequestedBy     uuid.UUID  `gorm:"type:char(36);not null" json:"requested_by"`
	RequestedDate   time.Time  `gorm:"not null" json:"requested_date"`
	ReviewedBy      *uuid.UUID `gorm:"type:char(36)" json:"reviewed_by,omitempty"`
	ReviewedDate    *time.Time `json:"reviewed_date,omitempty"`
	ReviewNotes     string     `gorm:"type:text" json:"review_notes"`
	ApprovedBy      *uuid.UUID `gorm:"type:char(36)" json:"approved_by,omitempty"`
	ApprovedDate    *time.Time `json:"approved_date,omitempty"`
	ApprovalNotes   string     `gorm:"type:text" json:"approval_notes"`
	CompletedDate   *time.Time `json:"completed_date,omitempty"`
	ExpenditureID   *uuid.UUID `gorm:"type:char(36)" json:"expenditure_id,omitempty"` // Link to actual expenditure
	BudgetID        *uuid.UUID `gorm:"type:char(36)" json:"budget_id,omitempty"` // Link to budget line
	School          *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Requester       *User      `gorm:"foreignKey:RequestedBy" json:"requester,omitempty"`
	Reviewer        *User      `gorm:"foreignKey:ReviewedBy" json:"reviewer,omitempty"`
	Approver        *User      `gorm:"foreignKey:ApprovedBy" json:"approver,omitempty"`
	Expenditure     *Expenditure `gorm:"foreignKey:ExpenditureID" json:"expenditure,omitempty"`
	Budget          *Budget    `gorm:"foreignKey:BudgetID" json:"budget,omitempty"`
	Items           []RequisitionItem `gorm:"foreignKey:RequisitionID" json:"items,omitempty"`
}

// RequisitionItem represents individual items in a requisition
type RequisitionItem struct {
	BaseModel
	RequisitionID uuid.UUID `gorm:"type:char(36);not null;index" json:"requisition_id"`
	ItemName      string    `gorm:"type:varchar(255);not null" json:"item_name"`
	Description   string    `gorm:"type:text" json:"description"`
	Quantity      int       `gorm:"not null" json:"quantity"`
	Unit          string    `gorm:"type:varchar(50)" json:"unit"` // pieces, boxes, liters, etc.
	UnitPrice     float64   `gorm:"type:decimal(10,2);not null" json:"unit_price"`
	TotalPrice    float64   `gorm:"type:decimal(15,2);not null" json:"total_price"`
	Specifications string   `gorm:"type:text" json:"specifications"`
	Requisition   *Requisition `gorm:"foreignKey:RequisitionID" json:"requisition,omitempty"`
}

// RequisitionApprovalFlow tracks approval workflow
type RequisitionApprovalFlow struct {
	BaseModel
	RequisitionID uuid.UUID  `gorm:"type:char(36);not null;index" json:"requisition_id"`
	Step          int        `gorm:"not null" json:"step"` // 1, 2, 3 for multi-level approval
	ApproverRole  string     `gorm:"type:varchar(50);not null" json:"approver_role"` // hod, bursar, headteacher
	ApproverID    *uuid.UUID `gorm:"type:char(36)" json:"approver_id,omitempty"`
	Status        string     `gorm:"type:varchar(20);default:'pending'" json:"status"` // pending, approved, rejected
	ActionDate    *time.Time `json:"action_date,omitempty"`
	Comments      string     `gorm:"type:text" json:"comments"`
	Requisition   *Requisition `gorm:"foreignKey:RequisitionID" json:"requisition,omitempty"`
	Approver      *User      `gorm:"foreignKey:ApproverID" json:"approver,omitempty"`
}

// BudgetTransfer represents budget reallocation between categories
type BudgetTransfer struct {
	BaseModel
	SchoolID      uuid.UUID  `gorm:"type:char(36);not null;index" json:"school_id"`
	FromBudgetID  uuid.UUID  `gorm:"type:char(36);not null" json:"from_budget_id"`
	ToBudgetID    uuid.UUID  `gorm:"type:char(36);not null" json:"to_budget_id"`
	Amount        float64    `gorm:"type:decimal(15,2);not null" json:"amount"`
	Reason        string     `gorm:"type:text;not null" json:"reason"`
	RequestedBy   uuid.UUID  `gorm:"type:char(36);not null" json:"requested_by"`
	ApprovedBy    *uuid.UUID `gorm:"type:char(36)" json:"approved_by,omitempty"`
	ApprovedDate  *time.Time `json:"approved_date,omitempty"`
	Status        string     `gorm:"type:varchar(20);default:'pending'" json:"status"`
	School        *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	FromBudget    *Budget    `gorm:"foreignKey:FromBudgetID" json:"from_budget,omitempty"`
	ToBudget      *Budget    `gorm:"foreignKey:ToBudgetID" json:"to_budget,omitempty"`
	Requester     *User      `gorm:"foreignKey:RequestedBy" json:"requester,omitempty"`
	Approver      *User      `gorm:"foreignKey:ApprovedBy" json:"approver,omitempty"`
}
