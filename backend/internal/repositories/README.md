# Repository Layer - Phase 2 Implementation

## Overview
This directory contains the repository layer that abstracts database operations from handlers. Repositories provide a clean interface for data access and make the code more testable and maintainable.

## Architecture

```
internal/repositories/
├── base_repository.go              # Common CRUD operations
├── student_repository.go           # Student data access
├── class_repository.go             # Class data access
├── guardian_repository.go          # Guardian data access
├── subject_result_repository.go    # Marks/grades data access
├── staff_repository.go             # Staff/teacher data access
└── README.md                       # This file
```

## Design Pattern

### Repository Pattern Benefits:
1. **Separation of Concerns**: Database logic separated from business logic
2. **Testability**: Easy to mock repositories for unit testing
3. **Maintainability**: Changes to database queries in one place
4. **Reusability**: Same repository methods used across handlers
5. **Type Safety**: Strongly typed interfaces

### Interface-Based Design:
Each repository has an interface defining its contract:
```go
type StudentRepository interface {
    BaseRepository
    FindBySchoolID(schoolID uuid.UUID, page, limit int) ([]models.Student, int64, error)
    FindByClassID(classID uuid.UUID) ([]models.Student, error)
    // ... more methods
}
```

## Repository Structure

### Base Repository
Provides common CRUD operations inherited by all repositories:
- `Create(entity)` - Insert new record
- `Update(entity)` - Update existing record
- `Delete(id)` - Soft delete record
- `FindByID(id, entity)` - Find by primary key
- `FindAll(entities, conditions)` - Find with optional conditions
- `Count(model, conditions)` - Count records

### Domain-Specific Repositories

#### StudentRepository
- Student CRUD operations
- Search and pagination
- Find by school, class, admission number
- Find with related guardians

#### ClassRepository
- Class CRUD operations
- Find by school, year, term, level
- Find with student counts
- Update teacher assignments

#### GuardianRepository
- Guardian CRUD operations
- Find by student, email, phone
- Bulk operations for student guardians

#### SubjectResultRepository
- Marks/grades CRUD operations
- Find by student, class, subject
- Bulk create for imports
- Grade recalculation support

#### StaffRepository
- Staff CRUD operations
- Find by role (Teacher, Admin, etc.)
- Search and pagination
- Count by role

## Usage Examples

### In Handlers (Current - Direct DB Access)
```go
// OLD WAY - Handler directly uses GORM
func (h *StudentHandler) GetStudent(c *gin.Context) {
    var student models.Student
    if err := h.db.First(&student, c.Param("id")).Error; err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    c.JSON(200, student)
}
```

### With Repository (New - Clean Separation)
```go
// NEW WAY - Handler uses repository
func (h *StudentHandler) GetStudent(c *gin.Context) {
    id, _ := uuid.Parse(c.Param("id"))
    var student models.Student
    if err := h.studentRepo.FindByID(id, &student); err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    c.JSON(200, student)
}
```

### Complex Queries
```go
// Find students with pagination
students, total, err := studentRepo.FindBySchoolID(schoolID, page, limit)

// Search students
students, total, err := studentRepo.Search(schoolID, "John", 1, 20)

// Find class with student count
classes, err := classRepo.FindWithStudentCount(schoolID)

// Find results by student
results, err := resultRepo.FindByStudent(studentID, "Term 1", 2026, "EOT")
```

## Implementation Strategy

### Phase 2A: Create Repositories (DONE ✅)
- [x] Create base repository
- [x] Create student repository
- [x] Create class repository
- [x] Create guardian repository
- [x] Create subject result repository
- [x] Create staff repository

### Phase 2B: Update Handlers (NEXT)
Gradually migrate handlers to use repositories:

1. **Start with simple handlers** (low risk):
   - Student handler
   - Class handler
   - Guardian handler

2. **Then complex handlers** (medium risk):
   - Result handler
   - Staff handler
   - Attendance handler

3. **Keep old code temporarily**:
   - Add repository alongside existing DB calls
   - Test thoroughly
   - Remove old code once stable

### Phase 2C: Testing
- Unit tests for each repository
- Integration tests for handlers
- Performance testing

## Migration Guide

### Step 1: Add Repository to Handler
```go
type StudentHandler struct {
    db          *gorm.DB           // Keep temporarily
    studentRepo repositories.StudentRepository  // Add new
}

func NewStudentHandler(db *gorm.DB, studentRepo repositories.StudentRepository) *StudentHandler {
    return &StudentHandler{
        db:          db,
        studentRepo: studentRepo,
    }
}
```

### Step 2: Update Methods Gradually
```go
func (h *StudentHandler) List(c *gin.Context) {
    // NEW: Use repository
    students, total, err := h.studentRepo.FindBySchoolID(schoolID, page, limit)
    
    // OLD: Direct DB (remove after testing)
    // var students []models.Student
    // h.db.Where("school_id = ?", schoolID).Find(&students)
    
    c.JSON(200, gin.H{"students": students, "total": total})
}
```

### Step 3: Remove Old Code
After thorough testing, remove direct DB access:
```go
type StudentHandler struct {
    studentRepo repositories.StudentRepository  // Only repository
}
```

## Testing

### Unit Test Example
```go
func TestStudentRepository_FindBySchoolID(t *testing.T) {
    // Setup test database
    db := setupTestDB()
    repo := repositories.NewStudentRepository(db)
    
    // Create test data
    schoolID := uuid.New()
    student := models.Student{
        SchoolID: schoolID,
        FirstName: "John",
        LastName: "Doe",
    }
    repo.Create(&student)
    
    // Test
    students, total, err := repo.FindBySchoolID(schoolID, 1, 10)
    
    // Assert
    assert.NoError(t, err)
    assert.Equal(t, int64(1), total)
    assert.Equal(t, "John", students[0].FirstName)
}
```

### Mock Repository for Handler Tests
```go
type MockStudentRepository struct {
    mock.Mock
}

func (m *MockStudentRepository) FindByID(id uuid.UUID, entity interface{}) error {
    args := m.Called(id, entity)
    return args.Error(0)
}

// Use in handler tests
mockRepo := new(MockStudentRepository)
handler := NewStudentHandler(nil, mockRepo)
```

## Performance Considerations

### Pagination
All list methods support pagination to avoid loading large datasets:
```go
students, total, err := repo.FindBySchoolID(schoolID, page, limit)
```

### Eager Loading
Use GORM's Preload for related data:
```go
func (r *studentRepository) FindWithEnrollment(id uuid.UUID) (*models.Student, error) {
    var student models.Student
    err := r.db.Preload("Enrollments").First(&student, id).Error
    return &student, err
}
```

### Caching (Future)
Repositories can be enhanced with caching:
```go
func (r *studentRepository) FindByID(id uuid.UUID, entity interface{}) error {
    // Check cache first
    if cached := r.cache.Get(id); cached != nil {
        return nil
    }
    
    // Query database
    err := r.db.First(entity, id).Error
    
    // Cache result
    r.cache.Set(id, entity)
    
    return err
}
```

## Best Practices

### 1. Keep Repositories Focused
Each repository handles one entity and its direct relationships.

### 2. Return Errors, Don't Handle Them
Let handlers decide how to handle errors:
```go
// GOOD
func (r *studentRepository) FindByID(id uuid.UUID) (*models.Student, error) {
    var student models.Student
    err := r.db.First(&student, id).Error
    return &student, err  // Return error to caller
}

// BAD
func (r *studentRepository) FindByID(id uuid.UUID) *models.Student {
    var student models.Student
    if err := r.db.First(&student, id).Error; err != nil {
        log.Fatal(err)  // Don't handle errors in repository
    }
    return &student
}
```

### 3. Use Transactions for Multi-Step Operations
```go
func (r *studentRepository) CreateWithGuardians(student *models.Student, guardians []models.Guardian) error {
    return r.db.Transaction(func(tx *gorm.DB) error {
        if err := tx.Create(student).Error; err != nil {
            return err
        }
        
        for i := range guardians {
            guardians[i].StudentID = student.ID
        }
        
        if err := tx.Create(&guardians).Error; err != nil {
            return err
        }
        
        return nil
    })
}
```

### 4. Use Interfaces for Flexibility
Always define interfaces for repositories to enable mocking and testing.

## Next Steps

1. **Create remaining repositories** for other entities:
   - Attendance
   - Fees
   - Library
   - Clinic
   - Finance

2. **Update handlers** to use repositories (one at a time)

3. **Write tests** for repositories and updated handlers

4. **Monitor performance** and optimize queries

5. **Remove old DB access code** after thorough testing

## Rollback Plan

If issues arise:
1. Handlers still have direct DB access (temporarily)
2. Can switch back by using `h.db` instead of `h.repo`
3. No database schema changes
4. No API changes

## Support

For questions or issues:
- Review this README
- Check existing repository implementations
- Test thoroughly before deploying
- Keep old code until stable

---

**Status**: Phase 2A Complete ✅  
**Next**: Phase 2B - Update Handlers  
**Risk**: Low (repositories alongside existing code)
