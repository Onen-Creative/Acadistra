# Troubleshooting Guide

Common issues and solutions for Acadistra deployment and operation.

## Table of Contents
- [Services Won't Start](#services-wont-start)
- [Database Issues](#database-issues)
- [Connection Problems](#connection-problems)
- [Performance Issues](#performance-issues)
- [Authentication Issues](#authentication-issues)
- [Backup & Recovery](#backup--recovery)

---

## Services Won't Start

### Docker daemon not running
```bash
# Check Docker status
sudo systemctl status docker

# Start Docker
sudo systemctl start docker

# Enable Docker on boot
sudo systemctl enable docker
```

### Port already in use
```bash
# Check what's using the port
sudo lsof -i :8080
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>

# Or change port in docker-compose.prod.yml
```

### Insufficient memory
```bash
# Check memory
free -h

# Check Docker memory
docker stats

# Solution: Upgrade server or reduce services
```

### Permission denied
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in
exit
```

---

## Database Issues

### Cannot connect to database
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs acadistra_postgres

# Test connection
docker exec -it acadistra_postgres psql -U acadistra -d acadistra

# Verify password in .env.production
cat .env.production | grep POSTGRES_PASSWORD
```

### Migration failed
```bash
# Check migration status
docker exec acadistra_backend ./main migrate

# View migration files
ls backend/migrations/

# Manual migration
docker exec -it acadistra_postgres psql -U acadistra -d acadistra < backend/migrations/xxx.sql
```

### Database is full
```bash
# Check database size
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "SELECT pg_size_pretty(pg_database_size('acadistra'));"

# Clean old data (be careful!)
# Backup first!
./scripts/backup.sh

# Then clean as needed
```

---

## Connection Problems

### Cannot access frontend
```bash
# Check if frontend is running
docker ps | grep frontend

# Check frontend logs
docker logs acadistra_frontend -f

# Test locally
curl http://localhost:3000

# Check firewall
sudo ufw status
```

### Cannot access backend API
```bash
# Check if backend is running
docker ps | grep backend

# Check backend logs
docker logs acadistra_backend -f

# Test health endpoint
curl http://localhost:8080/health

# Check backend environment
docker exec acadistra_backend env | grep POSTGRES
```

### SSL/HTTPS not working
```bash
# Check Caddy logs
docker logs acadistra_caddy -f

# Verify DNS is pointing to server
dig acadistra.com

# Check Caddyfile
cat Caddyfile

# Restart Caddy
docker restart acadistra_caddy
```

### CORS errors
```bash
# Check backend CORS configuration
# Edit backend/cmd/api/main.go if needed

# Verify NEXT_PUBLIC_API_URL
docker exec acadistra_frontend env | grep API_URL

# Rebuild if changed
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Performance Issues

### Slow response times
```bash
# Check resource usage
docker stats

# Check database connections
docker exec acadistra_postgres psql -U acadistra -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Restart services
make restart
```

### High memory usage
```bash
# Check memory per service
docker stats --no-stream

# Restart specific service
docker restart acadistra_backend

# Add memory limits in docker-compose.prod.yml
```

### Disk space full
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a

# Clean old logs
sudo journalctl --vacuum-time=7d

# Move backups to external storage
```

---

## Authentication Issues

### Cannot login
```bash
# Check if user exists
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "SELECT email, role FROM users;"

# Reset admin password
docker exec acadistra_backend ./main seed-admin

# Check JWT secret
cat .env.production | grep JWT_SECRET

# Check backend logs for auth errors
docker logs acadistra_backend | grep -i auth
```

### Token expired
```bash
# This is normal - tokens expire for security
# User should login again

# Check token expiration settings in backend
# Default is usually 24 hours
```

### Permission denied
```bash
# Check user role
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "SELECT email, role, is_active FROM users WHERE email='user@example.com';"

# Update user role if needed
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "UPDATE users SET role='school_admin' WHERE email='user@example.com';"
```

---

## Backup & Recovery

### Backup failed
```bash
# Check backup script
cat scripts/backup.sh

# Run manually
./scripts/backup.sh

# Check disk space
df -h

# Check permissions
ls -la scripts/backup.sh
chmod +x scripts/backup.sh
```

### Restore from backup
```bash
# Stop services
docker compose -f docker-compose.prod.yml down

# Restore database
docker compose -f docker-compose.prod.yml up -d postgres
docker exec -i acadistra_postgres psql -U acadistra -d acadistra < backup.sql

# Restore MinIO data
# Extract and copy to volume

# Start all services
docker compose -f docker-compose.prod.yml up -d
```

---

## Common Error Messages

### "connection refused"
- Service not running
- Wrong host/port
- Firewall blocking

**Solution**: Check service status, verify configuration

### "authentication failed"
- Wrong password
- User doesn't exist
- JWT token invalid

**Solution**: Verify credentials, check user exists, re-login

### "permission denied"
- Wrong user role
- Not authenticated
- File permissions

**Solution**: Check user role, verify authentication, fix permissions

### "database locked"
- Another process using database
- Long-running query

**Solution**: Wait or restart database service

### "out of memory"
- Insufficient RAM
- Memory leak

**Solution**: Restart service, upgrade server, check for leaks

---

## Diagnostic Commands

```bash
# Full system health check
./health-check.sh

# View all logs
docker compose -f docker-compose.prod.yml logs -f

# Check specific service
docker logs acadistra_backend -f --tail=100

# Check service status
docker compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats

# Check disk space
df -h

# Check memory
free -h

# Check network
netstat -tulpn | grep LISTEN

# Test database connection
docker exec -it acadistra_postgres psql -U acadistra -d acadistra -c "SELECT 1;"

# Test Redis connection
docker exec -it acadistra_redis redis-cli -a "${REDIS_PASSWORD}" ping
```

---

## Getting Help

If you can't resolve the issue:

1. **Check logs**: `docker compose -f docker-compose.prod.yml logs`
2. **Run health check**: `./health-check.sh`
3. **Search issues**: Check GitHub issues
4. **Create issue**: Include logs, error messages, and steps to reproduce

---

## Emergency Recovery

If everything is broken:

```bash
# 1. Stop everything
docker compose -f docker-compose.prod.yml down

# 2. Backup current state (if possible)
./scripts/backup.sh

# 3. Clean everything (WARNING: deletes data)
docker compose -f docker-compose.prod.yml down -v

# 4. Restore from backup
# Extract backup and restore database

# 5. Redeploy
./deploy.sh
```

---

**Remember**: Always backup before making major changes!
