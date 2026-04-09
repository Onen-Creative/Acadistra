#!/bin/bash

# Acadistra - Grade Recalculation Script
# Use this to recalculate grades after deployment

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration (can be overridden with environment variables)
ADMIN_EMAIL="${ADMIN_EMAIL}"
ADMIN_PASSWORD="${ADMIN_PASSWORD}"
API_URL="${API_URL:-https://acadistra.com}"
TERM="${TERM:-Term 1}"
YEAR="${YEAR:-2026}"
LEVEL="${LEVEL:-}"  # Optional: P4, S1, etc.

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Acadistra - Grade Recalculation Tool                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Show configuration
echo -e "${YELLOW}📋 Configuration:${NC}"
echo -e "${BLUE}   API URL: ${API_URL}${NC}"
echo -e "${BLUE}   Admin Email: ${ADMIN_EMAIL}${NC}"
echo -e "${BLUE}   Term: ${TERM}${NC}"
echo -e "${BLUE}   Year: ${YEAR}${NC}"
if [ -n "$LEVEL" ]; then
    echo -e "${BLUE}   Level: ${LEVEL}${NC}"
else
    echo -e "${BLUE}   Level: All levels${NC}"
fi
echo ""

# Confirm
read -p "$(echo -e ${YELLOW}Continue with recalculation? [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Cancelled${NC}"
    exit 1
fi
echo ""

# Login
echo -e "${YELLOW}🔐 Authenticating...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Authentication failed${NC}"
    echo -e "${YELLOW}Response: ${LOGIN_RESPONSE}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Authenticated${NC}"
echo ""

# Build URL with parameters
RECALC_URL="${API_URL}/api/v1/recalculate-grades"
PARAMS=""
if [ -n "$TERM" ]; then
    PARAMS="${PARAMS}term=$(echo "$TERM" | sed 's/ /%20/g')&"
fi
if [ -n "$YEAR" ]; then
    PARAMS="${PARAMS}year=${YEAR}&"
fi
if [ -n "$LEVEL" ]; then
    PARAMS="${PARAMS}level=${LEVEL}&"
fi
# Remove trailing &
PARAMS=${PARAMS%&}

if [ -n "$PARAMS" ]; then
    RECALC_URL="${RECALC_URL}?${PARAMS}"
fi

# Recalculate
echo -e "${YELLOW}🔄 Recalculating grades...${NC}"
echo -e "${BLUE}   URL: ${RECALC_URL}${NC}"
echo ""

RECALC_RESPONSE=$(curl -s -X POST "${RECALC_URL}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json")

# Display response
echo -e "${BLUE}📊 Response:${NC}"
echo "$RECALC_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RECALC_RESPONSE"
echo ""

# Parse and display summary
UPDATED=$(echo "$RECALC_RESPONSE" | grep -o '"updated":[0-9]*' | cut -d':' -f2)
ERRORS=$(echo "$RECALC_RESPONSE" | grep -o '"errors":[0-9]*' | cut -d':' -f2)
SKIPPED=$(echo "$RECALC_RESPONSE" | grep -o '"skipped":[0-9]*' | cut -d':' -f2)
TOTAL=$(echo "$RECALC_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)

if [ -n "$UPDATED" ]; then
    echo -e "${GREEN}✅ Recalculation completed!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}   📊 Updated: ${UPDATED}${NC}"
    echo -e "${BLUE}   ❌ Errors: ${ERRORS}${NC}"
    echo -e "${BLUE}   ⏭️  Skipped: ${SKIPPED}${NC}"
    echo -e "${BLUE}   📈 Total: ${TOTAL}${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}🎉 Success! Grades have been recalculated.${NC}"
else
    echo -e "${RED}❌ Recalculation failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📝 Verify the changes:${NC}"
echo -e "${BLUE}   Visit: ${API_URL}/results${NC}"
echo -e "${BLUE}   Check: Grades show D1/D2/C3/C4 (not A/B/C)${NC}"
echo -e "${BLUE}   Check: S1-S4 shows 'AOI' column (not 'CA')${NC}"
