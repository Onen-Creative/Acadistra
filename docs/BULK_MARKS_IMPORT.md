# Bulk Marks Import Feature

## Overview
Complete bulk marks import system with approval workflow for teachers and school administrators.

## Features

### 1. **Validation Before Import**
- Checks if marks already exist for the class, subject, term, year, and exam type
- Prevents duplicate imports
- Only allows import if no marks exist for that combination

### 2. **Role-Based Workflow**

#### Teachers
- Upload marks via Excel file
- Import goes to "pending" status
- Requires school admin approval before marks are saved to database

#### School Admins
- Upload marks via Excel file
- Import is auto-approved and immediately saved to database
- Can approve/reject pending imports from teachers

### 3. **Import Process**
1. Select filters: Year, Term, Class, Exam Type, Subject
2. Download Excel template (optionally pre-filled with student names)
3. Fill in CA and Exam marks
4. Upload completed file
5. System validates data and shows errors
6. For teachers: Wait for admin approval
7. For admins: Marks are immediately processed

### 4. **Approval Workflow**
- School admins can view all pending imports
- Approve button: Processes marks and saves to database
- Reject button: Requires rejection reason, marks are not saved
- Import history shows status: Pending, Approved, Rejected

## Backend Implementation

### Models
- **MarksImport** (`marks_import.go`): Tracks import sessions with approval workflow
  - Fields: school_id, class_id, subject_id, term, year, exam_type, status, uploaded_by, approved_by, rejected_by, data, errors

### Handlers
- **BulkMarksImportHandler** (`bulk_marks_import_handler.go`):
  - `UploadMarksForApproval`: Upload Excel and create import record
  - `ListImports`: Get all imports for school
  - `GetImportDetails`: Get specific import with marks data
  - `ApproveImport`: Approve and process marks
  - `RejectImport`: Reject import with reason
  - `DownloadTemplate`: Generate Excel template
  - `processMarksImport`: Internal method to save marks to database

### Routes
```go
// Teachers and School Admins
POST   /api/v1/marks/bulk-import
GET    /api/v1/marks/imports
GET    /api/v1/marks/imports/:id
GET    /api/v1/marks/import-template

// School Admins Only
POST   /api/v1/marks/imports/:id/approve
POST   /api/v1/marks/imports/:id/reject
```

## Frontend Implementation

### Page
- **`/marks/import`** (`frontend-nextjs/src/app/marks/import/page.tsx`)
  - Filter selection (Year, Term, Class, Exam Type, Subject)
  - Template download with optional student pre-fill
  - File upload with validation
  - Import history table
  - Approve/Reject buttons for admins

### Navigation
- Added to Teacher sidebar: "Import Marks" 📤
- Added to School Admin sidebar: "Import Marks" 📤

## Excel Template Format

### For Primary, Nursery, and O-Level (S1-S4)
```
| admission_no | student_name | ca | exam |
|--------------|--------------|-----|------|
| STD001       | John Doe     | 15  | 65   |
| STD002       | Jane Smith   | 18  | 72   |
```

### For Advanced Level (S5-S6)
```
| admission_no | student_name | mark |
|--------------|--------------|------|
| STD001       | John Doe     | 88   |
| STD002       | Jane Smith   | 77   |
```

**Note for Advanced Level:**
- Each paper is imported separately
- Select paper number (1, 2, 3, or 4) before uploading
- Template shows only "mark" column (out of 100)
- System automatically stores paper number with marks
- Subsidiary subjects (1 paper) use same format
- Principal subjects (2-4 papers) require separate uploads per paper

## Database Migration
- Added `marks_imports` table to database migration
- Includes all necessary fields for approval workflow

## Security
- Tenant isolation: All queries filtered by school_id
- Role-based access control
- Teachers cannot approve their own imports
- Validation prevents duplicate marks

## Usage Flow

### For Teachers:
1. Navigate to "Import Marks" from sidebar
2. Select class, subject, term, year, exam type
3. Download template (pre-filled with students)
4. Fill in marks
5. Upload file
6. Wait for admin approval
7. Check import history for status

### For School Admins:
1. Navigate to "Import Marks" from sidebar
2. Option A: Upload marks (auto-approved)
   - Same process as teachers but immediate
3. Option B: Review pending imports
   - View import history
   - Click "Approve" to process marks
   - Click "Reject" to decline with reason

## Error Handling
- Invalid Excel format: Clear error message
- Student not found: Row-level error with admission number
- Missing columns: Validation error
- Duplicate marks: Prevents upload with clear message
- Network errors: User-friendly toast notifications
