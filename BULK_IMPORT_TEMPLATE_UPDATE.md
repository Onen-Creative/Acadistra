# Bulk Import Template Enhancement

## Overview
Updated bulk marks import Excel template to display comprehensive metadata including school name, year, term, class, subject, exam type, and paper number (for Advanced Level).

## Changes Made

### 1. Backend Service (`bulk_marks_import_service.go`)

#### GenerateTemplate Method - Enhanced Header
```go
func (s *BulkMarksImportService) GenerateTemplate(classID, schoolID, year, term, subjectID, examType, paper string)
```

**Template Structure:**
```
Row 1: [School Name] (merged across columns)
Row 2: MARKS IMPORT TEMPLATE (merged across columns)
Row 4: Year: 2026
Row 5: Term: Term 1
Row 6: Class: S6 A
Row 7: Subject: Biology
Row 8: Exam Type: EOT
Row 9: Paper: 1 (only for Advanced Level with paper > 0)
Row 10+: Column headers and student data
```

**Column Headers by Level:**
- **Advanced Level (S5-S6)**: `admission_no | student_name | mark`
- **Ordinary Level (S1-S4)**: `admission_no | student_name | aoi | exam`
- **Primary (P1-P7)**: `admission_no | student_name | ca | exam`
- **Nursery**: `admission_no | student_name | ca | exam`

**Styling:**
- School name: Bold, 16pt, centered
- Template title: Bold, 14pt, centered
- Metadata labels: Bold
- Column headers: Bold, white text, blue background
- Auto-width columns for readability

### 2. Backend Handler (`bulk_marks_import_handler.go`)

#### DownloadTemplate Method
```go
func (h *BulkMarksImportHandler) DownloadTemplate(c *gin.Context) {
    classID := c.Query("class_id")
    schoolID := c.GetString("tenant_school_id")
    year := c.Query("year")
    term := c.Query("term")
    subjectID := c.Query("subject_id")
    examType := c.Query("exam_type")
    paper := c.Query("paper")
    
    f, err := h.service.GenerateTemplate(classID, schoolID, year, term, subjectID, examType, paper)
    // ...
}
```

### 3. Backend Repository (`bulk_marks_import_repository.go`)

#### New Methods
```go
FindSchoolByID(schoolID uuid.UUID) (*models.School, error)
FindSubjectByID(subjectID uuid.UUID) (*models.StandardSubject, error)
```

### 4. Frontend (`marks/enter/page.tsx`)

#### Template Download
- Changed from `/api/v1/marks/exam-template` to `/api/v1/marks/import-template`
- Passes all required parameters: `class_id`, `subject_id`, `year`, `term`, `exam_type`, `paper`
- Removed import type selection (CA vs Exam) - this page is for exam marks only
- AOI marks have their own dedicated page

#### Updated Instructions
```tsx
<li>Download the Excel template (pre-filled with school, class, subject info)</li>
<li>For S1-S4 AOI marks, use the AOI Marks Entry page</li>
```

## Template Examples

### Advanced Level (S6 Biology Paper 1)
```
┌─────────────────────────────────────────┐
│     Tanna Memorial High School          │
│     MARKS IMPORT TEMPLATE                │
│                                          │
│ Year:       2026                         │
│ Term:       Term 1                       │
│ Class:      S6 A                         │
│ Subject:    Biology                      │
│ Exam Type:  EOT                          │
│ Paper:      1                            │
│                                          │
│ admission_no | student_name | mark      │
├──────────────┼──────────────┼──────────┤
│ STD001       | John Doe     | 88       │
│ STD002       | Jane Smith   | 77       │
└─────────────────────────────────────────┘
```

### Ordinary Level (S3 Mathematics)
```
┌─────────────────────────────────────────────────┐
│     Tanna Memorial High School                  │
│     MARKS IMPORT TEMPLATE                       │
│                                                  │
│ Year:       2026                                │
│ Term:       Term 1                              │
│ Class:      S3 A                                │
│ Subject:    Mathematics                         │
│ Exam Type:  EOT                                 │
│                                                  │
│ admission_no | student_name | aoi | exam       │
├──────────────┼──────────────┼─────┼───────────┤
│ STD001       | John Doe     | 15  | 65        │
│ STD002       | Jane Smith   | 18  | 72        │
└─────────────────────────────────────────────────┘
```

### Primary Level (P5 English)
```
┌─────────────────────────────────────────────────┐
│     Tanna Memorial High School                  │
│     MARKS IMPORT TEMPLATE                       │
│                                                  │
│ Year:       2026                                │
│ Term:       Term 1                              │
│ Class:      P5 A                                │
│ Subject:    English                             │
│ Exam Type:  EOT                                 │
│                                                  │
│ admission_no | student_name | ca  | exam       │
├──────────────┼──────────────┼─────┼───────────┤
│ STD001       | John Doe     | 35  | 55        │
│ STD002       | Jane Smith   | 38  | 58        │
└─────────────────────────────────────────────────┘
```

## Key Benefits

✅ **Clear Context**: Teachers know exactly what they're importing
✅ **Reduced Errors**: School, class, subject info prevents mix-ups
✅ **Level-Specific**: Column headers adapt to education level
✅ **Paper Tracking**: Advanced Level shows paper number
✅ **Professional**: Clean, formatted template with proper styling
✅ **Pre-filled Students**: Student names and admission numbers included
✅ **Separation of Concerns**: Exam marks here, AOI marks in dedicated page

## Usage Flow

1. Navigate to **Marks Entry** page
2. Select: Year, Term, Class, Exam Type, Subject
3. For Advanced Level multi-paper subjects: Select Paper Number
4. Click **Bulk Import** button
5. Click **Download Template**
6. Template downloads with all metadata pre-filled
7. Fill in marks (column header shows: mark/aoi/ca based on level)
8. Upload completed file
9. System validates and imports marks

## Separation of Import Types

### Exam Marks Import (This Page)
- **Location**: `/marks/enter` page
- **Endpoint**: `/api/v1/marks/import-template`
- **Handles**: All exam marks (BOT, MOT, EOT, Mock)
- **Levels**: All levels (Nursery, Primary, Ordinary, Advanced)
- **Columns**: 
  - Advanced: `mark`
  - Ordinary: `aoi` + `exam`
  - Primary/Nursery: `ca` + `exam`

### AOI Marks Import (Separate Page)
- **Location**: `/marks/aoi` page (dedicated AOI section)
- **Endpoint**: `/api/v1/marks/aoi-template` (separate endpoint)
- **Handles**: Only AOI/Activity of Integration marks
- **Levels**: S1-S4 only
- **Columns**: Activity-specific columns

## Testing Checklist

- [ ] Download template for S6 class with Biology Paper 1
- [ ] Verify template shows: School, Year, Term, Class, Subject, Exam Type, Paper
- [ ] Verify column header shows "mark" for Advanced Level
- [ ] Download template for S3 class with Mathematics
- [ ] Verify column headers show "aoi" and "exam" for Ordinary Level
- [ ] Download template for P5 class with English
- [ ] Verify column headers show "ca" and "exam" for Primary Level
- [ ] Verify student names pre-filled in template
- [ ] Upload filled template and verify marks imported correctly
- [ ] Verify paper number stored correctly for Advanced Level
