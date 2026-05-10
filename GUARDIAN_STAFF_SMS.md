# Guardian-Staff SMS Notifications

## Overview
This feature allows SMS notifications to be sent to staff members who are linked to parents/guardians. This is useful when a parent is also a staff member at the school and wants to receive notifications on their staff phone number.

## Use Cases
- A teacher who is also a parent receives fee payment notifications on their work phone
- A staff member's spouse (who is a guardian) can have notifications sent to the staff member
- Administrative staff who are guardians can receive notifications through their work contact

## Database Schema

### guardian_staff Table
Links guardians to staff members for SMS notifications.

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
    deleted_at TIMESTAMP,
    
    FOREIGN KEY (guardian_id) REFERENCES guardians(id),
    FOREIGN KEY (staff_id) REFERENCES staff(id),
    FOREIGN KEY (school_id) REFERENCES schools(id)
);
```

## API Endpoints

### Link Guardian to Staff
```http
POST /api/guardian-staff/link
Content-Type: application/json

{
  "guardian_id": "uuid",
  "staff_id": "uuid",
  "relationship": "Parent",
  "is_primary_contact": false
}
```

### Unlink Guardian from Staff
```http
DELETE /api/guardian-staff/:guardian_id/:staff_id
```

### Get Staff Links for Guardian
```http
GET /api/guardian-staff/guardian/:guardian_id/staff
```

### Get Guardian Links for Staff
```http
GET /api/guardian-staff/staff/:staff_id/guardians
```

### Update Link
```http
PUT /api/guardian-staff/:guardian_id/:staff_id
Content-Type: application/json

{
  "relationship": "Spouse",
  "is_primary_contact": true
}
```

## How It Works

1. **Link Creation**: An administrator links a guardian record to a staff record
2. **SMS Sending**: When an SMS is sent to a guardian (e.g., fee payment notification), the system:
   - Sends SMS to the guardian's phone number
   - Queries for any linked staff members
   - Sends the same SMS to each linked staff member's phone number
3. **Metadata**: SMS sent to staff includes metadata indicating it's related to a guardian

## Code Example

### Sending SMS to Guardian and Linked Staff
```go
// In fees service or any service that sends notifications
smsService.SendSMSToGuardianAndStaff(
    ctx,
    guardianID,
    schoolID,
    "Payment of UGX 500,000 received for John Doe",
    "fees",
    5, // priority
    userID,
)
```

This will:
1. Send SMS to the guardian's phone
2. Find all staff linked to this guardian
3. Send SMS to each linked staff member's phone

## Migration

Run the migration to create the guardian_staff table:
```bash
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260610000000_create_guardian_staff_table.sql"
```

## Models

### GuardianStaff Model
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

### Updated Guardian Model
```go
type Guardian struct {
    // ... existing fields
    StaffLinks []GuardianStaff `gorm:"foreignKey:GuardianID"`
}
```

## Services

### GuardianStaffService
- `LinkGuardianToStaff()` - Create a link
- `UnlinkGuardianFromStaff()` - Remove a link
- `GetStaffLinksForGuardian()` - Get all staff for a guardian
- `GetGuardianLinksForStaff()` - Get all guardians for a staff
- `UpdateLink()` - Update relationship details

### SMS Service Enhancement
- `SendSMSToGuardianAndStaff()` - Send SMS to guardian and all linked staff

## Benefits

1. **Convenience**: Staff who are parents don't need to provide personal phone numbers
2. **Centralized Communication**: All school-related notifications go to work phone
3. **Flexibility**: Multiple staff can be linked to one guardian
4. **Audit Trail**: All SMS are logged with recipient type (guardian/staff)

## Security Considerations

- Only administrators should be able to create/modify guardian-staff links
- Staff phone numbers are already in the system, no new PII is collected
- SMS logs track whether message was sent to guardian or staff
- Links are school-specific (multi-tenant safe)

## Future Enhancements

- Allow staff to opt-in/opt-out of receiving guardian notifications
- Support for notification preferences per category (fees, attendance, etc.)
- Bulk linking interface for administrators
- Auto-linking based on matching phone numbers or email addresses
