package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// JSONB custom type for JSON fields
type JSONB map[string]interface{}

func (j JSONB) Value() (driver.Value, error) {
	return json.Marshal(j)
}

func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = make(JSONB)
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, j)
}

// Base model with UUID
type BaseModel struct {
	ID        uuid.UUID      `gorm:"type:char(36);primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (b *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}

// School represents an educational institution
type School struct {
	BaseModel
	Name         string `gorm:"type:varchar(255);not null" json:"name"`
	Type         string `gorm:"type:varchar(20);not null" json:"type"`
	Address      string `gorm:"type:text" json:"address"`
	Country      string `gorm:"type:varchar(100);default:'Uganda'" json:"country"`
	Region       string `gorm:"type:varchar(100)" json:"region"`
	ContactEmail string `gorm:"type:varchar(255)" json:"contact_email"`
	Phone        string `gorm:"type:varchar(50)" json:"phone"`
	LogoURL      string `gorm:"type:varchar(500)" json:"logo_url"`
	Motto        string `gorm:"type:varchar(255)" json:"motto"`
	IsActive     bool   `gorm:"default:true" json:"is_active"`
	Config       JSONB  `gorm:"type:json" json:"config"`
}

// SchoolPaymentConfig stores payment gateway credentials per school
type SchoolPaymentConfig struct {
	BaseModel
	SchoolID              uuid.UUID `gorm:"type:char(36);not null;uniqueIndex" json:"school_id"`
	Provider              string    `gorm:"type:varchar(50);not null;default:'flutterwave'" json:"provider"`
	PublicKey             string    `gorm:"type:varchar(255)" json:"public_key"`
	SecretKey             string    `gorm:"type:varchar(255)" json:"-"`
	EncryptionKey         string    `gorm:"type:varchar(255)" json:"-"`
	WebhookSecret         string    `gorm:"type:varchar(255)" json:"-"`
	MerchantAccountNumber string    `gorm:"type:varchar(100)" json:"merchant_account_number"`
	MerchantAccountName   string    `gorm:"type:varchar(255)" json:"merchant_account_name"`
	MerchantBankName      string    `gorm:"type:varchar(255)" json:"merchant_bank_name"`
	IsActive              bool      `gorm:"default:false" json:"is_active"`
	School                *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// User represents system users (system admin/ school admin/teacher/ librarian/ nurse/ bursar/ storekeeper)
type User struct {
	BaseModel
	SchoolID     *uuid.UUID `gorm:"type:char(36);index" json:"school_id"`
	Email        string     `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	PasswordHash string     `gorm:"type:varchar(255);not null" json:"-"`
	Role         string     `gorm:"type:varchar(20);not null" json:"role"`
	FullName     string     `gorm:"type:varchar(255);not null" json:"full_name"`
	IsActive     bool       `gorm:"default:true" json:"is_active"`
	Meta         JSONB      `gorm:"type:json" json:"meta"`
	School       *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// Class represents a class/grade
type Class struct {
	BaseModel
	SchoolID         uuid.UUID        `gorm:"type:char(36);not null;index:idx_class_school_year_term" json:"school_id"`
	Name             string           `gorm:"type:varchar(100);not null" json:"name"`
	Level            string           `gorm:"type:varchar(50);not null" json:"level"`
	Stream           string           `gorm:"type:varchar(10);default:''" json:"stream"`
	Capacity         int              `gorm:"default:30" json:"capacity"`
	TeacherProfileID *uuid.UUID       `gorm:"column:teacher_profile_id;type:char(36);index" json:"teacher_profile_id"`
	Year             int              `gorm:"not null;index:idx_class_school_year_term" json:"year"`
	Term             string           `gorm:"type:varchar(10);not null;index:idx_class_school_year_term" json:"term"`
	School           *School          `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	TeacherProfile   *TeacherProfile  `gorm:"foreignKey:TeacherProfileID" json:"teacher_profile,omitempty"`
}

// Student represents a student
type Student struct {
	BaseModel
	SchoolID         uuid.UUID    `gorm:"type:char(36);not null;index" json:"school_id"`
	AdmissionNo      string       `gorm:"type:varchar(50);not null;uniqueIndex:idx_admission_school" json:"admission_no"`
	LIN              string       `gorm:"type:varchar(50)" json:"lin"` // Learner Identification Number
	FirstName        string       `gorm:"type:varchar(100);not null" json:"first_name"`
	MiddleName       string       `gorm:"type:varchar(100)" json:"middle_name"`
	LastName         string       `gorm:"type:varchar(100);not null" json:"last_name"`
	DateOfBirth      *time.Time   `gorm:"type:date" json:"date_of_birth,omitempty"`
	Gender           string       `gorm:"type:varchar(10)" json:"gender"`
	Nationality      string       `gorm:"type:varchar(100);default:'Ugandan'" json:"nationality"`
	Religion         string       `gorm:"type:varchar(50)" json:"religion"`
	PhotoURL         string       `gorm:"type:varchar(500)" json:"photo_url"`
	Email            string       `gorm:"type:varchar(255)" json:"email"`
	Phone            string       `gorm:"type:varchar(50)" json:"phone"`
	Address          string       `gorm:"type:text" json:"address"`
	District         string       `gorm:"type:varchar(100)" json:"district"`
	Village          string       `gorm:"type:varchar(100)" json:"village"`
	ResidenceType    string       `gorm:"type:varchar(20);default:'Day'" json:"residence_type"` // Day or Boarding
	AdmissionDate    *time.Time   `gorm:"type:date" json:"admission_date,omitempty"`
	Status           string       `gorm:"type:varchar(20);default:'active';index" json:"status"` // active, suspended, graduated, transferred, withdrawn
	PreviousSchool   string       `gorm:"type:varchar(255)" json:"previous_school"`
	PreviousClass    string       `gorm:"type:varchar(50)" json:"previous_class"`
	SpecialNeeds     string       `gorm:"type:text" json:"special_needs"`
	DisabilityStatus string       `gorm:"type:varchar(100)" json:"disability_status"`
	School           *School      `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Class            *Class       `gorm:"-" json:"class,omitempty"` // Virtual field populated via join
	ClassName        string       `gorm:"-" json:"class_name,omitempty"` // Virtual field for class name
	Enrollments      []Enrollment `gorm:"foreignKey:StudentID" json:"enrollments,omitempty"`
	Guardians        []Guardian   `gorm:"foreignKey:StudentID" json:"guardians,omitempty"`
}

// Guardian represents a student's parent or guardian
type Guardian struct {
	BaseModel
	StudentID        uuid.UUID `gorm:"type:char(36);not null;index" json:"student_id"`
	SchoolID         uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	Relationship     string    `gorm:"type:varchar(50);not null" json:"relationship"` // Father, Mother, Legal Guardian, Sponsor, Other
	FullName         string    `gorm:"type:varchar(255);not null" json:"full_name"`
	Phone            string    `gorm:"type:varchar(50);not null" json:"phone"`
	AlternativePhone string    `gorm:"type:varchar(50)" json:"alternative_phone"`
	Email            string    `gorm:"type:varchar(255)" json:"email"`
	Occupation       string    `gorm:"type:varchar(100)" json:"occupation"`
	Address          string    `gorm:"type:text" json:"address"`
	Workplace        string    `gorm:"type:varchar(255)" json:"workplace"`
	WorkAddress      string    `gorm:"type:text" json:"work_address"`
	IsPrimaryContact bool      `gorm:"default:false" json:"is_primary_contact"`
	IsEmergency      bool      `gorm:"default:false" json:"is_emergency"`
	IsFeePayer       bool      `gorm:"default:false" json:"is_fee_payer"`
	NationalID       string    `gorm:"type:varchar(50)" json:"national_id"`
	Student          *Student  `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	School           *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// Enrollment links students to classes
type Enrollment struct {
	BaseModel
	StudentID  uuid.UUID  `gorm:"type:char(36);not null;index:idx_enrollment_student_class" json:"student_id"`
	ClassID    uuid.UUID  `gorm:"type:char(36);not null;index:idx_enrollment_student_class" json:"class_id"`
	Year       int        `gorm:"not null;index" json:"year"`
	Term       string     `gorm:"type:varchar(10);not null" json:"term"`
	Status     string     `gorm:"type:varchar(20);default:'active'" json:"status"`
	EnrolledOn time.Time  `gorm:"type:date" json:"enrolled_on"`
	LeftOn     *time.Time `gorm:"type:date" json:"left_on,omitempty"`
	Student    *Student   `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	Class      *Class     `gorm:"foreignKey:ClassID" json:"class,omitempty"`
}

// Subject represents a subject/course


// Assessment represents a test/exam
type Assessment struct {
	BaseModel
	SchoolID        uuid.UUID       `gorm:"type:char(36);not null;index" json:"school_id"`
	ClassID         uuid.UUID       `gorm:"type:char(36);not null;index:idx_assessment_class_subject" json:"class_id"`
	SubjectID       uuid.UUID       `gorm:"type:char(36);not null;index:idx_assessment_class_subject" json:"subject_id"`
	AssessmentType  string          `gorm:"type:varchar(20);not null" json:"assessment_type"`
	MaxMarks        int             `gorm:"not null" json:"max_marks"`
	Date            time.Time       `gorm:"type:date" json:"date"`
	Term            string          `gorm:"type:varchar(10);not null" json:"term"`
	Year            int             `gorm:"not null" json:"year"`
	Meta            JSONB           `gorm:"type:json" json:"meta"`
	CreatedBy       uuid.UUID       `gorm:"type:char(36);not null" json:"created_by"`
	School          *School         `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Class           *Class          `gorm:"foreignKey:ClassID" json:"class,omitempty"`
	StandardSubject *StandardSubject `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
}

// Mark represents individual student marks
type Mark struct {
	BaseModel
	AssessmentID   uuid.UUID `gorm:"type:char(36);not null;index:idx_mark_assessment_student" json:"assessment_id"`
	StudentID      uuid.UUID `gorm:"type:char(36);not null;index:idx_mark_assessment_student" json:"student_id"`
	MarksObtained  float64   `gorm:"type:decimal(5,2);not null" json:"marks_obtained"`
	GradedCode     *int      `gorm:"type:smallint" json:"graded_code,omitempty"`
	Grade          string    `gorm:"type:varchar(20)" json:"grade"`
	TeacherComment string    `gorm:"type:text" json:"teacher_comment"`
	EnteredBy      uuid.UUID `gorm:"type:char(36);not null" json:"entered_by"`
	EnteredAt      time.Time `json:"entered_at"`
	Assessment     *Assessment `gorm:"foreignKey:AssessmentID" json:"assessment,omitempty"`
	Student        *Student    `gorm:"foreignKey:StudentID" json:"student,omitempty"`
}

// SubjectResult stores computed subject results
type SubjectResult struct {
	BaseModel
	StudentID           uuid.UUID       `gorm:"type:char(36);not null;uniqueIndex:idx_unique_result" json:"student_id"`
	SubjectID           uuid.UUID       `gorm:"type:char(36);not null;uniqueIndex:idx_unique_result" json:"subject_id"`
	ClassID             uuid.UUID       `gorm:"type:char(36);not null;index" json:"class_id"`
	Term                string          `gorm:"type:varchar(10);not null;uniqueIndex:idx_unique_result" json:"term"`
	Year                int             `gorm:"not null;uniqueIndex:idx_unique_result" json:"year"`
	ExamType            string          `gorm:"type:varchar(20);uniqueIndex:idx_unique_result;index" json:"exam_type"`
	Paper               int             `gorm:"default:0;uniqueIndex:idx_unique_result" json:"paper"`
	SchoolID            uuid.UUID       `gorm:"type:char(36);not null;index" json:"school_id"`
	RawMarks            JSONB           `gorm:"type:json" json:"raw_marks"`
	DerivedCodes        JSONB           `gorm:"type:json" json:"derived_codes"`
	FinalGrade          string          `gorm:"type:varchar(20)" json:"final_grade"`
	ComputationReason   string          `gorm:"type:text" json:"computation_reason"`
	RuleVersionHash     string          `gorm:"type:varchar(64)" json:"rule_version_hash"`
	Student             *Student        `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	StandardSubject     *StandardSubject `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	Class               *Class          `gorm:"foreignKey:ClassID" json:"class,omitempty"`
}

// ReportCard represents generated report cards
type ReportCard struct {
	BaseModel
	StudentID   uuid.UUID  `gorm:"type:char(36);not null;index:idx_report_student_term" json:"student_id"`
	ClassID     uuid.UUID  `gorm:"type:char(36);not null;index" json:"class_id"`
	Term        string     `gorm:"type:varchar(10);not null;index:idx_report_student_term" json:"term"`
	Year        int        `gorm:"not null;index:idx_report_student_term" json:"year"`
	PDFURL      string     `gorm:"type:varchar(500)" json:"pdf_url"`
	Status      string     `gorm:"type:varchar(20);default:'pending'" json:"status"`
	GeneratedBy *uuid.UUID `gorm:"type:char(36)" json:"generated_by,omitempty"`
	GeneratedAt *time.Time `json:"generated_at,omitempty"`
	Meta        JSONB      `gorm:"type:json" json:"meta"`
	Student     *Student   `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	Class       *Class     `gorm:"foreignKey:ClassID" json:"class,omitempty"`
}

// AuditLog tracks all data changes
type AuditLog struct {
	ID           uuid.UUID `gorm:"type:char(36);primaryKey" json:"id"`
	ActorUserID  uuid.UUID `gorm:"type:char(36);index" json:"actor_user_id"`
	Action       string    `gorm:"type:varchar(50);not null" json:"action"`
	ResourceType string    `gorm:"type:varchar(50);not null;index" json:"resource_type"`
	ResourceID   uuid.UUID `gorm:"type:char(36);index" json:"resource_id"`
	Before       JSONB     `gorm:"type:json" json:"before"`
	After        JSONB     `gorm:"type:json" json:"after"`
	Timestamp    time.Time `gorm:"autoCreateTime;index" json:"timestamp"`
	IP           string    `gorm:"type:varchar(45)" json:"ip"`
}

func (a *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// Job tracks background jobs
type Job struct {
	ID         uuid.UUID  `gorm:"type:char(36);primaryKey" json:"id"`
	Type       string     `gorm:"type:varchar(50);not null;index" json:"type"`
	Payload    JSONB      `gorm:"type:json" json:"payload"`
	Status     string     `gorm:"type:varchar(20);default:'pending';index" json:"status"`
	Attempts   int        `gorm:"default:0" json:"attempts"`
	Result     JSONB      `gorm:"type:json" json:"result"`
	CreatedAt  time.Time  `gorm:"autoCreateTime;index" json:"created_at"`
	FinishedAt *time.Time `json:"finished_at,omitempty"`
}

func (j *Job) BeforeCreate(tx *gorm.DB) error {
	if j.ID == uuid.Nil {
		j.ID = uuid.New()
	}
	return nil
}

// GradingRule stores grading configuration
type GradingRule struct {
	BaseModel
	SchoolID    *uuid.UUID `gorm:"type:char(36);index" json:"school_id,omitempty"`
	Level       string    `gorm:"type:varchar(50);not null" json:"level"`
	RuleVersion string    `gorm:"type:varchar(50);not null" json:"rule_version"`
	Rules       JSONB     `gorm:"type:json" json:"rules"`
	School      *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// StandardSubject stores curriculum-defined subjects for each level
type StandardSubject struct {
	BaseModel
	Name         string `gorm:"type:varchar(255);not null" json:"name"`
	Code         string `gorm:"type:varchar(50);not null" json:"code"`
	Level        string `gorm:"type:varchar(50);not null;index" json:"level"`
	IsCompulsory bool   `gorm:"default:false" json:"is_compulsory"`
	Papers       int    `gorm:"default:1" json:"papers"`
	GradingType  string `gorm:"type:varchar(50);default:'standard'" json:"grading_type"`
	Description  string `gorm:"type:text" json:"description"`
}

// RefreshToken stores refresh tokens for revocation
type RefreshToken struct {
	ID        uuid.UUID `gorm:"type:char(36);primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:char(36);not null;index" json:"user_id"`
	Token     string    `gorm:"type:varchar(500);uniqueIndex;not null" json:"token"`
	ExpiresAt time.Time `gorm:"not null;index" json:"expires_at"`
	Revoked   bool      `gorm:"default:false;index" json:"revoked"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (r *RefreshToken) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

// FeesStructure represents the fees structure for a class/term
type FeesStructure struct {
	BaseModel
	SchoolID    uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	Level       string    `gorm:"type:varchar(50);not null" json:"level"`
	Term        string    `gorm:"type:varchar(10);not null" json:"term"`
	Year        int       `gorm:"not null" json:"year"`
	TotalFees   float64   `gorm:"type:decimal(10,2);not null" json:"total_fees"`
	Description string    `gorm:"type:text" json:"description"`
	School      *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// StudentFees represents a student's fees record for a term
type StudentFees struct {
	BaseModel
	StudentID     uuid.UUID `gorm:"type:char(36);not null;uniqueIndex:idx_student_fees" json:"student_id"`
	SchoolID      uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	Term          string    `gorm:"type:varchar(10);not null;uniqueIndex:idx_student_fees" json:"term"`
	Year          int       `gorm:"not null;uniqueIndex:idx_student_fees" json:"year"`
	TotalFees     float64   `gorm:"type:decimal(10,2);not null" json:"total_fees"`
	AmountPaid    float64   `gorm:"type:decimal(10,2);default:0" json:"amount_paid"`
	Outstanding   float64   `gorm:"type:decimal(10,2);default:0" json:"outstanding"`
	Student       *Student  `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	School        *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// FeesPayment represents individual fee payments
type FeesPayment struct {
	BaseModel
	StudentFeesID uuid.UUID    `gorm:"type:char(36);not null;index" json:"student_fees_id"`
	Amount        float64      `gorm:"type:decimal(10,2);not null" json:"amount"`
	PaymentDate   time.Time    `gorm:"not null" json:"payment_date"`
	PaymentMethod string       `gorm:"type:varchar(50)" json:"payment_method"`
	ReceiptNo     string       `gorm:"type:varchar(100)" json:"receipt_no"`
	Notes         string       `gorm:"type:text" json:"notes"`
	RecordedBy    uuid.UUID    `gorm:"type:char(36);not null" json:"recorded_by"`
	StudentFees   *StudentFees `gorm:"foreignKey:StudentFeesID" json:"student_fees,omitempty"`
}

// Library Management Models

// Book represents a book in the library
type Book struct {
	BaseModel
	SchoolID        uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	ISBN            string    `gorm:"type:varchar(20);index" json:"isbn"`
	Title           string    `gorm:"type:varchar(255);not null" json:"title"`
	Author          string    `gorm:"type:varchar(255);not null" json:"author"`
	Publisher       string    `gorm:"type:varchar(255)" json:"publisher"`
	Category        string    `gorm:"type:varchar(100);not null" json:"category"`
	Subject         string    `gorm:"type:varchar(100)" json:"subject"`
	Class           string    `gorm:"type:varchar(50)" json:"class"`
	PublishedYear   int       `json:"published_year"`
	TotalCopies     int       `gorm:"not null;default:0" json:"total_copies"`
	AvailableCopies int       `gorm:"not null;default:0" json:"available_copies"`
	IssuedCopies    int       `gorm:"not null;default:0" json:"issued_copies"`
	LostCopies      int       `gorm:"not null;default:0" json:"lost_copies"`
	DamagedCopies   int       `gorm:"not null;default:0" json:"damaged_copies"`
	Location        string    `gorm:"type:varchar(100)" json:"location"`
	Description     string    `gorm:"type:text" json:"description"`
	School          *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// BulkIssue represents a bulk borrowing transaction
type BulkIssue struct {
	BaseModel
	SchoolID     uuid.UUID  `gorm:"type:char(36);not null;index" json:"school_id"`
	BorrowerID   uuid.UUID  `gorm:"type:char(36);not null;index" json:"borrower_id"`
	BorrowerType string     `gorm:"type:varchar(20);not null" json:"borrower_type"` // student or teacher
	IssuedBy     uuid.UUID  `gorm:"type:char(36);not null" json:"issued_by"`
	Year         int        `gorm:"not null;index" json:"year"`
	Term         string     `gorm:"type:varchar(10);not null;index" json:"term"`
	IssuedDate   time.Time  `gorm:"not null" json:"issued_date"`
	DueDate      time.Time  `gorm:"not null" json:"due_date"`
	ReturnDate   *time.Time `json:"return_date,omitempty"`
	Status       string     `gorm:"type:varchar(20);default:'issued'" json:"status"`
	TotalBooks   int        `gorm:"not null" json:"total_books"`
	ReturnedBooks int       `gorm:"default:0" json:"returned_books"`
	Fine         float64    `gorm:"type:decimal(10,2);default:0" json:"fine"`
	Notes        string     `gorm:"type:text" json:"notes"`
	Student      *Student   `gorm:"foreignKey:BorrowerID" json:"student,omitempty"`
	Staff        *Staff     `gorm:"foreignKey:BorrowerID" json:"staff,omitempty"`
	Librarian    *User      `gorm:"foreignKey:IssuedBy" json:"librarian,omitempty"`
}

// BulkIssueItem represents individual books in a bulk issue
type BulkIssueItem struct {
	BaseModel
	BulkIssueID uuid.UUID  `gorm:"type:char(36);not null;index" json:"bulk_issue_id"`
	BookID      uuid.UUID  `gorm:"type:char(36);not null;index" json:"book_id"`
	CopyNumber  int        `gorm:"not null" json:"copy_number"`
	ReturnDate  *time.Time `json:"return_date,omitempty"`
	Status      string     `gorm:"type:varchar(20);default:'issued'" json:"status"`
	Fine        float64    `gorm:"type:decimal(10,2);default:0" json:"fine"`
	Notes       string     `gorm:"type:text" json:"notes"`
	BulkIssue   *BulkIssue `gorm:"foreignKey:BulkIssueID" json:"bulk_issue,omitempty"`
	Book        *Book      `gorm:"foreignKey:BookID" json:"book,omitempty"`
}
// BookIssue represents book borrowing records with copy tracking
type BookIssue struct {
	BaseModel
	BookID        uuid.UUID  `gorm:"type:char(36);not null;index" json:"book_id"`
	BookTitle     string     `gorm:"type:varchar(255);not null" json:"book_title"`
	BorrowerID    uuid.UUID  `gorm:"type:char(36);not null;index" json:"borrower_id"`
	BorrowerName  string     `gorm:"type:varchar(255);not null" json:"borrower_name"`
	BorrowerType  string     `gorm:"type:varchar(20);not null" json:"borrower_type"` // student or teacher
	BorrowerLevel string     `gorm:"type:varchar(50)" json:"borrower_level"`
	BorrowerClass string     `gorm:"type:varchar(50)" json:"borrower_class"`
	IssuedBy      uuid.UUID  `gorm:"type:char(36);not null" json:"issued_by"`
	CopyNumber    string     `gorm:"type:varchar(10);not null;index" json:"copy_number"`
	Year          int        `gorm:"not null;index" json:"year"`
	Term          string     `gorm:"type:varchar(10);not null;index" json:"term"`
	IssuedDate    time.Time  `gorm:"not null" json:"issued_date"`
	DueDate       time.Time  `gorm:"not null" json:"due_date"`
	ReturnDate    *time.Time `json:"return_date,omitempty"`
	Status        string     `gorm:"type:varchar(20);default:'issued'" json:"status"` // issued, returned, lost, damaged
	Fine          float64    `gorm:"type:decimal(10,2);default:0" json:"fine"`
	Notes         string     `gorm:"type:text" json:"notes"`
	BulkIssueID   *uuid.UUID `gorm:"type:char(36);index" json:"bulk_issue_id,omitempty"`
	Book          *Book      `gorm:"foreignKey:BookID" json:"book,omitempty"`
	Student       *Student   `gorm:"-" json:"student,omitempty"`
	Staff         *Staff     `gorm:"-" json:"staff,omitempty"`
	Librarian     *User      `gorm:"foreignKey:IssuedBy" json:"librarian,omitempty"`
	BulkIssue     *BulkIssue `gorm:"foreignKey:BulkIssueID" json:"bulk_issue,omitempty"`
}


// Clinic Management Models

// StudentHealthProfile stores comprehensive health information
type StudentHealthProfile struct {
	BaseModel
	StudentID          uuid.UUID `gorm:"type:char(36);not null;uniqueIndex" json:"student_id"`
	SchoolID           uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	Year               int       `gorm:"not null;index" json:"year"`
	Term               string    `gorm:"type:varchar(10);not null;index" json:"term"`
	BloodGroup         string    `gorm:"type:varchar(5)" json:"blood_group"`
	Allergies          string    `gorm:"type:text" json:"allergies"`
	ChronicConditions  string    `gorm:"type:text" json:"chronic_conditions"`
	Disabilities       string    `gorm:"type:text" json:"disabilities"`
	EmergencyContact   string    `gorm:"type:varchar(255)" json:"emergency_contact"`
	EmergencyPhone     string    `gorm:"type:varchar(50)" json:"emergency_phone"`
	VaccinationHistory JSONB     `gorm:"type:json" json:"vaccination_history"`
	Student            *Student  `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	School             *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// ClinicVisit represents a student visit to the clinic
type ClinicVisit struct {
	BaseModel
	StudentID       uuid.UUID  `gorm:"type:char(36);not null;index" json:"student_id"`
	SchoolID        uuid.UUID  `gorm:"type:char(36);not null;index" json:"school_id"`
	Year            int        `gorm:"not null;index" json:"year"`
	Term            string     `gorm:"type:varchar(10);not null;index" json:"term"`
	VisitDate       time.Time  `gorm:"not null;index" json:"visit_date"`
	Symptoms        string     `gorm:"type:text;not null" json:"symptoms"`
	Assessment      string     `gorm:"type:text" json:"assessment"`
	Diagnosis       string     `gorm:"type:text" json:"diagnosis"`
	Treatment       string     `gorm:"type:text" json:"treatment"`
	Outcome         string     `gorm:"type:varchar(50);not null" json:"outcome"`
	Temperature     float64    `gorm:"type:decimal(4,1)" json:"temperature"`
	BloodPressure   string     `gorm:"type:varchar(20)" json:"blood_pressure"`
	Pulse           int        `json:"pulse"`
	Weight          float64    `gorm:"type:decimal(5,2)" json:"weight"`
	Height          float64    `gorm:"type:decimal(5,2)" json:"height"`
	Notes           string     `gorm:"type:text" json:"notes"`
	FollowUpDate    *time.Time `json:"follow_up_date,omitempty"`
	ParentNotified  bool       `gorm:"default:false" json:"parent_notified"`
	ReferralDetails string     `gorm:"type:text" json:"referral_details"`
	AttendedBy      uuid.UUID  `gorm:"type:char(36);not null" json:"attended_by"`
	Student         *Student   `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	School          *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Nurse           *User      `gorm:"foreignKey:AttendedBy" json:"nurse,omitempty"`
}

// MedicalTest represents tests performed during clinic visits
type MedicalTest struct {
	BaseModel
	VisitID        uuid.UUID    `gorm:"type:char(36);not null;index" json:"visit_id"`
	StudentID      uuid.UUID    `gorm:"type:char(36);not null;index" json:"student_id"`
	SchoolID       uuid.UUID    `gorm:"type:char(36);not null;index" json:"school_id"`
	Year           int          `gorm:"not null;index" json:"year"`
	Term           string       `gorm:"type:varchar(10);not null;index" json:"term"`
	TestType       string       `gorm:"type:varchar(50);not null" json:"test_type"`
	TestDate       time.Time    `gorm:"not null" json:"test_date"`
	Reason         string       `gorm:"type:text" json:"reason"`
	Result         string       `gorm:"type:text" json:"result"`
	IsSensitive    bool         `gorm:"default:false" json:"is_sensitive"`
	ConsentGiven   bool         `gorm:"default:false" json:"consent_given"`
	ParentNotified bool         `gorm:"default:false" json:"parent_notified"`
	FollowUpAction string       `gorm:"type:text" json:"follow_up_action"`
	PerformedBy    uuid.UUID    `gorm:"type:char(36);not null" json:"performed_by"`
	Visit          *ClinicVisit `gorm:"foreignKey:VisitID" json:"visit,omitempty"`
	Student        *Student     `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	School         *School      `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Nurse          *User        `gorm:"foreignKey:PerformedBy" json:"nurse,omitempty"`
}

// Medicine represents medicines in the clinic
type Medicine struct {
	BaseModel
	SchoolID        uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	Year            int       `gorm:"not null;index" json:"year"`
	Term            string    `gorm:"type:varchar(10);not null;index" json:"term"`
	Name            string    `gorm:"type:varchar(255);not null" json:"name"`
	GenericName     string    `gorm:"type:varchar(255)" json:"generic_name"`
	Category        string    `gorm:"type:varchar(100);not null" json:"category"`
	DosageForm      string    `gorm:"type:varchar(100)" json:"dosage_form"`
	Strength        string    `gorm:"type:varchar(50)" json:"strength"`
	InitialQuantity int       `gorm:"not null;default:0" json:"initial_quantity"`
	Quantity        int       `gorm:"not null;default:0" json:"quantity"`
	Unit            string    `gorm:"type:varchar(50);not null" json:"unit"`
	ExpiryDate      time.Time `gorm:"not null" json:"expiry_date"`
	BatchNumber     string    `gorm:"type:varchar(100)" json:"batch_number"`
	Supplier        string    `gorm:"type:varchar(255)" json:"supplier"`
	CostPerUnit     float64   `gorm:"type:decimal(10,2)" json:"cost_per_unit"`
	MinimumStock    int       `gorm:"default:10" json:"minimum_stock"`
	Notes           string    `gorm:"type:text" json:"notes"`
	School          *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// MedicationAdministration tracks medicine given to students
type MedicationAdministration struct {
	BaseModel
	VisitID        uuid.UUID    `gorm:"type:char(36);not null;index" json:"visit_id"`
	StudentID      uuid.UUID    `gorm:"type:char(36);not null;index" json:"student_id"`
	MedicineID     uuid.UUID    `gorm:"type:char(36);not null;index" json:"medicine_id"`
	SchoolID       uuid.UUID    `gorm:"type:char(36);not null;index" json:"school_id"`
	Dose           string       `gorm:"type:varchar(100);not null" json:"dose"`
	Frequency      string       `gorm:"type:varchar(100)" json:"frequency"`
	AdministeredAt time.Time    `gorm:"not null" json:"administered_at"`
	QuantityGiven  int          `gorm:"not null" json:"quantity_given"`
	Notes          string       `gorm:"type:text" json:"notes"`
	AdministeredBy uuid.UUID    `gorm:"type:char(36);not null" json:"administered_by"`
	Visit          *ClinicVisit `gorm:"foreignKey:VisitID" json:"visit,omitempty"`
	Student        *Student     `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	Medicine       *Medicine    `gorm:"foreignKey:MedicineID" json:"medicine,omitempty"`
	School         *School      `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Nurse          *User        `gorm:"foreignKey:AdministeredBy" json:"nurse,omitempty"`
}

// ClinicConsumable represents non-medicinal items
type ClinicConsumable struct {
	BaseModel
	SchoolID        uuid.UUID  `gorm:"type:char(36);not null;index" json:"school_id"`
	Year            int        `gorm:"not null;index" json:"year"`
	Term            string     `gorm:"type:varchar(10);not null;index" json:"term"`
	Name            string     `gorm:"type:varchar(255);not null" json:"name"`
	Category        string     `gorm:"type:varchar(100);not null" json:"category"`
	ItemType        string     `gorm:"type:varchar(100);not null" json:"item_type"`
	InitialQuantity int        `gorm:"not null;default:0" json:"initial_quantity"`
	Quantity        int        `gorm:"not null;default:0" json:"quantity"`
	Unit            string     `gorm:"type:varchar(50);not null" json:"unit"`
	ExpiryDate      *time.Time `json:"expiry_date,omitempty"`
	BatchNumber     string     `gorm:"type:varchar(100)" json:"batch_number"`
	Supplier        string     `gorm:"type:varchar(255)" json:"supplier"`
	CostPerUnit     float64    `gorm:"type:decimal(10,2)" json:"cost_per_unit"`
	MinimumStock    int        `gorm:"default:10" json:"minimum_stock"`
	Notes           string     `gorm:"type:text" json:"notes"`
	School          *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// ConsumableUsage tracks usage of consumables
type ConsumableUsage struct {
	BaseModel
	ConsumableID uuid.UUID         `gorm:"type:char(36);not null;index" json:"consumable_id"`
	VisitID      *uuid.UUID        `gorm:"type:char(36);index" json:"visit_id,omitempty"`
	TestID       *uuid.UUID        `gorm:"type:char(36);index" json:"test_id,omitempty"`
	SchoolID     uuid.UUID         `gorm:"type:char(36);not null;index" json:"school_id"`
	QuantityUsed int               `gorm:"not null" json:"quantity_used"`
	UsedAt       time.Time         `gorm:"not null" json:"used_at"`
	Purpose      string            `gorm:"type:varchar(255)" json:"purpose"`
	UsedBy       uuid.UUID         `gorm:"type:char(36);not null" json:"used_by"`
	Consumable   *ClinicConsumable `gorm:"foreignKey:ConsumableID" json:"consumable,omitempty"`
	Visit        *ClinicVisit      `gorm:"foreignKey:VisitID" json:"visit,omitempty"`
	Test         *MedicalTest      `gorm:"foreignKey:TestID" json:"test,omitempty"`
	School       *School           `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Nurse        *User             `gorm:"foreignKey:UsedBy" json:"nurse,omitempty"`
}

// EmergencyIncident tracks serious medical incidents
type EmergencyIncident struct {
	BaseModel
	StudentID        uuid.UUID    `gorm:"type:char(36);not null;index" json:"student_id"`
	VisitID          *uuid.UUID   `gorm:"type:char(36);index" json:"visit_id,omitempty"`
	SchoolID         uuid.UUID    `gorm:"type:char(36);not null;index" json:"school_id"`
	Year             int          `gorm:"not null;index" json:"year"`
	Term             string       `gorm:"type:varchar(10);not null;index" json:"term"`
	IncidentDate     time.Time    `gorm:"not null;index" json:"incident_date"`
	IncidentType     string       `gorm:"type:varchar(100);not null" json:"incident_type"`
	Description      string       `gorm:"type:text;not null" json:"description"`
	ActionTaken      string       `gorm:"type:text;not null" json:"action_taken"`
	ParentNotified   bool         `gorm:"default:false" json:"parent_notified"`
	ParentNotifiedAt *time.Time   `json:"parent_notified_at,omitempty"`
	ReferralHospital string       `gorm:"type:varchar(255)" json:"referral_hospital"`
	ReferralDetails  string       `gorm:"type:text" json:"referral_details"`
	Outcome          string       `gorm:"type:text" json:"outcome"`
	ReportedBy       uuid.UUID    `gorm:"type:char(36);not null" json:"reported_by"`
	Student          *Student     `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	Visit            *ClinicVisit `gorm:"foreignKey:VisitID" json:"visit,omitempty"`
	School           *School      `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Nurse            *User        `gorm:"foreignKey:ReportedBy" json:"nurse,omitempty"`
}

// Phase 1 Models - Attendance, Communication, Exams, Parent Portal

// Attendance tracks daily student attendance
type Attendance struct {
	BaseModel
	StudentID  uuid.UUID `gorm:"type:char(36);not null;uniqueIndex:idx_attendance_unique" json:"student_id"`
	SchoolID   uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	ClassID    uuid.UUID `gorm:"type:char(36);not null;index" json:"class_id"`
	Year       int       `gorm:"not null;index" json:"year"`
	Term       string    `gorm:"type:varchar(10);not null;index" json:"term"`
	Date       time.Time `gorm:"type:date;not null;uniqueIndex:idx_attendance_unique" json:"date"`
	Status     string    `gorm:"type:varchar(20);not null" json:"status"` // present, absent, late, sick, excused
	Remarks    string    `gorm:"type:text" json:"remarks"`
	MarkedBy   uuid.UUID `gorm:"type:char(36);not null" json:"marked_by"`
	MarkedAt   time.Time `gorm:"not null" json:"marked_at"`
	Student    *Student  `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	School     *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Class      *Class    `gorm:"foreignKey:ClassID" json:"class,omitempty"`
	Teacher    *User     `gorm:"foreignKey:MarkedBy" json:"teacher,omitempty"`
}

// SMSLog tracks all SMS sent
type SMSLog struct {
	BaseModel
	SchoolID     uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	Recipient    string    `gorm:"type:varchar(20);not null" json:"recipient"`
	Message      string    `gorm:"type:text;not null" json:"message"`
	Status       string    `gorm:"type:varchar(20);not null" json:"status"` // pending, sent, failed
	SMSType      string    `gorm:"type:varchar(50);not null" json:"sms_type"` // attendance, fees, results, general
	Cost         float64   `gorm:"type:decimal(10,2)" json:"cost"`
	SentAt       *time.Time `json:"sent_at,omitempty"`
	ErrorMessage string    `gorm:"type:text" json:"error_message"`
	SentBy       uuid.UUID `gorm:"type:char(36);not null" json:"sent_by"`
	School       *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// Notification for in-app notifications
// Exam represents exam schedules
type Exam struct {
	BaseModel
	SchoolID    uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	Name        string    `gorm:"type:varchar(255);not null" json:"name"`
	ExamType    string    `gorm:"type:varchar(50);not null" json:"exam_type"` // BOT, MOT, EOT, Mock, UNEB
	Term        string    `gorm:"type:varchar(10);not null" json:"term"`
	Year        int       `gorm:"not null" json:"year"`
	StartDate   time.Time `gorm:"type:date;not null" json:"start_date"`
	EndDate     time.Time `gorm:"type:date;not null" json:"end_date"`
	Description string    `gorm:"type:text" json:"description"`
	School      *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// ExamTimetable represents exam schedule per subject
type ExamTimetable struct {
	BaseModel
	ExamID    uuid.UUID `gorm:"type:char(36);not null;index" json:"exam_id"`
	SchoolID  uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	SubjectID uuid.UUID `gorm:"type:char(36);not null" json:"subject_id"`
	Level     string    `gorm:"type:varchar(50);not null" json:"level"`
	Date      time.Time `gorm:"type:date;not null" json:"date"`
	StartTime string    `gorm:"type:varchar(10);not null" json:"start_time"`
	EndTime   string    `gorm:"type:varchar(10);not null" json:"end_time"`
	Venue     string    `gorm:"type:varchar(255)" json:"venue"`
	Exam      *Exam     `gorm:"foreignKey:ExamID" json:"exam,omitempty"`
	School    *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Subject   *StandardSubject `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
}

// ParentAccount for parent portal access
type ParentAccount struct {
	BaseModel
	GuardianID   uuid.UUID `gorm:"type:char(36);not null;uniqueIndex" json:"guardian_id"`
	SchoolID     uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	Email        string    `gorm:"type:varchar(255);uniqueIndex" json:"email"`
	Phone        string    `gorm:"type:varchar(20);uniqueIndex" json:"phone"`
	PasswordHash string    `gorm:"type:varchar(255);not null" json:"-"`
	IsActive     bool      `gorm:"default:true" json:"is_active"`
	LastLogin    *time.Time `json:"last_login,omitempty"`
	Guardian     *Guardian `gorm:"foreignKey:GuardianID" json:"guardian,omitempty"`
	School       *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// SchoolCalendar tracks holidays and non-school days
type SchoolCalendar struct {
	BaseModel
	SchoolID    uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	Date        time.Time `gorm:"type:date;not null;index" json:"date"`
	DayType     string    `gorm:"type:varchar(20);not null" json:"day_type"` // weekend, holiday, school_day
	Name        string    `gorm:"type:varchar(255)" json:"name"` // Holiday name
	Description string    `gorm:"type:text" json:"description"`
	Year        int       `gorm:"not null;index" json:"year"`
	Term        string    `gorm:"type:varchar(10);index" json:"term"`
	School      *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// TermDates defines start and end dates for school terms
type TermDates struct {
	BaseModel
	SchoolID  uuid.UUID `gorm:"type:char(36);not null;uniqueIndex:idx_term_dates" json:"school_id"`
	Year      int       `gorm:"not null;uniqueIndex:idx_term_dates" json:"year"`
	Term      string    `gorm:"type:varchar(10);not null;uniqueIndex:idx_term_dates" json:"term"`
	StartDate time.Time `gorm:"type:date;not null" json:"start_date"`
	EndDate   time.Time `gorm:"type:date;not null" json:"end_date"`
	School    *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// MobileMoneyPayment tracks mobile money transactions
type MobileMoneyPayment struct {
	BaseModel
	StudentFeesID   uuid.UUID    `gorm:"type:char(36);not null;index" json:"student_fees_id"`
	SchoolID        uuid.UUID    `gorm:"type:char(36);not null;index" json:"school_id"`
	Amount          float64      `gorm:"type:decimal(10,2);not null" json:"amount"`
	PhoneNumber     string       `gorm:"type:varchar(20);not null" json:"phone_number"`
	Provider        string       `gorm:"type:varchar(20);not null" json:"provider"` // MTN, Airtel
	TransactionRef  string       `gorm:"type:varchar(100);uniqueIndex" json:"transaction_ref"`
	ExternalRef     string       `gorm:"type:varchar(100)" json:"external_ref"`
	Status          string       `gorm:"type:varchar(20);not null" json:"status"` // pending, success, failed
	InitiatedAt     time.Time    `gorm:"not null" json:"initiated_at"`
	CompletedAt     *time.Time   `json:"completed_at,omitempty"`
	ErrorMessage    string       `gorm:"type:text" json:"error_message"`
	StudentFees     *StudentFees `gorm:"foreignKey:StudentFeesID" json:"student_fees,omitempty"`
	School          *School      `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// NotificationLog tracks all notifications sent
type NotificationLog struct {
	BaseModel
	SchoolID     uuid.UUID  `gorm:"type:char(36);not null;index" json:"school_id"`
	RecipientID  uuid.UUID  `gorm:"type:char(36);index" json:"recipient_id"`
	Type         string     `gorm:"not null" json:"type"` // sms, email
	Channel      string     `json:"channel"` // fees, results, attendance, announcement
	Recipient    string     `gorm:"not null" json:"recipient"` // phone or email
	Subject      string     `json:"subject"`
	Message      string     `gorm:"type:text;not null" json:"message"`
	Status       string     `gorm:"default:'pending'" json:"status"` // pending, sent, failed, delivered
	Provider     string     `json:"provider"` // africastalking, smtp, ses
	ProviderID   string     `json:"provider_id"`
	ErrorMessage string     `json:"error_message"`
	SentAt       *time.Time `json:"sent_at,omitempty"`
	DeliveredAt  *time.Time `json:"delivered_at,omitempty"`
	Cost         float64    `json:"cost"`
	School       *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// NotificationPreference stores user notification preferences
type NotificationPreference struct {
	BaseModel
	GuardianID      uuid.UUID `gorm:"type:char(36);not null;uniqueIndex" json:"guardian_id"`
	SchoolID        uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	SMSEnabled      bool      `gorm:"default:true" json:"sms_enabled"`
	EmailEnabled    bool      `gorm:"default:true" json:"email_enabled"`
	FeesReminders   bool      `gorm:"default:true" json:"fees_reminders"`
	PaymentConfirm  bool      `gorm:"default:true" json:"payment_confirm"`
	ResultsNotify   bool      `gorm:"default:true" json:"results_notify"`
	AttendanceAlert bool      `gorm:"default:true" json:"attendance_alert"`
	Announcements   bool      `gorm:"default:true" json:"announcements"`
	WeeklySummary   bool      `gorm:"default:false" json:"weekly_summary"`
	MonthlySummary  bool      `gorm:"default:true" json:"monthly_summary"`
	Guardian        *Guardian `gorm:"foreignKey:GuardianID" json:"guardian,omitempty"`
	School          *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}

// PaymentWebhookLog logs all webhook callbacks
type PaymentWebhookLog struct {
	ID             uuid.UUID  `gorm:"type:char(36);primaryKey" json:"id"`
	Provider       string     `gorm:"not null" json:"provider"`
	Event          string     `json:"event"`
	TransactionRef string     `json:"transaction_ref"`
	Payload        JSONB      `gorm:"type:json;not null" json:"payload"`
	Processed      bool       `gorm:"default:false" json:"processed"`
	ProcessedAt    *time.Time `json:"processed_at,omitempty"`
	ErrorMessage   string     `json:"error_message"`
	CreatedAt      time.Time  `json:"created_at"`
}

func (p *PaymentWebhookLog) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

// Income tracks school income
type Income struct {
	BaseModel
	SchoolID    uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	Category    string    `gorm:"type:varchar(100);not null" json:"category"` // Fees, Donations, Grants, Fundraising, Other
	Source      string    `gorm:"type:varchar(200)" json:"source"`
	Amount      float64   `gorm:"type:decimal(15,2);not null" json:"amount"`
	Description string    `gorm:"type:text" json:"description"`
	Date        time.Time `gorm:"not null;index" json:"date"`
	Term        string    `gorm:"type:varchar(20);index" json:"term"`
	Year        int       `gorm:"index" json:"year"`
	ReceiptNo   string    `gorm:"type:varchar(100)" json:"receipt_no"`
	ReceivedBy  uuid.UUID `gorm:"type:char(36)" json:"received_by"`
	School      *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	User        *User     `gorm:"foreignKey:ReceivedBy" json:"user,omitempty"`
}

// Expenditure tracks school expenses
type Expenditure struct {
	BaseModel
	SchoolID    uuid.UUID  `gorm:"type:char(36);not null;index" json:"school_id"`
	Category    string     `gorm:"type:varchar(100);not null" json:"category"` // Salaries, Utilities, Supplies, Maintenance, Transport, Other
	Vendor      string     `gorm:"type:varchar(200)" json:"vendor"`
	Amount      float64    `gorm:"type:decimal(15,2);not null" json:"amount"`
	Description string     `gorm:"type:text" json:"description"`
	Date        time.Time  `gorm:"not null;index" json:"date"`
	Term        string     `gorm:"type:varchar(20);index" json:"term"`
	Year        int        `gorm:"index" json:"year"`
	InvoiceNo   string     `gorm:"type:varchar(100)" json:"invoice_no"`
	ApprovedBy  *uuid.UUID `gorm:"type:char(36)" json:"approved_by"`
	RecordedBy  uuid.UUID  `gorm:"type:char(36)" json:"recorded_by"`
	Status      string     `gorm:"type:varchar(20);default:'approved'" json:"status"` // pending, approved, paid
	School      *School    `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
	Approver    *User      `gorm:"foreignKey:ApprovedBy" json:"approver,omitempty"`
	Recorder    *User      `gorm:"foreignKey:RecordedBy" json:"recorder,omitempty"`
}

// IntegrationActivity stores Activities of Integration marks for S1-S4 (0-3 per activity, 5 activities per subject)
type IntegrationActivity struct {
	BaseModel
	StudentID uuid.UUID `gorm:"type:char(36);not null;uniqueIndex:idx_integration_unique" json:"student_id"`
	SubjectID uuid.UUID `gorm:"type:char(36);not null;uniqueIndex:idx_integration_unique" json:"subject_id"`
	ClassID   uuid.UUID `gorm:"type:char(36);not null;index" json:"class_id"`
	SchoolID  uuid.UUID `gorm:"type:char(36);not null;index" json:"school_id"`
	Term      string    `gorm:"type:varchar(10);not null;uniqueIndex:idx_integration_unique" json:"term"`
	Year      int       `gorm:"not null;uniqueIndex:idx_integration_unique" json:"year"`
	Marks     JSONB     `gorm:"type:json" json:"marks"` // {"activity1": 2.5, "activity2": 3, ...}
	Student   *Student  `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	Subject   *StandardSubject `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	Class     *Class    `gorm:"foreignKey:ClassID" json:"class,omitempty"`
	School    *School   `gorm:"foreignKey:SchoolID" json:"school,omitempty"`
}
