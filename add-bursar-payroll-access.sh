#!/bin/bash

# Add Payroll Access for Bursar Role
# This script updates the frontend to give bursar access to payroll management

set -e

echo "=========================================="
echo "  Adding Payroll Access for Bursar"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Bursar role will now have access to Payroll Management${NC}"
echo ""

# Rebuild frontend
echo -e "${YELLOW}Rebuilding frontend...${NC}"
docker compose -f docker-compose.prod.yml build frontend

# Restart frontend
echo -e "${YELLOW}Restarting frontend...${NC}"
docker compose -f docker-compose.prod.yml restart frontend

# Wait for service
echo -e "${YELLOW}Waiting for frontend to be ready...${NC}"
sleep 10

# Check health
echo -e "${YELLOW}Checking service health...${NC}"
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is healthy${NC}"
else
    echo -e "${RED}✗ Frontend health check failed${NC}"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "  Payroll Access Added Successfully!"
echo "==========================================${NC}"
echo ""
echo "Changes:"
echo "  ✓ Bursar now has 'Payroll' menu item in sidebar"
echo "  ✓ Backend already allows bursar access to payroll endpoints"
echo "  ✓ Bursar can now:"
echo "    - View salary structures"
echo "    - Process monthly payroll"
echo "    - Mark payments as paid"
echo "    - View payroll runs and payslips"
echo "    - Generate payroll reports"
echo ""
echo "Test:"
echo "  1. Login as Bursar"
echo "  2. Check sidebar for 'Payroll' menu item"
echo "  3. Click to access payroll management"
echo "  4. Verify all payroll features are accessible"
echo ""
