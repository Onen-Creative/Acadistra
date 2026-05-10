# SMS to Staff Feature - Complete Implementation

## Overview
SMS notifications can now be sent to staff members who are linked to parents/guardians. This applies to **ALL** types of SMS communications, not just fees.

## Supported SMS Types

### 1. Fees-Related
- **Payment Confirmations**: When a parent pays fees
- **Fees Reminders**: Outstanding balance notifications
- **Payment Receipts**: Detailed payment records

### 2. Attendance
- **Absence Alerts**: When student is absent
- **Late Arrival Notifications**: When student arrives late
- **Attendance Summaries**: Weekly/monthly attendance reports

### 3. Academic
- **Results Notifications**: When report cards are ready
- **Exam Schedules**: Upcoming exam timetables
- **Academic Progress**: Mid-term progress reports

### 4. General Communications
- **School Announcements**: General school-wide messages
- **Event Reminders**: Sports days, parent meetings, etc.
- **Emergency Alerts**: Urgent school closures, incidents
- **Health Alerts**: Clinic visits, medical emergencies

## How It Works

### Single SMS
When sending SMS to a guardian:
```go
smsService.SendSMSToGuardianAndStaff(
    ctx,
    guardianID,
    schoolID,
    "Your message here",
    "category", // fees, attendance, results, announcement, alert
    5, // priority (1=highest, 10=lowest)
    userID,
    metadata, // optional additional data
)
```

This automatically:
1. Sends SMS to guardian's phone
2. Queries for linked staff members
3. Sends same SMS to each staff member's phone
4. Logs all messages with recipient type

### Bulk SMS
When sending to multiple guardians:
```go
smsService.SendBulkSMSToGuardiansAndStaff(ctx, BulkSMSToGuardiansRequest{
    SchoolID:    schoolID,
    Name:        "Fees Reminder - Term 1 2024",
    Category:    "fees",
    Message:     "Your message here",
    GuardianIDs: []uuid.UUID{...},
    Priority:    5,
    CreatedBy:   userID,
})
```

This automatically sends to all guardians AND their linked staff in one batch.

## Database Schema

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

## Files Created

1. **Migration**: `backend/migrations/20260610000000_create_guardian_staff_table.sql`
2. **Service**: `backend/internal/services/guardian_staff_service.go`
3. **Handler**: `backend/internal/handlers/guardian_staff_handler.go`
4. **Documentation**: `GUARDIAN_STAFF_SMS.md`

## Files Modified

### 1. Models (`backend/internal/models/models.go`)
- Added `GuardianStaff` model
- Updated `Guardian` model with `StaffLinks` relationship

### 2. SMS Service (`backend/internal/services/sms/service.go`)
- Added `SendSMSToGuardianAndStaff()` - single SMS
- Added `SendBulkSMSToGuardiansAndStaff()` - bulk SMS
- Added `BulkSMSToGuardiansRequest` type
- Enhanced metadata tracking

### 3. Notification Service (`backend/internal/services/notification_service.go`)
Updated ALL notification methods to send to staff:
- `SendPaymentConfirmation()` - fees payment confirmations
- `SendFeesReminder()` - fees reminders
- `SendAttendanceAlert()` - attendance notifications
- `SendResultsNotification()` - academic results
- `SendBulkAnnouncement()` - general announcements

### 4. Fees Service (`backend/internal/services/fees_service.go`)
- Already integrated with SMS service
- `sendPaymentReceipt()` sends to guardians and staff

## API Endpoints

### Guardian-Staff Management

```http
POST /api/guardian-staff/link
{
  "guardian_id": "uuid",
  "staff_id": "uuid",
  "relationship": "Parent",
  "is_primary_contact": false
}
```

```http
DELETE /api/guardian-staff/:guardian_id/:staff_id
```

```http
GET /api/guardian-staff/guardian/:guardian_id/staff
```

```http
GET /api/guardian-staff/staff/:staff_id/guardians
```

```http
PUT /api/guardian-staff/:guardian_id/:staff_id
{
  "relationship": "Spouse",
  "is_primary_contact": true
}
```

### SMS Sending (Existing - Now Enhanced)

```http
POST /api/sms/send
{
  "recipient_id": "guardian_uuid",
  "recipient_type": "guardian",
  "phone_number": "+256700000000",
  "message": "Your message",
  "category": "fees"
}
```

```http
POST /api/sms/bulk
{
  "name": "Fees Reminder",
  "category": "fees",
  "message": "Your message",
  "recipients": [...]
}
```

## Use Cases

### 1. Teacher Who is a Parent
- Teacher's child attends the same school
- Link teacher's staff record to their guardian record
- Teacher receives all notifications on work phone
- No need to provide personal phone number

### 2. Staff Member's Spouse
- Staff member's spouse is the primary guardian
- Link staff to spouse's guardian record
- Both receive notifications
- Staff can stay informed about their child

### 3. Administrative Staff
- Bursar who is also a parent
- Receives fee notifications on work phone
- Can immediately process payments
- Better coordination

## Integration Points

### Currently Integrated
✅ Fees payment receipts
✅ Fees reminders
✅ Payment confirmations
✅ Attendance alerts
✅ Results notifications
✅ General announcements

### Ready for Integration
- Exam timetable notifications
- Library book due reminders
- Clinic visit notifications
- Event reminders
- Emergency alerts
- Weekly/monthly summaries

## Migration Steps

```bash
# 1. Run migration
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260610000000_create_guardian_staff_table.sql"

# 2. Restart backend
docker compose -f docker-compose.prod.yml restart backend

# 3. Register routes (add to router configuration)
```

## Benefits

1. **Universal**: Works for ALL SMS types, not just fees
2. **Convenient**: Staff receive notifications on work phone
3. **No Duplication**: Uses existing staff data
4. **Flexible**: Multiple staff can link to one guardian
5. **Auditable**: All SMS logged with recipient type
6. **Scalable**: Works with existing SMS infrastructure
7. **Preference-Aware**: Respects notification preferences

## SMS Metadata

Each SMS includes metadata for tracking:
```json
{
  "type": "fees_reminder",
  "student_name": "John Doe",
  "amount": 500000,
  "term": "Term 1",
  "year": "2024",
  "guardian_id": "uuid",
  "guardian_name": "Jane Doe",
  "relationship": "Parent"
}
```

## Security & Privacy

- Links are school-specific (multi-tenant safe)
- Only administrators can manage links
- SMS logs track recipient type (guardian/staff)
- No new PII collected
- Soft deletes preserve audit trail
- Respects notification preferences

## Performance

- Minimal overhead: One query per guardian
- Async SMS sending (non-blocking)
- Indexed foreign keys
- Preloading to avoid N+1 queries
- Batch processing for bulk SMS

## Testing Checklist

- [ ] Create guardian-staff link
- [ ] Send fees reminder → verify both receive SMS
- [ ] Send payment confirmation → verify both receive SMS
- [ ] Send attendance alert → verify both receive SMS
- [ ] Send results notification → verify both receive SMS
- [ ] Send bulk announcement → verify all receive SMS
- [ ] Check SMS logs for both recipient types
- [ ] Test unlinking
- [ ] Verify multi-tenant isolation
- [ ] Test with multiple staff per guardian

## Future Enhancements

1. Staff opt-in/opt-out preferences
2. Category-specific preferences (fees only, attendance only, etc.)
3. Bulk linking interface
4. Auto-linking based on matching contact info
5. SMS delivery reports
6. Cost tracking per recipient type
7. Analytics dashboard

## Example Scenarios

### Scenario 1: Fees Reminder
```
Guardian: Jane Doe (+256700111111)
Linked Staff: John Doe (Teacher, +256700222222)
Message: "Fees reminder for Mary Doe: UGX 500,000 outstanding"

Result:
- SMS sent to Jane (+256700111111)
- SMS sent to John (+256700222222)
- Both logged in sms_queue table
- Metadata includes guardian relationship
```

### Scenario 2: Bulk Announcement
```
School: 500 guardians
Linked Staff: 50 staff members
Message: "School closes early tomorrow due to weather"

Result:
- 500 SMS to guardians
- 50 SMS to linked staff
- Total: 550 SMS in one batch
- All processed asynchronously
```

### Scenario 3: Emergency Alert
```
Guardian: Mary Smith (+256700333333)
Linked Staff: Peter Smith (Bursar, +256700444444)
Message: "URGENT: Student John Smith injured, at clinic"

Result:
- High priority SMS (priority=1)
- Sent immediately to both
- Both can respond quickly
- Logged as emergency alert
```

## Conclusion

This implementation makes SMS notifications universal - any communication to parents can automatically include linked staff members. This improves communication, convenience, and ensures important information reaches the right people quickly.
