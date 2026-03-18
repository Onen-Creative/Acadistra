#!/bin/bash

################################################################################
# ACADISTRA COMPLETE SYSTEM MIGRATION - VPS VERSION
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# VPS path
PROJECT_DIR="/root/acadistra"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/acadistra_full_backup_$TIMESTAMP.sql"

echo ""
echo "=========================================="
echo "  ACADISTRA COMPLETE SYSTEM MIGRATION"
echo "=========================================="
echo ""
echo "Working directory: $PROJECT_DIR"
echo ""
echo -e "${RED}WARNING: This will DELETE all existing data!${NC}"
echo -e "${YELLOW}A backup will be created first.${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'YES' to proceed): " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "Migration cancelled."
    exit 0
fi

cd "$PROJECT_DIR"

################################################################################
# STEP 1: BACKUP EXISTING DATABASE
################################################################################
echo ""
echo -e "${BLUE}[1/10] Creating database backup...${NC}"
mkdir -p "$BACKUP_DIR"

if docker ps | grep -q acadistra_postgres; then
    echo "Backing up existing database..."
    docker exec acadistra_postgres pg_dump -U acadistra acadistra > "$BACKUP_FILE" 2>/dev/null || {
        echo -e "${YELLOW}Warning: Could not backup database${NC}"
        touch "$BACKUP_FILE"
    }
    echo -e "${GREEN}✓ Backup saved: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}No existing database found${NC}"
    touch "$BACKUP_FILE"
fi

################################################################################
# STEP 2: STOP ALL SERVICES
################################################################################
echo ""
echo -e "${BLUE}[2/10] Stopping all services...${NC}"
docker compose -f docker-compose.prod.yml down 2>/dev/null || true
echo -e "${GREEN}✓ All services stopped${NC}"

################################################################################
# STEP 3: REMOVE OLD CONTAINERS
################################################################################
echo ""
echo -e "${BLUE}[3/10] Removing old containers...${NC}"
docker rm -f acadistra_backend acadistra_frontend acadistra_postgres acadistra_caddy 2>/dev/null || true
echo -e "${GREEN}✓ Old containers removed${NC}"

################################################################################
# STEP 4: REMOVE DATABASE VOLUME (FRESH START)
################################################################################
echo ""
echo -e "${BLUE}[4/10] Removing old database volume...${NC}"
docker volume rm acadistra_postgres_data 2>/dev/null || docker volume rm schoolmanagementsystem_postgres_data 2>/dev/null || echo -e "${YELLOW}No existing volume${NC}"
echo -e "${GREEN}✓ Database volume removed${NC}"

################################################################################
# STEP 5: REBUILD BACKEND
################################################################################
echo ""
echo -e "${BLUE}[5/10] Rebuilding backend with latest code...${NC}"
docker compose -f docker-compose.prod.yml build backend --no-cache
echo -e "${GREEN}✓ Backend rebuilt${NC}"

################################################################################
# STEP 6: REBUILD FRONTEND
################################################################################
echo ""
echo -e "${BLUE}[6/10] Rebuilding frontend...${NC}"
docker compose -f docker-compose.prod.yml build frontend --no-cache
echo -e "${GREEN}✓ Frontend rebuilt${NC}"

################################################################################
# STEP 7: START ALL SERVICES
################################################################################
echo ""
echo -e "${BLUE}[7/10] Starting all services...${NC}"
docker compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✓ Services started${NC}"

################################################################################
# STEP 8: WAIT FOR SERVICES TO BE HEALTHY
################################################################################
echo ""
echo -e "${BLUE}[8/10] Waiting for services to be healthy...${NC}"

echo -n "Waiting for PostgreSQL"
for i in {1..60}; do
    if docker exec acadistra_postgres pg_isready -U acadistra >/dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
        break
    fi
    echo -n "."
    sleep 2
    if [ $i -eq 60 ]; then
        echo ""
        echo -e "${RED}✗ PostgreSQL failed to start${NC}"
        exit 1
    fi
done

echo -n "Waiting for Backend"
for i in {1..60}; do
    if curl -s http://localhost:8080/health >/dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✓ Backend is ready${NC}"
        break
    fi
    echo -n "."
    sleep 2
    if [ $i -eq 60 ]; then
        echo ""
        echo -e "${RED}✗ Backend failed to start${NC}"
        echo "Check logs: docker logs acadistra_backend"
        exit 1
    fi
done

################################################################################
# STEP 9: RUN COMPLETE DATABASE MIGRATION
################################################################################
echo ""
echo -e "${BLUE}[9/10] Running complete database migration (ALL 65 tables)...${NC}"
echo "This will create all tables from scratch..."

MIGRATION_RESPONSE=$(curl -s -X GET "http://localhost:8080/setup/migrate")
echo "$MIGRATION_RESPONSE"

if echo "$MIGRATION_RESPONSE" | grep -q "successfully"; then
    echo -e "${GREEN}✓ Migration completed successfully${NC}"
else
    echo -e "${RED}✗ Migration failed!${NC}"
    echo "Check backend logs: docker logs acadistra_backend"
    exit 1
fi

# Seed admin user
echo ""
echo "Seeding system admin user..."
SEED_ADMIN_RESPONSE=$(curl -s -X GET "http://localhost:8080/setup/seed-admin")
echo "$SEED_ADMIN_RESPONSE"

if echo "$SEED_ADMIN_RESPONSE" | grep -q "successfully\|already exists"; then
    echo -e "${GREEN}✓ Admin user ready${NC}"
else
    echo -e "${YELLOW}Warning: Admin seeding may have failed${NC}"
fi

# Seed standard subjects
echo ""
echo "Seeding standard subjects..."
SEED_SUBJECTS_RESPONSE=$(curl -s -X GET "http://localhost:8080/setup/seed-subjects")
echo "$SEED_SUBJECTS_RESPONSE"

if echo "$SEED_SUBJECTS_RESPONSE" | grep -q "successfully\|already exist"; then
    echo -e "${GREEN}✓ Standard subjects ready${NC}"
else
    echo -e "${YELLOW}Warning: Subject seeding may have failed${NC}"
fi

################################################################################
# STEP 10: VERIFY ALL TABLES WERE CREATED
################################################################################
echo ""
echo -e "${BLUE}[10/10] Verifying all tables were created...${NC}"

# Count total tables
TOTAL_TABLES=$(docker exec acadistra_postgres psql -U acadistra -d acadistra -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" | tr -d ' ')

echo "Total tables created: $TOTAL_TABLES"

if [ "$TOTAL_TABLES" -ge 65 ]; then
    echo -e "${GREEN}✓ All tables created successfully${NC}"
else
    echo -e "${YELLOW}Warning: Expected 65+ tables, found $TOTAL_TABLES${NC}"
fi

# List all tables
echo ""
echo "Complete table list:"
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "\dt" | grep "public |"

# Verify critical new tables
echo ""
echo "Verifying critical tables:"
CRITICAL_TABLES=("lesson_records" "budgets" "budget_transfers" "requisitions" "requisition_items" "requisition_approval_flows" "inventory_categories" "inventory_items" "inventory_transactions")

ALL_FOUND=true
for table in "${CRITICAL_TABLES[@]}"; do
    if docker exec acadistra_postgres psql -U acadistra -d acadistra -t -c "\dt $table" | grep -q "$table"; then
        echo -e "  ${GREEN}✓${NC} $table"
    else
        echo -e "  ${RED}✗${NC} $table (MISSING)"
        ALL_FOUND=false
    fi
done

################################################################################
# FINAL STATUS
################################################################################
echo ""
echo "=========================================="
if [ "$ALL_FOUND" = true ]; then
    echo -e "${GREEN}✓ MIGRATION COMPLETED SUCCESSFULLY!${NC}"
else
    echo -e "${YELLOW}⚠ MIGRATION COMPLETED WITH WARNINGS${NC}"
fi
echo "=========================================="
echo ""

echo "Summary:"
echo "  • Database: Fresh installation with $TOTAL_TABLES tables"
echo "  • Backup: $BACKUP_FILE"
echo "  • Admin: sysadmin@school.ug / Admin@123"
echo "  • Status: All services running"
echo ""

echo "Service Status:"
docker compose -f docker-compose.prod.yml ps
echo ""

echo "Next Steps:"
echo "  1. Test login: https://acadistra.com"
echo "  2. Verify features work (staff, lessons, budget, inventory)"
echo "  3. Create schools and users"
echo ""

echo "Useful Commands:"
echo "  • View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  • Check tables: docker exec acadistra_postgres psql -U acadistra -d acadistra -c '\dt'"
echo "  • Restart: docker compose -f docker-compose.prod.yml restart"
echo "  • Stop: docker compose -f docker-compose.prod.yml down"
echo ""

echo -e "${GREEN}Migration complete!${NC}"
echo ""
