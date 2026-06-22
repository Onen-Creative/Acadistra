# Quick Deployment Reference Card

## 🚀 ONE-COMMAND DEPLOYMENT

```bash
cd /home/od/workspace/programming/school\ management\ system && ./deploy-production.sh
```

---

## 📋 Manual Deployment Commands

### 1. Backup (2 min)
```bash
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
docker exec acadistra_postgres pg_dump -U postgres school_system_db > "$BACKUP_DIR/db.sql"
```

### 2. Update Code (1 min)
```bash
cd /home/od/workspace/programming/school\ management\ system
git pull origin main
```

### 3. Migrate Database (1 min)
```bash
cd backend
docker exec acadistra_backend ./main migrate
```

### 4. Build & Deploy (5 min)
```bash
# Backend
cd backend && go build -o main cmd/api/main.go

# Frontend
cd ../frontend && npm run build

# Restart
cd .. && docker-compose -f docker-compose.prod.yml restart
```

### 5. Verify (1 min)
```bash
curl http://localhost:8080/api/v1/auth/login  # Backend
curl http://localhost:3000                     # Frontend
```

---

## 🔍 Quick Health Checks

```bash
# Service status
docker-compose ps

# Backend logs
docker logs acadistra_backend --tail 50

# Database connection
docker exec acadistra_postgres psql -U postgres -d school_system_db -c "SELECT COUNT(*) FROM users;"

# Monitoring status
curl http://localhost:8080/api/v1/monitoring/system-health | jq

# Check yearly classes
docker exec acadistra_postgres psql -U postgres -d school_system_db -c "SELECT COUNT(*) FROM classes WHERE year IS NOT NULL;"
```

---

## 🆘 Quick Rollback

```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Restore database
BACKUP_DIR="backups/YOUR_BACKUP_FOLDER"
docker exec -i acadistra_postgres psql -U postgres school_system_db < "$BACKUP_DIR/db.sql"

# Revert code
git reset --hard HEAD~1

# Restart
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📊 Post-Deployment Tests

```bash
# 1. Login
# URL: http://your-domain.com/login
# User: sysadmin@acadistra.com
# Pass: Admin@123

# 2. Check Monitoring
# Navigate to: /system/monitoring
# Click: "Generate Last 7 Days Reports"

# 3. Check Yearly Classes
# Navigate to: /classes
# Verify: Year filter (2024-2027) appears
# Test: Filter by different years

# 4. Check Response Times
# Monitoring Dashboard should show:
# - Response times with decimals (45.3ms, not 0ms)
# - Session durations in minutes (15m, not 0m)
# - Active user counts
```

---

## 🐛 Common Fixes

### Frontend won't build
```bash
cd frontend
rm -rf node_modules .next
npm install
npm run build
```

### Backend won't start
```bash
docker logs acadistra_backend
# Check .env.production for correct settings
```

### Monitoring shows zeros
```bash
# Generate reports manually
TOKEN="your-token"
for i in {1..7}; do
  curl -X POST "http://localhost:8080/api/v1/monitoring/generate-daily-report?date=$(date -d "$i days ago" +%Y-%m-%d)" -H "Authorization: Bearer $TOKEN"
done
```

### Classes not showing year
```bash
# Clear browser cache: Ctrl+Shift+R
# Or check frontend build
cd frontend && ls -la .next/
```

---

## 📈 Monitoring Commands

```bash
# View API request logs
docker exec acadistra_postgres psql -U postgres -d school_system_db -c "SELECT method, path, status_code, response_time FROM api_request_logs ORDER BY timestamp DESC LIMIT 10;"

# View active sessions
docker exec acadistra_postgres psql -U postgres -d school_system_db -c "SELECT COUNT(*) FROM user_sessions WHERE is_active = true AND last_activity > NOW() - INTERVAL '30 minutes';"

# View daily reports
docker exec acadistra_postgres psql -U postgres -d school_system_db -c "SELECT date, active_users, total_requests, avg_response_time FROM daily_system_reports ORDER BY date DESC LIMIT 7;"

# Generate report for today
docker exec acadistra_backend ./main --generate-report $(date +%Y-%m-%d)
```

---

## 🔧 Useful Queries

### Check migrations
```sql
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 10;
```

### Check yearly classes
```sql
SELECT year, COUNT(*) as class_count FROM classes GROUP BY year ORDER BY year;
```

### Check yearly enrollments
```sql
SELECT year, COUNT(*) as enrollment_count FROM enrollments GROUP BY year ORDER BY year;
```

### Check monitoring health
```sql
SELECT 
  (SELECT COUNT(*) FROM api_request_logs WHERE timestamp > NOW() - INTERVAL '1 hour') as requests_last_hour,
  (SELECT COUNT(*) FROM user_sessions WHERE is_active = true) as active_sessions,
  (SELECT COUNT(*) FROM daily_system_reports) as total_reports;
```

---

## ⏱️ Estimated Times

| Task | Time | Priority |
|------|------|----------|
| Backup | 2 min | CRITICAL |
| Code Update | 1 min | HIGH |
| Database Migration | 1 min | HIGH |
| Backend Build | 2 min | HIGH |
| Frontend Build | 3 min | HIGH |
| Service Restart | 1 min | HIGH |
| Health Check | 1 min | CRITICAL |
| Post-Deploy Tests | 5 min | HIGH |
| **TOTAL** | **~15 min** | |

---

## ✅ Success Checklist

- [ ] Backup created and verified
- [ ] Code pulled successfully
- [ ] Migrations ran without errors
- [ ] Backend built successfully
- [ ] Frontend built successfully
- [ ] Services restarted
- [ ] Backend health check passed (HTTP 200/400/401)
- [ ] Frontend accessible (HTTP 200)
- [ ] Database queries working
- [ ] Monitoring dashboard loads
- [ ] Response times show decimals
- [ ] Session durations show minutes
- [ ] Yearly classes visible
- [ ] No errors in logs

---

## 📞 Emergency Contacts

- **Backup Location**: `/home/od/workspace/programming/school management system/backups/`
- **Logs Location**: `docker logs acadistra_backend`
- **Database**: `docker exec acadistra_postgres psql -U postgres school_system_db`

---

**⚠️ IMPORTANT REMINDERS**

1. **Always backup before deployment**
2. **Test on staging first** (if available)
3. **Deploy during off-peak hours**
4. **Monitor for 24 hours after deployment**
5. **Keep backup for at least 30 days**
6. **Document any issues encountered**
7. **Notify users before and after deployment**

---

**Last Updated**: June 2026  
**Version**: 2.0.0  
**Deployment Type**: Yearly Classes + Monitoring System
