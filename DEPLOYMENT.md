# Acadistra Production Deployment Guide

## Multi-Tenant Architecture

**Strategy:** Single shared database with school_id isolation
- 1 PostgreSQL database (acadistra)
- All tables have school_id column for data isolation
- Shared Redis, MinIO, Backend, Frontend, Worker
- Subdomain routing: school1.acadistra.com → filters by school_id

## Server Requirements

**Recommended:** Atal Networks or Hetzner
- 1 vCPU, 4GB RAM (Atal: $10/month)
- 2 vCPU, 4GB RAM (Hetzner: $10/month)
- Handles 5-10 schools easily with single database

## Quick Deployment (15 minutes)

### 1. Get Hetzner VPS
```bash
# Sign up at https://www.hetzner.com/cloud
# Create CPX31 server with Ubuntu 22.04
# Note the IP address
```

### 2. Initial Server Setup
```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Create deployment user
adduser acadistra
usermod -aG docker acadistra
su - acadistra
```

### 3. Deploy Application
```bash
# Clone repository
git clone https://github.com/yourusername/acadistra.git
cd acadistra

# Copy and configure environment
cp .env.production .env
nano .env  # Set secure passwords

# Generate secure passwords
openssl rand -base64 32  # For POSTGRES_PASSWORD
openssl rand -base64 32  # For REDIS_PASSWORD
openssl rand -base64 32  # For MINIO_ROOT_PASSWORD
openssl rand -base64 48  # For JWT_SECRET

# Start services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps
```

### 4. Configure DNS
```bash
# Point these domains to YOUR_SERVER_IP:
# A record: acadistra.com → YOUR_SERVER_IP
# A record: www.acadistra.com → YOUR_SERVER_IP
# A record: api.acadistra.com → YOUR_SERVER_IP
# A record: school1.acadistra.com → YOUR_SERVER_IP
# A record: school2.acadistra.com → YOUR_SERVER_IP
# A record: school3.acadistra.com → YOUR_SERVER_IP
# A record: school4.acadistra.com → YOUR_SERVER_IP
# A record: school5.acadistra.com → YOUR_SERVER_IP
# A record: storage.acadistra.com → YOUR_SERVER_IP (optional)
```

### 5. Initialize Database
```bash
# Run migrations once for shared database
docker exec acadistra_backend /app/migrate

# Create schools in database
docker exec acadistra_backend /app/create-school --name="School 1" --subdomain=school1
docker exec acadistra_backend /app/create-school --name="School 2" --subdomain=school2
docker exec acadistra_backend /app/create-school --name="School 3" --subdomain=school3
docker exec acadistra_backend /app/create-school --name="School 4" --subdomain=school4
docker exec acadistra_backend /app/create-school --name="School 5" --subdomain=school5

# Create admin for each school (gets school_id automatically)
docker exec acadistra_backend /app/seed-admin --subdomain=school1 --email=admin@school1.com
docker exec acadistra_backend /app/seed-admin --subdomain=school2 --email=admin@school2.com
docker exec acadistra_backend /app/seed-admin --subdomain=school3 --email=admin@school3.com
docker exec acadistra_backend /app/seed-admin --subdomain=school4 --email=admin@school4.com
docker exec acadistra_backend /app/seed-admin --subdomain=school5 --email=admin@school5.com
```

### 6. Setup Standard Subjects
```bash
# Setup subjects once (shared across all schools)
docker exec acadistra_backend /app/setup-subjects
```

## Access URLs

- **School 1**: https://school1.acadistra.com
- **School 2**: https://school2.acadistra.com
- **School 3**: https://school3.acadistra.com
- **School 4**: https://school4.acadistra.com
- **School 5**: https://school5.acadistra.com
- **API**: https://api.acadistra.com
- **Storage Console**: https://storage.acadistra.com

## Backend Configuration

The backend automatically filters all queries by school_id based on subdomain:

```go
// middleware/tenant.go
func TenantMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        host := c.Request.Host
        
        // Extract subdomain
        parts := strings.Split(host, ".")
        if len(parts) >= 3 {
            subdomain := parts[0]
            
            // Get school_id from subdomain
            var school School
            db.Where("subdomain = ?", subdomain).First(&school)
            
            // Set school_id in context for all queries
            c.Set("school_id", school.ID)
        }
        
        c.Next()
    }
}

// All database queries automatically filter by school_id
db.Where("school_id = ?", c.GetString("school_id")).Find(&students)
```

## Backup Strategy

```bash
# Daily automated backups
# Add to crontab: crontab -e
0 2 * * * /home/acadistra/scripts/backup.sh

# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/home/acadistra/backups/$DATE"
mkdir -p $BACKUP_DIR

# Backup single database (contains all schools)
docker exec acadistra_postgres pg_dump -U acadistra acadistra > $BACKUP_DIR/acadistra.sql

# Backup MinIO data
docker exec acadistra_minio mc mirror /data $BACKUP_DIR/minio

# Keep last 30 days
find /home/acadistra/backups -type d -mtime +30 -exec rm -rf {} \;
```

## Monitoring

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check resource usage
docker stats

# Database connections
docker exec acadistra_postgres psql -U acadistra -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

## Scaling

**To add more schools:**
1. Create school record: `docker exec acadistra_backend /app/create-school --name="School 6" --subdomain=school6`
2. Create admin: `docker exec acadistra_backend /app/seed-admin --subdomain=school6 --email=admin@school6.com`
3. Add DNS record: `school6.acadistra.com → YOUR_SERVER_IP`
4. Done! (No database creation needed)

**To upgrade server:**
- Hetzner allows live resizing
- No downtime required
- Takes 2-3 minutes

## Cost Breakdown

**Monthly Costs:**
- Atal Networks (1 vCPU, 4GB): $10/month
- Domain (acadistra.com): $1/month
- **Total: $11/month for unlimited schools**

**Per School Cost: $2.20/month (5 schools) or $1.10/month (10 schools)**

## Troubleshooting

```bash
# Restart all services
docker compose -f docker-compose.prod.yml restart

# Rebuild after code changes
docker compose -f docker-compose.prod.yml up -d --build

# Check database connectivity
docker exec acadistra_backend psql -h postgres -U acadistra -d acadistra_school1 -c "SELECT 1;"

# View backend logs
docker logs acadistra_backend --tail=100 -f
```

## Security Checklist

- ✅ Strong passwords in .env
- ✅ Firewall enabled (ufw)
- ✅ SSH key authentication only
- ✅ Automatic SSL via Caddy
- ✅ Database backups automated
- ✅ Single shared database with school_id isolation
- ✅ JWT authentication
- ✅ Rate limiting on API

## Support

For issues, check logs first:
```bash
docker compose -f docker-compose.prod.yml logs --tail=100
```
