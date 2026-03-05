# Acadistra Deployment Checklist

## Pre-Deployment

- [ ] Server provisioned (Ubuntu 22.04, 2GB+ RAM)
- [ ] Domain name configured
- [ ] SSH access configured
- [ ] Firewall rules set (ports 80, 443, 22)

## Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/yourusername/acadistra.git
cd acadistra

# 2. Run deployment script
./deploy.sh
```

## DNS Configuration

Point these A records to your server IP:

- `acadistra.com` → `YOUR_SERVER_IP`
- `www.acadistra.com` → `YOUR_SERVER_IP`
- `api.acadistra.com` → `YOUR_SERVER_IP`
- `*.acadistra.com` → `YOUR_SERVER_IP` (wildcard for school subdomains)

## Post-Deployment

- [ ] Access frontend at http://localhost:3000
- [ ] Login with sysadmin@school.ug / Admin@123
- [ ] Create first school
- [ ] Create school admin user
- [ ] Test basic functionality

## SSL/HTTPS

Caddy automatically provisions SSL certificates via Let's Encrypt.
Ensure DNS is properly configured before starting Caddy.

## Backup Setup

```bash
# Add to crontab
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * /path/to/acadistra/scripts/backup.sh
```

## Monitoring

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check service status
docker compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats
```

## Troubleshooting

### Services won't start
```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### Database connection issues
```bash
docker exec -it acadistra_postgres psql -U acadistra -d acadistra
```

### Clear and restart
```bash
docker compose -f docker-compose.prod.yml down -v
./deploy.sh
```

## Security Checklist

- [ ] Changed default admin password
- [ ] Firewall configured (ufw enable)
- [ ] SSH key authentication only
- [ ] Regular backups scheduled
- [ ] SSL certificates active
- [ ] Database password is strong
- [ ] Redis password is strong
- [ ] JWT secret is secure (64+ characters)

## Scaling

### Add more schools
No additional setup needed - just create new school records in the system.
All schools share the same database with school_id isolation.

### Upgrade server resources
```bash
# On Hetzner/DigitalOcean, resize server via dashboard
# No downtime required for most providers
```

## Maintenance

### Update application
```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### Database backup
```bash
./scripts/backup.sh
```

### Restore from backup
```bash
# Stop services
docker compose -f docker-compose.prod.yml down

# Restore database
docker exec -i acadistra_postgres psql -U acadistra -d acadistra < backup.sql

# Start services
docker compose -f docker-compose.prod.yml up -d
```

## Support

For issues:
1. Check logs: `docker compose -f docker-compose.prod.yml logs`
2. Verify services: `docker compose -f docker-compose.prod.yml ps`
3. Check disk space: `df -h`
4. Check memory: `free -h`
