#!/bin/bash

# Acadistra Deployment Script
# This script automates the deployment process

set -e

echo "=========================================="
echo "  Acadistra Deployment Script"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color


# Function to generate secure password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from example...${NC}"
    if [ -f .env.production.example ]; then
        cp .env.production.example .env
        echo -e "${GREEN}✓ .env created from .env.production.example${NC}"
        echo -e "${RED}IMPORTANT: Edit .env file and add your credentials before continuing!${NC}"
        echo -e "${YELLOW}Press Enter after editing .env file...${NC}"
        read
    else
        echo -e "${RED}Error: .env.production.example not found!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env already exists${NC}"
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}✓ Docker installed${NC}"
    echo -e "${YELLOW}Please log out and log back in for Docker permissions to take effect${NC}"
    exit 0
else
    echo -e "${GREEN}✓ Docker is installed${NC}"
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo -e "${RED}Docker Compose plugin not found. Please install it.${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Docker Compose is available${NC}"
fi

# Build and start services
echo ""
echo -e "${YELLOW}Building and starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d --build

# Wait for services to be healthy
echo ""
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

# Check service health
echo ""
echo "Checking service health..."
docker compose -f docker-compose.prod.yml ps

# Run migrations
echo ""
echo -e "${YELLOW}Running database migrations...${NC}"
docker exec acadistra_backend ./main migrate || echo -e "${YELLOW}Migrations may have already run${NC}"

# Seed admin user
echo ""
echo -e "${YELLOW}Creating system admin user...${NC}"
docker exec acadistra_backend ./main seed-admin || echo -e "${YELLOW}Admin may already exist${NC}"

# Seed standard subjects
echo ""
echo -e "${YELLOW}Seeding standard subjects...${NC}"
docker exec acadistra_backend ./main seed-standard-subjects || echo -e "${YELLOW}Subjects may already exist${NC}"

# Run SMS tables migration
echo ""
echo -e "${YELLOW}Creating SMS system tables...${NC}"
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260505000000_create_sms_tables_pg.sql" || echo -e "${YELLOW}SMS tables may already exist${NC}"

# Run SchoolPay tables migration
echo ""
echo -e "${YELLOW}Creating SchoolPay system tables...${NC}"
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260129000000_create_schoolpay_tables.sql" || echo -e "${YELLOW}SchoolPay tables may already exist${NC}"

# Add SchoolPay code to students
echo ""
echo -e "${YELLOW}Adding SchoolPay code column to students...${NC}"
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260130000000_add_schoolpay_code_to_students.sql" || echo -e "${YELLOW}SchoolPay code column may already exist${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "  Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "Services are running:"
echo "  - Backend API: http://localhost:8080"
echo "  - Frontend: http://localhost:3000"
echo "  - MinIO Console: http://localhost:9001"
echo ""
echo "Default credentials:"
echo "  - Email: admin@acadistra.com"
echo "  - Password: Admin@123"
echo ""
echo "Configuration:"
echo "  - SMS: Configure in Admin Panel > SMS Management"
echo "  - SchoolPay: Configure in Admin Panel > Settings > SchoolPay"
echo "  - Email: Already configured from .env file"
echo ""
echo "To view logs:"
echo "  docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "To stop services:"
echo "  docker compose -f docker-compose.prod.yml down"
echo ""
echo "To backup data:"
echo "  ./scripts/backup.sh"
echo ""
