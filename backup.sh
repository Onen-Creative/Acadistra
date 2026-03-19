#!/bin/bash

################################################################################
# ACADISTRA AUTOMATED BACKUP WITH REMOTE SYNC
################################################################################

set -e

# Configuration
PROJECT_DIR="/root/acadistra"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y%m%d)
BACKUP_FILE="$BACKUP_DIR/acadistra_backup_${TIMESTAMP}.sql"
KEEP_DAYS=30  # Keep local backups for 30 days

# Remote backup configuration (optional)
REMOTE_BACKUP_ENABLED=${REMOTE_BACKUP_ENABLED:-false}
REMOTE_HOST=${REMOTE_HOST:-""}
REMOTE_USER=${REMOTE_USER:-""}
REMOTE_PATH=${REMOTE_PATH:-""}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

################################################################################
# STEP 1: CREATE DATABASE BACKUP
################################################################################
echo -e "${BLUE}[1/4] Creating database backup...${NC}"
if docker exec acadistra_postgres pg_dump -U acadistra acadistra > "$BACKUP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ Database backup created${NC}"
else
    echo -e "${RED}✗ Database backup failed${NC}"
    exit 1
fi

################################################################################
# STEP 2: COMPRESS BACKUP
################################################################################
echo ""
echo -e "${BLUE}[2/4] Compressing backup...${NC}"
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "${GREEN}✓ Backup compressed${NC}"
echo "File: $BACKUP_FILE"
echo "Size: $SIZE"

################################################################################
# STEP 3: BACKUP UPLOADED FILES (logos, photos)
################################################################################
echo ""
echo -e "${BLUE}[3/4] Backing up uploaded files...${NC}"
UPLOADS_BACKUP="$BACKUP_DIR/uploads_backup_${TIMESTAMP}.tar.gz"

if [ -d "$PROJECT_DIR/backend/public" ]; then
    tar -czf "$UPLOADS_BACKUP" -C "$PROJECT_DIR/backend" public 2>/dev/null || true
    UPLOADS_SIZE=$(du -h "$UPLOADS_BACKUP" | cut -f1)
    echo -e "${GREEN}✓ Uploaded files backed up${NC}"
    echo "File: $UPLOADS_BACKUP"
    echo "Size: $UPLOADS_SIZE"
else
    echo -e "${YELLOW}No uploads directory found, skipping${NC}"
fi

################################################################################
# STEP 4: SYNC TO REMOTE (if configured)
################################################################################
echo ""
echo -e "${BLUE}[4/4] Remote backup sync...${NC}"

if [ "$REMOTE_BACKUP_ENABLED" = "true" ] && [ -n "$REMOTE_HOST" ]; then
    echo "Syncing to remote server: $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH"
    
    # Create remote directory if it doesn't exist
    ssh "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_PATH" 2>/dev/null || true
    
    # Sync backups to remote
    rsync -avz --progress "$BACKUP_FILE" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/" 2>/dev/null && \
        echo -e "${GREEN}✓ Database backup synced to remote${NC}" || \
        echo -e "${YELLOW}⚠ Remote sync failed (continuing anyway)${NC}"
    
    if [ -f "$UPLOADS_BACKUP" ]; then
        rsync -avz --progress "$UPLOADS_BACKUP" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/" 2>/dev/null && \
            echo -e "${GREEN}✓ Uploads backup synced to remote${NC}" || \
            echo -e "${YELLOW}⚠ Uploads sync failed (continuing anyway)${NC}"
    fi
else
    echo -e "${YELLOW}Remote backup not configured (backups stored locally only)${NC}"
    echo "To enable remote backup, set these environment variables:"
    echo "  REMOTE_BACKUP_ENABLED=true"
    echo "  REMOTE_HOST=your-backup-server.com"
    echo "  REMOTE_USER=your-username"
    echo "  REMOTE_PATH=/path/to/backups"
fi

################################################################################
# STEP 5: CLEANUP OLD BACKUPS
################################################################################
echo ""
echo -e "${BLUE}Cleaning old backups (keeping last $KEEP_DAYS days)...${NC}"
find "$BACKUP_DIR" -name "acadistra_backup_*.sql.gz" -type f -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name "uploads_backup_*.tar.gz" -type f -mtime +$KEEP_DAYS -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/acadistra_backup_*.sql.gz 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo "Database backups remaining: $REMAINING"

################################################################################
# SUMMARY
################################################################################
echo ""
echo "=========================================="
echo "Recent backups:"
ls -lh "$BACKUP_DIR"/*backup_*.{sql.gz,tar.gz} 2>/dev/null | tail -5 | awk '{print $9, "("$5")"}'
echo "=========================================="
echo ""
echo -e "${GREEN}Backup completed successfully!${NC}"
echo ""
echo "Backup location: $BACKUP_DIR"
echo "Latest backup: $BACKUP_FILE"
echo ""
