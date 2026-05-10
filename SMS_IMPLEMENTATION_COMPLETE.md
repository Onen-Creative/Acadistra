# SMS Communication System - Complete Implementation

## Overview
Enhanced SMS system to support communication with:
1. **Parents/Guardians** - Existing functionality
2. **Staff Members** - NEW: Direct staff communications
3. **Guardian-Linked Staff** - NEW: Staff who are also parents receive notifications

## Key Features Implemented

### 1. Guardian-Staff Linking System
**Purpose**: Link parent/guardian records to staff records so staff who are parents receive SMS on their work phones.

**Database**: `guardian_staff` table
- Links guardians to staff members
- Supports relationship types (Parent, Spouse, Sibling, etc.)
- Primary contact designation
- School-specific (multi-tenant safe)

**Files Created**:
- `migrations/20260610000000_create_guardian_staff_table.sql`
- `internal/services/guardian_staff_service.go`
- `internal/handlers/guardian_staff_handler.go`

**API Endpoints**:
```
POST   /api/guardian-staff/link                    - Link guardian to staff
DELETE /api/guardian-staff/:guardian_id/:staff_id  - Unlink
GET    /api/guardian-staff/guardian/:id/staff      - Get staff for guardian
GET    /api/guardian-staff/staff/:id/guardians     - Get guardians for staff
PUT    /api/guardian-staff/:guardian_id/:staff_id  - Update link
```

### 2. Enhanced SMS Service
**File**: `internal/services/sms/service.go`

**New Functions**:
- `SendSMSToGuardianAndStaff()` - Sends SMS to guardian AND all linked staff automatically
- `SendBulkSMSToGuardiansAndStaff()` - Bulk version for multiple guardians

**How It Works**:
```go
// When sending SMS to a guardian
smsService.SendSMSToGuardianAndStaff(
    ctx,
    guardianID,
    schoolID,
    "Your child's fees payment received",
    "fees",
    5,
    userID,
    metadata,
)

// Automatically:
// 1. Sends SMS to guardian's phone
// 2. Queries for linked staff
// 3. Sends SMS to each staff member's phone
// 4. Logs all messages with proper metadata
```

### 3. Staff-Only SMS Communications
**File**: `internal/handlers/staff_sms_handler.go`

**New Endpoints**:
```
POST /api/sms/staff              - Send SMS to specific staff members
POST /api/sms/staff/department   - Send SMS by department/role
POST /api/sms/parents            - Send SMS to parents (with class filter)
```

**Use Cases**:
- Staff meetings announcements
- Department-specific communications
- Role-based notifications (all teachers, all nurses, etc.)
- Emergency staff alerts

**Example Request**:
```json
{
  "subject": "Staff Meeting Tomorrow",
  "message": "Reminder: Staff meeting tomorrow at 9 AM in the conference room.",
  "departments": ["Academic", "Administration"],
  "roles": ["Teacher", "Admin"]
}
```

### 4. Updated Notification Service
**File**: `internal/services/notification_service.go`

**Updated Functions** (now send to guardians AND linked staff):
- `SendFeesReminder()` - Fees reminders
- `SendPaymentConfirmation()` - Payment receipts
- `SendAttendanceAlert()` - Attendance notifications
- `SendResultsNotification()` - Results available
- `SendBulkAnnouncement()` - General announcements

**New Function**:
- `SendStaffAnnouncement()` - Staff-only communications

### 5. Updated Models
**File**: `internal/models/models.go`

**New Model**:
```go
type GuardianStaff struct {
    GuardianID       uuid.UUID
    StaffID          uuid.UUID
    SchoolID         uuid.UUID
    Relationship     string  // Parent, Spouse, Sibling, etc.
    IsPrimaryContact bool
}
```

**Updated Model**:
```go
type Guardian struct {
    // ... existing fields
    StaffLinks []GuardianStaff  // NEW: Linked staff members
}
```

## Communication Flow Examples

### Example 1: Fees Payment Notification
```
1. Parent pays fees
2. System triggers SendPaymentConfirmation()
3. System finds guardian record
4. System checks for linked staff
5. SMS sent to:
   - Guardian's phone: +256700111222
   - Linked staff phone: +256700333444 (if exists)
6. Both receive: "Payment of UGX 500,000 received for Mary Doe"
```

### Example 2: Staff Meeting Announcement
```
1. Admin sends staff announcement
2. System queries staff by department/role
3. SMS sent to all matching staff members
4. No parents receive this message
```

### Example 3: General School Announcement
```
1. Admin sends announcement to parents
2. System finds all guardians
3. For each guardian:
   - Send SMS to guardian's phone
   - Check for linked staff
   - Send SMS to linked staff phones
4. Staff who are parents receive on work phone
```

## SMS Categories

| Category | Recipients | Auto-Send to Linked Staff |
|----------|-----------|---------------------------|
| `fees` | Guardians | ✅ Yes |
| `attendance` | Guardians | ✅ Yes |
| `results` | Guardians | ✅ Yes |
| `announcement` | Guardians | ✅ Yes |
| `staff_announcement` | Staff Only | ❌ No (staff-only) |
| `alert` | Guardians | ✅ Yes |

## Benefits

### For Schools
- Centralized communication system
- Reach staff who are parents on work phones
- Department/role-based staff communications
- Complete audit trail of all SMS

### For Staff Who Are Parents
- Receive school communications on work phone
- No need to provide personal phone numbers
- Don't miss important notifications about their children

### For Administrators
- Flexible communication options
- Send to parents, staff, or both
- Filter by class, department, or role
- Track all communications

## Migration Steps

1. **Run Migration**:
```bash
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260610000000_create_guardian_staff_table.sql"
```

2. **Restart Backend**:
```bash
docker compose -f docker-compose.prod.yml restart backend
```

3. **Link Guardians to Staff** (via API or admin interface):
```bash
curl -X POST http://localhost:8080/api/guardian-staff/link \
  -H "Content-Type: application/json" \
  -d '{
    "guardian_id": "guardian-uuid",
    "staff_id": "staff-uuid",
    "relationship": "Parent",
    "is_primary_contact": true
  }'
```

## API Usage Examples

### Send SMS to All Staff
```bash
curl -X POST http://localhost:8080/api/sms/staff \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Staff Meeting",
    "message": "All staff meeting tomorrow at 9 AM"
  }'
```

### Send SMS to Teachers Only
```bash
curl -X POST http://localhost:8080/api/sms/staff/department \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Teacher Training",
    "message": "Teacher training session on Friday",
    "roles": ["Teacher"]
  }'
```

### Send SMS to Parents in Specific Classes
```bash
curl -X POST http://localhost:8080/api/sms/parents \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Class Meeting",
    "message": "P5 parents meeting next week",
    "class_ids": ["class-uuid-1", "class-uuid-2"]
  }'
```

## Security & Privacy

- ✅ School-specific isolation (multi-tenant)
- ✅ Role-based access control
- ✅ All SMS logged with recipient type
- ✅ No new PII collected (uses existing data)
- ✅ Soft deletes preserve audit trail
- ✅ Metadata tracks guardian relationships

## Performance

- Async SMS sending (non-blocking)
- Batch processing for bulk SMS
- Indexed foreign keys
- Preloading to avoid N+1 queries
- Queue-based processing

## Future Enhancements

1. Staff opt-in/opt-out preferences
2. Notification preferences per category
3. Bulk linking interface
4. Auto-linking based on matching contact info
5. SMS delivery reports
6. Cost tracking per department
7. Scheduled SMS campaigns
8. SMS templates for staff communications

## Testing Checklist

- [ ] Create guardian-staff link
- [ ] Send fees reminder (verify both guardian and staff receive)
- [ ] Send staff-only announcement
- [ ] Send attendance alert
- [ ] Send results notification
- [ ] Send bulk announcement to parents
- [ ] Send department-specific staff SMS
- [ ] Verify SMS logs show correct recipient types
- [ ] Test unlinking guardian from staff
- [ ] Verify multi-tenant isolation

## Documentation Files

- `GUARDIAN_STAFF_SMS.md` - Detailed feature documentation
- `IMPLEMENTATION_SUMMARY.md` - This file
- Migration SQL file with schema
- API endpoint documentation in handlers

## Support

For issues or questions:
- Check SMS logs: `GET /api/sms/logs`
- Check SMS queue: `GET /api/sms/queue`
- Check SMS stats: `GET /api/sms/stats`
- Review audit logs for SMS activities
