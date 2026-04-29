#!/bin/bash

# System Settings Feature Deployment Script
# This script deploys the system settings feature to production

set -e

echo "🚀 Deploying System Settings Feature..."
echo "========================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running in correct directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.prod.yml not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo -e "${BLUE}📦 Step 1: Building backend...${NC}"
cd backend
go build -o main cmd/api/main.go
cd ..

echo -e "${BLUE}🔄 Step 2: Restarting services...${NC}"
docker-compose -f docker-compose.prod.yml restart backend

echo -e "${BLUE}🗄️  Step 3: Running database migration...${NC}"
docker exec acadistra_backend ./main migrate

echo -e "${BLUE}✅ Step 4: Verifying migration...${NC}"
docker exec acadistra_postgres psql -U postgres -d school_system_db -c "\dt system_settings" || {
    echo -e "${RED}❌ Migration verification failed${NC}"
    exit 1
}

echo -e "${BLUE}📊 Step 5: Checking default settings...${NC}"
docker exec acadistra_postgres psql -U postgres -d school_system_db -c "SELECT key, value FROM system_settings LIMIT 5"

echo ""
echo -e "${GREEN}✨ Deployment Complete!${NC}"
echo "========================================"
echo ""
echo "📝 Next Steps:"
echo "1. Login as System Admin"
echo "2. Navigate to System → Settings"
echo "3. Configure your system settings"
echo ""
echo "🔗 Access the application:"
echo "   https://acadistra.com/system/settings"
echo ""
echo "📖 Documentation:"
echo "   See SYSTEM_SETTINGS_FEATURE.md for details"
echo ""
