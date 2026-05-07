# SMS System Documentation

## Overview

Complete SMS sending system for Acadistra with provider integration (Africa's Talking, Twilio), template management, queue processing, and bulk operations.

## Features

✅ **Multi-Provider Support**
- Africa's Talking integration
- Twilio integration
- Easy to add more providers

✅ **Template Management**
- Reusable SMS templates
- Variable substitution ({{.VariableName}})
- Category-based organization
- System-wide and school-specific templates

✅ **Queue System**
- Automatic retry on failure (max 3 attempts)
- Priority-based sending
- Scheduled SMS support
- Background processing via cron

✅ **Bulk Operations**
- Send to multiple recipients
- Batch tracking
- Progress monitoring
- Cost calculation

✅ **Comprehensive Logging**
- All SMS tracked in database
- Status tracking (pending, sending, sent, failed)
- Cost tracking
- Error logging

## Architecture

### Backend Components

1. **Models** (`backend/internal/models/sms.go`)
   - `SMSProvider` - Provider configuration per school
   - `SMSTemplate` - Reusable message templates
   - `SMSQueue` - SMS queue for processing
   - `SMSBatch` - Bulk SMS operations
   - `SMSLog` - Historical SMS logs (existing)

2. **Service** (`backend/internal/services/sms/service.go`)
   - Provider integration (Africa's Talking, Twilio)
   - Template rendering with Go templates
   - Queue processing
   - Batch operations
   - Phone number normalization (Uganda format)

3. **Handler** (`backend/internal/handlers/sms.go`)
   - REST API endpoints
   - Request validation
   - Response formatting

4. **Scheduler** (`backend/internal/cron/sms_scheduler.go`)
   - Processes scheduled SMS every minute
   - Runs in background
   - Auto-retry failed messages

### Frontend Components

1. **Service** (`frontend/src/services/sms.ts`)
   - API client for SMS operations
   - TypeScript interfaces

2. **Page** (`frontend/src/app/sms/page.tsx`)
   - Send SMS interface
   - Template management
   - Queue monitoring
   - Batch tracking
   - Logs viewer

## API Endpoints

### Provider Configuration

```http
POST /api/v1/sms/provider
GET /api/v1/sms/provider
```

**Request Body:**
```json
{
  "provider": "africastalking",
  "api_key": "your-api-key",
  "api_secret": "your-api-secret",
  "username": "sandbox",
  "sender_id": "SCHOOL"
}
```

### Templates

```http
GET /api/v1/sms/templates
POST /api/v1/sms/templates
```

**Create Template:**
```json
{
  "name": "Fees Reminder",
  "category": "fees",
  "template": "Dear {{.GuardianName}}, {{.StudentName}} has outstanding fees of UGX {{.Balance}}.",
  "variables": {
    "fields": ["GuardianName", "StudentName", "Balance"]
  }
}
```

### Send SMS

```http
POST /api/v1/sms/send
```

**Request Body:**
```json
{
  "phone_number": "+256700000000",
  "message": "Your message here",
  "category": "general",
  "priority": 5,
  "scheduled_for": "2024-01-01T10:00:00Z"
}
```

### Bulk SMS

```http
POST /api/v1/sms/bulk
```

**Request Body:**
```json
{
  "name": "Term Opening Reminder",
  "category": "announcement",
  "template_id": "uuid",
  "recipients": [
    {
      "phone_number": "+256700000000",
      "variables": {
        "GuardianName": "John Doe",
        "StudentName": "Jane Doe"
      }
    }
  ],
  "priority": 5
}
```

### Queue & Logs

```http
GET /api/v1/sms/queue?status=pending
GET /api/v1/sms/batches
GET /api/v1/sms/logs
GET /api/v1/sms/stats
```

## Setup Instructions

### 1. Database Migration

```bash
cd backend
./main migrate
```

This will create the SMS tables:
- `sms_providers`
- `sms_templates`
- `sms_queue`
- `sms_batches`

### 2. Seed Default Templates

```bash
./main seed-sms-templates
```

This creates 8 default templates:
- Fees Payment Received
- Fees Reminder
- Absent Alert
- Results Published
- General Announcement
- Medical Alert
- Exam Reminder
- Term Opening

### 3. Configure Provider

**Option A: Via API**
```bash
curl -X POST http://localhost:8080/api/v1/sms/provider \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "africastalking",
    "api_key": "your-api-key",
    "username": "sandbox",
    "sender_id": "SCHOOL"
  }'
```

**Option B: Via Frontend**
1. Login as School Admin
2. Navigate to SMS Management
3. Click "Configure Provider"
4. Enter credentials
5. Save

### 4. Environment Variables (Optional)

Add to `.env` for default SMS service:
```env
AFRICASTALKING_API_KEY=your-api-key
AFRICASTALKING_USERNAME=sandbox
AFRICASTALKING_SENDER_ID=SCHOOL
```

## Usage Examples

### Send Single SMS

```typescript
import { smsService } from '@/services/sms';

await smsService.sendSMS({
  phone_number: '+256700000000',
  message: 'Hello from Acadistra!',
  category: 'general',
  recipient_type: 'guardian',
});
```

### Send Bulk SMS with Template

```typescript
await smsService.sendBulkSMS({
  name: 'Fees Reminder - Term 1 2024',
  category: 'fees',
  template_id: 'template-uuid',
  recipients: guardians.map(g => ({
    phone_number: g.phone,
    recipient_type: 'guardian',
    variables: {
      GuardianName: g.full_name,
      StudentName: g.student.name,
      Balance: g.outstanding_balance,
      Term: 'Term 1',
      Year: '2024',
    },
  })),
});
```

### Use Template in Code

```go
import "github.com/school-system/backend/internal/services/sms"

smsService := sms.NewService(db)

// Render template
message, err := smsService.RenderTemplate(templateID, map[string]interface{}{
  "GuardianName": "John Doe",
  "StudentName": "Jane Doe",
  "Amount": "500000",
  "Balance": "200000",
})

// Send
err = smsService.SendSMS(ctx, sms.SendSMSRequest{
  SchoolID:    schoolID,
  PhoneNumber: "+256700000000",
  Message:     message,
  Category:    "fees",
  CreatedBy:   userID,
})
```

## Provider Configuration

### Africa's Talking

1. Sign up at https://africastalking.com
2. Get API Key from dashboard
3. Use sandbox username for testing
4. Configure sender ID (requires approval)

**Sandbox Testing:**
- Username: `sandbox`
- Test numbers: Use any valid format
- No actual SMS sent in sandbox

**Production:**
- Username: Your actual username
- Sender ID: Approved sender ID
- Real SMS sent and charged

### Twilio

1. Sign up at https://twilio.com
2. Get Account SID and Auth Token
3. Get phone number
4. Configure in system

## Phone Number Format

System automatically normalizes phone numbers to E.164 format:

- `0700000000` → `+256700000000`
- `700000000` → `+256700000000`
- `+256700000000` → `+256700000000` (no change)

## Cost Tracking

- Each SMS cost is tracked in the database
- Costs are provider-specific
- Total costs calculated per batch
- Monthly/yearly reports available

## Monitoring

### Queue Status
- **pending**: Waiting to be sent
- **sending**: Currently being sent
- **sent**: Successfully delivered
- **failed**: Failed after max attempts

### Retry Logic
- Failed SMS automatically retried
- Max 3 attempts
- Exponential backoff between retries
- After 3 failures, marked as failed

### Scheduler
- Runs every 1 minute
- Processes scheduled SMS
- Retries failed messages
- Logs all activities

## Security

- API keys stored encrypted in database
- Only school admins can configure providers
- Rate limiting on SMS endpoints
- Audit logging for all SMS operations

## Troubleshooting

### SMS Not Sending

1. Check provider configuration:
   ```bash
   curl http://localhost:8080/api/v1/sms/provider \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. Check queue status:
   ```bash
   curl http://localhost:8080/api/v1/sms/queue \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. Check logs for errors:
   ```bash
   docker logs acadistra_backend | grep SMS
   ```

### Provider Errors

**Africa's Talking:**
- Verify API key is correct
- Check username (sandbox vs production)
- Ensure sender ID is approved (production)
- Verify account has credits

**Twilio:**
- Verify Account SID and Auth Token
- Check phone number is active
- Ensure account has credits

### Template Not Rendering

- Check variable names match exactly (case-sensitive)
- Ensure template syntax is correct: `{{.VariableName}}`
- Verify all required variables are provided

## Performance

- Queue processing: ~100 SMS/minute
- Batch operations: Async processing
- Database indexes on school_id, status, created_at
- Automatic cleanup of old logs (90 days)

## Future Enhancements

- [ ] SMS delivery reports
- [ ] Two-way SMS (receive replies)
- [ ] SMS campaigns with scheduling
- [ ] A/B testing for messages
- [ ] SMS analytics dashboard
- [ ] Integration with more providers
- [ ] SMS credits management
- [ ] Bulk upload via CSV

## Support

For issues or questions:
- Email: support@acadistra.com
- Documentation: https://docs.acadistra.com/sms
- GitHub: https://github.com/acadistra/acadistra/issues
