# Deployment Verification Checklist ✅

## Pre-Deployment Checks

### 1. Environment Configuration ✅
- [x] `.env` file exists with all required variables
- [x] `NEXT_PUBLIC_API_URL=https://acadistra.com` (no /api/v1 suffix)
- [x] Database credentials configured
- [x] JWT secrets set (minimum 32 characters)
- [x] Redis password configured
- [x] MinIO credentials configured
- [x] SMTP settings for email notifications

### 2. API Configuration ✅
- [x] Axios interceptor automatically adds `/api/v1` prefix
- [x] All API service functions use clean paths (e.g., `/staff` not `/api/v1/staff`)
- [x] Token refresh mechanism working
- [x] Error handling for 401 responses

### 3. Reverse Proxy (Caddy) ✅
- [x] Routes `/api/*` to backend:8080
- [x] Routes `/logos/*` and `/photos/*` to backend:8080
- [x] Routes everything else to frontend:3000
- [x] SSL certificates auto-provisioned via Let's Encrypt
- [x] Wildcard subdomain support for multi-tenancy

### 4. Docker Configuration ✅
- [x] Backend Dockerfile builds successfully
- [x] Frontend Dockerfile with standalone output
- [x] docker-compose.prod.yml configured correctly
- [x] Health checks for all services
- [x] Proper service dependencies
- [x] Volume persistence for data

### 5. Database ✅
- [x] PostgreSQL 15 configured
- [x] Migrations ready
- [x] Connection pooling configured
- [x] Backup strategy in place

## Deployment Steps

### Step 1: Server Preparation
```bash
# SSH into your Contabo VPS
ssh root@185.208.207.16

# Update system
apt update && apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install docker-compose-plugin -y
```

### Step 2: Clone Repository
```bash
cd /opt
git clone https://github.com/yourusername/acadistra.git
cd acadistra
```

### Step 3: Configure Environment
```bash
# Copy and edit .env file
cp .env.example .env
nano .env

# Verify critical settings:
# - NEXT_PUBLIC_API_URL=https://acadistra.com
# - Strong passwords for DB, Redis, MinIO
# - JWT_SECRET (32+ characters)
```

### Step 4: DNS Configuration
Verify DNS records point to 185.208.207.16:
- `acadistra.com` → A record
- `*.acadistra.com` → A record (wildcard)
- `api.acadistra.com` → A record

```bash
# Test DNS resolution
nslookup acadistra.com
nslookup api.acadistra.com
```

### Step 5: Build and Deploy
```bash
# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build

# Monitor logs
docker compose -f docker-compose.prod.yml logs -f
```

### Step 6: Database Setup
```bash
# Run migrations
docker exec acadistra_backend ./main migrate

# Seed admin user
docker exec acadistra_backend ./main seed-admin

# Seed standard subjects
docker exec acadistra_backend ./main seed-standard-subjects
```

### Step 7: Verify Services
```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Expected output: All services "Up" and "healthy"
```

## Post-Deployment Verification

### 1. Health Checks
```bash
# Backend health
curl https://acadistra.com/api/v1/health
# Expected: {"status":"ok","service":"school-system-api"}

# Frontend health
curl https://acadistra.com
# Expected: HTML response

# API subdomain
curl https://api.acadistra.com/health
# Expected: {"status":"ok"}
```

### 2. SSL Certificates
```bash
# Check SSL certificate
curl -vI https://acadistra.com 2>&1 | grep -i "SSL certificate"
# Expected: Valid certificate from Let's Encrypt

# Check certificate expiry
docker exec acadistra_caddy caddy list-certificates
```

### 3. Login Test
1. Open browser: https://acadistra.com
2. Login with: `sysadmin@acadistra.com` / `Admin@123`
3. Verify dashboard loads
4. Check browser console for errors
5. Verify API calls go to `/api/v1/*`

### 4. API Endpoint Tests
```bash
# Test authentication
curl -X POST https://acadistra.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sysadmin@acadistra.com","password":"Admin@123"}'
# Expected: JWT tokens

# Test protected endpoint (use token from above)
curl https://acadistra.com/api/v1/students \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
# Expected: Student list or empty array
```

### 5. Static Files
```bash
# Test logo upload/access
curl -I https://acadistra.com/logos/test.png
# Expected: 200 or 404 (not 502)

# Test photo upload/access
curl -I https://acadistra.com/photos/test.jpg
# Expected: 200 or 404 (not 502)
```

### 6. Database Connectivity
```bash
# Check database connection
docker exec acadistra_backend ./main migrate
# Expected: "Migration completed successfully" or "already up to date"

# Check database size
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "SELECT pg_size_pretty(pg_database_size('acadistra'));"
```

### 7. Performance Tests
```bash
# Response time test
time curl -s https://acadistra.com/api/v1/health > /dev/null
# Expected: < 500ms

# Load test (optional)
ab -n 100 -c 10 https://acadistra.com/api/v1/health
```

## Common Issues & Solutions

### Issue 1: 404 on API Calls
**Symptom:** API calls return 404
**Solution:** 
- Check axios interceptor is adding `/api/v1` prefix
- Verify Caddyfile routes `/api/*` to backend
- Check backend is running: `docker logs acadistra_backend`

### Issue 2: SSL Certificate Not Provisioning
**Symptom:** "Your connection is not private" error
**Solution:**
- Verify DNS points to correct IP
- Check Caddy logs: `docker logs acadistra_caddy`
- Ensure ports 80 and 443 are open
- Wait 2-5 minutes for certificate provisioning

### Issue 3: Database Connection Failed
**Symptom:** Backend crashes with DB connection error
**Solution:**
- Check PostgreSQL is running: `docker ps | grep postgres`
- Verify credentials in `.env` match docker-compose.prod.yml
- Check backend env vars: `docker exec acadistra_backend env | grep DB_`

### Issue 4: Frontend Shows Old Code
**Symptom:** Changes not reflected after rebuild
**Solution:**
```bash
# Force rebuild without cache
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d frontend

# Clear browser cache (Ctrl+Shift+R)
```

### Issue 5: CORS Errors
**Symptom:** Browser console shows CORS errors
**Solution:**
- Backend CORS is configured to allow all origins in development
- In production, verify `Access-Control-Allow-Origin` header
- Check backend logs for CORS-related errors

## Monitoring Commands

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f caddy

# Check resource usage
docker stats

# Check disk space
df -h

# Check database size
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "SELECT pg_size_pretty(pg_database_size('acadistra'));"

# Check Redis memory
docker exec acadistra_redis redis-cli INFO memory
```

## Backup & Restore

### Backup
```bash
# Database backup
docker exec acadistra_postgres pg_dump -U acadistra acadistra > backup_$(date +%Y%m%d).sql

# Full backup (includes uploads)
tar -czf acadistra_backup_$(date +%Y%m%d).tar.gz \
  /opt/acadistra/.env \
  /opt/acadistra/backend/public \
  backup_$(date +%Y%m%d).sql
```

### Restore
```bash
# Restore database
cat backup_20260115.sql | docker exec -i acadistra_postgres psql -U acadistra acadistra

# Restore uploads
tar -xzf acadistra_backup_20260115.tar.gz -C /
```

## Rollback Procedure

If deployment fails:
```bash
# Stop new deployment
docker compose -f docker-compose.prod.yml down

# Restore from backup
cat backup_previous.sql | docker exec -i acadistra_postgres psql -U acadistra acadistra

# Start previous version
git checkout previous-tag
docker compose -f docker-compose.prod.yml up -d
```

## Success Criteria ✅

Deployment is successful when:
- [ ] All Docker containers are running and healthy
- [ ] SSL certificates are provisioned (https works)
- [ ] Login page loads at https://acadistra.com
- [ ] Can login with admin credentials
- [ ] Dashboard loads without errors
- [ ] API calls work (check browser Network tab)
- [ ] No 404 errors on API endpoints
- [ ] Static files (logos/photos) accessible
- [ ] Database migrations completed
- [ ] No errors in Docker logs

## Maintenance

### Daily
- Monitor disk space: `df -h`
- Check logs for errors: `docker compose logs --tail=100`

### Weekly
- Database backup
- Check SSL certificate expiry
- Review error logs

### Monthly
- Update Docker images: `docker compose pull`
- Security updates: `apt update && apt upgrade`
- Database optimization: `VACUUM ANALYZE`

## Support Contacts

- **Server:** Contabo VPS (185.208.207.16)
- **Domain:** acadistra.com
- **DNS:** Configured with A records
- **SSL:** Let's Encrypt (auto-renewal)

---

**Last Updated:** January 2026
**Deployment Status:** ✅ Ready for Production
