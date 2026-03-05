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

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root. Run as regular user with sudo access.${NC}"
   exit 1
fi

# Function to generate secure password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}Creating .env.production with secure passwords...${NC}"
    
    POSTGRES_PASSWORD=$(generate_password)
    REDIS_PASSWORD=$(generate_password)
    MINIO_PASSWORD=$(generate_password)
    JWT_SECRET=$(generate_password)$(generate_password)
    
    cat > .env.production << EOF
# PostgreSQL
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=acadistra

# Redis
REDIS_PASSWORD=${REDIS_PASSWORD}

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}

# JWT
JWT_SECRET=${JWT_SECRET}

# Multi-Tenant Setup
# All schools share one database (acadistra)
# Data is isolated by school_id column
EOF
    
    echo -e "${GREEN}✓ .env.production created with secure passwords${NC}"
else
    echo -e "${GREEN}✓ .env.production already exists${NC}"
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
echo "  - Email: sysadmin@school.ug"
echo "  - Password: Admin@123"
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
