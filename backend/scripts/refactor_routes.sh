#!/bin/bash

# Safe Refactoring - Backup and Apply Script
# This script helps you safely refactor routes from main.go

set -e

BACKEND_DIR="/home/od/workspace/programming/school management system/backend"
MAIN_FILE="$BACKEND_DIR/cmd/api/main.go"
BACKUP_FILE="$BACKEND_DIR/cmd/api/main.go.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔄 Safe Refactoring Script"
echo "=========================="
echo ""

# Step 1: Backup
echo "📦 Step 1: Creating backup..."
cp "$MAIN_FILE" "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"
echo ""

# Step 2: Check if routes package exists
echo "🔍 Step 2: Checking routes package..."
if [ -d "$BACKEND_DIR/internal/routes" ]; then
    echo "✅ Routes package found"
else
    echo "❌ Routes package not found. Please ensure route files are created first."
    exit 1
fi
echo ""

# Step 3: Test current build
echo "🧪 Step 3: Testing current build..."
cd "$BACKEND_DIR"
if go build -o /tmp/acadistra_test cmd/api/main.go; then
    echo "✅ Current code builds successfully"
    rm /tmp/acadistra_test
else
    echo "❌ Current code has build errors. Fix them before refactoring."
    exit 1
fi
echo ""

# Step 4: Instructions
echo "📋 Step 4: Manual steps required"
echo "================================"
echo ""
echo "Now you need to manually edit cmd/api/main.go:"
echo ""
echo "1. Add import:"
echo '   "github.com/school-system/backend/internal/routes"'
echo ""
echo "2. Find the line where routes start (around line 110):"
echo "   v1 := r.Group(\"/api/v1\")"
echo ""
echo "3. Replace ALL route definitions with:"
echo ""
echo "   routes.SetupRoutes(r, &routes.Dependencies{"
echo "       DB:                  db,"
echo "       Config:              cfg,"
echo "       AuthService:         authService,"
echo "       MonitoringService:   monitoringService,"
echo "       EmailService:        emailService,"
echo "       PayrollService:      payrollService,"
echo "       SMSService:          smsService,"
echo "       NotificationService: notificationService,"
echo "   })"
echo ""
echo "4. Save the file"
echo ""
echo "5. Run this script again with 'test' argument:"
echo "   ./scripts/refactor_routes.sh test"
echo ""
echo "Backup saved at: $BACKUP_FILE"
echo ""
echo "To restore backup if needed:"
echo "   cp $BACKUP_FILE $MAIN_FILE"
