# Production Deployment Checklist

This checklist ensures all features including SMS, SchoolPay, and recent grading fixes are properly deployed to production.

---

## ✅ Pre-Deployment Checklist

### 1. Code Changes Verification

- [x] **Grading Logic Fixes**
  - [x] Advanced Level (S5-S6) grading uses standard `UACEGrader.ComputeGradeFromPapers()`
  - [x] Bulk import triggers grade recalculation for all students
  - [x] Manual entry and bulk import use same grading logic
  - [x] All levels (Nursery, Primary, O-Level, A-Level) calculate correctly

- [x] **SMS Integration**
  - [x] SMS tables migration: `20260505000000_create_sms_tables_pg.sql`
  - [x] Africa's Talking integration
  - [x] Twilio integration (alternative)
  - [x] SMS configuration in admin panel
  - [x] Environment variables in docker-compose

- [x] **SchoolPay Integration**
  - [x] SchoolPay tables migration: `20260129000000_create_schoolpay_tables.sql`
  - [x] SchoolPay code column: `20260130000000_add_schoolpay_code_to_students.sql`
  - [x] Webhook endpoint: `/api/v1/webhooks/schoolpay/:school_id`
  - [x] Configuration in admin panel
  - [x] Environment variables in docker-compose

### 2. Environment Configuration

Check `.env.production.example` includes:

```bash
# SMS Configuration
AFRICASTALKING_USERNAME=
AFRICASTALKING_API_KEY=
AFRICASTALKING_SENDER_ID=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# SchoolPay Configuration
SCHOOLPAY_API_KEY=
SCHOOLPAY_API_SECRET=
SCHOOLPAY_MERCHANT_ID=
SCHOOLPAY_WEBHOOK_SECRET=
SCHOOLPAY_BASE_URL=https://api.schoolpay.ug
```

### 3. Docker Configuration

Check `docker-compose.prod.yml` includes:

```yaml
backend:
  environment:
    # SMS variables
    - AFRICASTALKING_USERNAME=${AFRICASTALKING_USERNAME:-}
    - AFRICASTALKING_API_KEY=${AFRICASTALKING_API_KEY:-}
    - AFRICASTALKING_SENDER_ID=${AFRICASTALKING_SENDER_ID:-}
    - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID:-}
    - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN:-}
    - TWILIO_PHONE_NUMBER=${TWILIO_PHONE_NUMBER:-}
    # SchoolPay variables
    - SCHOOLPAY_API_KEY=${SCHOOLPAY_API_KEY:-}
    - SCHOOLPAY_API_SECRET=${SCHOOLPAY_API_SECRET:-}
    - SCHOOLPAY_MERCHANT_ID=${SCHOOLPAY_MERCHANT_ID:-}
    - SCHOOLPAY_WEBHOOK_SECRET=${SCHOOLPAY_WEBHOOK_SECRET:-}
    - SCHOOLPAY_BASE_URL=${SCHOOLPAY_BASE_URL:-https://api.schoolpay.ug}
```

### 4. Deployment Script

Check `deploy.sh` includes:

```bash
# SMS tables migration
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260505000000_create_sms_tables_pg.sql"

# SchoolPay tables migration
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260129000000_create_schoolpay_tables.sql"

# SchoolPay code column
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260130000000_add_schoolpay_code_to_students.sql"
```

---

## 🚀 Deployment Steps

### Step 1: Backup Current Production

```bash
# SSH into production server
ssh user@your-server-ip

# Navigate to project directory
cd /path/to/acadistra

# Backup database
docker exec acadistra_postgres pg_dump -U acadistra acadistra > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup .env file
cp .env .env.backup

# Backup volumes (optional but recommended)
docker run --rm -v acadistra_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

### Step 2: Pull Latest Code

```bash
# Pull latest changes from repository
git fetch origin
git pull origin main

# Or if deploying from local
# rsync -avz --exclude 'node_modules' --exclude '.git' ./ user@server:/path/to/acadistra/
```

### Step 3: Update Environment Variables

```bash
# Edit .env file to add SMS and SchoolPay credentials
nano .env

# Add these if not present:
# AFRICASTALKING_USERNAME=your-username
# AFRICASTALKING_API_KEY=your-api-key
# AFRICASTALKING_SENDER_ID=ACADISTRA
# SCHOOLPAY_BASE_URL=https://api.schoolpay.ug
```

### Step 4: Rebuild and Deploy

```bash
# Stop current services
docker compose -f docker-compose.prod.yml down

# Pull latest images and rebuild
docker compose -f docker-compose.prod.yml build --no-cache

# Start services
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
sleep 15
```

### Step 5: Run Migrations

```bash
# Run standard migrations
docker exec acadistra_backend ./main migrate

# Run SMS tables migration
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260505000000_create_sms_tables_pg.sql"

# Run SchoolPay tables migration
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260129000000_create_schoolpay_tables.sql"

# Add SchoolPay code column
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260130000000_add_schoolpay_code_to_students.sql"
```

### Step 6: Verify Deployment

```bash
# Check service status
docker compose -f docker-compose.prod.yml ps

# Check logs for errors
docker compose -f docker-compose.prod.yml logs -f backend | head -50

# Test health endpoint
curl http://localhost:8080/health

# Test frontend
curl http://localhost:3000
```

---

## 🧪 Post-Deployment Testing

### 1. Test Grading System

#### Test Advanced Level (S5-S6) Grading

```bash
# Login as admin
# Navigate to: Results Management > S6 Class > Entrepreneurship

# Test 1: Import Paper 1 marks
# - Upload Excel with Paper 1 marks
# - Verify individual paper codes are shown (D1, C3, etc.)

# Test 2: Import Paper 2 marks
# - Upload Excel with Paper 2 marks
# - Verify final grades are calculated (A, B, C, D, E, O, F)
# - Check that grades match UNEB rules

# Test 3: Manual entry
# - Enter marks manually for a student
# - Verify same grading logic as bulk import
```

#### Test Other Levels

```bash
# Primary (P1-P7)
# - Import CA marks
# - Import Exam marks
# - Verify grades: D1, D2, C3, C4, C5, C6, P7, P8, F9

# O-Level (S1-S4)
# - Import AOI marks
# - Import Exam marks
# - Verify grades: A, B, C, D, E

# Nursery
# - Import CA marks
# - Import Exam marks
# - Verify grades: Mastering, Secure, Developing, Emerging, Not Yet
```

### 2. Test SMS Integration

```bash
# Login as admin
# Navigate to: SMS Management

# Test 1: Configure SMS Provider
# - Go to Settings > SMS Configuration
# - Select Africa's Talking or Twilio
# - Enter credentials
# - Test connection

# Test 2: Send Test SMS
# - Send a test SMS to your phone
# - Verify SMS is received
# - Check SMS log for status

# Test 3: Bulk SMS
# - Send fees reminder to a class
# - Verify all guardians receive SMS
# - Check SMS costs in log
```

### 3. Test SchoolPay Integration

```bash
# Login as admin
# Navigate to: Settings > SchoolPay Integration

# Test 1: Configure SchoolPay
# - Enter School Code
# - Enter API Password
# - Set Webhook URL: https://yourdomain.com/api/v1/webhooks/schoolpay/YOUR_SCHOOL_ID
# - Enable webhook
# - Activate integration

# Test 2: Assign SchoolPay Codes
# - Go to Students > Select Student
# - Assign SchoolPay code (e.g., SCHOOL-2024001)
# - Save

# Test 3: Test Payment Flow
# - Make a test payment via SchoolPay
# - Verify webhook receives payment
# - Check payment is recorded in student fees
# - Verify outstanding balance is updated

# Test 4: Manual Sync
# - Go to SchoolPay > Sync Transactions
# - Select date range
# - Verify transactions are synced
```

### 4. Test API Endpoints

```bash
# Get authentication token
TOKEN=$(curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acadistra.com","password":"Admin@123"}' \
  | jq -r '.access_token')

# Test SMS endpoints
curl -X GET "http://localhost:8080/api/v1/sms/config" \
  -H "Authorization: Bearer $TOKEN"

# Test SchoolPay endpoints
curl -X GET "http://localhost:8080/api/v1/schoolpay/config" \
  -H "Authorization: Bearer $TOKEN"

# Test results endpoint
curl -X GET "http://localhost:8080/api/v1/results/student/STUDENT_ID?term=Term%201&year=2024" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔍 Troubleshooting

### Issue: SMS not sending

**Check:**
```bash
# Verify SMS configuration
docker exec acadistra_backend sh -c "env | grep AFRICASTALKING"
docker exec acadistra_backend sh -c "env | grep TWILIO"

# Check SMS logs
docker compose -f docker-compose.prod.yml logs backend | grep -i sms

# Test SMS provider credentials
# Login to Africa's Talking/Twilio dashboard
# Verify API keys are correct
```

**Solution:**
- Verify environment variables are set correctly
- Check SMS provider account has sufficient balance
- Verify sender ID is approved (Africa's Talking)
- Check phone numbers are in correct format (+256...)

### Issue: SchoolPay webhook not receiving payments

**Check:**
```bash
# Verify webhook URL is accessible
curl https://yourdomain.com/api/v1/webhooks/schoolpay/YOUR_SCHOOL_ID

# Check webhook logs
docker compose -f docker-compose.prod.yml logs backend | grep -i schoolpay

# Verify firewall allows incoming requests
sudo ufw status
```

**Solution:**
- Verify webhook URL in SchoolPay portal is correct
- Ensure server is accessible from internet (not localhost)
- Check firewall/security group allows port 443
- Use manual sync as fallback

### Issue: Grades not calculating correctly

**Check:**
```bash
# Check grading service logs
docker compose -f docker-compose.prod.yml logs backend | grep -i grade

# Verify grading logic
docker exec -it acadistra_backend sh
cd internal/grading
cat grading.go
```

**Solution:**
- Verify you're using latest code with grading fixes
- Check that bulk import triggers recalculation
- Manually trigger grade recalculation:
  ```bash
  curl -X POST "http://localhost:8080/api/v1/results/recalculate?level=S6&term=Term%201&year=2024" \
    -H "Authorization: Bearer $TOKEN"
  ```

### Issue: Migrations fail

**Check:**
```bash
# Check migration status
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "\dt"

# Check if tables exist
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "SELECT tablename FROM pg_tables WHERE schemaname='public';"
```

**Solution:**
- If tables already exist, migrations will fail (this is OK)
- Manually run specific migration if needed
- Check migration file syntax

---

## 📊 Monitoring

### Check Service Health

```bash
# All services
docker compose -f docker-compose.prod.yml ps

# Backend health
curl http://localhost:8080/health

# Database connections
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "SELECT count(*) FROM pg_stat_activity;"

# Redis status
docker exec acadistra_redis redis-cli -a $REDIS_PASSWORD ping
```

### Monitor Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Backend only
docker compose -f docker-compose.prod.yml logs -f backend

# Database only
docker compose -f docker-compose.prod.yml logs -f postgres

# Filter for errors
docker compose -f docker-compose.prod.yml logs backend | grep -i error
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
df -h
docker system df

# Database size
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "SELECT pg_size_pretty(pg_database_size('acadistra'));"
```

---

## 🔐 Security Checklist

- [ ] All passwords are strong (min 32 characters)
- [ ] JWT_SECRET is unique and secure
- [ ] SSL/TLS is enabled (Caddy handles this)
- [ ] Firewall is configured (only ports 80, 443, 22 open)
- [ ] Database is not exposed to internet
- [ ] Redis requires password
- [ ] MinIO has strong credentials
- [ ] SMS API keys are kept secret
- [ ] SchoolPay credentials are secure
- [ ] Backup encryption is enabled
- [ ] Regular security updates are scheduled

---

## 📝 Documentation Updates

After deployment, update:

- [ ] README.md with new features
- [ ] CHANGELOG.md with version and changes
- [ ] API documentation (Swagger)
- [ ] User manual with SMS and SchoolPay guides
- [ ] Admin training materials

---

## 🎯 Success Criteria

Deployment is successful when:

- ✅ All services are running and healthy
- ✅ Database migrations completed without errors
- ✅ SMS can be sent successfully
- ✅ SchoolPay webhook receives test payments
- ✅ Grades calculate correctly for all levels
- ✅ Bulk import works for all mark types
- ✅ No errors in logs
- ✅ Frontend loads correctly
- ✅ API endpoints respond correctly
- ✅ Backup system is working

---

## 📞 Support Contacts

**Technical Issues:**
- Email: support@acadistra.com
- Phone: +256 XXX XXX XXX

**SMS Provider Support:**
- Africa's Talking: support@africastalking.com
- Twilio: support@twilio.com

**SchoolPay Support:**
- Email: support@schoolpay.co.ug
- Phone: +256 XXX XXX XXX

---

## 🔄 Rollback Plan

If deployment fails:

```bash
# Stop new services
docker compose -f docker-compose.prod.yml down

# Restore database backup
docker exec -i acadistra_postgres psql -U acadistra -d acadistra < backup_YYYYMMDD_HHMMSS.sql

# Restore .env
cp .env.backup .env

# Checkout previous version
git checkout PREVIOUS_COMMIT_HASH

# Rebuild and start
docker compose -f docker-compose.prod.yml up -d --build

# Verify rollback
curl http://localhost:8080/health
```

---

## ✅ Final Checklist

Before marking deployment complete:

- [ ] All services running
- [ ] Migrations completed
- [ ] SMS tested and working
- [ ] SchoolPay tested and working
- [ ] Grading tested for all levels
- [ ] Backup created
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Team notified
- [ ] Users informed of new features

---

**Deployment Date:** _________________

**Deployed By:** _________________

**Version:** _________________

**Notes:** _________________
