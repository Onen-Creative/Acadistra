# SMS Sending System Documentation

## Overview

Complete SMS sending system for Acadistra with provider integration (Africa's Talking, Twilio), template management, queue processing, and batch operations.

## Features

✅ **Multi-Provider Support**
- Africa's Talking integration
- Twilio integration
- Easy to extend for other providers

✅ **Template Management**
- Reusable SMS templates with variables
- System-wide and school-specific templates
- 8 pre-built templates (fees, attendance, results, announcements, alerts)

✅ **Queue System**
- Asynchronous SMS sending
- Priority-based queue
- Automatic retry on failure (up to 3 attempts)
- Scheduled SMS support

✅ **Batch Operations**
- Send SMS to multiple recipients
- Track batch progress
- Cost tracking per batch

✅ **Logging & Tracking**
- Complete SMS logs
- Delivery status tracking
- Cost tracking
- Provider response logging

## Database Models

### SMSProvider
Stores SMS provider configuration per school:
```go
type SMSProvider struct {
    SchoolID  uuid.UUID
    Provider  string  // africastalking, twilio
    APIKey    string
    APISecret string
    Username  string
    SenderID  string
    IsActive  bool
    Balance   float64
}
```

### SMSTemplate
Reusable SMS templates:
```go
type SMSTemplate struct {
    SchoolID  *uuid.UUID  // null = system-wide
    Name      string
    Category  string      // fees, attendance, results, announcement, alert
    Template  string      // "Dear {{.GuardianName}}, ..."
    Variables JSONB       // ["GuardianName", "Amount"]
    IsActive  bool
}
```

### SMSQueue
SMS queue for processing:
```go
type SMSQueue struct {
    SchoolID      uuid.UUID
    RecipientID   *uuid.UUID
    RecipientType string      // guardian, student, staff
    PhoneNumber   string
    Message       string
    Category      string
    Priority      int         // 1=highest, 10=lowest
    Status        string      // pending, sending, sent, failed
    ScheduledFor  *time.Time
    SentAt        *time.Time
    Attempts      int
    MaxAttempts   int
    ProviderID    string
    Cost          float64
    ErrorMessage  string
    Metadata      JSONB
    CreatedBy     uuid.UUID
}
```

### SMSBatch
Bulk SMS operations:
```go
type SMSBatch struct {
    SchoolID     uuid.UUID
    Name         string
    Category     string
    TotalCount   int
    SentCount    int
    FailedCount  int
    Status       string  // pending, processing, completed, failed
    TotalCost    float64
    StartedAt    *time.Time
    CompletedAt  *time.Time
    CreatedBy    uuid.UUID
}
```

## API Endpoints

### Configure Provider
```http
POST /api/v1/sms/provider
Authorization: Bearer <token>

{
  "provider": "africastalking",
  "api_key": "your-api-key",
  "api_secret": "your-api-secret",
  "username": "sandbox",
  "sender_id": "ACADISTRA"
}
```

### Get Provider Config
```http
GET /api/v1/sms/provider
Authorization: Bearer <token>
```

### Send Single SMS
```http
POST /api/v1/sms/send
Authorization: Bearer <token>

{
  "recipient_id": "uuid",
  "recipient_type": "guardian",
  "phone_number": "+256700000000",
  "message": "Your message here",
  "category": "fees",
  "priority": 5,
  "scheduled_for": "2025-01-15T10:00:00Z"  // optional
}
```

### Send Bulk SMS
```http
POST /api/v1/sms/bulk
Authorization: Bearer <token>

{
  "name": "Term 1 Fees Reminder",
  "category": "fees",
  "message": "Custom message",
  "template_id": "uuid",  // optional, overrides message
  "recipients": [
    {
      "recipient_id": "uuid",
      "recipient_type": "guardian",
      "phone_number": "+256700000000",
      "variables": {
        "GuardianName": "John Doe",
        "StudentName": "Jane Doe",
        "Balance": "500000"
      }
    }
  ],
  "priority": 5
}
```

### Create Template
```http
POST /api/v1/sms/templates
Authorization: Bearer <token>

{
  "name": "Custom Fees Reminder",
  "category": "fees",
  "template": "Dear {{.GuardianName}}, {{.StudentName}} owes UGX {{.Balance}}.",
  "variables": {
    "fields": ["GuardianName", "StudentName", "Balance"]
  }
}
```

### Get Templates
```http
GET /api/v1/sms/templates
Authorization: Bearer <token>
```

### Get SMS Queue
```http
GET /api/v1/sms/queue?status=pending
Authorization: Bearer <token>
```

### Get SMS Batches
```http
GET /api/v1/sms/batches
Authorization: Bearer <token>
```

### Get SMS Logs
```http
GET /api/v1/sms/logs
Authorization: Bearer <token>
```

## Pre-built Templates

### 1. Fees Payment Received
```
Dear {{.GuardianName}}, we have received UGX {{.Amount}} for {{.StudentName}}. Balance: UGX {{.Balance}}. Thank you.
```

### 2. Fees Reminder
```
Dear {{.GuardianName}}, {{.StudentName}} has an outstanding balance of UGX {{.Balance}} for {{.Term}} {{.Year}}. Please clear to avoid inconvenience.
```

### 3. Absent Alert
```
Dear {{.GuardianName}}, {{.StudentName}} was absent from school on {{.Date}}. Please contact the school if this is unexpected.
```

### 4. Results Published
```
Dear {{.GuardianName}}, {{.StudentName}}'s {{.ExamType}} results for {{.Term}} {{.Year}} are now available. Login to view.
```

### 5. General Announcement
```
{{.SchoolName}}: {{.Message}}
```

### 6. Medical Alert
```
URGENT: {{.StudentName}} visited the clinic on {{.Date}}. Diagnosis: {{.Diagnosis}}. Please contact the school immediately.
```

### 7. Exam Reminder
```
Dear {{.GuardianName}}, {{.StudentName}}'s {{.ExamName}} begins on {{.StartDate}}. Please ensure they are well prepared.
```

### 8. Term Opening
```
{{.SchoolName}}: {{.Term}} {{.Year}} begins on {{.StartDate}}. All students should report by {{.ReportTime}}.
```

## Setup Instructions

### 1. Run Migrations
```bash
./main migrate
```

### 2. Seed SMS Templates
```bash
./main seed-sms-templates
```

### 3. Configure Environment Variables

#### For Africa's Talking:
```env
AFRICASTALKING_API_KEY=your-api-key
AFRICASTALKING_USERNAME=sandbox
AFRICASTALKING_SENDER_ID=ACADISTRA
```

#### For Twilio:
```env
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Configure Provider via API
Use the `/api/v1/sms/provider` endpoint to configure your school's SMS provider.

## Usage Examples

### Example 1: Send Fees Reminder to All Parents
```go
// Get all guardians with outstanding fees
var guardians []Guardian
db.Joins("JOIN student_fees ON guardians.student_id = student_fees.student_id").
   Where("student_fees.outstanding > 0").
   Find(&guardians)

// Prepare recipients
recipients := []SMSRecipient{}
for _, guardian := range guardians {
    recipients = append(recipients, SMSRecipient{
        RecipientID:   &guardian.ID,
        RecipientType: "guardian",
        PhoneNumber:   guardian.Phone,
        Variables: map[string]interface{}{
            "GuardianName": guardian.FullName,
            "StudentName":  guardian.Student.FirstName,
            "Balance":      guardian.Student.Fees.Outstanding,
            "Term":         "Term 1",
            "Year":         "2025",
        },
    })
}

// Send bulk SMS
smsService.SendBulkSMS(ctx, BulkSMSRequest{
    SchoolID:   schoolID,
    Name:       "Term 1 Fees Reminder",
    Category:   "fees",
    TemplateID: &feesReminderTemplateID,
    Recipients: recipients,
    Priority:   5,
    CreatedBy:  userID,
})
```

### Example 2: Send Absence Alert
```go
// When marking attendance
if attendance.Status == "absent" {
    guardian := getGuardian(student.ID)
    
    smsService.SendSMS(ctx, SendSMSRequest{
        SchoolID:      schoolID,
        RecipientID:   &guardian.ID,
        RecipientType: "guardian",
        PhoneNumber:   guardian.Phone,
        Message:       fmt.Sprintf("Dear %s, %s was absent from school on %s.", 
                                   guardian.FullName, student.FirstName, time.Now().Format("02-Jan-2006")),
        Category:      "attendance",
        Priority:      3,  // High priority
        CreatedBy:     userID,
    })
}
```

### Example 3: Schedule Term Opening Reminder
```go
termStartDate := time.Date(2025, 2, 3, 8, 0, 0, 0, time.UTC)
reminderDate := termStartDate.AddDate(0, 0, -7)  // 7 days before

smsService.SendBulkSMS(ctx, BulkSMSRequest{
    SchoolID:   schoolID,
    Name:       "Term 1 Opening Reminder",
    Category:   "announcement",
    TemplateID: &termOpeningTemplateID,
    Recipients: allGuardianRecipients,
    Priority:   5,
    CreatedBy:  userID,
})
```

## Phone Number Normalization

The system automatically normalizes phone numbers to E.164 format:
- `0700123456` → `+256700123456`
- `700123456` → `+256700123456`
- `+256700123456` → `+256700123456`

## Cost Tracking

- Each SMS cost is tracked per message
- Batch total cost is calculated automatically
- Provider balance is updated (for supported providers)
- View costs in SMS logs and batch reports

## Retry Logic

- Failed SMS are automatically retried up to 3 times
- Retry interval: 100ms between messages (rate limiting)
- Status changes: `pending` → `sending` → `sent` or `failed`

## Scheduled SMS

SMS can be scheduled for future delivery:
```go
scheduledTime := time.Now().Add(24 * time.Hour)

smsService.SendSMS(ctx, SendSMSRequest{
    // ... other fields
    ScheduledFor: &scheduledTime,
})
```

The SMS scheduler runs every minute and processes scheduled messages.

## Monitoring

### Check Queue Status
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:8080/api/v1/sms/queue?status=pending
```

### Check Batch Progress
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:8080/api/v1/sms/batches
```

### View SMS Logs
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:8080/api/v1/sms/logs
```

## Security

- API keys and secrets are encrypted in database
- Only school admins can configure providers
- SMS logs are school-isolated
- Rate limiting prevents abuse

## Performance

- Asynchronous processing (goroutines)
- Batch operations for efficiency
- 100ms delay between messages (rate limiting)
- Database indexes on frequently queried fields

## Troubleshooting

### SMS Not Sending
1. Check provider configuration: `GET /api/v1/sms/provider`
2. Verify API credentials are correct
3. Check SMS queue: `GET /api/v1/sms/queue?status=failed`
4. Review error messages in queue

### High Costs
1. Review SMS logs for unnecessary sends
2. Implement sending limits per school
3. Use templates to reduce message length
4. Monitor batch operations

### Delivery Issues
1. Verify phone numbers are correct format
2. Check provider balance
3. Review provider-specific error codes
4. Test with sandbox mode first

## Future Enhancements

- [ ] Delivery reports from providers
- [ ] SMS analytics dashboard
- [ ] Cost budgets per school
- [ ] SMS approval workflow
- [ ] WhatsApp integration
- [ ] SMS scheduling UI
- [ ] Recipient groups management
- [ ] A/B testing for templates

## Support

For issues or questions:
- Email: support@acadistra.com
- Documentation: https://docs.acadistra.com/sms
