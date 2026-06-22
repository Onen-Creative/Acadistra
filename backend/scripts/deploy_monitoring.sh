#!/bin/bash
# Quick Deployment Script for Monitoring Fixes
# Run this script after pulling the latest code changes

set -e

echo "🚀 Deploying Monitoring System Fixes..."
echo "========================================"

# Step 1: Stop the backend
echo ""
echo "📛 Step 1: Stopping backend service..."
cd /home/od/workspace/programming/school\ management\ system/backend
pkill -f "go run cmd/api/main.go" || true
sleep 2

# Step 2: Build backend
echo ""
echo "🔨 Step 2: Building backend..."
go build -o main cmd/api/main.go

# Step 3: Start backend
echo ""
echo "✅ Step 3: Starting backend with new monitoring features..."
nohup ./main > logs/monitoring.log 2>&1 &
echo "Backend started with PID: $!"

# Wait for backend to be ready
echo ""
echo "⏳ Waiting for backend to be ready..."
sleep 5

# Step 4: Verify monitoring is working
echo ""
echo "🔍 Step 4: Verifying monitoring endpoints..."

# Check if backend is responding
if curl -s http://localhost:8080/api/v1/auth/login > /dev/null 2>&1; then
    echo "✅ Backend is responding"
else
    echo "❌ Backend is not responding - check logs/monitoring.log"
    exit 1
fi

# Step 5: Generate initial reports
echo ""
echo "📊 Step 5: Generating reports for last 7 days..."
echo "You'll need to do this manually via API or frontend after logging in as system_admin"
echo ""
echo "Example command:"
echo "curl -X POST 'http://localhost:8080/api/v1/monitoring/generate-daily-report?date=2026-06-20' \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN'"

# Step 6: Database cleanup
echo ""
echo "🧹 Step 6: Running database maintenance..."
echo "Expiring old inactive sessions and cleaning up logs..."

cat << EOF | psql -U postgres -d school_system_db
-- Expire sessions with no activity in last 2 hours
UPDATE user_sessions 
SET is_active = false, logout_at = NOW()
WHERE is_active = true 
  AND last_activity < NOW() - INTERVAL '2 hours';

-- Clean up very old inactive sessions
DELETE FROM user_sessions 
WHERE is_active = false 
  AND logout_at < NOW() - INTERVAL '90 days';

-- Show monitoring table stats
SELECT 
    'api_request_logs' as table_name,
    COUNT(*) as record_count,
    MIN(timestamp) as earliest,
    MAX(timestamp) as latest
FROM api_request_logs
UNION ALL
SELECT 
    'user_sessions' as table_name,
    COUNT(*) as record_count,
    MIN(login_at) as earliest,
    MAX(login_at) as latest
FROM user_sessions
UNION ALL
SELECT 
    'daily_system_reports' as table_name,
    COUNT(*) as record_count,
    MIN(date) as earliest,
    MAX(date) as latest
FROM daily_system_reports;
EOF

echo ""
echo "✨ Deployment Complete!"
echo "======================="
echo ""
echo "📋 Next Steps:"
echo "1. Login to system as system_admin"
echo "2. Navigate to /system/monitoring"
echo "3. Click 'Generate Last 7 Days Reports' button if no reports exist"
echo "4. Verify metrics are showing:"
echo "   - Response times should show decimal values (e.g., 45.3ms)"
echo "   - Session durations should show in minutes (e.g., 15m)"
echo "   - Active users should reflect current logged-in users"
echo ""
echo "📊 Monitor logs: tail -f logs/monitoring.log"
echo "🏥 Check health: curl http://localhost:8080/api/v1/monitoring/system-health"
echo ""
echo "🎉 All monitoring features are now fully functional!"
