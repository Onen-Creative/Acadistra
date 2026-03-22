#!/bin/bash

# Acadistra Deployment Verification Script
# This script checks all critical components before and after deployment

set -e

echo "🚀 Acadistra Deployment Verification"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Check .env file
echo "1. Checking environment configuration..."
if [ -f ".env" ]; then
    check_pass ".env file exists"
    
    # Check critical variables
    if grep -q "NEXT_PUBLIC_API_URL=https://acadistra.com" .env; then
        check_pass "NEXT_PUBLIC_API_URL correctly set"
    else
        check_fail "NEXT_PUBLIC_API_URL not set to https://acadistra.com"
    fi
    
    if grep -q "JWT_SECRET=" .env && [ ${#JWT_SECRET} -ge 32 ] 2>/dev/null; then
        check_pass "JWT_SECRET configured"
    else
        check_warn "JWT_SECRET may be too short (should be 32+ characters)"
    fi
else
    check_fail ".env file not found"
fi
echo ""

# 2. Check Docker
echo "2. Checking Docker..."
if command -v docker &> /dev/null; then
    check_pass "Docker installed"
    
    if docker compose version &> /dev/null; then
        check_pass "Docker Compose installed"
    else
        check_fail "Docker Compose not installed"
    fi
else
    check_fail "Docker not installed"
fi
echo ""

# 3. Check Caddyfile
echo "3. Checking Caddyfile..."
if [ -f "Caddyfile" ]; then
    check_pass "Caddyfile exists"
    
    if grep -q "handle /api/\*" Caddyfile; then
        check_pass "API routing configured"
    else
        check_fail "API routing not found in Caddyfile"
    fi
    
    if grep -q "reverse_proxy backend:8080" Caddyfile; then
        check_pass "Backend proxy configured"
    else
        check_fail "Backend proxy not configured"
    fi
else
    check_fail "Caddyfile not found"
fi
echo ""

# 4. Check docker-compose.prod.yml
echo "4. Checking docker-compose.prod.yml..."
if [ -f "docker-compose.prod.yml" ]; then
    check_pass "docker-compose.prod.yml exists"
    
    # Check services
    for service in postgres redis minio backend frontend caddy; do
        if grep -q "$service:" docker-compose.prod.yml; then
            check_pass "$service service defined"
        else
            check_fail "$service service not found"
        fi
    done
else
    check_fail "docker-compose.prod.yml not found"
fi
echo ""

# 5. Check frontend configuration
echo "5. Checking frontend configuration..."
if [ -f "frontend/next.config.js" ]; then
    check_pass "next.config.js exists"
    
    if grep -q "output: 'standalone'" frontend/next.config.js; then
        check_pass "Standalone output configured"
    else
        check_warn "Standalone output not configured (may cause issues)"
    fi
fi

if [ -f "frontend/src/services/api.ts" ]; then
    check_pass "api.ts exists"
    
    if grep -q "config.url.startsWith('/api/v1')" frontend/src/services/api.ts; then
        check_pass "API interceptor configured"
    else
        check_fail "API interceptor not found or misconfigured"
    fi
fi
echo ""

# 6. Check backend configuration
echo "6. Checking backend configuration..."
if [ -f "backend/Dockerfile" ]; then
    check_pass "Backend Dockerfile exists"
fi

if [ -f "backend/cmd/api/main.go" ]; then
    check_pass "Backend main.go exists"
fi
echo ""

# 7. DNS Check (if online)
echo "7. Checking DNS configuration..."
if command -v nslookup &> /dev/null; then
    if nslookup acadistra.com &> /dev/null; then
        IP=$(nslookup acadistra.com | grep -A1 "Name:" | grep "Address:" | awk '{print $2}' | head -1)
        if [ "$IP" == "185.208.207.16" ]; then
            check_pass "DNS points to correct IP (185.208.207.16)"
        else
            check_warn "DNS points to $IP (expected 185.208.207.16)"
        fi
    else
        check_warn "Cannot resolve acadistra.com (DNS may not be configured yet)"
    fi
else
    check_warn "nslookup not available, skipping DNS check"
fi
echo ""

# 8. Check if services are running (if deployed)
echo "8. Checking running services..."
if docker ps &> /dev/null; then
    RUNNING=$(docker ps --format '{{.Names}}' | grep acadistra | wc -l)
    if [ $RUNNING -gt 0 ]; then
        check_pass "$RUNNING Acadistra containers running"
        
        # Check specific containers
        for container in acadistra_postgres acadistra_redis acadistra_backend acadistra_frontend acadistra_caddy; do
            if docker ps --format '{{.Names}}' | grep -q "$container"; then
                STATUS=$(docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null || echo "no-healthcheck")
                if [ "$STATUS" == "healthy" ] || [ "$STATUS" == "no-healthcheck" ]; then
                    check_pass "$container is running"
                else
                    check_warn "$container is running but not healthy (status: $STATUS)"
                fi
            fi
        done
    else
        check_warn "No Acadistra containers running (not deployed yet)"
    fi
else
    check_warn "Cannot check running containers (Docker not accessible)"
fi
echo ""

# 9. Health check (if deployed)
echo "9. Checking application health..."
if command -v curl &> /dev/null; then
    # Check if running locally
    if curl -s http://localhost:8080/health &> /dev/null; then
        HEALTH=$(curl -s http://localhost:8080/health)
        if echo "$HEALTH" | grep -q "ok"; then
            check_pass "Backend health check passed (local)"
        else
            check_warn "Backend health check failed (local)"
        fi
    fi
    
    # Check if deployed
    if curl -s https://acadistra.com/api/v1/health &> /dev/null; then
        HEALTH=$(curl -s https://acadistra.com/api/v1/health)
        if echo "$HEALTH" | grep -q "ok"; then
            check_pass "Backend health check passed (production)"
        else
            check_warn "Backend health check failed (production)"
        fi
    fi
else
    check_warn "curl not available, skipping health checks"
fi
echo ""

# Summary
echo "===================================="
echo "✅ Verification Complete!"
echo ""
echo "Next steps:"
echo "1. If not deployed yet, run: docker compose -f docker-compose.prod.yml up -d --build"
echo "2. Run migrations: docker exec acadistra_backend ./main migrate"
echo "3. Seed admin: docker exec acadistra_backend ./main seed-admin"
echo "4. Seed subjects: docker exec acadistra_backend ./main seed-standard-subjects"
echo "5. Access: https://acadistra.com"
echo "6. Login: admin@acadistra.com / Admin@123"
echo ""
