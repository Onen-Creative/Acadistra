# Service Layer Refactoring - Implementation Guide

## Current Status

### ✅ COMPLETED (Phase 1)
- **AttendanceService** (658 lines) - Full business logic extracted
- **ClassService** (199 lines) - Complete with validation & authorization
- **StudentService** (174 lines) - List & GetMyChildren with complex queries
- **GuardianService** (216 lines) - CRUD with student verification

### 📋 REMAINING WORK

## Critical Pattern for All Services

Every service must follow this structure:

```go
type XService struct {
    repo XRepository
    db   *gorm.DB
    // Dependencies (email, notification, etc.)
}

// Business logic methods
func (s *XService) MethodName(params, userRole, schoolID string) (*Result, error) {
    // 1. Validation
    // 2. Authorization checks
    // 3. Business rules
    // 4. Repository calls
    // 5. Side effects (email, notifications)
    // 6. Return result
}
```

## Implementation Steps for Each Service

### 1. Analyze Handler
- Read handler file completely
- List all methods and their complexity
- Identify dependencies (email, grading, etc.)
- Note authorization patterns

### 2. Design Repository Interface
```go
type XRepository interface {
    BaseRepository
    // Add all complex queries from handler
    ListWithFilters(filter XFilter) ([]models.X, int64, error)
    FindWithRelations(id uuid.UUID) (*models.X, error)
    GetStats(schoolID uuid.UUID) (*XStats, error)
    BulkOperation(items []models.X) error
}
```

### 3. Implement Repository
- Add all methods to repository file
- Use GORM efficiently (joins, preloads, aggregations)
- Return errors, don't handle HTTP

### 4. Create Service
- Move ALL business logic from handler
- Keep authorization in service
- Keep validation in service
- Keep side effects in service
- Define request/response types in service

### 5. Refactor Handler
- Parse HTTP request
- Call service method
- Map error to HTTP status
- Return JSON response
- Handler should be ~50-150 lines max

### 6. Update Routes
- Add service factory helper
- Wire service in handler constructor
- Test compilation

## Priority Queue (Next 10 Services)

### 1. ResultService (CRITICAL - 1123 lines)
**Complexity**: VERY HIGH
- Grade calculation with multiple grading systems (Nursery, Primary, NCDC, UACE)
- AOI integration for S1-S4
- Paper-based grading for S5-S6
- Subsidiary subject handling
- Position calculation
- Email notifications
- Bulk operations
- Recalculate grades for entire school

**Repository Methods Needed**:
```go
FindByStudentWithFilters(studentID, term, year, examType string) ([]ResultWithSubject, error)
FindExisting(studentID, subjectID, term, year, examType string, paper int) (*models.SubjectResult, error)
GetClassPosition(classID, studentID, term, year, examType string) (string, error)
GetOutstandingFees(studentID, term, year string) (float64, error)
GetAllPapersForSubject(studentID, subjectID, term, year, examType string) ([]models.SubjectResult, error)
BulkGetMarks(classID, subjectID, term, year, examType string, paper int) (map[string]models.JSONB, error)
GetPerformanceData(schoolID, term, year string) ([]StudentPerformance, error)
RecalculateAll(schoolID, term, year, level string) (updated, errors, skipped int, err error)
```

**Service Methods**:
```go
GetByStudent(studentID, term, year, examType, schoolID string) (*StudentResults, error)
CreateOrUpdate(req CreateResultRequest, userRole, schoolID string) (*models.SubjectResult, error)
Delete(id, userRole string) error
RecalculateGrades(schoolID, term, year, level, userRole string) (*RecalculateStats, error)
GetBulkMarks(classID, subjectID, term, year, examType string, paper int, schoolID string) (map[string]models.JSONB, error)
GetPerformanceSummary(schoolID, term, year string) ([]StudentPerformance, error)
```

### 2. ClinicService (CRITICAL - 1214 lines)
**Complexity**: VERY HIGH
- Health profiles
- Clinic visits
- Medical tests
- Medicine inventory
- Medication administration
- Consumables tracking
- Emergency incidents
- Complex statistics

### 3. StaffService (HIGH - 965 lines)
**Complexity**: HIGH
- Staff CRUD with user creation
- Leave management
- Staff attendance
- Document management
- Statistics

### 4. LibraryService (HIGH - 880 lines)
**Complexity**: HIGH
- Book CRUD with copy management
- Issue/Return with due dates
- Bulk operations
- Statistics by subject

### 5. ClassRankingService (HIGH - 861 lines)
**Complexity**: HIGH
- Complex aggregations
- Excel export
- Term/year filtering

### 6. FinanceService (HIGH - 820 lines)
**Complexity**: HIGH
- Income/Expenditure CRUD
- Financial summary
- Report exports
- Budget tracking

### 7. BudgetService (MEDIUM - 698 lines)
**Complexity**: MEDIUM
- Budget CRUD
- Requisition workflow
- Approval process

### 8. FeesService (MEDIUM - 666 lines)
**Complexity**: MEDIUM
- Student fees CRUD
- Payment recording
- Notifications
- Reports

### 9. UserService (MEDIUM - 613 lines)
**Complexity**: MEDIUM
- User CRUD
- Role management
- Password reset
- Email notifications

### 10. SchoolService (MEDIUM - 586 lines)
**Complexity**: MEDIUM
- School CRUD
- Dashboard summary
- Statistics

## Quick Reference: Common Patterns

### Authorization Pattern
```go
func (s *XService) CheckAccess(resourceID, userRole, schoolID string) error {
    if userRole == "system_admin" {
        return nil
    }
    var resource models.X
    if err := s.db.First(&resource, resourceID).Error; err != nil {
        return errors.New("resource not found")
    }
    if resource.SchoolID.String() != schoolID {
        return errors.New("access denied")
    }
    return nil
}
```

### Validation Pattern
```go
func (s *XService) Validate(req CreateXRequest) error {
    if req.Field == "" {
        return errors.New("field is required")
    }
    if req.Amount < 0 {
        return errors.New("amount must be positive")
    }
    return nil
}
```

### Side Effects Pattern
```go
func (s *XService) Create(req CreateXRequest) (*models.X, error) {
    // ... create logic ...
    
    // Send notification asynchronously
    go func(id uuid.UUID) {
        s.emailService.SendNotification(...)
    }(result.ID)
    
    return result, nil
}
```

### Complex Query Pattern
```go
// In Repository
func (r *xRepository) ListWithFilters(f XFilter) ([]models.X, int64, error) {
    query := r.db.Table("xs")
    
    if f.SchoolID != "" {
        query = query.Where("school_id = ?", f.SchoolID)
    }
    
    if f.StartDate != "" && f.EndDate != "" {
        query = query.Where("date BETWEEN ? AND ?", f.StartDate, f.EndDate)
    }
    
    // Joins
    if f.NeedsRelation {
        query = query.Joins("LEFT JOIN ys ON xs.y_id = ys.id")
    }
    
    var total int64
    query.Count(&total)
    
    var results []models.X
    err := query.Offset((f.Page-1)*f.Limit).Limit(f.Limit).Find(&results).Error
    
    return results, total, err
}
```

## Testing Strategy

After each service:
1. Run `go build ./...` to verify compilation
2. Check handler is thin (~50-150 lines)
3. Verify service has all business logic
4. Confirm repository has all queries
5. Test routes wire correctly

## Estimated Effort

- **Phase 1** (COMPLETED): 4 services - ✅ DONE
- **Phase 2** (ResultService + ClinicService): 2 services - ~8-12 hours
- **Phase 3** (StaffService + LibraryService + ClassRankingService): 3 services - ~6-8 hours
- **Phase 4** (FinanceService + BudgetService + FeesService): 3 services - ~6-8 hours
- **Phase 5** (UserService + SchoolService + remaining): ~20 services - ~15-20 hours

**Total Remaining**: ~35-48 hours of focused work

## Benefits Achieved So Far

1. ✅ Handlers are thin and readable
2. ✅ Business logic is testable
3. ✅ Services are reusable
4. ✅ Clear separation of concerns
5. ✅ Consistent patterns across codebase

## Next Immediate Action

Start with **ResultService** as it's the most complex and critical for the academic system.

File to create: `internal/services/result_service.go` (~800-1000 lines)
File to enhance: `internal/repositories/subject_result_repository.go` (add ~15 methods)
File to refactor: `internal/handlers/result_handler.go` (reduce from 1123 to ~200 lines)
