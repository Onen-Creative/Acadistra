#!/bin/bash

# Pre-Deployment Verification Script
# Checks if all required files and configurations are in place

echo "=========================================="
echo "  Acadistra Pre-Deployment Verification"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1 - MISSING"
        ((ERRORS++))
    fi
}

# Function to check directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
    else
        echo -e "${RED}✗${NC} $1/ - MISSING"
        ((ERRORS++))
    fi
}

echo "Checking Required Files:"
echo "----------------------------------------"

# Core deployment files
check_file "docker-compose.prod.yml"
check_file "Caddyfile"
check_file "deploy.sh"
check_file "health-check.sh"
check_file "Makefile"
check_file "README.md"
check_file "LICENSE"

# Backend files
echo ""
echo "Backend Files:"
check_file "backend/Dockerfile"
check_file "backend/.dockerignore"
check_file "backend/go.mod"
check_file "backend/cmd/api/main.go"
check_dir "backend/migrations"

# Frontend files
echo ""
echo "Frontend Files:"
check_file "frontend/Dockerfile"
check_file "frontend/.dockerignore"
check_file "frontend/package.json"
check_file "frontend/next.config.js"
check_file "frontend/src/app/api/health/route.ts"

# Scripts
echo ""
echo "Scripts:"
check_file "scripts/backup.sh"
check_file "scripts/init-databases.sql"

# Documentation
echo ""
echo "Documentation:"
check_file "QUICKSTART.md"
check_file "DEPLOYMENT.md"
check_file "DEPLOYMENT_CHECKLIST_CLEAN.md"
check_file "PRODUCTION_CHECKLIST.md"
check_file "TROUBLESHOOTING.md"
check_file "SECURITY.md"
check_file "CONTRIBUTING.md"
check_file "CHANGELOG.md"

# Check if scripts are executable
echo ""
echo "Checking Script Permissions:"
echo "----------------------------------------"

for script in deploy.sh health-check.sh scripts/backup.sh; do
    if [ -x "$script" ]; then
        echo -e "${GREEN}✓${NC} $script is executable"
    else
        echo -e "${YELLOW}⚠${NC} $script is not executable"
        echo "  Run: chmod +x $script"
        ((WARNINGS++))
    fi
done

# Check for .env.production
echo ""
echo "Checking Configuration:"
echo "----------------------------------------"

if [ -f ".env.production" ]; then
    echo -e "${GREEN}✓${NC} .env.production exists"
    
    # Check if it has default values
    if grep -q "CHANGE_THIS" .env.production 2>/dev/null; then
        echo -e "${YELLOW}⚠${NC} .env.production contains default values"
        echo "  Update passwords before deployment!"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} .env.production not found"
    echo "  Will be created during deployment"
fi

# Check Docker
echo ""
echo "Checking System Requirements:"
echo "----------------------------------------"

if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker is installed"
    docker --version
else
    echo -e "${YELLOW}⚠${NC} Docker not found"
    echo "  Will be installed during deployment"
    ((WARNINGS++))
fi

if docker compose version &> /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker Compose is available"
else
    echo -e "${YELLOW}⚠${NC} Docker Compose not found"
    echo "  Required for deployment"
    ((WARNINGS++))
fi

# Check disk space
echo ""
echo "Checking Resources:"
echo "----------------------------------------"

DISK_AVAIL=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$DISK_AVAIL" -gt 20 ]; then
    echo -e "${GREEN}✓${NC} Sufficient disk space: ${DISK_AVAIL}GB available"
else
    echo -e "${YELLOW}⚠${NC} Low disk space: ${DISK_AVAIL}GB available"
    echo "  Recommended: 20GB+"
    ((WARNINGS++))
fi

MEMORY=$(free -g | grep Mem | awk '{print $2}')
if [ "$MEMORY" -ge 2 ]; then
    echo -e "${GREEN}✓${NC} Sufficient memory: ${MEMORY}GB"
else
    echo -e "${YELLOW}⚠${NC} Low memory: ${MEMORY}GB"
    echo "  Recommended: 2GB+"
    ((WARNINGS++))
fi

# Summary
echo ""
echo "=========================================="
echo "  Verification Summary"
echo "=========================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "System is ready for deployment."
    echo ""
    echo "Next steps:"
    echo "  1. Review PRODUCTION_CHECKLIST.md"
    echo "  2. Run: ./deploy.sh"
    echo "  3. Follow QUICKSTART.md"
    echo ""
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo ""
    echo "System can be deployed, but review warnings above."
    echo ""
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    fi
    echo ""
    echo "Please fix errors before deployment."
    echo ""
    exit 1
fi

echo "=========================================="
