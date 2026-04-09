#!/bin/bash

# Acadistra - Grading System Fix Deployment Script
# This script deploys the grading system fixes and recalculates all grades

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@acadistra.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@123}"
API_URL="${API_URL:-https://acadistra.com}"
TERM="${TERM:-Term 1}"
YEAR="${YEAR:-2026}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Acadistra - Grading System Fix Deployment             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Pull latest changes
echo -e "${YELLOW}📥 Step 1: Pulling latest changes from Git...${NC}"
if git pull origin main; then
    echo -e "${GREEN}✅ Git pull successful${NC}"
else
    echo -e "${RED}❌ Git pull failed${NC}"
    exit 1
fi
echo ""

# Step 2: Rebuild and restart services
echo -e "${YELLOW}🔨 Step 2: Rebuilding and restarting services...${NC}"
if docker compose -f docker-compose.prod.yml down; then
    echo -e "${GREEN}✅ Services stopped${NC}"
else
    echo -e "${RED}❌ Failed to stop services${NC}"
    exit 1
fi

if docker compose -f docker-compose.prod.yml up -d --build; then
    echo -e "${GREEN}✅ Services rebuilt and started${NC}"
else
    echo -e "${RED}❌ Failed to start services${NC}"
    exit 1
fi
echo ""

# Step 3: Wait for services to be ready
echo -e "${YELLOW}⏳ Step 3: Waiting for services to be ready...${NC}"
sleep 10

# Check if backend is responding
MAX_RETRIES=12
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s -f "${API_URL}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is ready${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -e "${BLUE}   Waiting... (${RETRY_COUNT}/${MAX_RETRIES})${NC}"
    sleep 5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Backend failed to start${NC}"
    echo -e "${YELLOW}📋 Checking logs:${NC}"
    docker compose -f docker-compose.prod.yml logs backend | tail -20
    exit 1
fi
echo ""

# Step 4: Check service status
echo -e "${YELLOW}📊 Step 4: Checking service status...${NC}"
docker compose -f docker-compose.prod.yml ps
echo ""

# Step 5: Login and get access token
echo -e "${YELLOW}🔐 Step 5: Authenticating as admin...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Failed to get access token${NC}"
    echo -e "${YELLOW}Response: ${LOGIN_RESPONSE}${NC}"
    echo ""
    echo -e "${YELLOW}💡 Manual recalculation required:${NC}"
    echo -e "${BLUE}1. Login to ${API_URL} as admin${NC}"
    echo -e "${BLUE}2. Open browser console (F12)${NC}"
    echo -e "${BLUE}3. Run:${NC}"
    echo -e "${GREEN}fetch('${API_URL}/api/v1/recalculate-grades?term=${TERM}&year=${YEAR}', {${NC}"
    echo -e "${GREEN}  method: 'POST',${NC}"
    echo -e "${GREEN}  headers: {'Authorization': 'Bearer ' + localStorage.getItem('access_token')}${NC}"
    echo -e "${GREEN}}).then(r => r.json()).then(console.log)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Authentication successful${NC}"
echo ""

# Step 6: Recalculate grades
echo -e "${YELLOW}🔄 Step 6: Recalculating grades for ${TERM} ${YEAR}...${NC}"
RECALC_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/recalculate-grades?term=${TERM}&year=${YEAR}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json")

echo -e "${BLUE}Response:${NC}"
echo "$RECALC_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RECALC_RESPONSE"
echo ""

# Parse response
UPDATED=$(echo "$RECALC_RESPONSE" | grep -o '"updated":[0-9]*' | cut -d':' -f2)
ERRORS=$(echo "$RECALC_RESPONSE" | grep -o '"errors":[0-9]*' | cut -d':' -f2)
SKIPPED=$(echo "$RECALC_RESPONSE" | grep -o '"skipped":[0-9]*' | cut -d':' -f2)
TOTAL=$(echo "$RECALC_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)

if [ -n "$UPDATED" ]; then
    echo -e "${GREEN}✅ Grade recalculation completed!${NC}"
    echo -e "${BLUE}   📊 Updated: ${UPDATED}${NC}"
    echo -e "${BLUE}   ❌ Errors: ${ERRORS}${NC}"
    echo -e "${BLUE}   ⏭️  Skipped: ${SKIPPED}${NC}"
    echo -e "${BLUE}   📈 Total: ${TOTAL}${NC}"
else
    echo -e "${RED}❌ Grade recalculation failed or returned unexpected response${NC}"
fi
echo ""

# Step 7: Verification
echo -e "${YELLOW}✅ Step 7: Deployment Summary${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Code deployed successfully${NC}"
echo -e "${GREEN}✅ Services restarted${NC}"
echo -e "${GREEN}✅ Backend is healthy${NC}"
if [ -n "$UPDATED" ]; then
    echo -e "${GREEN}✅ Grades recalculated (${UPDATED} updated)${NC}"
else
    echo -e "${YELLOW}⚠️  Grade recalculation needs manual verification${NC}"
fi
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "${BLUE}1. Visit ${API_URL}/results${NC}"
echo -e "${BLUE}2. Verify grades are showing D1/D2/C3/C4 (not A/B/C)${NC}"
echo -e "${BLUE}3. Verify S1-S4 shows 'AOI' column (not 'CA')${NC}"
echo ""

echo -e "${BLUE}📋 View logs:${NC}"
echo -e "${BLUE}   docker compose -f docker-compose.prod.yml logs backend${NC}"
echo ""

echo -e "${GREEN}🎉 Deployment complete!${NC}"
