#!/bin/bash

# Quick Production Update Script
# Use this to deploy updates to an already running production system

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================="
echo "  Acadistra Production Update"
echo "==========================================${NC}"
echo ""

# Confirm deployment
echo -e "${YELLOW}This will update the production system.${NC}"
echo -e "${YELLOW}Make sure you have:${NC}"
echo "  1. Backed up the database"
echo "  2. Tested changes in development"
echo "  3. Updated .env file if needed"
echo ""
read -p "Continue with deployment? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 0
fi

# Create backup
echo ""
echo -e "${YELLOW}Creating database backup...${NC}"
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
docker exec acadistra_postgres pg_dump -U acadistra acadistra > "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"

# Pull latest code (if using git)
if [ -d .git ]; then
    echo ""
    echo -e "${YELLOW}Pulling latest code...${NC}"
    git pull origin main
    echo -e "${GREEN}✓ Code updated${NC}"
fi

# Rebuild and restart services
echo ""
echo -e "${YELLOW}Rebuilding services...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache backend frontend

echo ""
echo -e "${YELLOW}Restarting services...${NC}"
docker compose -f docker-compose.prod.yml up -d

# Wait for services
echo ""
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 15

# Run migrations
echo ""
echo -e "${YELLOW}Running migrations...${NC}"
docker exec acadistra_backend ./main migrate || echo -e "${YELLOW}Migrations may have already run${NC}"

# Run SMS migration
echo ""
echo -e "${YELLOW}Updating SMS tables...${NC}"
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260505000000_create_sms_tables_pg.sql" 2>/dev/null || echo -e "${YELLOW}SMS tables already exist${NC}"

# Run SchoolPay migrations
echo ""
echo -e "${YELLOW}Updating SchoolPay tables...${NC}"
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260129000000_create_schoolpay_tables.sql" 2>/dev/null || echo -e "${YELLOW}SchoolPay tables already exist${NC}"

docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260130000000_add_schoolpay_code_to_students.sql" 2>/dev/null || echo -e "${YELLOW}SchoolPay code column already exists${NC}"

# Check service health
echo ""
echo -e "${YELLOW}Checking service health...${NC}"
sleep 5

# Test backend
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo -e "${YELLOW}Check logs: docker compose -f docker-compose.prod.yml logs backend${NC}"
fi

# Test frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is healthy${NC}"
else
    echo -e "${RED}✗ Frontend health check failed${NC}"
    echo -e "${YELLOW}Check logs: docker compose -f docker-compose.prod.yml logs frontend${NC}"
fi

# Show service status
echo ""
echo -e "${YELLOW}Service Status:${NC}"
docker compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}=========================================="
echo "  Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "What's New:"
echo "  ✓ Grading fixes for all levels"
echo "  ✓ SMS integration (Africa's Talking/Twilio)"
echo "  ✓ SchoolPay mobile money payments"
echo "  ✓ Improved bulk import with grade recalculation"
echo ""
echo "Next Steps:"
echo "  1. Test grading system with sample data"
echo "  2. Configure SMS in Admin Panel"
echo "  3. Configure SchoolPay in Admin Panel"
echo "  4. Monitor logs for any errors"
echo ""
echo "Useful Commands:"
echo "  View logs:    docker compose -f docker-compose.prod.yml logs -f"
echo "  Restart:      docker compose -f docker-compose.prod.yml restart"
echo "  Stop:         docker compose -f docker-compose.prod.yml down"
echo "  Rollback:     docker exec -i acadistra_postgres psql -U acadistra -d acadistra < $BACKUP_FILE"
echo ""
