#!/bin/bash

# Verification script to check if the Acadistra system is ready for grade recalculation

echo "=========================================="
echo "Acadistra System Verification"
echo "=========================================="
echo ""

# Check if Docker is installed
echo "1. Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "   ❌ Docker is not installed"
    exit 1
fi
echo "   ✅ Docker is installed"
echo ""

# Check if Docker Compose is available
echo "2. Checking Docker Compose..."
if ! command -v docker compose &> /dev/null; then
    echo "   ❌ Docker Compose is not available"
    exit 1
fi
echo "   ✅ Docker Compose is available"
echo ""

# Check if containers are running
echo "3. Checking container status..."
CONTAINERS=("acadistra_postgres" "acadistra_redis" "acadistra_minio" "acadistra_backend" "acadistra_frontend" "acadistra_caddy")

ALL_RUNNING=true
for container in "${CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo "   ✅ ${container} is running"
    else
        echo "   ❌ ${container} is NOT running"
        ALL_RUNNING=false
    fi
done
echo ""

if [ "$ALL_RUNNING" = false ]; then
    echo "⚠️  Some containers are not running. Start them with:"
    echo "   docker compose -f docker-compose.prod.yml up -d"
    echo ""
    exit 1
fi

# Check backend health
echo "4. Checking backend health..."
HEALTH_CHECK=$(docker exec acadistra_backend curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null)
if [ "$HEALTH_CHECK" = "200" ]; then
    echo "   ✅ Backend is healthy (HTTP 200)"
else
    echo "   ⚠️  Backend health check returned: $HEALTH_CHECK"
    echo "   This might be okay if /health endpoint doesn't exist"
fi
echo ""

# Check database connection
echo "5. Checking database connection..."
DB_CHECK=$(docker exec acadistra_postgres pg_isready -U acadistra 2>&1)
if echo "$DB_CHECK" | grep -q "accepting connections"; then
    echo "   ✅ Database is accepting connections"
else
    echo "   ❌ Database connection issue: $DB_CHECK"
    exit 1
fi
echo ""

# Check if curl is available in backend container
echo "6. Checking curl in backend container..."
if docker exec acadistra_backend which curl &> /dev/null; then
    echo "   ✅ curl is available in backend container"
else
    echo "   ❌ curl is not available in backend container"
    echo "   Rebuild backend: docker compose -f docker-compose.prod.yml up -d --build backend"
    exit 1
fi
echo ""

# Display container versions
echo "7. Container information..."
echo "   Backend image: $(docker inspect acadistra_backend --format='{{.Config.Image}}')"
echo "   Database version: $(docker exec acadistra_postgres psql -U acadistra -d acadistra -tAc 'SELECT version();' | head -1)"
echo ""

echo "=========================================="
echo "✅ System verification completed!"
echo "=========================================="
echo ""
echo "Your system is ready for grade recalculation."
echo "Run: ./fix_subsidiary_grades_docker.sh"
echo ""
