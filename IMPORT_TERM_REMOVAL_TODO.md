# ⚠️ Additional Frontend Updates Needed

## Import Students Feature

The **Import Students** feature in `frontend/src/app/students/page.tsx` still has term selection.

### Current Flow:
```
Step 1: Select Context
├─ Academic Year: [2026]
├─ Term: [Term 1]  ← Should be removed
└─ Class: [Select class]
```

### What Needs Changing:

1. **Remove Term Selection** (Line ~1031)
   - Remove the Term dropdown from the import modal
   - Remove `importTerm` state variable (Line 59)
   - Remove term from template download URL (Line 334)
   - Remove term from modal reset (Lines 1015, 1205)

2. **Update Template Download**
   ```javascript
   // Before:
   const res = await fetch(`...?year=${importYear}&term=${importTerm}&class_id=${importClass}`)
   
   // After:
   const res = await fetch(`...?year=${importYear}&class_id=${importClass}`)
   ```

3. **Update Context Display** (Line ~1060)
   ```javascript
   // Before:
   Year: {importYear} | Term: {importTerm} | Class: {...}
   
   // After:
   Year: {importYear} | Class: {...}
   ```

---

## Backend Template Endpoint

The backend endpoint `/api/v1/import/templates/students` likely expects `term` parameter.

**Check:** `backend/internal/handlers/import_handler.go` or similar file

**Update:** Remove term parameter from template generation

---

## Student List Filters

The main student list page has term filter for viewing students (Lines ~575-582).

### Decision Needed:

**Option A: Keep term filter for viewing** 
- Useful for seeing which students have marks/attendance for specific term
- Even though enrollments are yearly, some transactional queries use term

**Option B: Remove term filter**
- More consistent with yearly enrollment model
- Simpler UX

**Recommendation:** Keep term filter for now - it's used for filtering marks/attendance, not enrollment.

---

## Summary of Files Still Needing Updates:

| File | Lines | Changes Needed |
|------|-------|----------------|
| `frontend/src/app/students/page.tsx` | 59, 334, 1015, 1031-1034, 1060, 1205 | Remove term from import flow |
| `backend/internal/handlers/import_handler.go` | TBD | Remove term from template params |

---

## Quick Fix for Frontend:

```typescript
// Remove these lines from students/page.tsx:

// Line 59: Remove state
const [importTerm, setImportTerm] = useState('Term 1')  // DELETE

// Line 334: Update URL
const res = await fetch(`${...}/students?year=${importYear}&class_id=${importClass}&token=${token}`)  // Remove &term=${importTerm}

// Lines 1031-1034: Remove dropdown
<Select
  label="Term"
  // ... DELETE THIS WHOLE SELECT COMPONENT
/>

// Line 1060: Update display
<Text>Year: {importYear} | Class: {...}</Text>  // Remove | Term: {importTerm}

// Lines 1015, 1205: Remove from reset
setImportTerm('Term 1')  // DELETE
```

---

**Status:** Frontend import flow needs term removal (estimated 10-minute fix)
