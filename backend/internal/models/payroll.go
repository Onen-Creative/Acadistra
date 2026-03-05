package models

import (
	"time"
)

type SalaryStructure struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	SchoolID        string    `json:"school_id" gorm:"type:varchar(36);not null;index:idx_salary_school"`
	UserID          *string   `json:"user_id" gorm:"type:varchar(36);index:idx_user_salary"`
	StaffID         *string   `json:"staff_id" gorm:"type:varchar(36);index:idx_staff_salary"`
	EmployeeName    string    `json:"employee_name" gorm:"not null"`
	EmployeeRole    string    `json:"employee_role" gorm:"not null"`
	EmployeeID      string    `json:"employee_id"`
	BaseSalary      float64   `json:"base_salary" gorm:"not null"`
	HousingAllowance float64  `json:"housing_allowance" gorm:"default:0"`
	TransportAllowance float64 `json:"transport_allowance" gorm:"default:0"`
	MedicalAllowance float64  `json:"medical_allowance" gorm:"default:0"`
	OtherAllowances float64   `json:"other_allowances" gorm:"default:0"`
	NSSFDeduction   float64   `json:"nssf_deduction" gorm:"default:0"`
	PAYEDeduction   float64   `json:"paye_deduction" gorm:"default:0"`
	LoanDeduction   float64   `json:"loan_deduction" gorm:"default:0"`
	OtherDeductions float64   `json:"other_deductions" gorm:"default:0"`
	EffectiveFrom   time.Time `json:"effective_from" gorm:"not null"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	
	User            *User     `json:"user,omitempty" gorm:"foreignKey:UserID;references:ID"`
}

type PayrollRun struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	SchoolID    string    `json:"school_id" gorm:"type:varchar(36);not null;index:idx_payroll_school"`
	Month       int       `json:"month" gorm:"not null"`
	Year        int       `json:"year" gorm:"not null"`
	Status      string    `json:"status" gorm:"default:'draft'"` // draft, processed, paid
	TotalGross  float64   `json:"total_gross" gorm:"default:0"`
	TotalNet    float64   `json:"total_net" gorm:"default:0"`
	ProcessedBy uint      `json:"processed_by"`
	ProcessedAt *time.Time `json:"processed_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	
	School      *School   `json:"school,omitempty" gorm:"foreignKey:SchoolID;references:ID"`
	Payments    []PayrollPayment `json:"payments,omitempty" gorm:"foreignKey:PayrollRunID"`
}

type PayrollPayment struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	PayrollRunID    uint      `json:"payroll_run_id" gorm:"not null;index:idx_payment_run"`
	UserID          *string   `json:"user_id" gorm:"type:varchar(36);index:idx_payment_user"`
	EmployeeName    string    `json:"employee_name" gorm:"not null"`
	EmployeeRole    string    `json:"employee_role" gorm:"not null"`
	EmployeeID      string    `json:"employee_id"`
	BaseSalary      float64   `json:"base_salary" gorm:"not null"`
	TotalAllowances float64   `json:"total_allowances" gorm:"default:0"`
	GrossSalary     float64   `json:"gross_salary" gorm:"not null"`
	TotalDeductions float64   `json:"total_deductions" gorm:"default:0"`
	NetSalary       float64   `json:"net_salary" gorm:"not null"`
	PaymentStatus   string    `json:"payment_status" gorm:"default:'pending'"` // pending, paid
	PaymentDate     *time.Time `json:"payment_date"`
	PaymentMethod   string    `json:"payment_method"` // bank_transfer, cash, mobile_money
	PaymentRef      string    `json:"payment_ref"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	
	User            *User     `json:"user,omitempty" gorm:"foreignKey:UserID;references:ID"`
	PayrollRun      PayrollRun `json:"payroll_run,omitempty" gorm:"foreignKey:PayrollRunID"`
}
