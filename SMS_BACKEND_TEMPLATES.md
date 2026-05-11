# SMS Backend & Templates Documentation

## Backend Readiness ✅

The backend is **fully ready** for bulk SMS communication with the following features:

### 1. SMS Service (`backend/internal/services/sms/service.go`)

#### Core Functions:
- ✅ `SendSMS()` - Queue single SMS
- ✅ `SendBulkSMS()` - Send to multiple recipients
- ✅ `SendBulkSMSToGuardiansAndStaff()` - Send to guardians and linked staff
- ✅ `GetProvider()` - Get SMS provider config
- ✅ `ConfigureProvider()` - Configure SMS provider
- ✅ `GetTemplates()` - Get SMS templates
- ✅ `CreateTemplate()` - Create new template
- ✅ `RenderTemplate()` - Render template with variables
- ✅ `GetQueue()` - Get SMS queue
- ✅ `GetBatches()` - Get SMS batches
- ✅ `GetLogs()` - Get SMS logs
- ✅ `GetStats()` - Get SMS statistics

#### Supported Providers:
- ✅ Africa's Talking
- ✅ Twilio
- ✅ Extensible for custom providers

#### Features:
- ✅ Automatic phone number normalization (Uganda format)
- ✅ Queue-based sending with retry logic
- ✅ Batch processing with rate limiting
- ✅ Cost tracking per SMS
- ✅ Delivery status tracking
- ✅ Template variable substitution
- ✅ Priority-based sending
- ✅ Scheduled SMS support
- ✅ Comprehensive logging

### 2. SMS Models (`backend/internal/models/sms.go`)

#### Tables:
- ✅ `sms_providers` - Provider configurations per school
- ✅ `sms_templates` - Reusable message templates
- ✅ `sms_queue` - Pending/processing SMS
- ✅ `sms_batches` - Bulk SMS operations
- ✅ `sms_logs` - Sent SMS history

### 3. SMS Handlers (`backend/internal/handlers/staff_sms_handler.go`)

#### Endpoints:
- ✅ `POST /sms/staff` - Send to staff members
- ✅ `POST /sms/staff/department` - Send to staff by department
- ✅ `POST /sms/parents` - Send to parents/guardians
- ✅ Supports filtering by class, department, role

## SMS Templates

### Template Categories

1. **Fees** - Payment reminders and confirmations
2. **Announcement** - General school announcements
3. **Event** - Event invitations and notices
4. **Reminder** - Meeting and deadline reminders
5. **Alert** - Urgent notifications
6. **Attendance** - Absence and lateness alerts
7. **Results** - Exam results notifications

### Template Variables

Templates use Go template syntax: `{{.VariableName}}`

#### Common Variables:
- `{{.RecipientName}}` - Recipient's name
- `{{.GuardianName}}` - Guardian's name
- `{{.StudentName}}` - Student's name
- `{{.ClassName}}` - Student's class
- `{{.Date}}` - Date
- `{{.Time}}` - Time
- `{{.Message}}` - Custom message

### Fees Templates (4 templates)

#### 1. Outstanding Balance
```
Dear {{.GuardianName}}, this is a reminder that {{.StudentName}} ({{.ClassName}}) has an outstanding school fees balance of UGX {{.OutstandingBalance}}. Please make payment at your earliest convenience. Thank you.
```

**Variables**: GuardianName, StudentName, ClassName, OutstandingBalance

#### 2. Payment Due
```
Dear {{.GuardianName}}, the school fees payment for {{.StudentName}} is due on {{.DueDate}}. Outstanding amount: UGX {{.OutstandingBalance}}. Please pay to avoid late fees. Thank you.
```

**Variables**: GuardianName, StudentName, DueDate, OutstandingBalance

#### 3. Partial Payment
```
Dear {{.GuardianName}}, we acknowledge your partial payment of UGX {{.AmountPaid}} for {{.StudentName}}. Remaining balance: UGX {{.OutstandingBalance}}. Thank you.
```

**Variables**: GuardianName, StudentName, AmountPaid, OutstandingBalance

#### 4. Final Notice
```
FINAL NOTICE: Dear {{.GuardianName}}, {{.StudentName}} has an outstanding balance of UGX {{.OutstandingBalance}}. Please clear this by {{.DeadlineDate}} to avoid consequences. Contact the bursar for assistance.
```

**Variables**: GuardianName, StudentName, OutstandingBalance, DeadlineDate

### General Communication Templates (6 templates)

#### 1. General Announcement
```
Dear {{.RecipientName}}, {{.Message}} For more information, contact the school office. Thank you.
```

**Variables**: RecipientName, Message

#### 2. School Closure Notice
```
Dear {{.RecipientName}}, the school will be closed on {{.Date}} due to {{.Reason}}. Classes will resume on {{.ResumeDate}}. Thank you.
```

**Variables**: RecipientName, Date, Reason, ResumeDate

#### 3. Event Invitation
```
Dear {{.RecipientName}}, you are invited to {{.EventName}} on {{.EventDate}} at {{.EventTime}}. Venue: {{.Venue}}. Your presence is highly appreciated.
```

**Variables**: RecipientName, EventName, EventDate, EventTime, Venue

#### 4. Meeting Reminder
```
Dear {{.RecipientName}}, this is a reminder about the {{.MeetingType}} scheduled for {{.Date}} at {{.Time}}. Venue: {{.Venue}}. Attendance is {{.AttendanceType}}.
```

**Variables**: RecipientName, MeetingType, Date, Time, Venue, AttendanceType

#### 5. Emergency Alert
```
URGENT: Dear {{.RecipientName}}, {{.AlertMessage}} Please take immediate action. For assistance, call {{.ContactNumber}}.
```

**Variables**: RecipientName, AlertMessage, ContactNumber

#### 6. Holiday Notice
```
Dear {{.RecipientName}}, the school will observe a holiday on {{.HolidayDate}} for {{.HolidayName}}. Classes will resume on {{.ResumeDate}}. Enjoy the break!
```

**Variables**: RecipientName, HolidayDate, HolidayName, ResumeDate

### Attendance Templates (3 templates)

#### 1. Absence Alert
```
Dear {{.GuardianName}}, {{.StudentName}} was absent from school on {{.Date}}. If this was unplanned, please contact the school immediately. Thank you.
```

**Variables**: GuardianName, StudentName, Date

#### 2. Late Arrival Notice
```
Dear {{.GuardianName}}, {{.StudentName}} arrived late to school today at {{.ArrivalTime}}. Please ensure punctuality. Thank you.
```

**Variables**: GuardianName, StudentName, ArrivalTime

#### 3. Multiple Absences Warning
```
Dear {{.GuardianName}}, {{.StudentName}} has been absent for {{.DaysAbsent}} days this term. Excessive absences affect academic performance. Please contact the school.
```

**Variables**: GuardianName, StudentName, DaysAbsent

### Results Templates (3 templates)

#### 1. Results Ready
```
Dear {{.GuardianName}}, {{.StudentName}}'s {{.ExamType}} results for {{.Term}} {{.Year}} are now available. Please visit the school or check the parent portal. Thank you.
```

**Variables**: GuardianName, StudentName, ExamType, Term, Year

#### 2. Excellent Performance
```
Dear {{.GuardianName}}, congratulations! {{.StudentName}} achieved excellent results in {{.ExamType}} with an average of {{.Average}}%. Keep up the great work!
```

**Variables**: GuardianName, StudentName, ExamType, Average

#### 3. Performance Concern
```
Dear {{.GuardianName}}, {{.StudentName}}'s performance in {{.ExamType}} requires attention. Please schedule a meeting with the class teacher to discuss improvement strategies.
```

**Variables**: GuardianName, StudentName, ExamType

### Parent-Teacher Meeting Templates (2 templates)

#### 1. PTM Invitation
```
Dear {{.GuardianName}}, you are invited to the Parent-Teacher Meeting on {{.Date}} from {{.StartTime}} to {{.EndTime}}. Please confirm your attendance. Thank you.
```

**Variables**: GuardianName, Date, StartTime, EndTime

#### 2. PTM Reminder
```
Dear {{.GuardianName}}, reminder: Parent-Teacher Meeting is tomorrow, {{.Date}} at {{.Time}}. Your attendance is important for {{.StudentName}}'s progress.
```

**Variables**: GuardianName, Date, Time, StudentName

### Payment Confirmation Templates (2 templates)

#### 1. Payment Received
```
Dear {{.GuardianName}}, we confirm receipt of UGX {{.Amount}} for {{.StudentName}}. Receipt No: {{.ReceiptNo}}. New balance: UGX {{.NewBalance}}. Thank you.
```

**Variables**: GuardianName, Amount, StudentName, ReceiptNo, NewBalance

#### 2. Payment Cleared
```
Dear {{.GuardianName}}, congratulations! {{.StudentName}}'s school fees for {{.Term}} {{.Year}} have been fully paid. Receipt No: {{.ReceiptNo}}. Thank you for your prompt payment.
```

**Variables**: GuardianName, StudentName, Term, Year, ReceiptNo

### Staff Communication Templates (3 templates)

#### 1. Staff Meeting
```
Dear {{.StaffName}}, staff meeting scheduled for {{.Date}} at {{.Time}} in {{.Venue}}. Agenda: {{.Agenda}}. Attendance is mandatory.
```

**Variables**: StaffName, Date, Time, Venue, Agenda

#### 2. Duty Reminder
```
Dear {{.StaffName}}, you are on duty on {{.Date}} from {{.StartTime}} to {{.EndTime}}. Please report on time. Thank you.
```

**Variables**: StaffName, Date, StartTime, EndTime

#### 3. Document Submission
```
Dear {{.StaffName}}, reminder to submit {{.DocumentName}} by {{.Deadline}}. Contact the admin office if you need assistance. Thank you.
```

**Variables**: StaffName, DocumentName, Deadline

## Installation

### 1. Run Migration
```bash
cd backend
psql -U postgres -d acadistra -f migrations/seed_sms_templates.sql
```

### 2. Verify Templates
```sql
SELECT name, category, COUNT(*) 
FROM sms_templates 
WHERE school_id IS NULL 
GROUP BY category, name 
ORDER BY category, name;
```

Expected output: 23 system-wide templates across 7 categories

## Usage Examples

### Frontend Usage

#### Using Template in Bulk Communication
```typescript
// Load template
const template = templates.find(t => t.name === 'General Announcement');

// Render with variables
const message = template.template
  .replace('{{.RecipientName}}', recipient.name)
  .replace('{{.Message}}', customMessage);

// Send SMS
await smsService.sendSMS({
  recipient_id: recipient.id,
  recipient_type: recipient.type,
  phone_number: recipient.phone,
  message: message,
  category: 'announcement',
});
```

#### Using Template for Fees Reminder
```typescript
const template = templates.find(t => t.name === 'Fees Reminder - Outstanding Balance');

const message = template.template
  .replace('{{.GuardianName}}', guardian.full_name)
  .replace('{{.StudentName}}', student.full_name)
  .replace('{{.ClassName}}', student.class_name)
  .replace('{{.OutstandingBalance}}', outstanding.toLocaleString());
```

### Backend Usage

#### Send with Template
```go
// Get template
template, _ := smsService.GetTemplateByName(schoolID, "Fees Reminder - Outstanding Balance")

// Render with variables
vars := map[string]interface{}{
    "GuardianName": guardian.FullName,
    "StudentName": student.FirstName + " " + student.LastName,
    "ClassName": class.Name,
    "OutstandingBalance": fmt.Sprintf("%.0f", outstanding),
}

message, _ := smsService.RenderTemplate(template.ID, vars)

// Send SMS
smsService.SendSMS(ctx, sms.SendSMSRequest{
    SchoolID: schoolID,
    RecipientID: &guardian.ID,
    RecipientType: "guardian",
    PhoneNumber: guardian.Phone,
    Message: message,
    Category: "fees",
    CreatedBy: userID,
})
```

## API Endpoints

### Get Templates
```http
GET /api/v1/sms/templates
Authorization: Bearer {token}
```

Response:
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Fees Reminder - Outstanding Balance",
      "category": "fees",
      "template": "Dear {{.GuardianName}}...",
      "variables": ["GuardianName", "StudentName", "ClassName", "OutstandingBalance"],
      "is_active": true
    }
  ]
}
```

### Create Custom Template
```http
POST /api/v1/sms/templates
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Custom Announcement",
  "category": "announcement",
  "template": "Dear {{.Name}}, {{.Message}}",
  "variables": ["Name", "Message"]
}
```

### Send Bulk SMS
```http
POST /api/v1/sms/bulk
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Term Opening Announcement",
  "category": "announcement",
  "message": "School reopens on January 15th",
  "recipients": [
    {
      "recipient_id": "uuid",
      "recipient_type": "parent",
      "phone_number": "+256700000000"
    }
  ]
}
```

## Template Management

### Creating School-Specific Templates

Schools can create custom templates:

```sql
INSERT INTO sms_templates (id, school_id, name, category, template, variables, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'school-uuid-here',
    'Custom School Template',
    'announcement',
    'Dear {{.Name}}, {{.CustomMessage}}',
    '["Name", "CustomMessage"]'::jsonb,
    true,
    NOW(),
    NOW()
);
```

### Deactivating Templates

```sql
UPDATE sms_templates 
SET is_active = false 
WHERE name = 'Template Name';
```

### Updating Templates

```sql
UPDATE sms_templates 
SET template = 'New template text with {{.Variables}}',
    variables = '["Variables"]'::jsonb,
    updated_at = NOW()
WHERE name = 'Template Name';
```

## Best Practices

### 1. Template Design
- Keep messages under 160 characters when possible
- Use clear, professional language
- Include school name in important messages
- Always end with "Thank you" or similar closing

### 2. Variable Naming
- Use PascalCase for variables: `{{.StudentName}}`
- Be descriptive: `{{.OutstandingBalance}}` not `{{.Amount}}`
- Keep variable names consistent across templates

### 3. Message Personalization
- Always address recipient by name
- Include relevant context (student name, class, etc.)
- Provide actionable information

### 4. Testing
- Test templates with sample data before bulk sending
- Verify variable substitution works correctly
- Check message length after variable substitution

### 5. Compliance
- Include opt-out information for marketing messages
- Respect quiet hours (avoid 9 PM - 8 AM)
- Keep records of consent for SMS communication

## Monitoring

### Check SMS Statistics
```sql
SELECT 
    category,
    status,
    COUNT(*) as count,
    SUM(cost) as total_cost
FROM sms_logs
WHERE school_id = 'school-uuid'
    AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY category, status
ORDER BY category, status;
```

### Check Template Usage
```sql
SELECT 
    t.name,
    t.category,
    COUNT(q.id) as times_used
FROM sms_templates t
LEFT JOIN sms_queue q ON q.metadata->>'template_id' = t.id::text
WHERE t.school_id = 'school-uuid' OR t.school_id IS NULL
GROUP BY t.id, t.name, t.category
ORDER BY times_used DESC;
```

### Check Failed Messages
```sql
SELECT 
    phone_number,
    message,
    error_message,
    attempts,
    created_at
FROM sms_queue
WHERE school_id = 'school-uuid'
    AND status = 'failed'
ORDER BY created_at DESC
LIMIT 50;
```

## Troubleshooting

### Templates Not Loading
- Check database connection
- Verify `sms_templates` table exists
- Run seed migration if templates missing
- Check `is_active = true` in query

### Variables Not Substituting
- Verify variable names match exactly (case-sensitive)
- Check template syntax: `{{.VariableName}}`
- Ensure variables passed as map[string]interface{}
- Test with RenderTemplate function

### SMS Not Sending
- Verify provider configured and active
- Check provider credentials
- Verify phone numbers in E.164 format
- Check SMS queue for errors
- Verify sufficient provider balance

## Summary

✅ **Backend is fully ready** for bulk SMS communication  
✅ **23 pre-built templates** across 7 categories  
✅ **Template system** supports variables and customization  
✅ **Queue-based sending** with retry logic  
✅ **Comprehensive logging** and monitoring  
✅ **Multi-provider support** (Africa's Talking, Twilio)  
✅ **Cost tracking** and delivery status  
✅ **Batch processing** for bulk operations  

The system is production-ready and can handle bulk SMS communication for fees reminders, general announcements, and all other school communication needs.
