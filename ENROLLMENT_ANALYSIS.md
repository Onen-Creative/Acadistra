# Enrollment Logic Analysis

## Current State: ENROLLMENTS ARE TERMLY ❌

### Evidence

**1. Enrollment Model (models.go:145-158)**
```go
type Enrollment struct {
    BaseModel
    StudentID  uuid.UUID  `json:"student_id"`
    ClassID    uuid.UUID  `json:"class_id"`
    Year       int        `json:"year"`
    Term       string     `json:"term"`  // ❌ TERMLY
    Status     string     `json:"status"`
    EnrolledOn time.Time  `json:"enrolled_on"`
    LeftOn     *time.Time `json:"left_on,omitempty"`
}
```

**2. Student Service (student_service.go:223)**
```go
newEnrollment := models.Enrollment{
    StudentID:  sid,
    ClassID:    classUUID,
    Year:       year,
    Term:       term,      // ❌ REQUIRES TERM
    Status:     "active",
    EnrolledOn: time.Now(),
}
```

**3. Registration Service (registration_service.go:198)**
```go
enrollment := &models.Enrollment{
    ClassID:    class.ID,
    Year:       req.Year,
    Term:       req.Term,  // ❌ REQUIRES TERM
    Status:     "active",
    EnrolledOn: time.Now(),
}
```

**4. Bulk Import Service (bulk_import_xlsx_service.go:1029)**
```go
enrollment := models.Enrollment{
    ...
    Term:       "1",  // ❌ HARDCODED TO TERM 1
    ...
}
```

## The Problem

**Classes are yearly but enrollments are termly** → Inconsistent system!

### Current Behavior:
1. Create class: P1 Blue 2024 (yearly) ✅
2. Enroll student for Term 1 ❌
3. Want to see students in Term 2? None exist! ❌
4. Must manually enroll same students for Terms 2 & 3 ❌

This defeats the purpose of yearly classes!

## What Should Happen

### Option 1: Yearly Enrollments (Recommended)
**Enroll once per year, same as classes**

```go
type Enrollment struct {
    StudentID  uuid.UUID
    ClassID    uuid.UUID
    Year       int        // No term field
    Status     string
    EnrolledOn time.Time
}
```

**Benefits:**
- ✅ Consistent with yearly classes
- ✅ Students stay in same class all year
- ✅ Enroll once, visible all terms
- ✅ Simple and clean

**What needs term:**
- Marks/Results - filter by term when displaying
- Attendance - track per term via date
- Reports - generate per term

### Option 2: Keep Termly Enrollments (Current)
**Keep term field, auto-create for all terms**

**Drawbacks:**
- ❌ Still requires 3x enrollment records
- ❌ More complex data
- ❌ Manual script needed to propagate to all terms

## Recommendation

**Remove Term from Enrollments** to match the yearly class system.

### Changes Needed:

1. **Migration:** Remove `term` column from enrollments table
2. **Model:** Remove Term field from Enrollment struct
3. **Services:** Update all enrollment creation (3 places found)
4. **Queries:** Remove term filters from enrollment queries
5. **Frontend:** Remove term from enrollment forms

### Impact:
- Marks, attendance, reports already have term - no issue ✅
- Students enrolled once per year, visible all terms ✅
- Simpler data model ✅
- Consistent with yearly classes ✅

## Current Workaround

If you want to keep the current system, run this script to make students available for all terms:

```bash
./enroll_students_all_terms.sh
```

This copies all Term 1 enrollments to Terms 2 & 3.

**But this is a workaround, not a solution!** It treats the symptom, not the cause.

## Decision Needed

Do you want me to:
- **A) Make enrollments yearly** (remove term field completely)
- **B) Keep enrollments termly** (use the workaround script)

Option A is recommended for consistency and simplicity.
