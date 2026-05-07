# Bulk Import for Advanced Level - Implementation Summary

## Overview
Updated bulk marks import to support Advanced Level (S5/S6) paper-based grading system, matching the manual mark entry functionality.

## Changes Made

### 1. Backend Service (`bulk_marks_import_service.go`)

#### Updated MarkRow Structure
```go
type MarkRow struct {
    StudentID   string  `json:"student_id"`
    AdmissionNo string  `json:"admission_no"`
    StudentName string  `json:"student_name"`
    CA          float64 `json:"ca"`          // For P1-P7, S1-S4
    Exam        float64 `json:"exam"`        // For P1-P7, S1-S4
    Mark        float64 `json:"mark"`        // For S5-S6
    Paper       int     `json:"paper"`       // For S5-S6
}
```

#### ProcessExcelUpload Method
- Added `paper int` parameter
- Detects if class is Advanced Level (S5/S6)
- Passes `isAdvanced` and `paper` to parser

#### parseExcelFile Method
- Accepts `isAdvanced bool` and `paper int` parameters
- **For Advanced Level:**
  - Expects 3 columns: `admission_no`, `student_name`, `mark`
  - Stores mark and paper number
- **For Other Levels:**
  - Expects 4 columns: `admission_no`, `student_name`, `ca`, `exam`
  - Stores CA and exam marks

#### ProcessMarksImport Method
- Detects class level
- **For Advanced Level:**
  - Creates raw_marks with `{"mark": value, "paper": number}`
  - Sets `paper` column in SubjectResult
- **For Other Levels:**
  - Creates raw_marks with `{"ca": value, "exam": value}`
  - No paper column

#### GenerateTemplate Method
- Detects class level
- **For Advanced Level:** Generates template with columns: `admission_no`, `student_name`, `mark`
- **For Other Levels:** Generates template with columns: `admission_no`, `student_name`, `ca`, `exam`

### 2. Backend Repository (`bulk_marks_import_repository.go`)

#### Added Method
```go
FindClassByID(classID uuid.UUID) (*models.Class, error)
```
- Retrieves class information to determine level
- Used to check if class is S5 or S6

### 3. Backend Handler (`bulk_marks_import_handler.go`)

#### UploadMarksForApproval Method
- Added paper parameter extraction: `paperStr := c.DefaultPostForm("paper", "0")`
- Passes paper number to service: `ProcessExcelUpload(..., paper)`

### 4. Frontend Integration

The frontend (`/marks/enter/page.tsx`) already:
- Shows paper selector for Advanced Level subjects with multiple papers
- Sends paper parameter in bulk upload FormData
- Validates paper selection before allowing upload

## Grading Logic Alignment

### Manual Entry
```go
rawMarks = { mark: studentMarks.mark || 0, paper: parseInt(paperNumber) }
```

### Bulk Import (Now Matches)
```go
rawMarks = models.JSONB{
    "mark":  mark.Mark,
    "paper": mark.Paper,
}
paper = mark.Paper
```

## Excel Template Formats

### Advanced Level (S5-S6)
```
| admission_no | student_name | mark |
|--------------|--------------|------|
| STD001       | John Doe     | 88   |
| STD002       | Jane Smith   | 77   |
```

### Other Levels (P1-P7, S1-S4, Nursery)
```
| admission_no | student_name | ca | exam |
|--------------|--------------|-----|------|
| STD001       | John Doe     | 15  | 65   |
| STD002       | Jane Smith   | 18  | 72   |
```

## Usage for Advanced Level

1. Navigate to "Import Marks"
2. Select Year, Term, Class (S5 or S6), Exam Type
3. Select Subject
4. **Select Paper Number** (1, 2, 3, or 4) - Required for multi-paper subjects
5. Download template (shows 3 columns: admission_no, student_name, mark)
6. Fill in marks (out of 100)
7. Upload file
8. System stores marks with paper number
9. Grading follows same logic as manual entry:
   - Subsidiary subjects (1 paper): Pass if mark ≥50% (code ≤7)
   - Principal subjects (2-4 papers): Aggregated grading after all papers entered

## Key Benefits

✅ Consistent mark storage between manual and bulk import
✅ Paper numbers properly tracked
✅ Subsidiary vs Principal subject logic maintained
✅ Template format adapts to class level
✅ Grading calculations identical to manual entry
✅ Supports all Advanced Level scenarios (1-4 papers)

## Testing Checklist

- [ ] Upload marks for S6 subsidiary subject (General Paper)
- [ ] Upload marks for S6 principal subject Paper 1 (Biology)
- [ ] Upload marks for S6 principal subject Paper 2 (Biology)
- [ ] Verify grades calculated correctly
- [ ] Verify paper numbers stored correctly
- [ ] Download template for S6 class (should show 3 columns)
- [ ] Download template for P7 class (should show 4 columns)
- [ ] Verify marks display correctly on results page
- [ ] Verify marks display correctly on report cards
