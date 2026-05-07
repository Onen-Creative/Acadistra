# Acadistra

Production-ready school management system for Ugandan schools (ECCE → S6) with UNEB/NCDC grading.

## 🚀 Quick Deploy

```bash
git clone https://github.com/yourusername/acadistra.git
cd acadistra
./deploy.sh
```

Access at http://localhost:3000 with `admin@acadistra.com` / `Admin@123`

📖 **[Full Quick Start Guide](QUICKSTART.md)** | 📋 **[Deployment Checklist](DEPLOYMENT_CHECKLIST_CLEAN.md)**

## Prerequisites

- Docker & Docker Compose
- 2GB+ RAM server
- Ubuntu 22.04 (recommended)

## Features

✅ Multi-section support (ECCE, P1-P7, S1-S6)
✅ **Standardized curriculum subjects** - All schools use the same subjects per level
✅ Role-based access (Admin, Teacher, Bursar, Librarian, Nurse, Parent)
✅ Offline-first marks entry
✅ UNEB & NCDC grading engines
✅ PDF report generation
✅ **Payroll management** - Salary structures, monthly processing, payment tracking
✅ **Automatic finance integration** - Payroll payments auto-create expenditure records
✅ **Budget & Requisitions** - Budget planning, purchase requests, approval workflow
✅ **SMS Management** - Send fees reminders, attendance alerts via Africa's Talking/Twilio
✅ **SchoolPay integration** - Real-time mobile money payments via SchoolPay Uganda
✅ Attendance tracking with holidays & term dates
✅ Library management with book issues
✅ Clinic management with health profiles
✅ Finance & inventory management
✅ **Parent portal** - View children's progress, fees, attendance
✅ Audit logging
✅ JWT authentication

## Stack

- **Backend**: Go + Gin + GORM + PostgreSQL
- **Frontend**: React 19 + Next.js 16 + TypeScript + Mantine UI
- **Queue**: Redis + Asynq
- **Storage**: MinIO (S3-compatible)
- **Proxy**: Caddy (auto SSL)

## Architecture

**Multi-Tenant**: Single shared database with `school_id` isolation
- 1 PostgreSQL database for all schools
- Data isolated by `school_id` column
- Subdomain routing: `school1.acadistra.com` → filters by `school_id`
- Cost-effective: €1-2 per school/month

## Development

```bash
# Terminal 1 - Backend
cd backend
go run cmd/api/main.go

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev

# Tests
cd backend && go test ./... -v
cd frontend && npm test
```

## Production Deployment

### Option 1: Automated Script (Recommended)
```bash
./deploy.sh
```

### Option 2: Manual
```bash
# 1. Configure environment
cp .env.production.example .env.production
nano .env.production  # Set secure passwords and API keys

# 2. Start services
docker compose -f docker-compose.prod.yml up -d

# 3. Run migrations
docker exec acadistra_backend ./main migrate

# 4. Create admin
docker exec acadistra_backend ./main seed-admin

# 5. Seed subjects
docker exec acadistra_backend ./main seed-standard-subjects

# 6. Create SMS tables
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f migrations/20260505000000_create_sms_tables_pg.sql"
```

## Configuration

### Environment Variables
Copy `.env.production.example` to `.env` and configure:

```bash
cp .env.production.example .env
nano .env  # Edit with your credentials
```

Required variables:
- Database: `POSTGRES_PASSWORD`
- Redis: `REDIS_PASSWORD`
- MinIO: `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`
- JWT: `JWT_SECRET` (min 32 characters)
- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`

Optional integrations:
- SMS: `AFRICASTALKING_*` or `TWILIO_*` variables
- SchoolPay: `SCHOOLPAY_*` variables

### DNS Setup
Point these A records to your server:
- `acadistra.com` → `YOUR_SERVER_IP`
- `*.acadistra.com` → `YOUR_SERVER_IP` (wildcard)
- `api.acadistra.com` → `YOUR_SERVER_IP`

### SSL/HTTPS
Caddy automatically provisions SSL certificates via Let's Encrypt.

### Backup
```bash
# Manual backup
./scripts/backup.sh

# Automated (add to crontab)
0 2 * * * /path/to/acadistra/scripts/backup.sh
```

## API Documentation

OpenAPI/Swagger: http://localhost:8080/swagger/index.html

## Monitoring

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps

# Resource usage
docker stats
```

## Cost Breakdown

**Recommended**: Hetzner Cloud CPX31
- 2 vCPU, 4GB RAM: €10/month
- Handles 5-10 schools
- **Per school**: €1-2/month

## Security

- ✅ JWT authentication
- ✅ Role-based access control
- ✅ Audit logging
- ✅ Secure password hashing (Argon2)
- ✅ SQL injection protection (GORM)
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ Auto SSL via Caddy

## Support

- 📖 [Quick Start Guide](QUICKSTART.md)
- 📋 [Deployment Guide](DEPLOYMENT.md)
- 🏗️ [System Architecture](SYSTEM_ARCHITECTURE.md)
- 📝 [API Documentation](http://localhost:8080/swagger/index.html)
- 📧 Email: support@acadistra.com
- 🔒 Security: security@acadistra.com
- 💼 Sales: sales@acadistra.com

## License

MIT License - See LICENSE file

---

**Built for Ugandan Schools** 🇺🇬 | ECCE → S6 | UNEB & NCDC Compliant
