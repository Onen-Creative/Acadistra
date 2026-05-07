# Subscription System - Repository Pattern Implementation

## Overview
Refactored the subscription system to follow the repository pattern used throughout the Acadistra backend.

---

## Why Repository Pattern?

### Benefits:
1. **Separation of Concerns** - Business logic (service) separated from data access (repository)
2. **Testability** - Easy to mock repositories for unit testing
3. **Maintainability** - Changes to database queries don't affect business logic
4. **Consistency** - Follows the same pattern as all other modules in the project
5. **Reusability** - Repository methods can be reused across services

### Before (Direct DB Access):
```go
type SubscriptionService struct {
    db *gorm.DB
}

func (s *SubscriptionService) GetAllModules() ([]models.Module, error) {
    var modules []models.Module
    err := s.db.Where("is_active = ?", true).Find(&modules).Error
    return modules, err
}
```

### After (Repository Pattern):
```go
type SubscriptionService struct {
    repo repositories.SubscriptionRepository
    db   *gorm.DB
}

func (s *SubscriptionService) GetAllModules() ([]models.Module, error) {
    return s.repo.GetAllModules()
}
```

---

## Files Created/Modified

### 1. ✅ Created: `subscription_repository.go`

**Location**: `/internal/repositories/subscription_repository.go`

**Interface**:
```go
type SubscriptionRepository interface {
    // Module operations
    GetAllModules() ([]models.Module, error)
    GetModuleByCode(code string) (*models.Module, error)
    
    // Subscription operations
    GetActiveModules(schoolID uuid.UUID) ([]models.Module, error)
    GetActiveSubscriptions(schoolID uuid.UUID) ([]models.SchoolSubscription, error)
    HasModuleAccess(schoolID uuid.UUID, moduleCode string) (bool, error)
    
    // Update operations
    ActivateModule(schoolID uuid.UUID, moduleCode string, startDate time.Time) error
    DeactivateModule(schoolID uuid.UUID, moduleCode string, endDate time.Time) error
    DeactivateAllModules(schoolID uuid.UUID, endDate time.Time) error
    UpsertSubscription(subscription *models.SchoolSubscription) error
}
```

**Methods**:
- `GetAllModules()` - Returns all active modules
- `GetModuleByCode()` - Returns a specific module
- `GetActiveModules()` - Returns active modules for a school
- `GetActiveSubscriptions()` - Returns active subscriptions with module details
- `HasModuleAccess()` - Checks if school has access to a module
- `ActivateModule()` - Activates a module for a school
- `DeactivateModule()` - Deactivates a specific module
- `DeactivateAllModules()` - Deactivates all modules for a school
- `UpsertSubscription()` - Creates or updates a subscription

---

### 2. ✅ Modified: `subscription_service.go`

**Changes**:
- Added `repo` field of type `SubscriptionRepository`
- Updated constructor to accept repository
- Refactored all methods to use repository instead of direct DB access
- Kept `db` field for transaction support

**Constructor**:
```go
func NewSubscriptionService(repo repositories.SubscriptionRepository, db *gorm.DB) *SubscriptionService {
    return &SubscriptionService{
        repo: repo,
        db:   db,
    }
}
```

**Service Methods** (now delegate to repository):
- `GetAllModules()` → `repo.GetAllModules()`
- `GetActiveModules()` → `repo.GetActiveModules()`
- `HasModuleAccess()` → `repo.HasModuleAccess()`
- `ActivateModules()` → Uses `repo.ActivateModule()` in transaction
- `UpdateModules()` → Uses `repo.DeactivateAllModules()` + `repo.ActivateModule()`

---

### 3. ✅ Modified: `routes.go`

**Added Factory Function**:
```go
func newSubscriptionService(deps *Dependencies) *services.SubscriptionService {
    return services.NewSubscriptionService(
        repositories.NewSubscriptionRepository(deps.DB),
        deps.DB,
    )
}
```

---

### 4. ✅ Modified: `protected_routes.go`

**Added Routes**:
```go
// Modules and subscriptions
sysAdmin.GET("/modules", subscriptionHandler.GetAllModules)
sysAdmin.PUT("/subscriptions/school/:school_id", subscriptionHandler.UpdateSchoolModules)
sysAdmin.GET("/subscriptions/school/:school_id/modules", subscriptionHandler.GetSchoolModules)
```

---

### 5. ✅ Modified: `subscription_handler.go`

**Added Method**:
```go
func (h *SubscriptionHandler) GetSchoolModules(c *gin.Context) {
    schoolID := c.Param("school_id")
    // Returns module codes for a school
}
```

**Updated Method**:
```go
func (h *SubscriptionHandler) UpdateSchoolModules(c *gin.Context) {
    schoolID := c.Param("school_id") // Now from URL param
    // Updates modules for a school
}
```

---

### 6. ✅ Modified: `school_handler.go`

**Fixed Constructor Calls**:
```go
// Before
subscriptionService := services.NewSubscriptionService(h.service.GetDB())

// After
subscriptionService := services.NewSubscriptionService(
    repositories.NewSubscriptionRepository(h.service.GetDB()),
    h.service.GetDB(),
)
```

**Added Import**:
```go
import "github.com/school-system/backend/internal/repositories"
```

---

## API Endpoints

### 1. Get All Modules
```
GET /api/v1/modules
Authorization: Bearer <token>
Role: system_admin

Response:
[
  {
    "id": "uuid",
    "code": "academic",
    "name": "Academic Management",
    "description": "Student enrollment, classes, marks, report cards, grading",
    "is_active": true
  },
  ...
]
```

### 2. Get School Modules
```
GET /api/v1/subscriptions/school/:school_id/modules
Authorization: Bearer <token>
Role: system_admin

Response:
{
  "module_codes": ["academic", "finance", "hr", "library"]
}
```

### 3. Update School Modules
```
PUT /api/v1/subscriptions/school/:school_id
Authorization: Bearer <token>
Role: system_admin

Body:
{
  "module_codes": ["academic", "finance", "hr", "library", "clinic"]
}

Response:
{
  "message": "Modules updated successfully"
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Handler Layer                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │         SubscriptionHandler                        │ │
│  │  - GetAllModules()                                 │ │
│  │  - GetSchoolModules()                              │ │
│  │  - UpdateSchoolModules()                           │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Service Layer                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │         SubscriptionService                        │ │
│  │  - GetAllModules()                                 │ │
│  │  - GetActiveModules()                              │ │
│  │  - ActivateModules()                               │ │
│  │  - UpdateModules()                                 │ │
│  │  - HasModuleAccess()                               │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Repository Layer                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │       SubscriptionRepository                       │ │
│  │  - GetAllModules()                                 │ │
│  │  - GetActiveModules()                              │ │
│  │  - ActivateModule()                                │ │
│  │  - DeactivateModule()                              │ │
│  │  - DeactivateAllModules()                          │ │
│  │  - HasModuleAccess()                               │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Database Layer                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │              GORM + PostgreSQL                     │ │
│  │  - modules table                                   │ │
│  │  - school_subscriptions table                      │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema

### modules table
```sql
CREATE TABLE modules (
    id CHAR(36) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);
```

### school_subscriptions table
```sql
CREATE TABLE school_subscriptions (
    id CHAR(36) PRIMARY KEY,
    school_id CHAR(36) NOT NULL,
    module_code VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (module_code) REFERENCES modules(code),
    UNIQUE (school_id, module_code, deleted_at)
);
```

---

## Testing

### Unit Testing (Example)
```go
func TestSubscriptionService_GetAllModules(t *testing.T) {
    // Mock repository
    mockRepo := &MockSubscriptionRepository{
        GetAllModulesFunc: func() ([]models.Module, error) {
            return []models.Module{
                {Code: "academic", Name: "Academic Management"},
                {Code: "finance", Name: "Finance Management"},
            }, nil
        },
    }
    
    // Create service with mock
    service := services.NewSubscriptionService(mockRepo, nil)
    
    // Test
    modules, err := service.GetAllModules()
    assert.NoError(t, err)
    assert.Len(t, modules, 2)
}
```

---

## Benefits Achieved

### ✅ Consistency
- Follows same pattern as all other modules (students, classes, fees, etc.)
- Easier for developers to understand and maintain

### ✅ Testability
- Can mock repository for unit tests
- No need for database in unit tests
- Faster test execution

### ✅ Maintainability
- Database queries isolated in repository
- Business logic isolated in service
- Changes to queries don't affect business logic

### ✅ Reusability
- Repository methods can be used by multiple services
- Common operations centralized

### ✅ Single Responsibility
- Repository: Data access
- Service: Business logic
- Handler: HTTP handling

---

## Comparison with Other Modules

### Student Module (Example)
```go
// Repository
type StudentRepository interface {
    Create(student *models.Student) error
    FindByID(id uuid.UUID) (*models.Student, error)
    // ...
}

// Service
type StudentService struct {
    repo repositories.StudentRepository
    db   *gorm.DB
}
```

### Subscription Module (Now)
```go
// Repository
type SubscriptionRepository interface {
    GetAllModules() ([]models.Module, error)
    GetActiveModules(schoolID uuid.UUID) ([]models.Module, error)
    // ...
}

// Service
type SubscriptionService struct {
    repo repositories.SubscriptionRepository
    db   *gorm.DB
}
```

**Same Pattern** ✅

---

## Summary

✅ **Repository Created**: `subscription_repository.go` with 8 methods
✅ **Service Refactored**: Now uses repository instead of direct DB access
✅ **Routes Added**: 3 new endpoints for module management
✅ **Handler Updated**: New method for getting school modules
✅ **School Handler Fixed**: Updated to use new constructor
✅ **Pattern Consistency**: Matches all other modules in the project

**Result**: Clean, testable, maintainable code following established patterns.

---

**Date**: 2025-05-05  
**Status**: ✅ Complete  
**Pattern**: Repository Pattern
