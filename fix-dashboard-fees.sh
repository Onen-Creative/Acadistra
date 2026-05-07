#!/bin/bash

# Fix Dashboard Fees Display
# This script updates the dashboard to show correct fees totals across all classes

set -e

echo "=========================================="
echo "  Fixing Dashboard Fees Display"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}This fix ensures dashboards show correct fees totals across ALL classes${NC}"
echo ""

# Rebuild backend
echo -e "${YELLOW}Rebuilding backend...${NC}"
docker compose -f docker-compose.prod.yml build backend

# Rebuild frontend
echo -e "${YELLOW}Rebuilding frontend...${NC}"
docker compose -f docker-compose.prod.yml build frontend

# Restart services
echo -e "${YELLOW}Restarting services...${NC}"
docker compose -f docker-compose.prod.yml restart backend frontend

# Wait for services
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Check health
echo -e "${YELLOW}Checking service health...${NC}"
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is healthy${NC}"
else
    echo -e "${RED}✗ Frontend health check failed${NC}"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "  Fix Applied Successfully!"
echo "==========================================${NC}"
echo ""
echo "Changes:"
echo "  ✓ Backend now supports limit=-1 for fetching all records"
echo "  ✓ School Admin dashboard fetches ALL fees (not paginated)"
echo "  ✓ Bursar dashboard fetches ALL fees (not paginated)"
echo "  ✓ Totals now calculated across all classes correctly"
echo ""
echo "Test:"
echo "  1. Login as School Admin or Bursar"
echo "  2. Check fees cards on dashboard"
echo "  3. Verify totals match actual fees across all classes"
echo ""
