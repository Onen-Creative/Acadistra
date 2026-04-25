#!/bin/bash

# Quick Fix Script for Announcement Issues
# Run this script to diagnose and fix common announcement problems

set -e

echo "🔧 Acadistra Announcement Quick Fix"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ] && ! groups | grep -q docker; then 
    echo -e "${RED}❌ Please run with sudo or add your user to docker group${NC}"
    exit 1
fi

# Step 1: Check if containers are running
echo "1️⃣  Checking Docker containers..."
if ! docker ps | grep -q acadistra_backend; then
    echo -e "${RED}❌ Backend container is not running${NC}"
    echo "   Starting containers..."
    docker compose -f docker-compose.prod.yml up -d
    sleep 10
else
    echo -e "${GREEN}✅ Backend container is running${NC}"
fi
echo ""

# Step 2: Check email configuration
echo "2️⃣  Checking email configuration..."
if [ -f .env.production ]; then
    source .env.production
    
    if [ -z "$SMTP_HOST" ] || [ -z "$SMTP_USER" ] || [ -z "$SMTP_PASSWORD" ]; then
        echo -e "${RED}❌ Email configuration is incomplete${NC}"
        echo ""
        echo "Please add the following to .env.production:"
        echo ""
        echo "SMTP_HOST=smtp.gmail.com"
        echo "SMTP_PORT=587"
        echo "SMTP_USER=your-email@gmail.com"
        echo "SMTP_PASSWORD=your-app-password"
        echo "SMTP_FROM=noreply@acadistra.com"
        echo ""
        echo "After updating, run: docker compose -f docker-compose.prod.yml restart backend"
        exit 1
    else
        echo -e "${GREEN}✅ Email configuration found${NC}"
        echo "   SMTP_HOST: $SMTP_HOST"
        echo "   SMTP_USERNAME: $SMTP_USERNAME"
    fi
else
    echo -e "${RED}❌ .env.production file not found${NC}"
    exit 1
fi
echo ""

# Step 3: Check database tables
echo "3️⃣  Checking database tables..."
TABLES_OK=true

if ! docker exec acadistra_postgres psql -U acadistra -d acadistra -c "\dt system_announcements" 2>/dev/null | grep -q system_announcements; then
    echo -e "${RED}❌ system_announcements table missing${NC}"
    TABLES_OK=false
fi

if ! docker exec acadistra_postgres psql -U acadistra -d acadistra -c "\dt user_notifications" 2>/dev/null | grep -q user_notifications; then
    echo -e "${RED}❌ user_notifications table missing${NC}"
    TABLES_OK=false
fi

if ! docker exec acadistra_postgres psql -U acadistra -d acadistra -c "\dt email_queue" 2>/dev/null | grep -q email_queue; then
    echo -e "${RED}❌ email_queue table missing${NC}"
    TABLES_OK=false
fi

if [ "$TABLES_OK" = false ]; then
    echo ""
    echo "Running migrations..."
    docker exec acadistra_backend ./main migrate
    echo -e "${GREEN}✅ Migrations completed${NC}"
else
    echo -e "${GREEN}✅ All required tables exist${NC}"
fi
echo ""

# Step 4: Check email queue status
echo "4️⃣  Checking email queue..."
PENDING=$(docker exec acadistra_postgres psql -U acadistra -d acadistra -t -c "SELECT COUNT(*) FROM email_queue WHERE status = 'pending';" 2>/dev/null | tr -d ' ')
FAILED=$(docker exec acadistra_postgres psql -U acadistra -d acadistra -t -c "SELECT COUNT(*) FROM email_queue WHERE status = 'failed';" 2>/dev/null | tr -d ' ')
SENT=$(docker exec acadistra_postgres psql -U acadistra -d acadistra -t -c "SELECT COUNT(*) FROM email_queue WHERE status = 'sent';" 2>/dev/null | tr -d ' ')

echo "   Pending: $PENDING"
echo "   Failed: $FAILED"
echo "   Sent: $SENT"

if [ "$FAILED" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  There are $FAILED failed emails${NC}"
    echo ""
    echo "Recent failures:"
    docker exec acadistra_postgres psql -U acadistra -d acadistra -c "SELECT to_email, subject, error FROM email_queue WHERE status = 'failed' ORDER BY updated_at DESC LIMIT 3;"
fi
echo ""

# Step 5: Check backend logs for errors
echo "5️⃣  Checking backend logs for email errors..."
ERROR_COUNT=$(docker logs acadistra_backend 2>&1 | grep -i "email.*error\|failed to send" | wc -l)
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $ERROR_COUNT email-related errors in logs${NC}"
    echo ""
    echo "Recent errors:"
    docker logs acadistra_backend 2>&1 | grep -i "email.*error\|failed to send" | tail -5
else
    echo -e "${GREEN}✅ No email errors in recent logs${NC}"
fi
echo ""

# Step 6: Check if email queue processor is running
echo "6️⃣  Checking email queue processor..."
if docker logs acadistra_backend 2>&1 | grep -q "Daily email counter reset\|Successfully sent queued email"; then
    echo -e "${GREEN}✅ Email queue processor is running${NC}"
    LAST_SENT=$(docker logs acadistra_backend 2>&1 | grep "Successfully sent queued email" | tail -1)
    if [ -n "$LAST_SENT" ]; then
        echo "   Last email sent: $(echo $LAST_SENT | cut -d' ' -f1-2)"
    fi
else
    echo -e "${YELLOW}⚠️  Email queue processor may not be running${NC}"
    echo "   Restarting backend..."
    docker compose -f docker-compose.prod.yml restart backend
    sleep 5
fi
echo ""

# Step 7: Summary and recommendations
echo "📋 Summary"
echo "=========="
echo ""

if [ -z "$SMTP_HOST" ] || [ -z "$SMTP_USERNAME" ]; then
    echo -e "${RED}❌ CRITICAL: Email service not configured${NC}"
    echo "   Action: Configure SMTP settings in .env.production"
elif [ "$FAILED" -gt 10 ]; then
    echo -e "${YELLOW}⚠️  WARNING: Many failed emails ($FAILED)${NC}"
    echo "   Action: Check SMTP credentials and logs"
elif [ "$PENDING" -gt 50 ]; then
    echo -e "${YELLOW}⚠️  WARNING: Large email queue ($PENDING pending)${NC}"
    echo "   Action: Email queue processor may be slow or stuck"
else
    echo -e "${GREEN}✅ System appears healthy${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test by creating an announcement in the admin panel"
    echo "2. Monitor logs: docker logs -f acadistra_backend | grep -i email"
    echo "3. Check email queue: docker exec acadistra_postgres psql -U acadistra -d acadistra -c 'SELECT * FROM email_queue ORDER BY created_at DESC LIMIT 5;'"
fi

echo ""
echo "📚 For detailed troubleshooting, see: TROUBLESHOOTING_ANNOUNCEMENTS.md"
echo ""
