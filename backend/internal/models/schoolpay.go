package models

import (
	"time"

	"github.com/google/uuid"
)

// SchoolPayConfig stores SchoolPay credentials per school
type SchoolPayConfig struct {
	BaseModel
	SchoolID       uuid.UUID `gorm:"type:char(36);not null;uniqueIndex" json:"school_id"`
	SchoolCode     string    `gorm:"type:varchar(50);not null" json:"school_code"`
	APIPassword    string    `gorm:"type:varchar(255);not null" json:"-"`
	WebhookURL     string    `gorm:"type:varchar(500)" json:"webhook_url"`
	WebhookEnabled bool      `gorm:"default:false" json:"webhook_enabled"`
	IsActive       bool      `gorm:"default:false" json:"is_active"`
	LastSyncAt     *time.Time `json:"last_sync_at,omitempty"`
	School         *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// SchoolPayTransaction stores transactions from SchoolPay
type SchoolPayTransaction struct {
	BaseModel
	SchoolID                   uuid.UUID  `gorm:"type:char(36);not null;index" json:"school_id"`
	StudentID                  *uuid.UUID `gorm:"type:char(36);index" json:"student_id,omitempty"`
	TransactionType            string     `gorm:"type:varchar(20);not null" json:"transaction_type"` // SCHOOL_FEES, OTHER_FEES
	SchoolpayReceiptNumber     string     `gorm:"type:varchar(50);uniqueIndex;not null" json:"schoolpay_receipt_number"`
	Amount                     float64    `gorm:"type:decimal(10,2);not null" json:"amount"`
	StudentPaymentCode         string     `gorm:"type:varchar(50);index" json:"student_payment_code"`
	StudentName                string     `gorm:"type:varchar(255)" json:"student_name"`
	StudentRegistrationNumber  string     `gorm:"type:varchar(100)" json:"student_registration_number"`
	StudentClass               string     `gorm:"type:varchar(100)" json:"student_class"`
	SupplementaryFeeID         string     `gorm:"type:varchar(50)" json:"supplementary_fee_id"`
	SupplementaryFeeDescription string    `gorm:"type:varchar(255)" json:"supplementary_fee_description"`
	SourcePaymentChannel       string     `gorm:"type:varchar(100)" json:"source_payment_channel"`
	SourceChannelTransactionID string     `gorm:"type:varchar(100)" json:"source_channel_transaction_id"`
	SourceChannelTransDetail   string     `gorm:"type:text" json:"source_channel_trans_detail"`
	SettlementBankCode         string     `gorm:"type:varchar(50)" json:"settlement_bank_code"`
	PaymentDateAndTime         time.Time  `gorm:"not null;index" json:"payment_date_and_time"`
	TransactionCompletionStatus string    `gorm:"type:varchar(50)" json:"transaction_completion_status"`
	TransactionCompletionDateAndTime *time.Time `json:"transaction_completion_date_and_time,omitempty"`
	Processed                  bool       `gorm:"default:false;index" json:"processed"`
	ProcessedAt                *time.Time `json:"processed_at,omitempty"`
	FeesPaymentID              *uuid.UUID `gorm:"type:char(36);index" json:"fees_payment_id,omitempty"`
	ErrorMessage               string     `gorm:"type:text" json:"error_message"`
	RawPayload                 JSONB      `gorm:"type:json" json:"raw_payload"`
	School                     *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Student                    *Student   `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	FeesPayment                *FeesPayment `gorm:"foreignKey:FeesPaymentID" json:"fees_payment,omitempty"`
}
