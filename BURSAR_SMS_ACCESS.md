# Bursar SMS Access - Implementation Summary

## Changes Made

Added SMS functionality to the Bursar role to enable sending fees reminders and viewing SMS communications.

### File Modified
- `backend/internal/routes/role_routes.go`

### SMS Routes Added for Bursar

The bursar now has access to the following SMS endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/sms/send` | Send single SMS |
| POST | `/api/v1/sms/bulk` | Send bulk SMS (fees reminders) |
| GET | `/api/v1/sms/queue` | View SMS queue |
| GET | `/api/v1/sms/batches` | View SMS batches |
| GET | `/api/v1/sms/logs` | View SMS logs |
| GET | `/api/v1/sms/stats` | View SMS statistics |
| GET | `/api/v1/sms/templates` | View SMS templates |
| GET | `/api/v1/sms/provider` | View SMS provider config |

### Permissions

**Bursar CAN:**
- ✅ Send SMS to parents (fees reminders)
- ✅ Send bulk SMS (e.g., outstanding fees alerts)
- ✅ View SMS queue and logs
- ✅ View SMS statistics
- ✅ View SMS templates
- ✅ View SMS provider configuration

**Bursar CANNOT:**
- ❌ Configure SMS provider (school_admin only)
- ❌ Create/edit SMS templates (school_admin only)

### Use Cases for Bursar

1. **Fees Reminders**
   - Send bulk SMS to parents with outstanding fees
   - Automated reminders at end of month

2. **Payment Confirmations**
   - Already automated via notification service
   - Bursar can view logs to confirm delivery

3. **Fee Structure Updates**
   - Notify parents about new fee structures
   - Term opening fee reminders

4. **Outstanding Balance Alerts**
   - Send targeted SMS to specific parents
   - Bulk reminders before term ends

### Example: Bursar Sending Fees Reminder

```bash
POST /api/v1/sms/bulk
Authorization: Bearer <bursar_token>

{
  "name": "Term 1 Fees Reminder",
  "category": "fees",
  "message": "Dear parent, your child has an outstanding balance of UGX {{amount}}. Please clear by {{deadline}}.",
  "recipients": [
    {
      "recipient_id": "guardian-uuid-1",
      "recipient_type": "guardian",
      "phone_number": "+256700111222",
      "variables": {
        "amount": "500000",
        "deadline": "30th May 2026"
      }
    }
  ]
}
```

### SMS to Guardians and Linked Staff

When the bursar sends SMS to guardians, the system automatically:
1. Sends SMS to the guardian's phone
2. Checks for linked staff members
3. Sends SMS to linked staff phones (if any)

This ensures staff who are parents receive fees reminders on their work phones.

### Role Access Summary

| Role | SMS Access |
|------|------------|
| **System Admin** | Full access (all endpoints) |
| **School Admin** | Full access (configure provider, templates, send) |
| **Bursar** | Send & view (cannot configure provider/templates) |
| **Teacher** | No access |
| **Librarian** | No access |
| **Nurse** | No access |
| **Parent** | No access |

### Testing

To test bursar SMS access:

```bash
# 1. Login as bursar
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "bursar@school.com", "password": "password"}'

# 2. Get token from response

# 3. Test SMS endpoint
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/v1/sms/stats

# Should return SMS statistics
```

### Deployment

No additional deployment steps needed. The changes are in the routes configuration and will be active after backend restart:

```bash
# Development
cd backend
go run cmd/api/main.go

# Production
docker compose -f docker-compose.prod.yml restart backend
```

### Benefits

1. **Bursar Independence** - Can send fees reminders without admin
2. **Efficient Communication** - Bulk SMS for outstanding fees
3. **Audit Trail** - All SMS logged and viewable
4. **Cost Tracking** - View SMS costs and statistics
5. **Guardian + Staff** - Automatic SMS to linked staff members

### Security

- ✅ Role-based access control enforced
- ✅ Bursar cannot modify SMS provider settings
- ✅ Bursar cannot create/edit templates (prevents abuse)
- ✅ All SMS logged with sender information
- ✅ Audit trail maintained

## Complete Implementation

This completes the SMS system implementation with:
- ✅ Guardian-staff linking
- ✅ Automatic SMS to guardians + linked staff
- ✅ Staff-only communications
- ✅ School admin full access
- ✅ Bursar fees reminder access
- ✅ Complete audit trail
