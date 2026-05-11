# SMS Features Deployment Checklist

## Pre-Deployment

- [ ] Backend SMS service is running
- [ ] Database has `sms_templates`, `sms_queue`, `sms_batches`, `sms_logs`, `sms_providers` tables
- [ ] SMS provider (Africa's Talking or Twilio) account created
- [ ] SMS provider API credentials obtained

## Database Setup

### 1. Run SMS Templates Migration
```bash
cd backend
psql -U postgres -d acadistra -f migrations/seed_sms_templates.sql
```

### 2. Verify Templates Loaded
```bash
psql -U postgres -d acadistra -c "SELECT category, COUNT(*) FROM sms_templates WHERE school_id IS NULL GROUP BY category;"
```

Expected output:
```
   category   | count 
--------------+-------
 announcement |     6
 fees         |     6
 event        |     2
 reminder     |     4
 alert        |     1
 attendance   |     3
 results      |     3
```

## Frontend Deployment

### 1. Build Frontend
```bash
cd frontend
npm run build
```

### 2. Deploy Frontend
```bash
# If using Docker
docker compose -f docker-compose.prod.yml up -d frontend

# If using standalone
npm run start
```

## Backend Deployment

### 1. Rebuild Backend (if needed)
```bash
cd backend
go build -o main cmd/api/main.go
```

### 2. Restart Backend
```bash
# If using Docker
docker compose -f docker-compose.prod.yml restart backend

# If using systemd
sudo systemctl restart acadistra-backend
```

## Configuration

### 1. Configure SMS Provider (via UI)
1. Login as admin
2. Navigate to SMS Management
3. Click "Configure Provider"
4. Select provider (Africa's Talking or Twilio)
5. Enter credentials:
   - **Africa's Talking**:
     - API Key
     - Username
     - Sender ID (optional)
   - **Twilio**:
     - Account SID (as Username)
     - Auth Token (as API Key)
     - Phone Number (as Sender ID)
6. Save configuration

### 2. Test SMS Sending
1. Go to "Send SMS" tab
2. Enter test phone number
3. Type test message
4. Click "Send SMS"
5. Check "Queue" tab for status
6. Verify SMS received

## Feature Testing

### Bulk Fees Reminder
- [ ] Navigate to "Bulk Fees Reminder"
- [ ] Select "All Classes"
- [ ] Click "Load Students with Outstanding Fees"
- [ ] Verify students displayed
- [ ] Check console logs for fetch counts
- [ ] Send to 1-2 test students first
- [ ] Verify SMS received
- [ ] Check "Logs" tab for delivery status

### Bulk Communication
- [ ] Navigate to "Bulk Communication"
- [ ] Select "Staff Only"
- [ ] Click "Load Recipients"
- [ ] Verify staff displayed
- [ ] Compose test message
- [ ] Send to 1-2 test staff first
- [ ] Verify SMS received
- [ ] Repeat for "Parents Only"
- [ ] Repeat for "All (Staff & Parents)"

### Templates
- [ ] Navigate to "Templates" tab
- [ ] Verify 23 templates loaded
- [ ] Test creating custom template
- [ ] Test using template in "Send SMS"

## Monitoring

### 1. Check SMS Queue
```sql
SELECT status, COUNT(*) 
FROM sms_queue 
WHERE school_id = 'your-school-id' 
GROUP BY status;
```

### 2. Check SMS Logs
```sql
SELECT 
    DATE(created_at) as date,
    status,
    COUNT(*) as count,
    SUM(cost) as total_cost
FROM sms_logs
WHERE school_id = 'your-school-id'
    AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), status
ORDER BY date DESC, status;
```

### 3. Check Failed Messages
```sql
SELECT 
    phone_number,
    LEFT(message, 50) as message_preview,
    error_message,
    attempts,
    created_at
FROM sms_queue
WHERE school_id = 'your-school-id'
    AND status = 'failed'
ORDER BY created_at DESC
LIMIT 20;
```

## Troubleshooting

### Issue: Classes not displaying in filter
**Solution**: 
- Check browser console for errors
- Verify classes exist in database
- Check backend logs for API errors

### Issue: Students not loading
**Solution**:
- Check console logs for fetch count
- Verify students have guardians with phone numbers
- Check backend student limit (should be 10,000)

### Issue: SMS not sending
**Solution**:
- Verify provider configured and active
- Check provider credentials
- Verify phone numbers in correct format (+256...)
- Check provider account balance
- Check backend logs for errors

### Issue: Templates not loading
**Solution**:
- Run seed migration again
- Check `sms_templates` table exists
- Verify templates have `is_active = true`

### Issue: Duplicate messages
**Solution**:
- Check guardian deduplication logic
- Verify guardian IDs are unique
- Check console logs for duplicate detection

## Performance Optimization

### 1. Database Indexes
```sql
-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sms_queue_status_school ON sms_queue(school_id, status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_school_date ON sms_logs(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_templates_category ON sms_templates(category, is_active);
```

### 2. Queue Processing
Ensure SMS queue processor is running:
```bash
# Check if queue processor is running
ps aux | grep "sms-processor"

# If not running, start it
cd backend
./main process-sms-queue &
```

### 3. Rate Limiting
Configure rate limits in provider settings to avoid throttling:
- Africa's Talking: ~100 SMS/second
- Twilio: ~1 SMS/second (default)

## Cost Management

### 1. Monitor SMS Costs
```sql
SELECT 
    DATE_TRUNC('month', created_at) as month,
    category,
    COUNT(*) as sms_count,
    SUM(cost) as total_cost
FROM sms_logs
WHERE school_id = 'your-school-id'
    AND status = 'sent'
GROUP BY DATE_TRUNC('month', created_at), category
ORDER BY month DESC, category;
```

### 2. Set Budget Alerts
- Monitor provider account balance
- Set up low balance alerts
- Configure spending limits if available

### 3. Optimize Message Length
- Keep messages under 160 characters
- Longer messages cost multiple SMS units
- Use templates to standardize length

## Security

### 1. Protect API Credentials
- Store credentials in environment variables
- Never commit credentials to git
- Rotate credentials periodically

### 2. Audit SMS Sending
```sql
SELECT 
    u.full_name as sent_by,
    COUNT(*) as sms_sent,
    SUM(s.cost) as total_cost
FROM sms_queue s
JOIN users u ON s.created_by = u.id
WHERE s.school_id = 'your-school-id'
    AND s.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.full_name
ORDER BY sms_sent DESC;
```

### 3. Rate Limiting
- Implement per-user sending limits
- Monitor for abuse patterns
- Set daily/monthly caps

## Backup

### 1. Backup SMS Templates
```bash
pg_dump -U postgres -d acadistra -t sms_templates > sms_templates_backup.sql
```

### 2. Backup SMS Logs
```bash
pg_dump -U postgres -d acadistra -t sms_logs > sms_logs_backup.sql
```

## Post-Deployment

- [ ] Test all SMS features
- [ ] Train staff on SMS usage
- [ ] Document SMS costs and budgets
- [ ] Set up monitoring alerts
- [ ] Schedule regular audits
- [ ] Create user guide for staff

## Support Contacts

- **Technical Issues**: Check backend logs and database
- **Provider Issues**: Contact SMS provider support
- **Feature Requests**: Document and prioritize

## Success Metrics

Track these metrics weekly:
- Total SMS sent
- Delivery success rate
- Average cost per SMS
- Most used templates
- Failed message rate
- User adoption rate

## Files Modified/Created

### Frontend
- ✅ `frontend/src/app/sms/page.tsx` - Added bulk communication feature
- ✅ `frontend/src/services/api.ts` - Added staffApi import

### Backend
- ✅ `backend/internal/services/sms/service.go` - SMS service (already exists)
- ✅ `backend/internal/models/sms.go` - SMS models (already exists)
- ✅ `backend/internal/handlers/staff_sms_handler.go` - SMS handlers (already exists)

### Database
- ✅ `backend/migrations/seed_sms_templates.sql` - Template seed migration

### Documentation
- ✅ `BULK_SMS_FIXES.md` - Bulk fees reminder fixes
- ✅ `BULK_COMMUNICATION_FEATURE.md` - Bulk communication feature
- ✅ `SMS_BACKEND_TEMPLATES.md` - Backend and templates documentation
- ✅ `SMS_DEPLOYMENT_CHECKLIST.md` - This file

## Rollback Plan

If issues occur:

### 1. Rollback Frontend
```bash
cd frontend
git checkout HEAD~1
npm run build
docker compose -f docker-compose.prod.yml restart frontend
```

### 2. Rollback Backend
```bash
cd backend
git checkout HEAD~1
go build -o main cmd/api/main.go
docker compose -f docker-compose.prod.yml restart backend
```

### 3. Rollback Database
```bash
# Remove templates if needed
psql -U postgres -d acadistra -c "DELETE FROM sms_templates WHERE school_id IS NULL;"
```

## Next Steps

After successful deployment:
1. Monitor SMS delivery rates
2. Gather user feedback
3. Optimize templates based on usage
4. Add more templates as needed
5. Consider adding scheduled SMS feature
6. Implement SMS analytics dashboard
