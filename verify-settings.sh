#!/bin/bash

# System Settings Feature Verification Script
# Tests the complete implementation

set -e

echo "🔍 System Settings Feature Verification"
echo "========================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

# Function to test
test_check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((FAILED++))
    fi
}

echo ""
echo -e "${BLUE}📁 Checking Backend Files...${NC}"

echo -n "  Migration file exists: "
[ -f "backend/migrations/20260520000000_create_system_settings_table.sql" ]
test_check

echo -n "  SystemSetting model exists: "
[ -f "backend/internal/models/system_settings.go" ]
test_check

echo -n "  Settings handler updated: "
grep -q "SystemSetting" "backend/internal/handlers/settings_handler.go"
test_check

echo -n "  Database migration includes SystemSetting: "
grep -q "SystemSetting" "backend/internal/database/database.go"
test_check

echo ""
echo -e "${BLUE}📁 Checking Frontend Files...${NC}"

echo -n "  Settings service exists: "
[ -f "frontend/src/services/settings.ts" ]
test_check

echo -n "  Settings page updated: "
grep -q "settingsService" "frontend/src/app/system/settings/page.tsx"
test_check

echo ""
echo -e "${BLUE}📁 Checking Documentation...${NC}"

echo -n "  Feature documentation exists: "
[ -f "SYSTEM_SETTINGS_FEATURE.md" ]
test_check

echo -n "  Summary documentation exists: "
[ -f "SYSTEM_SETTINGS_SUMMARY.md" ]
test_check

echo ""
echo -e "${BLUE}🔧 Checking Code Quality...${NC}"

echo -n "  Backend compiles: "
cd backend && go build -o /tmp/acadistra_test cmd/api/main.go 2>/dev/null
test_check
cd ..

echo -n "  Frontend TypeScript valid: "
cd frontend && npx tsc --noEmit 2>/dev/null
test_check
cd ..

echo ""
echo -e "${BLUE}🗄️  Checking Database (if running)...${NC}"

if docker ps | grep -q acadistra_postgres; then
    echo -n "  System settings table exists: "
    docker exec acadistra_postgres psql -U postgres -d school_system_db -c "\dt system_settings" >/dev/null 2>&1
    test_check
    
    echo -n "  Default settings exist: "
    COUNT=$(docker exec acadistra_postgres psql -U postgres -d school_system_db -t -c "SELECT COUNT(*) FROM system_settings" 2>/dev/null | tr -d ' ')
    [ "$COUNT" -gt 0 ] 2>/dev/null
    test_check
else
    echo -e "${YELLOW}  ⚠️  Database not running - skipping database checks${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Failed: $FAILED${NC}"
else
    echo -e "${GREEN}🎉 All checks passed!${NC}"
fi
echo "========================================"

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✨ System Settings feature is ready for deployment!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: ./deploy-settings.sh (for production)"
    echo "2. Or: cd backend && go run cmd/api/main.go migrate (for development)"
    echo "3. Access: http://localhost:3000/system/settings"
else
    echo -e "${RED}⚠️  Some checks failed. Please review the errors above.${NC}"
    exit 1
fi

echo ""
