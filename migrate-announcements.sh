#!/bin/bash

# Announcement Tables Migration Script for Live Server
# Usage: ./migrate-announcements.sh

set -e

echo "🚀 Starting announcement tables migration..."

# Check if running in production
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: docker-compose.prod.yml not found. Are you in the project root?"
    exit 1
fi

# Check if containers are running
if ! docker ps | grep -q "acadistra_backend"; then
    echo "❌ Error: Backend container is not running"
    exit 1
fi

echo "✅ Backend container found"

# Run migration
echo "📦 Running database migration..."
docker exec acadistra_backend ./main migrate

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📋 Verifying tables..."
    
    # Verify tables exist
    docker exec acadistra_postgres psql -U acadistra -d acadistra -c "\dt system_announcements" 2>/dev/null
    docker exec acadistra_postgres psql -U acadistra -d acadistra -c "\dt user_notifications" 2>/dev/null
    
    echo "📊 Verifying existing data is intact..."
    docker exec acadistra_postgres psql -U acadistra -d acadistra -c "SELECT COUNT(*) as student_count FROM students;" 2>/dev/null
    docker exec acadistra_postgres psql -U acadistra -d acadistra -c "SELECT COUNT(*) as user_count FROM users;" 2>/dev/null
    
    echo ""
    echo "✨ Announcement tables are ready!"
    echo ""
    echo "Next steps:"
    echo "1. Restart backend: docker compose -f docker-compose.prod.yml restart backend"
    echo "2. Test announcements feature in the UI"
else
    echo "❌ Migration failed!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check backend logs: docker logs acadistra_backend"
    echo "2. Try manual migration: docker exec -it acadistra_postgres psql -U acadistra -d acadistra"
    exit 1
fi
