# Yearly Classes - Quick Reference Card

## 🎯 Key Concept
**Classes = Yearly | Enrollments = Per Term**

One class for the whole year, students enrolled per term.

---

## 📦 Class Model (YEARLY)

```go
type Class struct {
    ID        uuid.UUID
    SchoolID  uuid.UUID
    Name      string    // "P1 Blue"
    Level     string    // "P1"
    Stream    string    // "Blue"
    Year      int       // 2024
    Capacity  int       // 30
    // NO TERM FIELD ❌
}
```

**Unique Constraint**: `(school_id, level, stream, year)`

---

## 📝 Enrollment Model (PER TERM)

```go
type Enrollment struct {
    ID         uuid.UUID
    StudentID  uuid.UUID
    ClassID    uuid.UUID  // → Yearly class
    Year       int        // 2024
    Term       string     // "1", "2", "3"
    Status     string     // "active"
    EnrolledOn time.Time
}
```

**Unique Constraint**: `(student_id, class_id, year, term)`

---

## 🔧 Common Operations

### Create Class (Once per year)
```bash
POST /api/classes
{
  "school_id": "abc-123",
  "level": "P1",
  "stream": "Blue",
  "year": 2024,
  "capacity": 35
}
```

### Enroll Student (Per term)
```bash
POST /api/enrollments
{
  "student_id": "def-456",
  "class_id": "abc-123",  # Yearly class
  "year": 2024,
  "term": "1"            # Specific term
}
```

### Get Class Students (Filtered by term)
```bash
GET /api/classes/{id}/students?term=1
# Returns students enrolled in term 1
```

### List Classes
```bash
GET /api/classes?year=2024&level=P1
# Term parameter ignored for class lookup
```

---

## 📅 Timeline Example

### January 2024 (Start of Year)
```
CREATE CLASS: P1 Blue (year=2024)
└─ Used for all three terms
```

### Term 1 (Jan-Apr)
```
ENROLL: 30 students in P1 Blue (term=1)
```

### Term 2 (May-Aug)
```
ENROLL: Same 30 students in P1 Blue (term=2)
└─ Same class, new enrollment records
```

### Term 3 (Sep-Dec)
```
ENROLL: Same 30 students in P1 Blue (term=3)
```

### January 2025 (New Year)
```
CREATE CLASS: P2 Blue (year=2025)
MOVE: P1 Blue students → P2 Blue
```

---

## 🔍 Database Queries

### All students in a class (all terms)
```sql
SELECT s.* FROM students s
JOIN enrollments e ON e.student_id = s.id
WHERE e.class_id = 'class-uuid'
  AND e.status = 'active';
```

### Students in specific term
```sql
SELECT s.* FROM students s
JOIN enrollments e ON e.student_id = s.id
WHERE e.class_id = 'class-uuid'
  AND e.term = '1'
  AND e.status = 'active';
```

### Count students per term
```sql
SELECT term, COUNT(*) FROM enrollments
WHERE class_id = 'class-uuid'
  AND status = 'active'
GROUP BY term;
```

---

## ⚠️ Common Mistakes

### ❌ DON'T: Create class per term
```go
// WRONG
CreateClass("P1 Blue", year=2024, term="1")
CreateClass("P1 Blue", year=2024, term="2")
CreateClass("P1 Blue", year=2024, term="3")
```

### ✅ DO: Create once, enroll per term
```go
// CORRECT
classID := CreateClass("P1 Blue", year=2024)
EnrollStudent(studentID, classID, term="1")
EnrollStudent(studentID, classID, term="2")
EnrollStudent(studentID, classID, term="3")
```

---

## 🧪 Testing Checklist

- [ ] Create class without term
- [ ] Duplicate check prevents same level/stream/year
- [ ] Enroll student for Term 1
- [ ] Enroll same student for Term 2 (same class)
- [ ] Filter students by term
- [ ] Student progression P1→P2 across years
- [ ] Mid-year transfer between classes

---

## 📚 Documentation Files

- **CLASS_YEARLY_SYSTEM.md** - Full documentation
- **CLASSES_YEARLY_IMPLEMENTATION.md** - Implementation details
- **scripts/test_yearly_classes.sh** - Test script
- **migrations/20260702000000_make_classes_yearly.sql** - DB migration

---

## 🚀 Migration Command

```bash
# Run migration
docker exec acadistra_backend ./main migrate

# Or manually
psql -f migrations/20260702000000_make_classes_yearly.sql
```

---

## 💡 Benefits

1. ✅ **Consistency** - Same classmates all year
2. ✅ **Simplicity** - Create once, not 3x
3. ✅ **Natural Flow** - P1→P2→P3 progression
4. ✅ **Analytics** - Year-long comparisons
5. ✅ **Less Data** - No duplication

---

**Questions?** Check CLASS_YEARLY_SYSTEM.md for details.
