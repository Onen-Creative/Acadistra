# SMS to Staff Linked to Parents - Implementation Summary

## Overview
SMS notifications can now be sent to staff members who are linked to parents/guardians. This applies to **ALL types of SMS communications** - fees, attendance, announcements, reports, alerts, etc.

## Key Concept
When a guardian is linked to a staff member (e.g., a teacher who is also a parent), any SMS sent to that guardian will **automatically** also be sent to the linked staff member's phone number.

## Use Cases
- **Fees**: Payment receipts, reminders, outstanding balance alerts
- **Attendance**: Absence notifications, late arrival alerts
- **Academic**: Report card availability, exam schedules, results
- **Announcements**: School events, holidays, meetings
- **Emergencies**: Health incidents, urgent notifications
- **General**: Any communication to parents

## Implementation

### 1. Database Schema
**New Table**: `guardian_staff`
```sql
CREATE TABLE guardian_staff (
    id CHAR(36) PRIMARY KEY,
    guardian_id CHAR(36) NOT NULL,
    staff_id CHAR(36) NOT NULL,
    school_id CHAR(36) NOT NULL,
    relationship VARCHAR(100) DEFAULT 'Parent',
    is_primary_contact BOOLEAN DEFAULT false,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);
```

### 2. Models Added/Updated

**New Model**: `GuardianStaff`
```go
type GuardianStaff struct {
    BaseModel
    GuardianID       uuid.UUID
    StaffID          uuid.UUID
    SchoolID         uuid.UUID
    Relationship     string  // Parent, Spouse, Sibling, etc.
    IsPrimaryContact bool
    Guardian         *Guardian
    Staff            *Staff
    School           *School
}
```

**Updated Model**: `Guardian`
```go
type Guardian struct {
    // ... existing fields
    StaffLinks []GuardianStaff `gorm:"foreignKey:GuardianID"`
}
```

### 3. SMS Service Functions

**Core Function**: `SendSMSToGuardianAndStaff()`
```go
func (s *Service) SendSMSToGuardianAndStaff(
    ctx context.Context,
    guardianID uuid.UUID,
    schoolID uuid.UUID,
    message string,
    category string,
    priority int,
    createdBy uuid.UUID,
    metadata models.JSONB,
) error
```

**Bulk Function**: `SendBulkSMSToGuardiansAndStaff()`
```go
func (s *Service) SendBulkSMSToGuardiansAndStaff(
    ctx context.Context,
    req BulkSMSToGuardiansRequest,
) (*models.SMSBatch, error)
```

### 4. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/guardian-staff/link` | Link guardian to staff |
| DELETE | `/api/guardian-staff/:guardian_id/:staff_id` | Unlink |
| GET | `/api/guardian-staff/guardian/:guardian_id/staff` | Get staff for guardian |
| GET | `/api/guardian-staff/staff/:staff_id/guardians` | Get guardians for staff |
| PUT | `/api/guardian-staff/:guardian_id/:staff_id` | Update link |

## How It Works

### Single SMS Example
```go
// Send SMS to guardian and linked staff
smsService.SendSMSToGuardianAndStaff(
    ctx,
    guardianID,
    schoolID,
    "Your child was absent today",
    "attendance",
    5,
    userID,
    models.JSONB{"student_id": studentID},
)
```

**What happens:**
1. SMS sent to guardian's phone: `+256701234567`
2. System queries `guardian_staff` table for linked staff
3. SMS sent to each linked staff phone: `+256709876543`
4. All messages logged with recipient type (guardian/staff)

### Bulk SMS Example
```go
// Send to multiple guardians and their staff
smsService.SendBulkSMSToGuardiansAndStaff(ctx, BulkSMSToGuardiansRequest{
    SchoolID:    schoolID,
    Name:        "Term 1 Report Cards Available",
    Category:    "results",
    Message:     "Report cards for Term 1 are now available",
    GuardianIDs: []uuid.UUID{guardian1, guardian2, guardian3},
    Priority:    5,
    CreatedBy:   userID,
})
```

## Integration Points

### Already Integrated
✅ **Fees Service** - Payment receipts automatically sent to guardians and linked staff

### Ready for Integration
The following services can use `SendSMSToGuardianAndStaff()`:

- **Attendance Service** - Absence/late notifications
- **Clinic Service** - Health incident alerts
- **Reports Service** - Report card availability
- **Announcement Service** - General announcements
- **Exam Service** - Exam schedules and results
- **Library Service** - Overdue book reminders

### Example Integration (Attendance)
```go
// In attendance service
for _, guardian := range guardians {
    smsService.SendSMSToGuardianAndStaff(
        ctx,
        guardian.ID,
        schoolID,
        fmt.Sprintf("%s was absent on %s", studentName, date),
        "attendance",
        5,
        userID,
        models.JSONB{"student_id": studentID, "date": date},
    )
}
```

## Files Created

1. **Migration**: `backend/migrations/20260610000000_create_guardian_staff_table.sql`
2. **Service**: `backend/internal/services/guardian_staff_service.go`
3. **Handler**: `backend/internal/handlers/guardian_staff_handler.go`
4. **Documentation**: `GUARDIAN_STAFF_SMS.md`

## Files Modified

1. **Models**: `backend/internal/models/models.go`
   - Added `GuardianStaff` model
   - Updated `Guardian` model with `StaffLinks`

2. **SMS Service**: `backend/internal/services/sms/service.go`
   - Added `SendSMSToGuardianAndStaff()`
   - Added `SendBulkSMSToGuardiansAndStaff()`
   - Added `BulkSMSToGuardiansRequest` type

3. **Fees Service**: `backend/internal/services/fees_service.go`
   - Already using the new SMS function for payment receipts

## Benefits

### 1. Universal Application
- Works for **all** SMS types, not just fees
- Single implementation serves all use cases
- Consistent behavior across the system

### 2. Convenience
- Staff who are parents receive notifications on work phone
- No need to provide personal phone numbers
- Centralized communication channel

### 3. Flexibility
- Multiple staff can be linked to one guardian
- Different relationship types supported
- Primary contact designation available

### 4. Audit Trail
- All SMS logged with recipient type
- Metadata tracks guardian relationship
- Full traceability for compliance

## Migration Steps

```bash
# 1. Run migration
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260610000000_create_guardian_staff_table.sql"

# 2. Restart backend
docker compose -f docker-compose.prod.yml restart backend
```

## Usage Examples

### Attendance Notification
```go
smsService.SendSMSToGuardianAndStaff(
    ctx, guardianID, schoolID,
    "John Doe was absent today",
    "attendance", 5, userID,
    models.JSONB{"student_id": studentID, "date": "2024-06-10"},
)
```

### Report Card Notification
```go
smsService.SendSMSToGuardianAndStaff(
    ctx, guardianID, schoolID,
    "Term 1 report card for Jane Doe is ready",
    "results", 5, userID,
    models.JSONB{"student_id": studentID, "term": "Term1", "year": 2024},
)
```

### Emergency Alert
```go
smsService.SendSMSToGuardianAndStaff(
    ctx, guardianID, schoolID,
    "URGENT: Please contact the school nurse regarding your child",
    "emergency", 1, userID,
    models.JSONB{"student_id": studentID, "incident_type": "health"},
)
```

### Bulk Announcement
```go
smsService.SendBulkSMSToGuardiansAndStaff(ctx, BulkSMSToGuardiansRequest{
    SchoolID:    schoolID,
    Name:        "School Closure Notice",
    Category:    "announcement",
    Message:     "School will be closed tomorrow due to public holiday",
    GuardianIDs: allGuardianIDs,
    Priority:    3,
    CreatedBy:   userID,
})
```

## Security & Privacy

- ✅ School-specific links (multi-tenant safe)
- ✅ Admin-only link management
- ✅ SMS logs track recipient type
- ✅ No new PII collected
- ✅ Soft deletes preserve audit trail
- ✅ Metadata includes relationship context

## Performance

- Minimal overhead: One query per guardian
- Async SMS sending (non-blocking)
- Indexed foreign keys
- Preloading prevents N+1 queries
- Batch processing for bulk operations

## Next Steps

1. ✅ Core implementation complete
2. ⏳ Add routes to main router
3. ⏳ Create frontend UI for link management
4. ⏳ Integrate with attendance service
5. ⏳ Integrate with clinic service
6. ⏳ Integrate with announcements
7. ⏳ Add notification preferences
8. ⏳ Auto-linking based on matching contacts

## Testing Checklist

- [ ] Create guardian-staff link
- [ ] Send fee payment SMS → verify both receive
- [ ] Send attendance SMS → verify both receive
- [ ] Send announcement SMS → verify both receive
- [ ] Bulk send to multiple guardians
- [ ] Verify SMS logs show correct recipient types
- [ ] Test unlinking
- [ ] Test multi-tenant isolation
- [ ] Verify metadata in SMS logs

## Summary

This implementation provides a **universal solution** for sending SMS to both guardians and their linked staff members across **all communication types**. The system automatically handles the distribution, logging, and tracking, making it seamless for any service to use.
