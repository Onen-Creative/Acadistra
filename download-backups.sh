#!/bin/bash

################################################################################
# DOWNLOAD BACKUPS FROM VPS TO LOCAL MACHINE
################################################################################

# Configuration
VPS_HOST="185.208.207.16"
VPS_USER="root"
VPS_BACKUP_DIR="/root/acadistra/backups"
LOCAL_BACKUP_DIR="./backups-from-vps"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "  DOWNLOAD BACKUPS FROM VPS"
echo "=========================================="
echo ""

# Create local backup directory
mkdir -p "$LOCAL_BACKUP_DIR"

# Check if we can connect to VPS
echo -e "${BLUE}Checking VPS connection...${NC}"
if ! ssh -o ConnectTimeout=5 "$VPS_USER@$VPS_HOST" "echo 'Connected'" >/dev/null 2>&1; then
    echo -e "${RED}ERROR: Cannot connect to VPS${NC}"
    echo "Make sure you can SSH to: $VPS_USER@$VPS_HOST"
    exit 1
fi
echo -e "${GREEN}✓ VPS connection OK${NC}"
echo ""

# List available backups on VPS
echo -e "${BLUE}Available backups on VPS:${NC}"
echo ""
ssh "$VPS_USER@$VPS_HOST" "ls -lh $VPS_BACKUP_DIR/*.sql.gz 2>/dev/null | tail -10" | nl
echo ""

# Ask what to download
echo "Options:"
echo "  1. Download latest backup only"
echo "  2. Download all backups"
echo "  3. Download backups from specific date (YYYYMMDD)"
echo "  4. Exit"
echo ""
read -p "Choose option (1-4): " OPTION

case $OPTION in
    1)
        echo ""
        echo -e "${BLUE}Downloading latest backup...${NC}"
        LATEST=$(ssh "$VPS_USER@$VPS_HOST" "ls -t $VPS_BACKUP_DIR/acadistra_backup_*.sql.gz 2>/dev/null | head -1")
        if [ -n "$LATEST" ]; then
            rsync -avz --progress "$VPS_USER@$VPS_HOST:$LATEST" "$LOCAL_BACKUP_DIR/"
            echo -e "${GREEN}✓ Latest backup downloaded${NC}"
        else
            echo -e "${RED}No backups found on VPS${NC}"
        fi
        
        # Also download latest uploads backup
        LATEST_UPLOADS=$(ssh "$VPS_USER@$VPS_HOST" "ls -t $VPS_BACKUP_DIR/uploads_backup_*.tar.gz 2>/dev/null | head -1")
        if [ -n "$LATEST_UPLOADS" ]; then
            echo ""
            echo -e "${BLUE}Downloading latest uploads backup...${NC}"
            rsync -avz --progress "$VPS_USER@$VPS_HOST:$LATEST_UPLOADS" "$LOCAL_BACKUP_DIR/"
            echo -e "${GREEN}✓ Latest uploads backup downloaded${NC}"
        fi
        ;;
    2)
        echo ""
        echo -e "${BLUE}Downloading all backups...${NC}"
        rsync -avz --progress "$VPS_USER@$VPS_HOST:$VPS_BACKUP_DIR/*.sql.gz" "$LOCAL_BACKUP_DIR/"
        rsync -avz --progress "$VPS_USER@$VPS_HOST:$VPS_BACKUP_DIR/*.tar.gz" "$LOCAL_BACKUP_DIR/"
        echo -e "${GREEN}✓ All backups downloaded${NC}"
        ;;
    3)
        echo ""
        read -p "Enter date (YYYYMMDD): " DATE
        echo -e "${BLUE}Downloading backups from $DATE...${NC}"
        rsync -avz --progress "$VPS_USER@$VPS_HOST:$VPS_BACKUP_DIR/*backup_${DATE}_*.{sql.gz,tar.gz}" "$LOCAL_BACKUP_DIR/" 2>/dev/null || \
            echo -e "${YELLOW}No backups found for date: $DATE${NC}"
        ;;
    4)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

# Show what was downloaded
echo ""
echo "=========================================="
echo -e "${GREEN}Download complete!${NC}"
echo "=========================================="
echo ""
echo "Downloaded backups:"
ls -lh "$LOCAL_BACKUP_DIR"
echo ""
echo "Location: $LOCAL_BACKUP_DIR"
echo ""
echo "To restore locally:"
echo "  1. Extract: gunzip backups-from-vps/acadistra_backup_YYYYMMDD_HHMMSS.sql.gz"
echo "  2. Import: psql -U postgres -d acadistra < backups-from-vps/acadistra_backup_YYYYMMDD_HHMMSS.sql"
echo ""
