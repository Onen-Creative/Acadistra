#!/bin/bash

################################################################################
# ACADISTRA DATABASE RESTORE SCRIPT
################################################################################

set -e

# Configuration
PROJECT_DIR="/root/acadistra"
BACKUP_DIR="$PROJECT_DIR/backups"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "  ACADISTRA DATABASE RESTORE"
echo "=========================================="
echo ""

# Check if backups exist
if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR/*.sql.gz 2>/dev/null)" ]; then
    echo -e "${RED}ERROR: No backups found in $BACKUP_DIR${NC}"
    exit 1
fi

# List available backups
echo "Available backups:"
echo ""
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | nl | awk '{print $1". "$10" ("$6")"}'
echo ""

# Get backup file
if [ -z "$1" ]; then
    read -p "Enter backup number to restore (or full path): " BACKUP_CHOICE
    
    if [[ "$BACKUP_CHOICE" =~ ^[0-9]+$ ]]; then
        BACKUP_FILE=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | sed -n "${BACKUP_CHOICE}p")
    else
        BACKUP_FILE="$BACKUP_CHOICE"
    fi
else
    BACKUP_FILE="$1"
fi

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}ERROR: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}WARNING: This will REPLACE the current database!${NC}"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Type 'YES' to proceed: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Check if PostgreSQL is running
if ! docker ps | grep -q acadistra_postgres; then
    echo -e "${RED}ERROR: PostgreSQL container is not running${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}[1/4] Creating safety backup of current database...${NC}"
SAFETY_BACKUP="$BACKUP_DIR/before_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
docker exec acadistra_postgres pg_dump -U acadistra acadistra | gzip > "$SAFETY_BACKUP"
echo -e "${GREEN}✓ Safety backup created: $SAFETY_BACKUP${NC}"

echo ""
echo -e "${BLUE}[2/4] Dropping existing database...${NC}"
docker exec acadistra_postgres psql -U acadistra -d postgres -c "DROP DATABASE IF EXISTS acadistra;"
echo -e "${GREEN}✓ Database dropped${NC}"

echo ""
echo -e "${BLUE}[3/4] Creating fresh database...${NC}"
docker exec acadistra_postgres psql -U acadistra -d postgres -c "CREATE DATABASE acadistra;"
echo -e "${GREEN}✓ Database created${NC}"

echo ""
echo -e "${BLUE}[4/4] Restoring from backup...${NC}"
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker exec -i acadistra_postgres psql -U acadistra -d acadistra
else
    cat "$BACKUP_FILE" | docker exec -i acadistra_postgres psql -U acadistra -d acadistra
fi
echo -e "${GREEN}✓ Database restored${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}✓ RESTORE COMPLETED SUCCESSFULLY!${NC}"
echo "=========================================="
echo ""
echo "Restored from: $BACKUP_FILE"
echo "Safety backup: $SAFETY_BACKUP"
echo ""
echo "Next steps:"
echo "  1. Test the application: https://acadistra.com"
echo "  2. Verify data is correct"
echo "  3. If issues, restore from safety backup"
echo ""
