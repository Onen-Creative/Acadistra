# SMS & SchoolPay Production Setup Guide

Complete guide for configuring SMS and SchoolPay integrations in production.

## Table of Contents
1. [SMS Configuration](#sms-configuration)
2. [SchoolPay Configuration](#schoolpay-configuration)
3. [Docker Environment Setup](#docker-environment-setup)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)

---

## SMS Configuration

### Overview
Acadistra supports two SMS providers:
- **Africa's Talking** (Recommended for Uganda)
- **Twilio** (International)

Each school configures their own SMS provider and pays directly to the provider.

### Option 1: Africa's Talking (Recommended)

#### 1. Create Account
1. Visit https://africastalking.com
2. Sign up for an account
3. Verify your phone number
4. Add credit to your account

#### 2. Get API Credentials
1. Go to Dashboard → Settings → API Key
2. Copy your **Username** and **API Key**
3. Go to SMS → Sender IDs
4. Request a Sender ID (e.g., "ACADISTRA" or your school name)

#### 3. Configure in Docker
Add to `.env` file:
```bash
AFRICASTALKING_USERNAME=your-username
AFRICASTALKING_API_KEY=your-api-key
AFRICASTALKING_SENDER_ID=ACADISTRA
```

#### 4. Configure in Admin Panel
1. Login as Admin
2. Go to **SMS Management**
3. Click **Configure Provider**
4. Select "Africa's Talking"
5. Enter:
   - Username: Your AT username
   - API Key: Your AT API key
   - Sender ID: Your approved sender ID
6. Click **Save Configuration**

#### Pricing (Africa's Talking Uganda)
- Local SMS: UGX 60-80 per SMS
- Bulk discounts available
- Pay-as-you-go, no monthly fees

### Option 2: Twilio

#### 1. Create Account
1. Visit https://www.twilio.com
2. Sign up for an account
3. Verify your phone number

#### 2. Get API Credentials
1. Go to Console Dashboard
2. Copy **Account SID** and **Auth Token**
3. Buy a phone number (SMS-enabled)

#### 3. Configure in Docker
Add to `.env` file:
```bash
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+256700000000
```

#### 4. Configure in Admin Panel
1. Login as Admin
2. Go to **SMS Management**
3. Click **Configure Provider**
4. Select "Twilio"
5. Enter:
   - Account SID: Your Twilio SID
   - Auth Token: Your Twilio token
   - Phone Number: Your Twilio number
6. Click **Save Configuration**

#### Pricing (Twilio)
- Uganda SMS: ~$0.05 per SMS
- Monthly phone number fee: $1-2
- Higher cost than Africa's Talking

---

## SchoolPay Configuration

### Overview
SchoolPay enables real-time mobile money payments (MTN, Airtel) directly to your school account.

### 1. Create SchoolPay Account

#### Contact SchoolPay Uganda
- Website: https://schoolpay.ug
- Email: support@schoolpay.ug
- Phone: +256 XXX XXX XXX

#### Required Documents
- School registration certificate
- Tax Identification Number (TIN)
- Bank account details
- Director/Principal ID

#### Account Setup
1. Submit application with documents
2. SchoolPay reviews (2-3 business days)
3. Receive merchant credentials:
   - Merchant ID
   - API Key
   - API Secret
   - Webhook Secret

### 2. Configure in Docker

Add to `.env` file:
```bash
SCHOOLPAY_API_KEY=your-api-key
SCHOOLPAY_API_SECRET=your-api-secret
SCHOOLPAY_MERCHANT_ID=your-merchant-id
SCHOOLPAY_WEBHOOK_SECRET=your-webhook-secret
SCHOOLPAY_BASE_URL=https://api.schoolpay.ug
```

### 3. Configure in Admin Panel

1. Login as Admin
2. Go to **Settings** → **SchoolPay Integration**
3. Enter credentials:
   - API Key
   - API Secret
   - Merchant ID
   - Webhook Secret
4. Click **Save Configuration**
5. Click **Test Connection** to verify

### 4. Webhook Configuration

SchoolPay needs to send payment notifications to your server.

#### Webhook URL
```
https://your-domain.com/api/v1/schoolpay/webhook
```

#### Configure in SchoolPay Dashboard
1. Login to SchoolPay merchant portal
2. Go to Settings → Webhooks
3. Add webhook URL: `https://your-domain.com/api/v1/schoolpay/webhook`
4. Select events:
   - `payment.success`
   - `payment.failed`
   - `payment.pending`
5. Save configuration

#### Test Webhook
```bash
curl -X POST https://your-domain.com/api/v1/schoolpay/webhook \
  -H "Content-Type: application/json" \
  -H "X-SchoolPay-Signature: test-signature" \
  -d '{
    "event": "payment.success",
    "payment_id": "test-123",
    "amount": 100000,
    "student_id": "student-uuid",
    "phone_number": "+256700000000"
  }'
```

### Pricing (SchoolPay)
- Transaction fee: 1-2% of payment amount
- No setup fees
- No monthly fees
- Instant settlement to bank account

---

## Docker Environment Setup

### Complete .env Configuration

```bash
# ============================================
# CORE SERVICES
# ============================================
POSTGRES_PASSWORD=your-secure-postgres-password
REDIS_PASSWORD=your-secure-redis-password
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your-secure-minio-password
JWT_SECRET=your-secure-jwt-secret-min-32-characters

# ============================================
# EMAIL
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@acadistra.com

# ============================================
# SMS (Africa's Talking)
# ============================================
AFRICASTALKING_USERNAME=sandbox
AFRICASTALKING_API_KEY=your-api-key
AFRICASTALKING_SENDER_ID=ACADISTRA

# ============================================
# SCHOOLPAY
# ============================================
SCHOOLPAY_API_KEY=your-api-key
SCHOOLPAY_API_SECRET=your-api-secret
SCHOOLPAY_MERCHANT_ID=your-merchant-id
SCHOOLPAY_WEBHOOK_SECRET=your-webhook-secret
SCHOOLPAY_BASE_URL=https://api.schoolpay.ug

# ============================================
# URLS
# ============================================
NEXT_PUBLIC_API_URL=https://acadistra.com
NEXT_PUBLIC_APP_URL=https://acadistra.com
NEXT_PUBLIC_SOCKET_URL=https://acadistra.com
```

### Deploy with SMS & SchoolPay

```bash
# 1. Configure environment
cp .env.production.example .env
nano .env  # Add all credentials

# 2. Deploy
./deploy.sh

# 3. Verify SMS tables
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -c 'SELECT * FROM sms_providers LIMIT 1;'"

# 4. Check logs
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## Testing

### Test SMS Sending

#### Via Admin Panel
1. Login as Admin
2. Go to **SMS Management**
3. Click **Send SMS**
4. Enter test phone number
5. Type test message
6. Click **Send SMS**
7. Check SMS Queue for status

#### Via API
```bash
curl -X POST https://your-domain.com/api/v1/sms/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+256700000000",
    "message": "Test SMS from Acadistra",
    "category": "general"
  }'
```

### Test Fees Reminder

1. Go to **SMS Management** → **Fees Reminder**
2. Search for a student with outstanding fees
3. Select student
4. Review message preview
5. Click **Send Fees Reminder**
6. Verify SMS received

### Test Bulk Fees Reminder

1. Go to **SMS Management** → **Bulk Fees Reminder**
2. Select class (optional)
3. Set minimum balance
4. Click **Load Students**
5. Review list of students
6. Click **Send to All**
7. Monitor SMS Queue

### Test SchoolPay Payment

#### Test Mode
1. Go to **Fees** → **Student Fees**
2. Select a student
3. Click **Pay with SchoolPay**
4. Use test phone number: `+256700000000`
5. Use test PIN: `1234`
6. Verify payment recorded

#### Production Mode
1. Use real phone number
2. Enter MTN/Airtel mobile money PIN
3. Verify payment received
4. Check bank account settlement

---

## Troubleshooting

### SMS Issues

#### SMS Not Sending
```bash
# Check provider configuration
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -c 'SELECT * FROM sms_providers;'"

# Check SMS queue
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -c 'SELECT * FROM sms_queue ORDER BY created_at DESC LIMIT 10;'"

# Check logs
docker compose -f docker-compose.prod.yml logs -f backend | grep SMS
```

#### Invalid Credentials
- Verify API keys in `.env` file
- Check provider dashboard for correct credentials
- Ensure sender ID is approved (Africa's Talking)

#### SMS Stuck in Queue
```bash
# Check Redis connection
docker exec acadistra_redis redis-cli -a $REDIS_PASSWORD ping

# Restart backend
docker compose -f docker-compose.prod.yml restart backend
```

### SchoolPay Issues

#### Webhook Not Receiving
```bash
# Check webhook URL is accessible
curl https://your-domain.com/api/v1/schoolpay/webhook

# Check webhook logs
docker compose -f docker-compose.prod.yml logs -f backend | grep schoolpay

# Verify webhook signature
# Check SCHOOLPAY_WEBHOOK_SECRET matches SchoolPay dashboard
```

#### Payment Not Recording
```bash
# Check recent payments
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -c 'SELECT * FROM student_fees ORDER BY updated_at DESC LIMIT 10;'"

# Check SchoolPay logs
docker compose -f docker-compose.prod.yml logs -f backend | grep -i payment
```

#### Connection Failed
- Verify API credentials in `.env`
- Check SchoolPay API status
- Ensure server can reach `api.schoolpay.ug`
- Check firewall rules

### General Issues

#### Environment Variables Not Loading
```bash
# Verify .env file exists
ls -la .env

# Check environment in container
docker exec acadistra_backend env | grep AFRICASTALKING
docker exec acadistra_backend env | grep SCHOOLPAY

# Restart services
docker compose -f docker-compose.prod.yml restart
```

#### Database Connection Issues
```bash
# Check PostgreSQL
docker exec acadistra_postgres pg_isready -U acadistra

# Check tables exist
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -c '\dt'"
```

---

## Support

### SMS Support
- **Africa's Talking**: support@africastalking.com
- **Twilio**: https://support.twilio.com

### SchoolPay Support
- **Email**: support@schoolpay.ug
- **Phone**: +256 XXX XXX XXX
- **Hours**: Mon-Fri 8AM-6PM EAT

### Acadistra Support
- **Email**: support@acadistra.com
- **Documentation**: https://docs.acadistra.com
- **GitHub Issues**: https://github.com/yourusername/acadistra/issues

---

## Best Practices

### SMS
1. Test in sandbox mode first
2. Monitor SMS costs regularly
3. Use templates for common messages
4. Schedule bulk SMS during off-peak hours
5. Keep sender ID professional

### SchoolPay
1. Test with small amounts first
2. Monitor webhook logs
3. Reconcile payments daily
4. Keep API credentials secure
5. Update webhook URL if domain changes

### Security
1. Use strong passwords (32+ characters)
2. Rotate API keys quarterly
3. Enable SSL/TLS (Caddy handles this)
4. Monitor audit logs
5. Backup database daily

---

**Last Updated**: January 2025
