#!/bin/bash

# Acadistra System Health Check Script

echo "=========================================="
echo "  Acadistra System Health Check"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Docker is running${NC}"
fi

# Check if services are running
echo ""
echo "Service Status:"
echo "----------------------------------------"

services=("acadistra_postgres" "acadistra_redis" "acadistra_minio" "acadistra_backend" "acadistra_frontend" "acadistra_caddy")

for service in "${services[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${service}$"; then
        status=$(docker inspect --format='{{.State.Health.Status}}' $service 2>/dev/null || echo "running")
        if [ "$status" = "healthy" ] || [ "$status" = "running" ]; then
            echo -e "${GREEN}✓${NC} $service: $status"
        else
            echo -e "${YELLOW}⚠${NC} $service: $status"
        fi
    else
        echo -e "${RED}✗${NC} $service: not running"
    fi
done

# Check disk space
echo ""
echo "Disk Usage:"
echo "----------------------------------------"
df -h / | tail -1 | awk '{print "Root: " $3 " used of " $2 " (" $5 " full)"}'

# Check memory usage
echo ""
echo "Memory Usage:"
echo "----------------------------------------"
free -h | grep Mem | awk '{print "Memory: " $3 " used of " $2}'

# Check database connectivity
echo ""
echo "Database Connectivity:"
echo "----------------------------------------"
if docker exec acadistra_postgres pg_isready -U acadistra > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL is accepting connections${NC}"
    
    # Count schools
    school_count=$(docker exec acadistra_postgres psql -U acadistra -d acadistra -t -c "SELECT COUNT(*) FROM schools;" 2>/dev/null | tr -d ' ')
    if [ ! -z "$school_count" ]; then
        echo "  Schools in database: $school_count"
    fi
else
    echo -e "${RED}✗ PostgreSQL is not accepting connections${NC}"
fi

# Check Redis connectivity
echo ""
echo "Redis Connectivity:"
echo "----------------------------------------"
if docker exec acadistra_redis redis-cli -a "${REDIS_PASSWORD:-redis}" ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is responding${NC}"
else
    echo -e "${RED}✗ Redis is not responding${NC}"
fi

# Check backend API
echo ""
echo "Backend API:"
echo "----------------------------------------"
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend API is responding${NC}"
    echo "  URL: http://localhost:8080"
else
    echo -e "${RED}✗ Backend API is not responding${NC}"
fi

# Check frontend
echo ""
echo "Frontend:"
echo "----------------------------------------"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is responding${NC}"
    echo "  URL: http://localhost:3000"
else
    echo -e "${RED}✗ Frontend is not responding${NC}"
fi

# Check MinIO
echo ""
echo "MinIO Storage:"
echo "----------------------------------------"
if curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo -e "${GREEN}✓ MinIO is responding${NC}"
    echo "  Console: http://localhost:9001"
else
    echo -e "${RED}✗ MinIO is not responding${NC}"
fi

# Check recent logs for errors
echo ""
echo "Recent Errors (last 10):"
echo "----------------------------------------"
error_count=$(docker compose -f docker-compose.prod.yml logs --tail=100 2>/dev/null | grep -i error | wc -l)
if [ "$error_count" -gt 0 ]; then
    echo -e "${YELLOW}Found $error_count error(s) in recent logs${NC}"
    docker compose -f docker-compose.prod.yml logs --tail=100 2>/dev/null | grep -i error | tail -10
else
    echo -e "${GREEN}No recent errors found${NC}"
fi

# Check backup status
echo ""
echo "Backup Status:"
echo "----------------------------------------"
if [ -d "backups" ]; then
    latest_backup=$(ls -t backups/*.tar.gz 2>/dev/null | head -1)
    if [ ! -z "$latest_backup" ]; then
        backup_date=$(stat -c %y "$latest_backup" 2>/dev/null | cut -d' ' -f1)
        backup_size=$(du -h "$latest_backup" | cut -f1)
        echo -e "${GREEN}✓ Latest backup: $backup_date ($backup_size)${NC}"
    else
        echo -e "${YELLOW}⚠ No backups found${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Backup directory does not exist${NC}"
fi

echo ""
echo "=========================================="
echo "  Health Check Complete"
echo "=========================================="
