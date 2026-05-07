# SchoolPay Integration - Complete Setup Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [SchoolPay Portal Configuration](#schoolpay-portal-configuration)
5. [Testing the Integration](#testing-the-integration)
6. [Troubleshooting](#troubleshooting)
7. [Production Deployment](#production-deployment)

---

## Prerequisites

### What You Need

1. **SchoolPay Account**
   - Active SchoolPay subscription
   - School Code (e.g., `123456`)
   - API Password (from SchoolPay portal)

2. **Server Requirements**
   - Public domain/IP (webhooks need public access)
   - SSL certificate (HTTPS required for production)
   - PostgreSQL database
   - Go 1.24+ and Node.js 18+

3. **Student Data**
   - Student admission numbers must match SchoolPay payment codes
   - Term dates configured in system

---

## Backend Setup

### Step 1: Run Database Migration

```bash
cd backend

# Connect to PostgreSQL
psql -U postgres -d acadistra

# Run the migration
\i migrations/20260129000000_create_schoolpay_tables.sql

# Verify tables created
\dt schoolpay*

# Expected output:
# schoolpay_configs
# schoolpay_transactions
```

**Verify Migration:**
```sql
-- Check schoolpay_configs table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'schoolpay_configs';

-- Check schoolpay_transactions table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'schoolpay_transactions';
```

### Step 2: Configure Environment Variables

```bash
# Edit .env file
nano backend/.env
```

Add SchoolPay configuration:
```env
# SchoolPay Integration
SCHOOLPAY_BASE_URL=https://schoolpay.co.ug/paymentapi
```

### Step 3: Restart Backend Server

```bash
# Development
cd backend
go run cmd/api/main.go

# Production (Docker)
docker compose -f docker-compose.prod.yml restart backend
```

### Step 4: Verify Backend Routes

```bash
# Test health endpoint
curl http://localhost:8080/health

# Test SchoolPay config endpoint (should return 404 if not configured)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/v1/schoolpay/config
```

---

## Frontend Setup

### Step 1: Install Dependencies (if needed)

```bash
cd frontend
npm install
```

### Step 2: Verify Frontend Routes

The following pages should now be available:
- `/finance/schoolpay` - Main SchoolPay page
- `/finance/schoolpay/config` - Configuration page
- `/finance/schoolpay/transactions` - Transactions list

### Step 3: Start Frontend

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Step 4: Access SchoolPay Pages

Open browser and navigate to:
```
http://localhost:3000/finance/schoolpay
```

---

## SchoolPay Portal Configuration

### Step 1: Get SchoolPay Credentials

1. **Login to SchoolPay Portal**
   - Go to https://schoolpay.co.ug
   - Login with your school credentials

2. **Navigate to API Settings**
   - Click on **Settings** (gear icon)
   - Select **API Configuration**

3. **Copy Credentials**
   - **School Code**: e.g., `123456`
   - **API Password**: e.g., `your_secret_password`
   - **Keep these secure!**

### Step 2: Configure Acadistra

1. **Login to Acadistra**
   ```
   http://localhost:3000/login
   ```
   - Use bursar, school_admin, or system_admin account

2. **Navigate to SchoolPay Config**
   ```
   Finance → SchoolPay → Configuration
   ```
   Or directly:
   ```
   http://localhost:3000/finance/schoolpay/config
   ```

3. **Enter Credentials**
   - **School Code**: Enter your SchoolPay school code
   - **API Password**: Enter your SchoolPay API password
   - **Webhook URL**: Auto-generated (copy this!)
   - **Enable Webhook Notifications**: ✅ Check
   - **Activate Integration**: ✅ Check

4. **Save Configuration**
   - Click **"Save Configuration"**
   - You should see success message

### Step 3: Register Webhook in SchoolPay

1. **Copy Webhook URL from Acadistra**
   - Example: `https://acadistra.com/api/v1/webhooks/schoolpay/abc-123-def-456`
   - Click the copy button next to webhook URL

2. **Go Back to SchoolPay Portal**
   - Navigate to **Settings** → **Webhooks**

3. **Add Webhook**
   - Click **"Add Webhook"** or **"Configure Webhook"**
   - **Webhook URL**: Paste the URL from Acadistra
   - **Enable Notifications**: ✅ Check
   - **Events**: Select "Payment Completed"

4. **Save Webhook Settings**
   - Click **"Save"** or **"Update"**
   - Verify webhook is active

### Step 4: Test Connection

1. **In Acadistra Config Page**
   - Click **"Test Connection"** button
   - This will sync today's transactions

2. **Expected Result**
   - Success message: "Connection successful! Transactions synced."
   - If error, check credentials and try again

---

## Testing the Integration

### Test 1: Manual Sync

**Sync Today's Transactions:**

```bash
# Via API
curl -X POST http://localhost:8080/api/v1/schoolpay/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"from_date":"2024-01-29"}'
```

**Via Frontend:**
1. Go to `Finance → SchoolPay → Transactions`
2. Click **"Sync Transactions"**
3. Select today's date
4. Click **"Sync Transactions"**

### Test 2: Make Test Payment

1. **Via SchoolPay Test Environment** (if available)
   - Use SchoolPay's test payment feature
   - Enter test student payment code
   - Complete payment

2. **Via Real Payment** (small amount)
   - Use MTN/Airtel Mobile Money
   - Pay to your school's SchoolPay number
   - Use a real student payment code

### Test 3: Verify Webhook Received

**Check Acadistra Transactions:**
1. Go to `Finance → SchoolPay → Transactions`
2. Look for the new transaction
3. Verify details match payment

**Check Database:**
```sql
-- View recent transactions
SELECT 
  schoolpay_receipt_number,
  student_name,
  amount,
  payment_date_and_time,
  processed
FROM schoolpay_transactions
ORDER BY payment_date_and_time DESC
LIMIT 10;
```

### Test 4: Process Transaction

**Via Frontend:**
1. Go to `Finance → SchoolPay → Transactions`
2. If transaction shows "Pending", click **"Process Pending"**
3. Verify transaction status changes to "Processed"

**Via API:**
```bash
curl -X POST http://localhost:8080/api/v1/schoolpay/process \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 5: Verify Fee Payment Created

**Check Student Fees:**
```sql
-- Find the student
SELECT id, admission_no, first_name, last_name 
FROM students 
WHERE admission_no = 'PAYMENT_CODE';

-- Check fees payment created
SELECT 
  fp.amount,
  fp.payment_date,
  fp.payment_method,
  fp.receipt_no,
  sf.amount_paid,
  sf.outstanding
FROM fees_payments fp
JOIN student_fees sf ON fp.student_fees_id = sf.id
WHERE sf.student_id = 'STUDENT_ID'
ORDER BY fp.payment_date DESC;
```

---

## Troubleshooting

### Issue 1: Webhook Not Receiving Calls

**Symptoms:**
- Payments made but no transactions in Acadistra
- Webhook not triggering

**Solutions:**

1. **Check Webhook URL is Public**
   ```bash
   # Test from external server
   curl -X POST https://yourdomain.com/api/v1/webhooks/schoolpay/YOUR_SCHOOL_ID \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

2. **Verify Webhook Enabled in SchoolPay**
   - Login to SchoolPay portal
   - Check Settings → Webhooks
   - Ensure webhook is enabled

3. **Check SchoolPay Subscription**
   - Webhooks only work with active subscription
   - Verify subscription status in SchoolPay portal

4. **Check Server Logs**
   ```bash
   # Docker logs
   docker logs acadistra_backend -f --tail=100
   
   # Look for webhook POST requests
   grep "webhooks/schoolpay" logs/app.log
   ```

### Issue 2: Student Not Matched

**Symptoms:**
- Transaction received but not processed
- Error: "student not found for payment code"

**Solutions:**

1. **Check Admission Number**
   ```sql
   -- Find student by admission number
   SELECT id, admission_no, first_name, last_name 
   FROM students 
   WHERE admission_no = 'PAYMENT_CODE';
   ```

2. **Update Student Admission Number**
   ```sql
   -- Update to match SchoolPay payment code
   UPDATE students 
   SET admission_no = 'SCHOOLPAY_PAYMENT_CODE'
   WHERE id = 'STUDENT_ID';
   ```

3. **Manual Match**
   ```sql
   -- Update transaction with correct student_id
   UPDATE schoolpay_transactions 
   SET student_id = 'CORRECT_STUDENT_ID'
   WHERE schoolpay_receipt_number = 'RECEIPT_NUMBER';
   
   -- Then process
   -- Click "Process Pending" in frontend
   ```

### Issue 3: Transaction Not Processing

**Symptoms:**
- Transaction shows as "Pending"
- Error message in transaction details

**Solutions:**

1. **Check Term Dates**
   ```sql
   -- Verify term dates exist for payment date
   SELECT * FROM term_dates 
   WHERE school_id = 'YOUR_SCHOOL_ID'
   AND start_date <= '2024-01-29'
   AND end_date >= '2024-01-29';
   ```

2. **Create Term Dates if Missing**
   - Go to `Settings → Term Dates`
   - Add term dates for current academic year

3. **Check Student Fees Record**
   ```sql
   -- Verify student has fees record for term
   SELECT * FROM student_fees 
   WHERE student_id = 'STUDENT_ID'
   AND term = 'Term1'
   AND year = 2024;
   ```

4. **Create Student Fees Record**
   - Go to `Finance → Fees`
   - Create fees record for student

### Issue 4: Signature Verification Failed

**Symptoms:**
- Webhook received but rejected
- Error: "Invalid webhook signature"

**Solutions:**

1. **Verify API Password**
   - Check password in Acadistra matches SchoolPay portal
   - Re-enter password in config page

2. **Test Signature Manually**
   ```bash
   # Calculate expected signature
   echo -n "YOUR_API_PASSWORD18843014" | sha256sum
   
   # Compare with signature in webhook payload
   ```

### Issue 5: Sync API Fails

**Symptoms:**
- "Test Connection" fails
- Manual sync returns error

**Solutions:**

1. **Check Credentials**
   - Verify school code is correct
   - Verify API password is correct

2. **Test Hash Generation**
   ```bash
   # Calculate MD5 hash
   echo -n "1234562024-01-29your_password" | md5sum
   ```

3. **Check SchoolPay API Status**
   - Visit https://schoolpay.co.ug
   - Check if service is operational

4. **Check Network Connectivity**
   ```bash
   # Test connection to SchoolPay
   curl https://schoolpay.co.ug/paymentapi
   ```

---

## Production Deployment

### Step 1: SSL Certificate

**Option A: Let's Encrypt (Recommended)**
```bash
# Caddy auto-provisions SSL
# Just ensure DNS points to your server
```

**Option B: Manual Certificate**
```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d acadistra.com -d *.acadistra.com
```

### Step 2: DNS Configuration

```bash
# A Records
acadistra.com           → YOUR_SERVER_IP
*.acadistra.com         → YOUR_SERVER_IP
api.acadistra.com       → YOUR_SERVER_IP
```

### Step 3: Update Webhook URL

1. **In Acadistra Config**
   - Update webhook URL to production domain
   - Example: `https://acadistra.com/api/v1/webhooks/schoolpay/abc-123`

2. **In SchoolPay Portal**
   - Update webhook URL to production domain
   - Save changes

### Step 4: Environment Variables

```bash
# Production .env
SCHOOLPAY_BASE_URL=https://schoolpay.co.ug/paymentapi
DATABASE_URL=postgresql://user:pass@localhost:5432/acadistra
JWT_SECRET=your_production_secret
```

### Step 5: Deploy

```bash
# Using Docker Compose
docker compose -f docker-compose.prod.yml up -d

# Verify services running
docker compose -f docker-compose.prod.yml ps
```

### Step 6: Setup Monitoring

**Cron Job for Daily Sync:**
```bash
# Edit crontab
crontab -e

# Add daily sync at 6 AM
0 6 * * * curl -X POST https://acadistra.com/api/v1/schoolpay/sync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"from_date":"'$(date -d yesterday +%Y-%m-%d)'"}'
```

**Cron Job for Processing:**
```bash
# Process pending every hour
0 * * * * curl -X POST https://acadistra.com/api/v1/schoolpay/process \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 7: Backup Strategy

```bash
# Backup SchoolPay data
pg_dump -U postgres -d acadistra \
  -t schoolpay_configs \
  -t schoolpay_transactions \
  > schoolpay_backup_$(date +%Y%m%d).sql
```

---

## Quick Reference

### Important URLs

**Development:**
- Frontend: http://localhost:3000/finance/schoolpay
- Backend API: http://localhost:8080/api/v1/schoolpay
- Webhook: http://localhost:8080/api/v1/webhooks/schoolpay/:school_id

**Production:**
- Frontend: https://acadistra.com/finance/schoolpay
- Backend API: https://acadistra.com/api/v1/schoolpay
- Webhook: https://acadistra.com/api/v1/webhooks/schoolpay/:school_id

### API Endpoints

```
GET    /api/v1/schoolpay/config          - Get configuration
PUT    /api/v1/schoolpay/config          - Update configuration
POST   /api/v1/schoolpay/sync            - Sync transactions
POST   /api/v1/schoolpay/process         - Process pending
GET    /api/v1/schoolpay/transactions    - List transactions
POST   /api/v1/webhooks/schoolpay/:id    - Webhook (public)
```

### Database Tables

```sql
-- Configuration
SELECT * FROM schoolpay_configs;

-- Transactions
SELECT * FROM schoolpay_transactions ORDER BY payment_date_and_time DESC;

-- Unprocessed
SELECT * FROM schoolpay_transactions WHERE processed = false;

-- Failed
SELECT * FROM schoolpay_transactions WHERE error_message IS NOT NULL;
```

---

## Support

- **Documentation**: `SCHOOLPAY_INTEGRATION.md`
- **Quick Reference**: `SCHOOLPAY_QUICK_REFERENCE.md`
- **SchoolPay Support**: support@schoolpay.co.ug
- **SchoolPay API**: https://schoolpay.co.ug/api-docs

---

## Checklist

### Backend Setup
- [ ] Run database migration
- [ ] Configure environment variables
- [ ] Restart backend server
- [ ] Verify API endpoints accessible

### Frontend Setup
- [ ] Install dependencies
- [ ] Start frontend server
- [ ] Access SchoolPay pages
- [ ] Verify UI loads correctly

### SchoolPay Configuration
- [ ] Get SchoolPay credentials
- [ ] Configure Acadistra with credentials
- [ ] Copy webhook URL
- [ ] Register webhook in SchoolPay portal
- [ ] Test connection

### Testing
- [ ] Manual sync works
- [ ] Make test payment
- [ ] Webhook received
- [ ] Transaction processed
- [ ] Fee payment created

### Production
- [ ] SSL certificate installed
- [ ] DNS configured
- [ ] Webhook URL updated
- [ ] Cron jobs configured
- [ ] Backup strategy in place

---

**Setup Complete!** 🎉

Your SchoolPay integration is now ready to receive real-time mobile money payments!
