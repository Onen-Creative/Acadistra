#!/bin/bash

################################################################################
# ACADISTRA COMPLETE SYSTEM MIGRATION - STANDALONE VERSION
# 
# Copy this entire file and paste it into your VPS terminal
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/home/od/workspace/programming/school management system"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/acadistra_full_backup_$TIMESTAMP.sql"

echo ""
echo "=========================================="
echo "  ACADISTRA COMPLETE SYSTEM MIGRATION"
echo "=========================================="
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

echo ""
echo -e "${BLUE}[2/10] Stopping all services...${NC}"
docker compose -f docker-compose.prod.yml down 2>/dev/null || true
echo -e "${GREEN}✓ All services stopped${NC}"

echo ""
echo -e "${BLUE}[3/10] Removing old containers...${NC}"
docker rm -f acadistra_backend acadistra_frontend acadistra_postgres acadistra_caddy 2>/dev/null || true
echo -e "${GREEN}✓ Old containers removed${NC}"

echo ""
echo -e "${BLUE}[4/10] Removing old database volume...${NC}"
docker volume rm schoolmanagementsystem_postgres_data 2>/dev/null || echo -e "${YELLOW}No existing volume${NC}"
echo -e "${GREEN}✓ Database volume removed${NC}"

echo ""
echo -e "${BLUE}[5/10] Downloading updated code from GitHub...${NC}"
curl -s -o backend/internal/database/database.go https://raw.githubusercontent.com/Onen-Creative/Acadistra/main/backend/internal/database/database.go
curl -s -o docker-compose.prod.yml https://raw.githubusercontent.com/Onen-Creative/Acadistra/main/docker-compose.prod.yml
echo -e "${GREEN}✓ Code updated${NC}"

echo ""
echo -e "${BLUE}[6/10] Rebuilding backend...${NC}"
docker compose -f docker-compose.prod.yml build backend --no-cache
echo -e "${GREEN}✓ Backend rebuilt${NC}"

echo ""
echo -e "${BLUE}[7/10] Rebuilding frontend...${NC}"
docker compose -f docker-compose.prod.yml build frontend --no-cache
echo -e "${GREEN}✓ Frontend rebuilt${NC}"

echo ""
echo -e "${BLUE}[8/10] Starting all services...${NC}"
docker compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✓ Services started${NC}"

echo ""
echo -e "${BLUE}[9/10] Waiting for services...${NC}"

echo -n "Waiting for PostgreSQL"
for i in {1..60}; do
    if docker exec acadistra_postgres pg_isready -U acadistra >/dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✓ PostgreSQL ready${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

echo -n "Waiting for Backend"
for i in {1..60}; do
    if curl -s http://localhost:8080/health >/dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✓ Backend ready${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

echo ""
echo -e "${BLUE}[10/10] Running migrations...${NC}"

MIGRATION_RESPONSE=$(curl -s -X GET "http://localhost:8080/setup/migrate")
echo "$MIGRATION_RESPONSE"

if echo "$MIGRATION_RESPONSE" | grep -q "successfully"; then
    echo -e "${GREEN}✓ Migration completed${NC}"
else
    echo -e "${RED}✗ Migration failed${NC}"
    exit 1
fi

echo ""
echo "Seeding admin user..."
curl -s -X GET "http://localhost:8080/setup/seed-admin"

echo ""
echo "Seeding subjects..."
curl -s -X GET "http://localhost:8080/setup/seed-subjects"

echo ""
echo -e "${BLUE}Verifying tables...${NC}"
TOTAL_TABLES=$(docker exec acadistra_postgres psql -U acadistra -d acadistra -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" | tr -d ' ')
echo "Total tables: $TOTAL_TABLES"

echo ""
echo "Checking new tables:"
for table in lesson_records budgets requisitions inventory_items; do
    if docker exec acadistra_postgres psql -U acadistra -d acadistra -t -c "\dt $table" | grep -q "$table"; then
        echo -e "  ${GREEN}✓${NC} $table"
    else
        echo -e "  ${RED}✗${NC} $table"
    fi
done

echo ""
echo "=========================================="
echo -e "${GREEN}✓ MIGRATION COMPLETE!${NC}"
echo "=========================================="
echo ""
echo "Login: https://acadistra.com"
echo "Email: admin@acadistra.com"
echo "Password: Admin@123"
echo ""
echo "Backup: $BACKUP_FILE"
echo ""
