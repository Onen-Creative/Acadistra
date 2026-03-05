# Acadistra - Quick Start Guide

## 🚀 Deploy in 5 Minutes

### Prerequisites
- Ubuntu 22.04 server (2GB+ RAM)
- Domain name (optional for local testing)
- SSH access

### Step 1: Clone Repository
```bash
git clone https://github.com/yourusername/acadistra.git
cd acadistra
```

### Step 2: Deploy
```bash
./deploy.sh
```

That's it! The script will:
- Install Docker if needed
- Generate secure passwords
- Build and start all services
- Run database migrations
- Create admin user
- Seed standard subjects

### Step 3: Access
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **MinIO Console**: http://localhost:9001

**Default Login**:
- Email: `sysadmin@school.ug`
- Password: `Admin@123`

## 🏫 Create Your First School

1. Login as system admin
2. Navigate to Schools → Add School
3. Fill in school details
4. Create school admin user
5. Login as school admin to manage school

## 📊 Features Available

✅ Student Management
✅ Class Management
✅ Marks Entry (Online & Offline)
✅ Report Cards (UNEB/NCDC Grading)
✅ Attendance Tracking
✅ Finance Management
✅ Payroll System
✅ Library Management
✅ Clinic Management
✅ Budget & Requisitions
✅ Inventory Management

## 🔒 Security

Change default password immediately after first login!

## 📦 Backup

Setup automated backups:
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/acadistra/scripts/backup.sh
```

## 🌐 Production Deployment

For production with domain name:

1. **Configure DNS**: Point your domain to server IP
2. **Update Caddyfile**: Replace `acadistra.com` with your domain
3. **Restart services**:
   ```bash
   docker compose -f docker-compose.prod.yml restart caddy
   ```

Caddy will automatically provision SSL certificates!

## 📝 Common Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop services
docker compose -f docker-compose.prod.yml down

# Update application
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build

# Backup database
./scripts/backup.sh
```

## 🆘 Troubleshooting

### Services won't start
```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### Check service health
```bash
docker compose -f docker-compose.prod.yml ps
```

### View specific service logs
```bash
docker logs acadistra_backend -f
docker logs acadistra_frontend -f
docker logs acadistra_postgres -f
```

## 📚 Documentation

- Full deployment guide: `DEPLOYMENT.md`
- API documentation: http://localhost:8080/swagger/index.html
- Architecture: `SYSTEM_ARCHITECTURE.md`

## 💰 Cost Estimate

**Recommended Hosting**: Hetzner Cloud
- CPX31 (2 vCPU, 4GB RAM): €10/month
- Handles 5-10 schools easily
- **Cost per school**: €1-2/month

## 🎯 Next Steps

1. Change admin password
2. Create your first school
3. Add teachers and students
4. Configure school settings
5. Setup backup schedule
6. Configure SMS/Email (optional)

## 📞 Support

For issues or questions:
- Check logs first
- Review documentation
- Check GitHub issues

---

**Built for Ugandan Schools** 🇺🇬
ECCE → S6 | UNEB & NCDC Compliant
