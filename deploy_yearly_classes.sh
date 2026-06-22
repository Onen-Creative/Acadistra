#!/bin/bash
# One-command deployment script for yearly class migration
# Usage: ./deploy_yearly_classes.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Yearly Class System Deployment${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Configuration
DB_CONTAINER="${DB_CONTAINER:-acadistra_db}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-acadistra_backend}"
DB_NAME="${DB_NAME:-school_system_db}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="./backups"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Backup
echo -e "${YELLOW}Step 1: Creating backup...${NC}"
BACKUP_FILE="$BACKUP_DIR/backup_before_yearly_migration_$(date +%Y%m%d_%H%M%S).sql"

if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "  Size: $BACKUP_SIZE"
else
    echo -e "${RED}✗ Backup failed!${NC}"
    exit 1
fi
echo ""

# Step 2: Check current state
echo -e "${YELLOW}Step 2: Checking current database state...${NC}"
HAS_TERM=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "\d classes" 2>/dev/null | grep -c "term" || true)

if [ "$HAS_TERM" -gt 0 ]; then
    echo -e "${YELLOW}⚠  'term' column exists in classes table${NC}"
    echo -e "  Migration needed: YES"
else
    echo -e "${GREEN}✓ 'term' column does NOT exist${NC}"
    echo -e "  Migration already applied"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi
echo ""

# Step 3: Show current classes
echo -e "${YELLOW}Step 3: Current classes per term...${NC}"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
    "SELECT COALESCE(term, 'NO TERM') as term, level, COUNT(*) FROM classes WHERE year = 2024 GROUP BY term, level ORDER BY level, term;" 2>/dev/null || echo "Query failed"
echo ""

# Step 4: Confirm
echo -e "${RED}WARNING: This will modify the database schema!${NC}"
echo -e "  - Remove 'term' column from classes table"
echo -e "  - Classes will be yearly instead of per-term"
echo -e "  - Backup saved to: $BACKUP_FILE"
echo ""
read -p "Proceed with migration? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "Aborted. No changes made."
    exit 0
fi
echo ""

# Step 5: Run migration
echo -e "${YELLOW}Step 4: Running migration...${NC}"

# Check if migration file exists
if ! docker exec "$BACKEND_CONTAINER" test -f /app/migrations/20260702000000_make_classes_yearly.sql 2>/dev/null; then
    echo -e "${RED}✗ Migration file not found in container!${NC}"
    echo "  Expected: /app/migrations/20260702000000_make_classes_yearly.sql"
    echo ""
    echo "Trying alternative method..."
    
    # Copy migration file to container if it exists locally
    if [ -f "migrations/20260702000000_make_classes_yearly.sql" ]; then
        docker cp migrations/20260702000000_make_classes_yearly.sql "$BACKEND_CONTAINER":/tmp/
        docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/20260702000000_make_classes_yearly.sql
    else
        echo -e "${RED}✗ Migration file not found locally either!${NC}"
        exit 1
    fi
else
    # Run migration using backend container
    if docker exec "$BACKEND_CONTAINER" sh -c "PGPASSWORD=\${DB_PASSWORD} psql -h \${DB_HOST} -U \${DB_USER} -d \${DB_NAME} -f /app/migrations/20260702000000_make_classes_yearly.sql" 2>/dev/null; then
        echo -e "${GREEN}✓ Migration completed successfully${NC}"
    else
        echo -e "${RED}✗ Migration failed!${NC}"
        echo ""
        echo "To rollback:"
        echo "  docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
        exit 1
    fi
fi
echo ""

# Step 6: Verify migration
echo -e "${YELLOW}Step 5: Verifying migration...${NC}"

# Check term column removed
HAS_TERM_AFTER=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "\d classes" 2>/dev/null | grep -c "term" || true)
if [ "$HAS_TERM_AFTER" -eq 0 ]; then
    echo -e "${GREEN}✓ 'term' column removed${NC}"
else
    echo -e "${RED}✗ 'term' column still exists!${NC}"
fi

# Check unique constraint
HAS_CONSTRAINT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'classes' AND indexname = 'idx_class_unique';" 2>/dev/null | tr -d ' ')
if [ "$HAS_CONSTRAINT" -eq 1 ]; then
    echo -e "${GREEN}✓ Unique constraint 'idx_class_unique' exists${NC}"
else
    echo -e "${YELLOW}⚠  Unique constraint not found${NC}"
fi
echo ""

# Step 7: Show new state
echo -e "${YELLOW}Step 6: Classes after migration...${NC}"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
    "SELECT level, COUNT(*) FROM classes WHERE year = 2024 GROUP BY level ORDER BY level;" 2>/dev/null || echo "Query failed"
echo ""

# Step 8: Restart services
echo -e "${YELLOW}Step 7: Restarting backend service...${NC}"
if docker restart "$BACKEND_CONTAINER" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend restarted${NC}"
    echo "  Waiting for service to be ready..."
    sleep 5
else
    echo -e "${YELLOW}⚠  Could not restart backend (manual restart may be needed)${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}✓ Migration Complete!${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Test View Marks page with Term 2"
echo "  2. Test Attendance page with Term 2"
echo "  3. Test Reports page with Term 3"
echo ""
echo "If issues occur, rollback with:"
echo "  docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
echo "  docker restart $BACKEND_CONTAINER"
echo ""
echo "Backup location: $BACKUP_FILE"
echo ""
