package models

import (
	"time"

	"github.com/google/uuid"
)

// Staff represents all school employees (teachers, admin, support staff, etc.)
type Staff struct {
	BaseModel
	SchoolID           uuid.UUID  `gorm:"type:char(36);not null;index" json:"school_id"`
	UserID             *uuid.UUID `gorm:"type:char(36);index" json:"user_id,omitempty"`
	EmployeeID         string     `gorm:"type:varchar(50);not null;uniqueIndex:idx_employee_school" json:"employee_id"`
	FirstName          string     `gorm:"type:varchar(100);not null" json:"first_name"`
	MiddleName         string     `gorm:"type:varchar(100)" json:"middle_name"`
	LastName           string     `gorm:"type:varchar(100);not null" json:"last_name"`
	DateOfBirth        *time.Time `gorm:"type:date" json:"date_of_birth,omitempty"`
	Gender             string     `gorm:"type:varchar(10)" json:"gender"`
	Nationality        string     `gorm:"type:varchar(100);default:'Ugandan'" json:"nationality"`
	NationalID         string     `gorm:"type:varchar(50)" json:"national_id"`
	Email              string     `gorm:"type:varchar(255);index" json:"email"`
	Phone              string     `gorm:"type:varchar(50);not null" json:"phone"`
	AlternativePhone   string     `gorm:"type:varchar(50)" json:"alternative_phone"`
	Address            string     `gorm:"type:text" json:"address"`
	District           string     `gorm:"type:varchar(100)" json:"district"`
	Village            string     `gorm:"type:varchar(100)" json:"village"`
	
	// Role and Department
	Role               string     `gorm:"type:varchar(100);not null" json:"role"` // Teacher, Admin, Bursar, Librarian, Nurse, Security, Cook, Cleaner, Driver, etc.
	Department         string     `gorm:"type:varchar(100)" json:"department"` // Academic, Finance, Health, Administration, Support
	
	// Qualifications (for all staff)
	Qualifications     string     `gorm:"type:text" json:"qualifications"`
	Specialization     string     `gorm:"type:varchar(255)" json:"specialization"`
	Experience         int        `gorm:"default:0" json:"experience"` // Years of experience
	
	// Employment Details
	EmploymentType     string     `gorm:"type:varchar(50);default:'Permanent'" json:"employment_type"` // Permanent, Contract, Part-time, Volunteer
	DateJoined         *time.Time `gorm:"type:date" json:"date_joined,omitempty"`
	ContractEndDate    *time.Time `gorm:"type:date" json:"contract_end_date,omitempty"`
	
	// Financial Details
	Salary             float64    `gorm:"type:decimal(10,2)" json:"salary"`
	BankAccount        string     `gorm:"type:varchar(100)" json:"bank_account"`
	BankName           string     `gorm:"type:varchar(100)" json:"bank_name"`
	TIN                string     `gorm:"type:varchar(50)" json:"tin"` // Tax Identification Number
	NSSF               string     `gorm:"type:varchar(50)" json:"nssf"` // National Social Security Fund
	
	// Professional Registration (mainly for teachers, nurses, etc.)
	RegistrationNumber string     `gorm:"type:varchar(100)" json:"registration_number"`
	RegistrationBody   string     `gorm:"type:varchar(100)" json:"registration_body"` // e.g., UNEB, Nursing Council
	IPPSNumber         string     `gorm:"column:ipps_number;type:varchar(100)" json:"ipps_number"`
	SupplierNumber     string     `gorm:"type:varchar(100)" json:"supplier_number"`
	
	// Emergency Contact
	EmergencyContact   string     `gorm:"type:varchar(255)" json:"emergency_contact"`
	EmergencyPhone     string     `gorm:"type:varchar(50)" json:"emergency_phone"`
	EmergencyRelation  string     `gorm:"type:varchar(50)" json:"emergency_relation"`
	
	// Status and Additional Info
	Status             string     `gorm:"type:varchar(20);default:'active';index" json:"status"` // active, on_leave, suspended, terminated, resigned
	PhotoURL           string     `gorm:"type:varchar(500)" json:"photo_url"`
	Notes              string     `gorm:"type:text" json:"notes"`
	
	// Relations
	School             *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	User               *User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName overrides the table name used by Staff to `staff`
func (Staff) TableName() string {
	return "staff"
}

// StaffLeave tracks staff leave requests and approvals
type StaffLeave struct {
	BaseModel
	StaffID      uuid.UUID  `gorm:"type:char(36);not null;index" json:"staff_id"`
	SchoolID     uuid.UUID  `gorm:"type:char(36);not null;index" json:"school_id"`
	LeaveType    string     `gorm:"type:varchar(50);not null" json:"leave_type"` // Annual, Sick, Maternity, Paternity, Unpaid, Study
	StartDate    time.Time  `gorm:"type:date;not null" json:"start_date"`
	EndDate      time.Time  `gorm:"type:date;not null" json:"end_date"`
	Days         int        `gorm:"not null" json:"days"`
	Reason       string     `gorm:"type:text;not null" json:"reason"`
	Status       string     `gorm:"type:varchar(20);default:'pending'" json:"status"` // pending, approved, rejected, cancelled
	ApprovedBy   *uuid.UUID `gorm:"type:char(36)" json:"approved_by,omitempty"`
	ApprovedAt   *time.Time `json:"approved_at,omitempty"`
	RejectionReason string  `gorm:"type:text" json:"rejection_reason"`
	Staff        *Staff     `gorm:"foreignKey:StaffID" json:"staff,omitempty"`
	School       *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Approver     *User      `gorm:"foreignKey:ApprovedBy" json:"approver,omitempty"`
}

func (StaffLeave) TableName() string {
	return "staff_leave"
}

// StaffAttendance tracks daily staff attendance
type StaffAttendance struct {
	BaseModel
	StaffID    uuid.UUID `gorm:"type:char(36);not null;uniqueIndex:idx_staff_attendance_unique" json:"staff_id"`
	SchoolID   uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	Date       time.Time `gorm:"type:date;not null;uniqueIndex:idx_staff_attendance_unique" json:"date"`
	CheckIn    *time.Time `json:"check_in,omitempty"`
	CheckOut   *time.Time `json:"check_out,omitempty"`
	Status     string    `gorm:"type:varchar(20);not null" json:"status"` // present, absent, late, on_leave, half_day
	Remarks    string    `gorm:"type:text" json:"remarks"`
	MarkedBy   uuid.UUID `gorm:"type:char(36)" json:"marked_by"`
	Staff      *Staff    `gorm:"foreignKey:StaffID" json:"staff,omitempty"`
	School     *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

func (StaffAttendance) TableName() string {
	return "staff_attendance"
}

// StaffDocument stores staff-related documents
type StaffDocument struct {
	BaseModel
	StaffID      uuid.UUID `gorm:"type:char(36);not null;index" json:"staff_id"`
	SchoolID     uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	DocumentType string    `gorm:"type:varchar(100);not null" json:"document_type"` // CV, Certificate, Contract, ID, Recommendation, etc.
	Title        string    `gorm:"type:varchar(255);not null" json:"title"`
	FileURL      string    `gorm:"type:varchar(500);not null" json:"file_url"`
	UploadedBy   uuid.UUID `gorm:"type:char(36);not null" json:"uploaded_by"`
	UploadedAt   time.Time `gorm:"not null" json:"uploaded_at"`
	ExpiryDate   *time.Time `gorm:"type:date" json:"expiry_date,omitempty"`
	Notes        string    `gorm:"type:text" json:"notes"`
	Staff        *Staff    `gorm:"foreignKey:StaffID" json:"staff,omitempty"`
	School       *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

func (StaffDocument) TableName() string {
	return "staff_document"
}
