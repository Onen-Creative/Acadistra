#!/bin/bash

# Rollback Script for Acadistra
# Use this if the migration fails and you need to restore

set -e

echo "=========================================="
echo "Acadistra Rollback Script"
echo "=========================================="
echo ""

PROJECT_DIR="/home/od/workspace/programming/school management system"
BACKUP_DIR="$PROJECT_DIR/backups"

cd "$PROJECT_DIR"

# Find the most recent backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/acadistra_backup_*.sql 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backup found in $BACKUP_DIR"
    exit 1
fi

echo "Found backup: $LATEST_BACKUP"
echo ""
read -p "Do you want to restore from this backup? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

echo ""
echo "Step 1: Stopping services..."
docker compose -f docker-compose.prod.yml down

echo ""
echo "Step 2: Removing database volume..."
docker volume rm schoolmanagementsystem_postgres_data 2>/dev/null || true

echo ""
echo "Step 3: Starting PostgreSQL..."
docker compose -f docker-compose.prod.yml up -d postgres
sleep 10

echo ""
echo "Step 4: Restoring database..."
cat "$LATEST_BACKUP" | docker exec -i acadistra_postgres psql -U acadistra -d acadistra

echo ""
echo "Step 5: Starting all services..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "=========================================="
echo "Rollback Complete!"
echo "=========================================="
echo ""
echo "Database restored from: $LATEST_BACKUP"
echo ""
