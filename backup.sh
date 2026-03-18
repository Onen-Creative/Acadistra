#!/bin/bash

################################################################################
# ACADISTRA AUTOMATED BACKUP SCRIPT
################################################################################

set -e

# Configuration
PROJECT_DIR="/root/acadistra"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y%m%d)
BACKUP_FILE="$BACKUP_DIR/acadistra_backup_${TIMESTAMP}.sql"
KEEP_DAYS=30  # Keep backups for 30 days

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  ACADISTRA DATABASE BACKUP"
echo "=========================================="
echo "Date: $(date)"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if PostgreSQL is running
if ! docker ps | grep -q acadistra_postgres; then
    echo -e "${RED}ERROR: PostgreSQL container is not running${NC}"
    exit 1
fi

# Create backup
echo "Creating backup..."
if docker exec acadistra_postgres pg_dump -U acadistra acadistra > "$BACKUP_FILE" 2>/dev/null; then
    # Compress backup
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    # Get file size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    
    echo -e "${GREEN}✓ Backup created successfully${NC}"
    echo "File: $BACKUP_FILE"
    echo "Size: $SIZE"
else
    echo -e "${RED}✗ Backup failed${NC}"
    exit 1
fi

# Clean old backups (older than KEEP_DAYS)
echo ""
echo "Cleaning old backups (keeping last $KEEP_DAYS days)..."
find "$BACKUP_DIR" -name "acadistra_backup_*.sql.gz" -type f -mtime +$KEEP_DAYS -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/acadistra_backup_*.sql.gz 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo "Backups remaining: $REMAINING"

# Backup summary
echo ""
echo "=========================================="
echo "Recent backups:"
ls -lh "$BACKUP_DIR"/acadistra_backup_*.sql.gz 2>/dev/null | tail -5 | awk '{print $9, "("$5")"}'
echo "=========================================="
echo ""
echo -e "${GREEN}Backup completed successfully!${NC}"
echo ""
