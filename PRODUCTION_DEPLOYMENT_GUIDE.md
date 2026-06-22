# Production Deployment Guide
## Acadistra - Yearly Classes, Enrollment & Monitoring System

**Date**: June 2026  
**Version**: 2.0.0  
**Components**: Yearly Classes, Yearly Enrollment, System Monitoring

---

## 🎯 Pre-Deployment Checklist

### 1. Preparation (1-2 hours before deployment)
- [ ] **Notify users** - Send notification about system maintenance
- [ ] **Schedule downtime window** - Recommended: Off-peak hours (e.g., 11 PM - 2 AM)
- [ ] **Verify backup systems** - Ensure backup scripts are working
- [ ] **Check disk space** - Minimum 10GB free space required
- [ ] **Review changes** - Read through MONITORING_COMPLETE.md and YEARLY_CLASSES_IMPLEMENTATION.md
- [ ] **Test on staging** - If you have a staging server, test there first

### 2. System Requirements
- [ ] Docker & Docker Compose installed
- [ ] PostgreSQL container running
- [ ] Minimum 4GB RAM available
- [ ] Git access to repository
- [ ] Root/sudo access to server

### 3. Backup Verification
- [ ] Database backup script tested
- [ ] Sufficient backup storage available
- [ ] Previous backups accessible
- [ ] Rollback procedure documented

---

## 🚀 Deployment Options

### Option A: Automated Deployment (Recommended)

```bash
cd /home/od/workspace/programming/school\ management\ system
./deploy-production.sh
```

The script will:
1. Create automatic backups
2. Pull latest code
3. Run database migrations
4. Build backend & frontend
5. Restart services
6. Verify deployment
7. Generate initial reports

**Time Estimate**: 10-15 minutes

---

### Option B: Manual Deployment (Step-by-Step)

If you prefer manual control, follow these steps:

#### Step 1: Create Backups (CRITICAL)

```bash
# Create backup directory
BACKUP_DIR="/home/od/workspace/programming/school management system/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup database
docker exec acadistra_postgres pg_dump -U postgres school_system_db > "$BACKUP_DIR/database_backup.sql"

# Backup backend
cd /home/od/workspace/programming/school\ management\ system/backend
tar -czf "$BACKUP_DIR/backend_backup.tar.gz" .

# Backup frontend
cd /home/od/workspace/programming/school\ management\ system/frontend
tar -czf "$BACKUP_DIR/frontend_backup.tar.gz" .next

echo "✅ Backups saved to: $BACKUP_DIR"
```

#### Step 2: Pull Latest Code

```bash
cd /home/od/workspace/programming/school\ management\ system
git stash  # Save any local changes
git pull origin main
```

#### Step 3: Database Migrations

```bash
cd backend

# Run migrations
docker exec acadistra_backend ./main migrate

# Verify migrations
docker exec acadistra_postgres psql -U postgres -d school_system_db -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

**Expected migrations to run**:
- `20260702000000_make_classes_yearly.sql`
- `20260703000000_make_enrollments_yearly.sql`
- `20260501000000_system_monitoring.sql` (if not already applied)

#### Step 4: Build Backend

```bash
cd /home/od/workspace/programming/school\ management\ system/backend

# Build
go build -o main cmd/api/main.go

# Verify build
./main --version || echo "Backend built successfully"
```

#### Step 5: Build Frontend

```bash
cd /home/od/workspace/programming/school\ management\ system/frontend

# Install dependencies (if needed)
npm install

# Build
npm run build

# Verify build
ls -la .next/
```

#### Step 6: Restart Services

```bash
cd /home/od/workspace/programming/school\ management\ system

# Stop services
docker-compose -f docker-compose.prod.yml down

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Wait for startup
sleep 10

# Check status
docker-compose -f docker-compose.prod.yml ps
```

#### Step 7: Post-Deployment Verification

```bash
# Check backend
curl http://localhost:8080/api/v1/auth/login
# Should return 400/401 (expected, means backend is responding)

# Check frontend
curl http://localhost:3000
# Should return 200

# Check database
docker exec acadistra_postgres psql -U postgres -d school_system_db -c "SELECT COUNT(*) FROM users;"

# Check monitoring tables
docker exec acadistra_postgres psql -U postgres -d school_system_db -c "SELECT COUNT(*) FROM api_request_logs;"
docker exec acadistra_postgres psql -U postgres -d school_system_db -c "SELECT COUNT(*) FROM user_sessions;"

# Check yearly classes
docker exec acadistra_postgres psql -U postgres -d school_system_db -c "SELECT COUNT(*) FROM classes WHERE year IS NOT NULL;"
```

---

## 🔍 Post-Deployment Testing

### 1. System Admin Tests (5 minutes)

```bash
# Login as system admin
# URL: http://your-domain.com/login
# Credentials: sysadmin@acadistra.com / Admin@123
```

**Test Checklist**:
- [ ] Login successful
- [ ] Dashboard loads
- [ ] Navigate to `/system/monitoring`
- [ ] Verify metrics are showing
- [ ] Click "Generate Last 7 Days Reports"
- [ ] Check if reports generate

### 2. Yearly Classes Tests (10 minutes)

**Test Checklist**:
- [ ] Navigate to Classes page
- [ ] Verify year filter shows (2024, 2025, 2026, 2027)
- [ ] Create a new class for 2026
- [ ] Verify class appears only when 2026 selected
- [ ] Switch year to 2025, verify 2026 class doesn't show
- [ ] Check enrollment in the new class

### 3. Monitoring System Tests (5 minutes)

**Test Checklist**:
- [ ] Navigate to `/system/monitoring`
- [ ] Verify "Overview" tab shows metrics
- [ ] Check "Active Users" count
- [ ] Check "Response Time" shows decimal values (not 0ms)
- [ ] Check "Reports" tab shows daily reports
- [ ] Verify session durations show in minutes (not 0m)

### 4. Enrollment Tests (5 minutes)

**Test Checklist**:
- [ ] Navigate to Students page
- [ ] Filter by year: 2026
- [ ] Verify students in 2026 classes show
- [ ] Switch to 2025, verify only 2025 students show
- [ ] Try enrolling a student in a 2026 class
- [ ] Verify enrollment is year-specific

---

## 📊 Monitoring After Deployment

### First 30 Minutes
- [ ] Monitor docker logs: `docker-compose logs -f`
- [ ] Check error rates: `/system/monitoring`
- [ ] Verify no database errors
- [ ] Check response times are normal

### First 24 Hours
- [ ] Monitor system health endpoint: `/api/v1/monitoring/system-health`
- [ ] Check daily report generation (runs at 1 AM)
- [ ] Monitor user activity
- [ ] Review any error logs

### First Week
- [ ] Weekly backup verification
- [ ] User feedback collection
- [ ] Performance monitoring
- [ ] Database size monitoring

---

## 🆘 Rollback Procedure

If something goes wrong, follow these steps immediately:

### Quick Rollback (5 minutes)

```bash
# 1. Stop services
cd /home/od/workspace/programming/school\ management\ system
docker-compose -f docker-compose.prod.yml down

# 2. Restore database (replace with your backup path)
BACKUP_DIR="/path/to/your/backup"
docker exec -i acadistra_postgres psql -U postgres school_system_db < "$BACKUP_DIR/database_backup.sql"

# 3. Revert code
git reset --hard HEAD~1

# 4. Rebuild and restart
cd backend
go build -o main cmd/api/main.go

cd ../frontend
npm run build

cd ..
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify
curl http://localhost:8080/api/v1/auth/login
curl http://localhost:3000
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Frontend build fails
**Error**: `npm run build` fails with TypeScript errors

**Solution**:
```bash
cd frontend
rm -rf node_modules .next
npm install
npm run build
```

### Issue 2: Backend won't start
**Error**: Backend container exits immediately

**Solution**:
```bash
# Check logs
docker logs acadistra_backend

# Common causes:
# - Database connection: Check .env.production
# - Port conflict: Check if port 8080 is in use
# - Migration error: Check migration logs
```

### Issue 3: Monitoring not showing data
**Error**: Monitoring dashboard shows zeros

**Solution**:
```bash
# Generate reports manually
TOKEN="your-admin-token"
for i in {1..7}; do
  date=$(date -d "$i days ago" +%Y-%m-%d)
  curl -X POST "http://localhost:8080/api/v1/monitoring/generate-daily-report?date=$date" \
    -H "Authorization: Bearer $TOKEN"
done

# Check if API logs are being created
docker exec acadistra_postgres psql -U postgres -d school_system_db -c "SELECT COUNT(*) FROM api_request_logs WHERE timestamp > NOW() - INTERVAL '1 hour';"
```

### Issue 4: Classes not showing year filter
**Error**: Year filter missing on classes page

**Solution**:
```bash
# Clear browser cache
# Or force refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

# Verify frontend build included changes
cd frontend
grep -r "year" .next/server/app/classes/
```

### Issue 5: Database migration fails
**Error**: Migration error during deployment

**Solution**:
```bash
# Check which migrations ran
docker exec acadistra_postgres psql -U postgres -d school_system_db -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 10;"

# Manually run specific migration
docker exec acadistra_postgres psql -U postgres -d school_system_db -f migrations/20260702000000_make_classes_yearly.sql

# If migration is corrupted, restore backup and try again
```

---

## 📈 Performance Optimization

After deployment, consider these optimizations:

### 1. Database Indexes (Already included in migrations)
```sql
-- These should already exist, but verify:
CREATE INDEX IF NOT EXISTS idx_classes_year ON classes(year);
CREATE INDEX IF NOT EXISTS idx_enrollments_year ON enrollments(year);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_timestamp ON api_request_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_sessions_activity ON user_sessions(last_activity);
```

### 2. Log Rotation
```bash
# Add to crontab for automatic log cleanup
0 2 * * * docker exec acadistra_postgres psql -U postgres -d school_system_db -c "DELETE FROM api_request_logs WHERE timestamp < NOW() - INTERVAL '90 days';"
```

### 3. Monitoring Report Generation
```bash
# Verify daily reports are generating
docker logs acadistra_backend | grep "GenerateDailyReport"

# If not, check cron is working:
docker exec acadistra_backend ps aux | grep main
```

---

## 📝 Deployment Log Template

Use this template to document your deployment:

```
DEPLOYMENT LOG
==============
Date: ______________
Time Started: ______________
Performed By: ______________

PRE-DEPLOYMENT
[ ] Backups created
[ ] Users notified
[ ] Disk space checked
Backup Location: ______________

DEPLOYMENT STEPS
[ ] Code pulled
[ ] Migrations run
[ ] Backend built
[ ] Frontend built
[ ] Services restarted

POST-DEPLOYMENT TESTS
[ ] Login successful
[ ] Monitoring working
[ ] Yearly classes working
[ ] Response times accurate
[ ] Session tracking working

ISSUES ENCOUNTERED
______________
______________

RESOLUTION
______________
______________

TIME COMPLETED: ______________
STATUS: [ ] Success [ ] Failed [ ] Rolled Back

NOTES:
______________
______________
```

---

## ✅ Success Criteria

Deployment is considered successful when:

1. ✅ All services running (docker-compose ps shows all "Up")
2. ✅ Backend responding (HTTP 200/400/401 on /api/v1/auth/login)
3. ✅ Frontend accessible (HTTP 200 on homepage)
4. ✅ Database queries working
5. ✅ Monitoring dashboard showing data
6. ✅ Response times showing decimals (not 0ms)
7. ✅ Session durations showing minutes (not 0m)
8. ✅ Yearly classes visible with year filter
9. ✅ No errors in docker logs
10. ✅ Users can login and use the system

---

## 📞 Support & Escalation

If you encounter issues:

1. **Check this guide** - Most issues are covered above
2. **Review logs** - `docker-compose logs -f`
3. **Check monitoring** - `/system/monitoring` for system health
4. **Database queries** - Run verification queries above
5. **Rollback if needed** - Better safe than sorry

**Emergency Contacts**:
- Technical Lead: _______________
- DevOps Team: _______________
- Database Admin: _______________

---

## 📚 Additional Resources

- **Monitoring Guide**: `backend/MONITORING_GUIDE.md`
- **Monitoring Fixes**: `backend/MONITORING_FIXES.md`
- **Yearly Classes Guide**: `backend/CLASS_YEARLY_SYSTEM.md`
- **API Documentation**: http://localhost:8080/swagger/index.html

---

**Good luck with your deployment! 🚀**

Remember: Always backup, test thoroughly, and monitor closely after deployment.
