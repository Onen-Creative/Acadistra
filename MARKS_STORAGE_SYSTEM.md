# Unified Marks Storage and Grading System

## Overview
All marks (CA, AOI, and Exam) are stored in the same `subject_results` table and follow the same grading logic, ensuring consistency between manual entry and bulk imports.

## Storage Structure

### subject_results Table
All marks are stored in the `raw_marks` JSONB column:
```json
{
  "ca": 35.0,      // CA marks (Primary/Nursery) or AOI-derived CA (S1-S4)
  "exam": 55.0,    // Exam marks
  "total": 90.0,   // Total marks (ca + exam)
  "mark": 90.0     // For Advanced level (single paper mark)
}
```

### integration_activities Table (S1-S4 Only)
AOI marks are stored separately for reference:
```json
{
  "activity1": 2.5,
  "activity2": 3.0,
  "activity3": 2.0,
  "activity4": 2.5,
  "activity5": 3.0
}
```

## Grading Logic by Level

### 1. S1-S4 (NCDC - O-Level)
- **CA Source**: AOI activities (5 activities, 0-3 marks each)
- **CA Calculation**: `(average of activities / 3) * 20` = CA out of 20
- **Exam**: Out of 80
- **Total**: CA (20) + Exam (80) = 100
- **Grading**: NCDC grading system (D1, D2, C3, C4, C5, C6, P7, P8, F9)

**Import Flow**:
1. Import AOI marks → Stored in `integration_activities`
2. Calculate CA from AOI → Update `subject_results.raw_marks.ca`
3. When exam marks imported → Recalculate grade with AOI CA + Exam

### 2. P1-P7 (Primary)
- **CA**: Out of 40
- **Exam**: Out of 60
- **Total**: CA (40) + Exam (60) = 100
- **Grading**: Primary grading system (1-4 scale)

**Import Flow**:
1. Import CA marks → Stored in `subject_results.raw_marks.ca`
2. Import Exam marks → Stored in `subject_results.raw_marks.exam`
3. Recalculate grade when both CA and Exam exist

### 3. Baby, Middle, Top, Nursery (ECCE)
- **CA**: Out of 100
- **Exam**: Out of 100
- **Average**: (CA + Exam) / 2
- **Grading**: Nursery grading system

**Import Flow**:
1. Import CA marks → Stored in `subject_results.raw_marks.ca`
2. Import Exam marks → Stored in `subject_results.raw_marks.exam`
3. Calculate average and grade

### 4. S5-S6 (UACE - A-Level)
- **Paper-based**: Each paper out of 100
- **No CA**: Only exam marks
- **Grading**: UACE grading system (D1-F9)

**Import Flow**:
1. Import exam marks per paper → Stored in `subject_results.raw_marks.mark`
2. Grade calculated immediately

## Import Handlers

### 1. AOI Marks Import (`/api/v1/marks/aoi-import`)
- **Levels**: S1-S4 only
- **Process**:
  1. Validate AOI activities (0-3 each)
  2. Store in `integration_activities` table
  3. Calculate CA from AOI average
  4. Update ALL `subject_results` for that student/subject/term/year with new CA
  5. Recalculate grades for all exam types (BOT, MOT, EOT)
- **No Approval**: Processed immediately

### 2. CA Marks Import (`/api/v1/marks/ca-import`)
- **Levels**: Primary (P1-P7), Nursery (Baby, Middle, Top)
- **Process**:
  1. Validate CA marks (0-40 for Primary, 0-100 for Nursery)
  2. Store in `subject_results.raw_marks.ca`
  3. If exam marks exist, recalculate grade
- **No Approval**: Processed immediately

### 3. Exam Marks Import (`/api/v1/marks/exam-import`)
- **Levels**: All levels
- **Process**:
  1. Validate exam marks
  2. Store in `subject_results.raw_marks.exam`
  3. For S1-S4: Fetch AOI CA from `integration_activities`
  4. Calculate grade with appropriate CA
  5. Store complete result with grade
- **Approval**: May require admin approval (configurable)

## Manual Entry Integration

Manual marks entry in `/marks/enter` uses the same `subject_results` table:
- Teachers enter marks → Stored in `raw_marks`
- Same grading logic applied
- No difference between manual and imported marks

## Grade Recalculation

Grades are automatically recalculated when:
1. **AOI marks imported** → All subject_results for that student/subject updated
2. **CA marks imported** → Grade recalculated if exam exists
3. **Exam marks imported** → Grade calculated with existing CA (or AOI CA for S1-S4)
4. **Manual entry saved** → Grade calculated immediately

## API Endpoints

### Import Endpoints
- `POST /api/v1/marks/aoi-import` - Import AOI marks (S1-S4)
- `POST /api/v1/marks/ca-import` - Import CA marks (Primary/Nursery)
- `POST /api/v1/marks/exam-import` - Import exam marks (All levels)

### Template Endpoints
- `GET /api/v1/marks/aoi-template` - Download AOI template
- `GET /api/v1/marks/ca-template` - Download CA template
- `GET /api/v1/marks/exam-template` - Download exam template

### Approval Endpoints (Exam imports only)
- `GET /api/v1/marks/imports` - List pending imports
- `POST /api/v1/marks/imports/:id/approve` - Approve import
- `POST /api/v1/marks/imports/:id/reject` - Reject import

## Frontend Integration

The marks entry page (`/marks/enter`) provides:
1. **Manual Entry**: Direct input of CA and Exam marks
2. **Bulk Import**: Toggle between CA and Exam import modes
3. **Import Type Selection**: Automatically detects level and shows appropriate options
4. **Unified Display**: All marks (manual or imported) displayed together

## Benefits

1. **Consistency**: Same storage and grading logic for all entry methods
2. **Flexibility**: Import CA and Exam separately or together
3. **Automatic Grading**: Grades recalculated automatically when marks updated
4. **AOI Integration**: S1-S4 AOI marks automatically converted to CA
5. **Audit Trail**: All marks changes tracked in audit logs
6. **No Duplication**: Single source of truth for all marks
