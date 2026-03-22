# Email Notifications System - Acadistra

## Overview

Acadistra has a comprehensive email notification system that automatically sends emails for all key events in the school management system. All emails are sent from **admin@acadistra.com** using Gmail SMTP.

**Cost: 100% FREE** ✅
- Cloudflare Email Routing: Free (unlimited emails)
- Gmail SMTP: Free (15GB storage)
- No third-party email service fees
- No per-email charges

## Configuration

### SMTP Settings

Email notifications are configured in `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=onendavid23@gmail.com
SMTP_PASSWORD=zcif tdkf rcfp iheq
SMTP_FROM=admin@acadistra.com
SMTP_FROM_NAME=Acadistra
SMTP_REPLY_TO=admin@acadistra.com
```

## Email Types

### 1. Password Reset Email

**Trigger**: User requests password reset
**Recipient**: User's email address
**Content**: 
- Password reset link (valid for 24 hours)
- Instructions to create new password
- Security warning if not requested

**API Endpoint**:
```
POST /api/v1/auth/password-reset/request
Body: { "email": "user@acadistra.com" }
```

**Confirmation Endpoint**:
```
POST /api/v1/auth/password-reset/confirm
Body: { "token": "reset_token", "new_password": "NewPassword123" }
```

---

### 2. Welcome Email

**Trigger**: New user account created
**Recipient**: New user's email
**Content**:
- Welcome message
- Login credentials (email + temporary password)
- School/role assignment
- Instructions to change password on first login
- Link to login page

**Sent When**:
- System admin creates school admin
- School admin creates staff (teacher, bursar, librarian, nurse, etc.)
- School admin creates other users

---

### 3. Attendance Alert Email

**Trigger**: Attendance report generated or low attendance detected
**Recipient**: Parent/Guardian email
**Content**:
- Student name
- Attendance rate (percentage)
- Days present vs total days
- Alert if attendance < 80%
- Recommendation to ensure regular attendance

**Data Included**:
- Attendance percentage
- Present count
- Total days
- Report date

---

### 4. Grade Alert Email

**Trigger**: New grade recorded for student
**Recipient**: Parent/Guardian email
**Content**:
- Student name
- Subject name
- Grade received
- Term/period
- Link to view detailed performance

**Sent For**:
- Test scores
- Assignment grades
- Exam results
- Term grades

---

### 5. Fees Invoice Email

**Trigger**: Fees recorded or updated for student
**Recipient**: Parent/Guardian email
**Content**:
- Student name
- Total fees amount
- Amount paid
- Outstanding balance
- Payment deadline
- Payment instructions

**Format**: HTML invoice with professional styling

---

### 6. Payment Confirmation Email

**Trigger**: Payment successfully processed
**Recipient**: Parent/Guardian email
**Content**:
- Student name
- Amount paid
- Payment method (Mobile Money, Bank Transfer, etc.)
- Transaction ID
- Payment date
- Receipt reference

**Status**: Shows "PAID" confirmation

---

### 7. Health Alert Email

**Trigger**: Health issue recorded in clinic
**Recipient**: Parent/Guardian email
**Content**:
- Student name
- Health issue description
- Date reported
- Recommendation to contact clinic
- Clinic contact information

**Sent For**:
- Medical visits
- Health concerns
- Medication administration
- Emergency incidents

---

### 8. Requisition Status Email

**Trigger**: Requisition approved, rejected, or marked paid
**Recipient**: Staff member who created requisition
**Content**:
- Requisition ID
- Status (Approved/Rejected/Paid)
- Reason (if rejected)
- Next steps
- Link to dashboard

**Status Types**:
- ✅ Approved
- ❌ Rejected
- 💰 Marked Paid

---

### 9. Payroll Notification Email

**Trigger**: Monthly payroll processed
**Recipient**: Staff member email
**Content**:
- Staff name
- Month and year
- Salary amount
- Link to view payslip
- Deductions summary
- Net amount

**Sent To**: All staff with salary structures

---

### 10. Student Registration Confirmation Email

**Trigger**: Student successfully registered
**Recipient**: Parent/Guardian email
**Content**:
- Student name
- Admission number
- School name
- Registration confirmation
- Instructions for parent portal access
- Next steps

---

### 11. Results Notification Email

**Trigger**: Term results published
**Recipient**: Parent/Guardian email
**Content**:
- Student name
- Term and year
- Results available notification
- Link to parent portal
- Instructions to view detailed report card

---

## Email Service Methods

### Core Email Sending

```go
// Generic email sending
emailService.SendEmail(EmailRequest{
    To:      []string{"recipient@example.com"},
    Subject: "Email Subject",
    Body:    "Email body (HTML or plain text)",
    IsHTML:  true,
})
```

### Specific Email Methods

```go
// Password reset
emailService.SendPasswordResetEmail(email, userName, resetLink)

// Welcome email
emailService.SendWelcomeEmail(email, userName, role, schoolName, tempPassword)

// Attendance alert
emailService.SendAttendanceAlert(email, studentName, date, presentCount, totalDays)

// Grade alert
emailService.SendGradeAlert(email, studentName, subject, grade, term)

// Fees invoice
emailService.SendFeesInvoice(email, studentName, amount, paid, balance, term, year)

// Payment confirmation
emailService.SendPaymentConfirmation(email, studentName, amount, paymentMethod, transactionID)

// Health alert
emailService.SendHealthAlert(email, studentName, issue, date)

// Requisition status
emailService.SendRequisitionStatusEmail(email, requisitionID, status, reason)

// Payroll notification
emailService.SendPayrollNotification(email, staffName, month, year, amount)

// Registration confirmation
emailService.SendRegistrationConfirmation(email, studentName, admissionNumber, schoolName)

// Results notification
emailService.SendResultsNotification(email, studentName, term, year)
```

## Email Templates

All emails use professional HTML templates with:
- Acadistra branding
- Consistent styling
- Clear call-to-action buttons
- Footer with copyright
- Responsive design for mobile

### Template Features

- **Header**: Branded header with Acadistra logo colors
- **Content**: Clear, readable content with proper spacing
- **Buttons**: Action buttons for important links
- **Footer**: Copyright and contact information
- **Colors**: 
  - Primary: #4F46E5 (Indigo)
  - Success: #28a745 (Green)
  - Alert: #dc3545 (Red)
  - Warning: #ffc107 (Yellow)

## Sending Emails Asynchronously

All emails are sent asynchronously using goroutines to prevent blocking:

```go
go emailService.SendWelcomeEmail(email, name, role, school, password)
```

This ensures the API responds quickly while emails are sent in the background.

## Error Handling

If email sending fails:
- Error is logged but doesn't block the operation
- User can retry from dashboard
- Admin can resend emails manually

## Email Preferences

Users can manage email preferences:

```
GET  /api/v1/notifications/preferences
PUT  /api/v1/notifications/preferences
```

Preferences include:
- Email notifications enabled/disabled
- Notification types to receive
- Frequency (immediate, daily digest, weekly)

## Testing Emails

### Test Password Reset
```bash
curl -X POST http://localhost:8080/api/v1/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acadistra.com"}'
```

### Test Welcome Email
Create a new user through the admin panel - welcome email will be sent automatically.

### Test Other Emails
- Record attendance → Attendance alert sent
- Record grades → Grade alert sent
- Record fees → Fees invoice sent
- Process payment → Payment confirmation sent
- Record health visit → Health alert sent
- Create requisition → Status email sent when approved/rejected
- Process payroll → Payroll notification sent

## Email Logs

All sent emails are logged in the database for audit purposes:
- Recipient email
- Subject
- Timestamp
- Status (sent/failed)
- Error message (if failed)

## Troubleshooting

### Emails Not Sending

1. **Check SMTP Configuration**
   ```bash
   # Verify .env has correct SMTP settings
   echo $SMTP_HOST
   echo $SMTP_USER
   ```

2. **Check Gmail App Password**
   - Ensure 2FA is enabled on Gmail
   - Generate new App Password if needed
   - Update SMTP_PASSWORD in .env

3. **Check Email Service Initialization**
   - Verify emailService is passed to handlers
   - Check for nil pointer errors in logs

4. **Check Network**
   - Ensure server can reach smtp.gmail.com:587
   - Check firewall rules

### Emails Going to Spam

1. **Add SPF Record** (already configured by Cloudflare)
2. **Add DKIM Record** (already configured by Cloudflare)
3. **Add DMARC Record** (already configured by Cloudflare)
4. **Warm up domain** by sending gradually

### Email Delays

- Emails are sent asynchronously
- Check server logs for errors
- Verify Gmail isn't rate-limiting

## Best Practices

1. **Always use templates** for consistent branding
2. **Send asynchronously** to avoid blocking requests
3. **Include action links** for important emails
4. **Test in development** before production
5. **Monitor email delivery** through logs
6. **Keep templates updated** with latest branding
7. **Use clear subject lines** for better open rates
8. **Include unsubscribe option** in preferences

## Future Enhancements

- [ ] Email scheduling (send at specific times)
- [ ] Email templates customization per school
- [ ] Bulk email sending
- [ ] Email analytics (open rates, click rates)
- [ ] SMS fallback for critical emails
- [ ] Email retry logic for failed sends
- [ ] Email preview in dashboard
- [ ] Custom email signatures per school

## Support

For email-related issues:
- Check logs: `docker logs acadistra_backend`
- Verify SMTP settings in .env
- Test with curl commands
- Contact: support@acadistra.com
