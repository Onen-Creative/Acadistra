# Troubleshooting: Announcements Not Being Sent

## Problem
Announcements are not being sent to users in production.

## Root Causes

### 1. Email Service Not Configured
The most common issue is missing or incorrect SMTP configuration.

**Check:**
```bash
./scripts/check-email-config.sh
```

**Fix:**
Add these variables to `.env.production`:
```bash
# Email Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@acadistra.com
```

For Gmail:
1. Enable 2-factor authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the App Password (not your regular password)

### 2. Email Queue Not Processing
The email queue processor runs in the background but may fail silently.

**Check logs:**
```bash
docker logs acadistra_backend | grep -i "email"
docker logs acadistra_backend | grep -i "queue"
```

**Look for:**
- "Daily email counter reset" - Queue processor is running
- "Successfully sent queued email" - Emails are being sent
- "Failed to send queued email" - Email sending errors
- "Email service not configured" - SMTP not set up

### 3. Database Issues
Announcements and notifications are stored in the database.

**Check tables exist:**
```bash
docker exec -it acadistra_postgres psql -U acadistra -d acadistra -c "\dt system_announcements"
docker exec -it acadistra_postgres psql -U acadistra -d acadistra -c "\dt user_notifications"
```

**Check for pending emails:**
```bash
docker exec -it acadistra_postgres psql -U acadistra -d acadistra -c "SELECT COUNT(*) FROM email_queue WHERE status = 'pending';"
```

### 4. User Targeting Issues
Announcements may not reach users if targeting is incorrect.

**Check:**
- Target roles are correct (admin, teacher, parent, etc.)
- Users have the correct role assigned
- Users are active (`is_active = true`)
- School filtering is correct (for school-specific announcements)

## Step-by-Step Fix

### Step 1: Verify Email Configuration
```bash
cd /path/to/acadistra
./scripts/check-email-config.sh
```

### Step 2: Update Environment Variables
Edit `.env.production` and add/update SMTP settings:
```bash
nano .env.production
```

### Step 3: Restart Services
```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### Step 4: Check Logs
```bash
# Watch logs in real-time
docker logs -f acadistra_backend

# Filter for email-related logs
docker logs acadistra_backend 2>&1 | grep -i email
```

### Step 5: Test Announcement
1. Log in as system_admin or school_admin
2. Go to Announcements
3. Create a test announcement
4. Target a specific role (e.g., "teacher")
5. Enable "Send Email"
6. Click "Send"

### Step 6: Verify Delivery
Check the response for:
- `total_sent`: Number of emails queued successfully
- `total_failed`: Number of emails that failed

Check user notifications:
```bash
docker exec -it acadistra_postgres psql -U acadistra -d acadistra -c "SELECT * FROM user_notifications ORDER BY created_at DESC LIMIT 5;"
```

Check email queue:
```bash
docker exec -it acadistra_postgres psql -U acadistra -d acadistra -c "SELECT id, to_email, subject, status, attempts, error FROM email_queue ORDER BY created_at DESC LIMIT 10;"
```

## Common Errors

### "Email service not configured"
**Cause:** SMTP environment variables are missing or incorrect.
**Fix:** Add SMTP configuration to `.env.production` and restart.

### "Daily email limit reached"
**Cause:** Gmail/SMTP provider has daily sending limits (Gmail: 500/day).
**Fix:** Wait until tomorrow or upgrade to a transactional email service (SendGrid, Mailgun, AWS SES).

### "Authentication failed"
**Cause:** Incorrect SMTP username or password.
**Fix:** 
- For Gmail: Use App Password, not regular password
- Verify credentials are correct
- Check if 2FA is enabled (required for Gmail App Passwords)

### Emails stuck in "pending" status
**Cause:** Email queue processor not running or SMTP connection issues.
**Fix:**
1. Check backend logs for errors
2. Verify SMTP credentials
3. Restart backend container
4. Check network connectivity to SMTP server

## Monitoring

### Check Email Queue Stats
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/v1/email-queue/stats
```

### View Recent Email Queue Items
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/v1/email-queue
```

### Database Queries
```sql
-- Pending emails
SELECT COUNT(*) FROM email_queue WHERE status = 'pending';

-- Failed emails
SELECT to_email, subject, error, attempts 
FROM email_queue 
WHERE status = 'failed' 
ORDER BY updated_at DESC 
LIMIT 10;

-- Recent announcements
SELECT id, title, status, total_sent, total_failed, sent_at 
FROM system_announcements 
ORDER BY created_at DESC 
LIMIT 10;

-- User notifications
SELECT u.email, un.title, un.is_read, un.created_at
FROM user_notifications un
JOIN users u ON un.user_id = u.id
ORDER BY un.created_at DESC
LIMIT 10;
```

## Alternative: Use Transactional Email Service

For production, consider using a dedicated email service:

### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
```

### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USERNAME=postmaster@yourdomain.com
SMTP_PASSWORD=your-mailgun-password
SMTP_FROM=noreply@yourdomain.com
```

### AWS SES
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USERNAME=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM=noreply@yourdomain.com
```

## Prevention

1. **Monitor email queue regularly** - Set up alerts for failed emails
2. **Use transactional email service** - More reliable than Gmail for production
3. **Test after deployment** - Always send a test announcement after deploying
4. **Check logs daily** - Look for email-related errors
5. **Set up proper monitoring** - Use Prometheus/Grafana to track email metrics

## Support

If issues persist:
1. Check logs: `docker logs acadistra_backend 2>&1 | grep -i email > email-logs.txt`
2. Export email queue: `docker exec -it acadistra_postgres psql -U acadistra -d acadistra -c "COPY (SELECT * FROM email_queue WHERE status = 'failed') TO STDOUT CSV HEADER" > failed-emails.csv`
3. Contact support with logs and error details
