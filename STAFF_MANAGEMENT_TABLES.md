# Staff Management Database Tables

## Overview
Comprehensive database schema for staff leave management, attendance tracking, and document management.

## Tables Created

### 1. staff_leave
**Purpose**: Manage staff leave requests with approval workflow

**Columns**:
- `id` (CHAR(36), PK): Unique identifier
- `created_at`, `updated_at`, `deleted_at`: Timestamps
- `staff_id` (CHAR(36), FK): Reference to staff
- `school_id` (CHAR(36), FK): Reference to school
- `leave_type` (VARCHAR(50)): Annual, Sick, Maternity, Paternity, Compassionate, Study, Unpaid
- `start_date`, `end_date` (DATE): Leave period
- `days` (INTEGER): Number of days
- `reason` (TEXT): Leave reason
- `status` (VARCHAR(20)): pending, approved, rejected, cancelled
- `approved_by` (CHAR(36)): Approver user ID
- `approved_at` (TIMESTAMP): Approval timestamp
- `rejection_reason` (TEXT): Reason for rejection

**Constraints**:
- CHECK: `leave_type` must be one of 7 valid types
- CHECK: `status` must be one of 4 valid statuses
- CHECK: `days > 0`
- CHECK: `end_date >= start_date`
- FK: `staff_id` → staff(id) ON DELETE CASCADE
- FK: `school_id` → schools(id) ON DELETE CASCADE

**Indexes**:
- Primary key on `id`
- Index on `staff_id`, `school_id`, `status`, `deleted_at`
- Composite index on `(start_date, end_date)`

**Triggers**:
- Auto-update `updated_at` on UPDATE

---

### 2. staff_attendance
**Purpose**: Track daily staff attendance with check-in/out times

**Columns**:
- `id` (CHAR(36), PK): Unique identifier
- `created_at`, `updated_at`, `deleted_at`: Timestamps
- `staff_id` (CHAR(36), FK): Reference to staff
- `school_id` (CHAR(36), FK): Reference to school
- `date` (DATE): Attendance date
- `check_in`, `check_out` (TIMESTAMP): Check-in/out times
- `status` (VARCHAR(20)): present, absent, late, on_leave, half_day
- `remarks` (TEXT): Additional notes
- `marked_by` (CHAR(36)): User who marked attendance

**Constraints**:
- CHECK: `status` must be one of 5 valid statuses
- CHECK: `check_out >= check_in` (when both present)
- FK: `staff_id` → staff(id) ON DELETE CASCADE
- FK: `school_id` → schools(id) ON DELETE CASCADE
- UNIQUE: One attendance record per staff per day (excluding soft-deleted)

**Indexes**:
- Primary key on `id`
- Unique index on `(staff_id, date)` WHERE deleted_at IS NULL
- Index on `school_id`, `date`, `status`, `deleted_at`

**Triggers**:
- Auto-update `updated_at` on UPDATE

---

### 3. staff_document
**Purpose**: Store and manage staff documents with expiry tracking

**Columns**:
- `id` (CHAR(36), PK): Unique identifier
- `created_at`, `updated_at`, `deleted_at`: Timestamps
- `staff_id` (CHAR(36), FK): Reference to staff
- `school_id` (CHAR(36), FK): Reference to school
- `document_type` (VARCHAR(100)): CV, Certificate, Degree, Diploma, Transcript, Contract, ID, Passport, Recommendation, Medical, Police_Clearance, Tax_Clearance, Other
- `title` (VARCHAR(255)): Document title
- `file_url` (VARCHAR(500)): File storage URL
- `uploaded_by` (CHAR(36)): User who uploaded
- `uploaded_at` (TIMESTAMP): Upload timestamp
- `expiry_date` (DATE): Document expiry (optional)
- `notes` (TEXT): Additional notes

**Constraints**:
- CHECK: `document_type` must be one of 13 valid types
- FK: `staff_id` → staff(id) ON DELETE CASCADE
- FK: `school_id` → schools(id) ON DELETE CASCADE

**Indexes**:
- Primary key on `id`
- Index on `staff_id`, `school_id`, `document_type`, `deleted_at`
- Index on `expiry_date` (for expiring documents)

**Triggers**:
- Auto-update `updated_at` on UPDATE

---

## Features

### Leave Management
✅ Multiple leave types (Annual, Sick, Maternity, etc.)
✅ Approval workflow (pending → approved/rejected)
✅ Date range validation
✅ Rejection reason tracking
✅ Soft delete support

### Attendance Tracking
✅ Daily attendance records
✅ Check-in/out time tracking
✅ Multiple status types (present, absent, late, etc.)
✅ One record per staff per day constraint
✅ Audit trail (marked_by)

### Document Management
✅ 13 document types
✅ Expiry date tracking
✅ File URL storage
✅ Upload audit trail
✅ Categorization and notes

---

## Backend Handler Updates

### Fixed Handlers:
1. **CreateLeaveRequest**: Now accepts string dates and parses to time.Time
2. **MarkStaffAttendance**: Now accepts string dates and parses to time.Time

Both handlers properly validate input and return descriptive error messages.

---

## Next Steps

1. **Restart backend server** to load updated handlers
2. Test leave request creation from frontend
3. Test attendance marking from frontend
4. Test document upload from frontend

---

## Database Commands

```sql
-- View table structure
\d staff_leave
\d staff_attendance
\d staff_document

-- View all staff tables
\dt staff*

-- Check constraints
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'staff_leave'::regclass;
```

---

**Created**: 2026-03-22
**Database**: school_system_db
**Status**: ✅ Production Ready
