# Announcements Not Working? Quick Fix

If announcements are not being sent to users in production, run this command:

```bash
./scripts/fix-announcements.sh
```

This script will:
1. ✅ Check if containers are running
2. ✅ Verify email configuration
3. ✅ Check database tables
4. ✅ Inspect email queue status
5. ✅ Review backend logs
6. ✅ Verify email queue processor

## Most Common Issue: Missing Email Configuration

Add these to your `.env.production` file:

```bash
# Email Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@acadistra.com
```

**For Gmail:**
1. Enable 2-factor authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the App Password (not your regular password)

Then restart:
```bash
docker compose -f docker-compose.prod.yml restart backend
```

## Check Email Queue Status

```bash
# View pending emails
docker exec acadistra_postgres psql -U acadistra -d acadistra -c \
  "SELECT COUNT(*) FROM email_queue WHERE status = 'pending';"

# View failed emails
docker exec acadistra_postgres psql -U acadistra -d acadistra -c \
  "SELECT to_email, subject, error FROM email_queue WHERE status = 'failed' LIMIT 5;"
```

## Monitor Email Sending

```bash
# Watch logs in real-time
docker logs -f acadistra_backend | grep -i email

# Check for successful sends
docker logs acadistra_backend 2>&1 | grep "Successfully sent queued email"
```

## Full Troubleshooting Guide

See [TROUBLESHOOTING_ANNOUNCEMENTS.md](./TROUBLESHOOTING_ANNOUNCEMENTS.md) for detailed troubleshooting steps.

## Alternative Email Providers

For production, consider using a transactional email service instead of Gmail:

- **SendGrid** - 100 emails/day free
- **Mailgun** - 5,000 emails/month free
- **AWS SES** - 62,000 emails/month free (if hosted on AWS)

These are more reliable and have higher sending limits than Gmail.
