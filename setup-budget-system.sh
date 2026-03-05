#!/bin/bash

# Budget & Requisitions System Setup Script
# This script sets up the budget and requisitions functionality

set -e

echo "🚀 Setting up Budget & Requisitions System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "❌ Error: backend directory not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "${BLUE}Step 1: Running database migrations...${NC}"
cd backend

# Run migration
if go run cmd/api/main.go migrate; then
    echo "${GREEN}✅ Database migration completed successfully${NC}"
else
    echo "${YELLOW}⚠️  Migration may have already been run${NC}"
fi

echo ""
echo "${BLUE}Step 2: Verifying tables...${NC}"

# Check if tables exist (requires mysql client)
if command -v mysql &> /dev/null; then
    echo "Checking for budget tables..."
    
    # Get database credentials from .env
    if [ -f ".env" ]; then
        source .env
        
        # Check if budgets table exists
        if mysql -u${DB_USER:-root} -p${DB_PASSWORD} -D${DB_NAME:-acadistra} -e "SHOW TABLES LIKE 'budgets';" | grep -q budgets; then
            echo "${GREEN}✅ budgets table exists${NC}"
        else
            echo "${YELLOW}⚠️  budgets table not found${NC}"
        fi
        
        # Check if requisitions table exists
        if mysql -u${DB_USER:-root} -p${DB_PASSWORD} -D${DB_NAME:-acadistra} -e "SHOW TABLES LIKE 'requisitions';" | grep -q requisitions; then
            echo "${GREEN}✅ requisitions table exists${NC}"
        else
            echo "${YELLOW}⚠️  requisitions table not found${NC}"
        fi
        
        # Check if requisition_items table exists
        if mysql -u${DB_USER:-root} -p${DB_PASSWORD} -D${DB_NAME:-acadistra} -e "SHOW TABLES LIKE 'requisition_items';" | grep -q requisition_items; then
            echo "${GREEN}✅ requisition_items table exists${NC}"
        else
            echo "${YELLOW}⚠️  requisition_items table not found${NC}"
        fi
    else
        echo "${YELLOW}⚠️  .env file not found, skipping table verification${NC}"
    fi
else
    echo "${YELLOW}⚠️  mysql client not found, skipping table verification${NC}"
fi

echo ""
echo "${BLUE}Step 3: Checking backend routes...${NC}"

# Check if routes are added to main.go
if grep -q "budgetHandler := handlers.NewBudgetHandler" cmd/api/main.go; then
    echo "${GREEN}✅ Budget routes are configured${NC}"
else
    echo "${YELLOW}⚠️  Budget routes not found in main.go${NC}"
    echo "   Please ensure routes are added to cmd/api/main.go"
fi

echo ""
echo "${BLUE}Step 4: Checking frontend pages...${NC}"

cd ..

# Check if frontend budget page exists
if [ -f "frontend/src/app/finance/budget/page.tsx" ]; then
    echo "${GREEN}✅ Budget page exists${NC}"
else
    echo "${YELLOW}⚠️  Budget page not found${NC}"
fi

# Check if frontend requisitions page exists
if [ -f "frontend/src/app/finance/requisitions/page.tsx" ]; then
    echo "${GREEN}✅ Requisitions page exists${NC}"
else
    echo "${YELLOW}⚠️  Requisitions page not found${NC}"
fi

echo ""
echo "${GREEN}========================================${NC}"
echo "${GREEN}✅ Setup Complete!${NC}"
echo "${GREEN}========================================${NC}"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Start the backend server:"
echo "   ${BLUE}cd backend && go run cmd/api/main.go${NC}"
echo ""
echo "2. Start the frontend server:"
echo "   ${BLUE}cd frontend && npm run dev${NC}"
echo ""
echo "3. Access the system:"
echo "   - Budget Management: ${BLUE}http://localhost:3000/finance/budget${NC}"
echo "   - Requisitions: ${BLUE}http://localhost:3000/finance/requisitions${NC}"
echo ""
echo "4. Login as:"
echo "   - Bursar or School Admin to access all features"
echo "   - Teacher to create requisitions"
echo ""
echo "📚 Documentation:"
echo "   - See ${BLUE}BUDGET_REQUISITIONS_IMPLEMENTATION.md${NC} for details"
echo "   - See ${BLUE}docs/BUDGET_REQUISITIONS.md${NC} for API documentation"
echo ""
echo "🎉 Happy budgeting!"
