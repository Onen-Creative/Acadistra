# Service Layer Enhancement - Complete System Refactoring

## Objective
Move ALL business logic from handlers to services, making handlers thin HTTP adapters (parse → call service → return JSON).

## Priority Order (by complexity)

### Phase 1: Critical Business Logic (COMPLETED ✓)
1. ✓ AttendanceService - 658 lines (was 1000+ in handler)
2. ✓ ClassService - 199 lines
3. ✓ StudentService - 174 lines  
4. ✓ GuardianService - 216 lines

### Phase 2: Core Academic Operations (HIGH PRIORITY)
5. ResultService - Handle result_handler.go (1123 lines)
   - CreateOrUpdate with grade calculation
   - GetByStudent with term/year filtering
   - GetBulkMarks with class filtering
   - GetPerformanceSummary with statistics
   - Delete with authorization
   - RecalculateGrades for entire school

6. SubjectService - Handle subject_handler.go
   - ListStandardSubjects with level filtering
   - GetSchoolSubjects with enrollment data
   - CreateStandardSubject (system admin only)
   - UpdateStandardSubject
   - DeleteStandardSubject

7. ClassRankingService - Handle class_ranking_handler.go (861 lines)
   - GetClassRanking with complex aggregations
   - ExportClassRanking to Excel
   - GetAvailableTermsYears

### Phase 3: Staff & HR Management (HIGH PRIORITY)
8. StaffService - Handle staff_handler.go (965 lines)
   - CreateStaff with user creation
   - UpdateStaff with profile management
   - DeleteStaff with cascade checks
   - GetStaffStats with aggregations
   - Leave management (create, approve, list)
   - Staff attendance tracking
   - Document management (upload, list)

9. PayrollService - Already exists but needs enhancement
   - Process payroll with finance integration
   - Generate payslips
   - Track payment status
   - Salary structure management

### Phase 4: Finance & Fees (HIGH PRIORITY)
10. FinanceService - Handle finance_handler.go (820 lines)
    - Income/Expenditure CRUD
    - GetFinancialSummary with date ranges
    - ExportFinanceReport
    - ExportFeesReport
    - Budget tracking

11. FeesService - Handle fees_handler.go (666 lines)
    - CreateOrUpdateStudentFees
    - RecordPayment with notifications
    - GetReportData with statistics
    - ListStudentFees with filtering

12. BudgetService - Handle budget_handler.go (698 lines)
    - Budget CRUD with approval workflow
    - GetBudgetSummary with spending analysis
    - Requisition management
    - Approval/rejection workflow

### Phase 5: Health & Library (MEDIUM PRIORITY)
13. ClinicService - Handle clinic_handler.go (1214 lines)
    - Health profile management
    - Clinic visits tracking
    - Medical tests recording
    - Medicine inventory
    - Medication administration
    - Consumables tracking
    - Emergency incidents
    - GetAdminSummary with statistics

14. LibraryService - Handle library_handler.go (880 lines)
    - Book CRUD with copy management
    - Issue/Return books
    - Bulk issue operations
    - GetStats with subject breakdown
    - GetReportData

### Phase 6: Inventory & Logistics (MEDIUM PRIORITY)
15. InventoryService - Handle inventory_handler.go (452 lines)
    - Item CRUD with categories
    - Transaction recording
    - GetStats with low stock alerts
    - GetPurchaseReceipt

### Phase 7: Parent Portal (MEDIUM PRIORITY)
16. ParentService - Handle parent_handler.go (512 lines)
    - GetDashboardSummary
    - GetChildDetails
    - GetChildAttendance
    - GetChildResults
    - GetChildFees
    - GetChildHealth
    - GetChildReportCard
    - GetChildTimetable

### Phase 8: School Management (MEDIUM PRIORITY)
17. SchoolService - Handle school_handler.go (586 lines)
    - School CRUD
    - GetSchoolSummary with statistics
    - GetSchoolLevels
    - ToggleActive
    - GetStats (system-wide)

18. UserService - Handle user_handler.go (613 lines)
    - User CRUD with role management
    - CreateSchoolUser with email notifications
    - ResetUserPassword
    - ListSchoolUsers with filtering

### Phase 9: Reporting & Analytics (LOW PRIORITY)
19. AnalyticsService - Handle analytics_handler.go
    - SubjectPerformanceTrend
    - StudentProgressTracking
    - ClassComparison
    - SubjectComparison
    - TermComparison

20. ReportsService - Handle reports_handler.go
    - GenerateStudentsReport
    - GenerateStaffReport
    - GenerateAttendanceReport
    - GeneratePerformanceReport

21. MarksExportService - Handle marks_export_handler.go (564 lines)
    - ExportClassMarks with formatting

### Phase 10: Supporting Services (LOW PRIORITY)
22. LessonService - Handle lesson_handler.go (416 lines)
23. AnnouncementService - Handle announcement_handler.go
24. NotificationService - Already exists, may need enhancement
25. TermDatesService - Handle term_dates_handler.go
26. SettingsService - Handle settings_handler.go
27. UploadService - Handle upload_handler.go
28. IntegrationActivityService - Handle integration_activity_handler.go

### Phase 11: Bulk Import (LOW PRIORITY)
29. BulkImportService - Consolidate all bulk import handlers
    - Student import
    - Marks import (exam, CA, AOI)
    - Validation and approval workflow

### Phase 12: Payment Integration (LOW PRIORITY)
30. PaymentService - Handle payment_handler.go (393 lines)
    - Mobile money integration
    - Payment verification
    - Webhook handling

## Implementation Pattern

For each service:

### 1. Repository Enhancement
```go
// Add all methods needed by handler
type XRepository interface {
    BaseRepository
    // List with complex filters
    ListWithFilters(filter XFilter) ([]models.X, int64, error)
    // Aggregations
    GetStats(schoolID uuid.UUID, filters) (*XStats, error)
    // Complex queries
    FindWithRelations(id uuid.UUID) (*models.X, error)
    // Bulk operations
    BulkCreate(items []models.X) error
}
```

### 2. Service Implementation
```go
type XService struct {
    repo XRepository
    db   *gorm.DB
    // Other dependencies (email, notification, etc.)
}

// Business logic methods matching handler operations
func (s *XService) Create(req CreateXRequest, userRole, schoolID string) (*models.X, error) {
    // Validation
    // Authorization
    // Business rules
    // Call repository
    // Side effects (notifications, etc.)
}
```

### 3. Handler Refactoring
```go
type XHandler struct {
    svc *services.XService
}

func (h *XHandler) Create(c *gin.Context) {
    var req services.CreateXRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    
    result, err := h.svc.Create(req, c.GetString("user_role"), c.GetString("tenant_school_id"))
    if err != nil {
        c.JSON(mapErrorToStatus(err), gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(201, result)
}
```

## Benefits

1. **Maintainability**: Business logic in one place (services)
2. **Testability**: Services can be unit tested without HTTP
3. **Reusability**: Services can be called from multiple handlers/jobs
4. **Clarity**: Handlers are thin and obvious
5. **Consistency**: All handlers follow same pattern

## Current Status

- Phase 1: ✓ COMPLETED (4/4 services)
- Phase 2-12: IN PROGRESS

## Next Steps

1. Start with Phase 2 (ResultService, SubjectService, ClassRankingService)
2. Continue through phases in priority order
3. Update routes to wire new services
4. Verify compilation after each service
5. Document any breaking changes
