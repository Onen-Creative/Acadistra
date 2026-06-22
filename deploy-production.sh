#!/bin/bash
# Production Deployment Script - Acadistra System
# Deploys: Yearly Classes, Yearly Enrollment, System Monitoring
# Date: June 2026

set -e  # Exit on any error

echo "🚀 ACADISTRA PRODUCTION DEPLOYMENT"
echo "===================================="
echo ""
echo "This script will deploy:"
echo "  ✓ Yearly Classes System"
echo "  ✓ Yearly Enrollment System"
echo "  ✓ System Monitoring (Full Fix)"
echo ""
read -p "⚠️  Are you ready to deploy to PRODUCTION? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 1
fi

# Configuration
BACKUP_DIR="/home/od/workspace/programming/school management system/backups/$(date +%Y%m%d_%H%M%S)"
APP_DIR="/home/od/workspace/programming/school management system"
FRONTEND_DIR="$APP_DIR/frontend"
BACKEND_DIR="$APP_DIR/backend"

echo ""
echo "📦 Step 1: Creating Backup..."
mkdir -p "$BACKUP_DIR"

# Backup database
echo "  → Backing up database..."
docker exec acadistra_postgres pg_dump -U postgres school_system_db > "$BACKUP_DIR/database_backup.sql"
if [ $? -eq 0 ]; then
    echo "  ✓ Database backed up to: $BACKUP_DIR/database_backup.sql"
else
    echo "  ❌ Database backup failed!"
    exit 1
fi

# Backup backend code
echo "  → Backing up backend code..."
tar -czf "$BACKUP_DIR/backend_backup.tar.gz" -C "$BACKEND_DIR" .
echo "  ✓ Backend backed up"

# Backup frontend build
echo "  → Backing up frontend..."
if [ -d "$FRONTEND_DIR/.next" ]; then
    tar -czf "$BACKUP_DIR/frontend_backup.tar.gz" -C "$FRONTEND_DIR" .next
    echo "  ✓ Frontend backed up"
fi

echo ""
echo "📥 Step 2: Pulling Latest Code..."
cd "$APP_DIR"
git stash  # Stash any local changes
git pull origin main
if [ $? -ne 0 ]; then
    echo "  ❌ Git pull failed!"
    exit 1
fi
echo "  ✓ Code updated"

echo ""
echo "🗄️  Step 3: Running Database Migrations..."
cd "$BACKEND_DIR"

# Check if migrations are needed
echo "  → Checking for pending migrations..."
docker exec acadistra_backend ./main migrate
if [ $? -eq 0 ]; then
    echo "  ✓ Migrations completed"
else
    echo "  ❌ Migration failed!"
    echo "  → Rolling back..."
    docker exec acadistra_postgres psql -U postgres -d school_system_db < "$BACKUP_DIR/database_backup.sql"
    exit 1
fi

echo ""
echo "🔧 Step 4: Building Backend..."
cd "$BACKEND_DIR"

# Build backend
echo "  → Compiling Go application..."
go build -o main cmd/api/main.go
if [ $? -eq 0 ]; then
    echo "  ✓ Backend built successfully"
else
    echo "  ❌ Backend build failed!"
    exit 1
fi

echo ""
echo "🎨 Step 5: Building Frontend..."
cd "$FRONTEND_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ "$FORCE_NPM_INSTALL" = "true" ]; then
    echo "  → Installing npm dependencies..."
    npm install
fi

# Build frontend
echo "  → Building Next.js application..."
npm run build
if [ $? -eq 0 ]; then
    echo "  ✓ Frontend built successfully"
else
    echo "  ❌ Frontend build failed!"
    exit 1
fi

echo ""
echo "🔄 Step 6: Restarting Services..."

# Stop services
echo "  → Stopping services..."
docker-compose -f "$APP_DIR/docker-compose.prod.yml" down

# Start services
echo "  → Starting services..."
docker-compose -f "$APP_DIR/docker-compose.prod.yml" up -d

# Wait for services to be ready
echo "  → Waiting for services to start..."
sleep 10

# Check if backend is running
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/v1/auth/login)
if [ "$BACKEND_HEALTH" = "200" ] || [ "$BACKEND_HEALTH" = "400" ] || [ "$BACKEND_HEALTH" = "401" ]; then
    echo "  ✓ Backend is running"
else
    echo "  ❌ Backend health check failed (HTTP $BACKEND_HEALTH)"
    exit 1
fi

# Check if frontend is running
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_HEALTH" = "200" ] || [ "$FRONTEND_HEALTH" = "404" ]; then
    echo "  ✓ Frontend is running"
else
    echo "  ❌ Frontend health check failed (HTTP $FRONTEND_HEALTH)"
    exit 1
fi

echo ""
echo "🔍 Step 7: Post-Deployment Verification..."

# Check database connection
echo "  → Verifying database connection..."
docker exec acadistra_postgres psql -U postgres -d school_system_db -c "SELECT COUNT(*) FROM users;" > /dev/null
if [ $? -eq 0 ]; then
    echo "  ✓ Database connection OK"
else
    echo "  ❌ Database connection failed!"
fi

# Check monitoring system
echo "  → Verifying monitoring system..."
MONITORING_CHECK=$(docker exec acadistra_backend sh -c "psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -c 'SELECT COUNT(*) FROM api_request_logs;' 2>&1")
if [ $? -eq 0 ]; then
    echo "  ✓ Monitoring tables exist"
else
    echo "  ⚠️  Monitoring tables may need initialization"
fi

# Check yearly classes
echo "  → Verifying yearly classes system..."
YEARLY_CHECK=$(docker exec acadistra_backend sh -c "psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -c 'SELECT COUNT(*) FROM classes WHERE year IS NOT NULL;' 2>&1")
if [ $? -eq 0 ]; then
    echo "  ✓ Yearly classes system active"
else
    echo "  ⚠️  Yearly classes may need verification"
fi

echo ""
echo "📊 Step 8: Generating Initial Reports..."
echo "  → This may take a few moments..."

# Generate monitoring reports for last 7 days
for i in {1..7}; do
    date=$(date -d "$i days ago" +%Y-%m-%d)
    docker exec acadistra_backend sh -c "curl -s -X POST 'http://localhost:8080/api/v1/monitoring/generate-daily-report?date=$date' -H 'Authorization: Bearer ADMIN_TOKEN'" > /dev/null 2>&1 || true
done

echo "  ✓ Report generation initiated"

echo ""
echo "✅ DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "===================================="
echo ""
echo "📋 Deployment Summary:"
echo "  • Backup Location: $BACKUP_DIR"
echo "  • Database: Migrated & Running"
echo "  • Backend: Built & Running"
echo "  • Frontend: Built & Running"
echo "  • Monitoring: Active"
echo ""
echo "🔗 Access your application:"
echo "  • Frontend: http://your-domain.com"
echo "  • Backend API: http://your-domain.com/api"
echo "  • Monitoring: http://your-domain.com/system/monitoring"
echo ""
echo "📝 Next Steps:"
echo "  1. Login as system_admin"
echo "  2. Verify yearly classes are working"
echo "  3. Check monitoring dashboard (/system/monitoring)"
echo "  4. Generate reports if needed"
echo "  5. Monitor logs: docker-compose logs -f"
echo ""
echo "⚠️  Important Notes:"
echo "  • Backup saved to: $BACKUP_DIR"
echo "  • Keep backup for at least 30 days"
echo "  • Monitor system for next 24 hours"
echo "  • Report any issues immediately"
echo ""
echo "🆘 Rollback Instructions (if needed):"
echo "  1. Stop services: docker-compose -f docker-compose.prod.yml down"
echo "  2. Restore database: docker exec -i acadistra_postgres psql -U postgres school_system_db < $BACKUP_DIR/database_backup.sql"
echo "  3. Restore code: git reset --hard HEAD~1"
echo "  4. Restart: docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "✨ Deployment completed at: $(date)"
