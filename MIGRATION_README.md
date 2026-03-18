# Complete System Migration

## What This Does

This migration performs a **COMPLETE FRESH INSTALLATION** of the entire Acadistra database:

✅ Creates ALL 65 tables from scratch
✅ Includes all 9 new tables (lessons, budget, requisitions, inventory)
✅ Seeds system admin user
✅ Seeds all standard subjects (ECCE → S6)
✅ Rebuilds all Docker containers with latest code

## ⚠️ WARNING

**THIS WILL DELETE ALL EXISTING DATA!**

A backup will be created automatically before deletion.

## Quick Start

### 1. Run the Migration

```bash
sudo ./complete-migration.sh
```

You will be prompted to confirm by typing `YES`.

### 2. Expected Duration

5-10 minutes depending on server speed.

### 3. What Gets Created

**All 65 Tables:**
- Core: schools, users, staff, students, guardians, classes
- Academic: marks, assessments, report_cards, exams, standard_subjects
- Finance: fees, payments, income, expenditure, payroll
- Library: books, book_issues, bulk_issues
- Clinic: health_profiles, visits, medicines, tests
- Attendance: attendances, term_dates, school_calendars
- **NEW: lesson_records, budgets, requisitions, inventory (9 tables)**

**Initial Data:**
- System Admin: `sysadmin@school.ug` / `Admin@123`
- Standard Subjects: All UNEB/NCDC subjects for ECCE → S6

## After Migration

### Test the System

1. **Login**: https://acadistra.com
   - Email: `sysadmin@school.ug`
   - Password: `Admin@123`

2. **Verify Pages Load:**
   - ✅ Dashboard
   - ✅ Staff
   - ✅ Students
   - ✅ Lessons (NEW - should not show 500 error)
   - ✅ Budget (NEW - should not show 500 error)
   - ✅ Requisitions (NEW - should not show 500 error)
   - ✅ Inventory (NEW - should not show 500 error)

### Check Database

```bash
# List all tables
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "\dt"

# Count tables (should be 65+)
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"

# Check specific new tables
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "\d lesson_records"
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "\d budgets"
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "\d requisitions"
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "\d inventory_items"
```

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Backend only
docker logs acadistra_backend -f

# Check for errors
docker logs acadistra_backend 2>&1 | grep -i error
```

## Rollback

If something goes wrong, restore from backup:

```bash
sudo ./rollback.sh
```

This will restore the database from the backup created before migration.

## Backup Location

Backups are stored in:
```
/home/od/workspace/programming/school management system/backups/
```

Format: `acadistra_full_backup_YYYYMMDD_HHMMSS.sql`

## Troubleshooting

### Migration Fails

```bash
# Check backend logs
docker logs acadistra_backend

# Check if database is running
docker exec acadistra_postgres pg_isready -U acadistra

# Manually trigger migration
curl -X GET "http://localhost:8080/setup/migrate"
```

### Tables Not Created

```bash
# Verify backend has latest code
docker exec acadistra_backend ls -la /root/main

# Check migration logs
docker logs acadistra_backend | grep -i migrat

# Manually run migration
curl -X GET "http://localhost:8080/setup/migrate"
```

### Services Won't Start

```bash
# Check service status
docker compose -f docker-compose.prod.yml ps

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend

# Full restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

## Files

- `complete-migration.sh` - Main migration script (THIS ONE)
- `rollback.sh` - Restore from backup
- `docker-compose.prod.yml` - Production configuration
- `backups/` - Database backups directory

## Support

If migration fails:
1. Check logs: `docker logs acadistra_backend`
2. Verify backup exists: `ls -lh backups/`
3. Rollback if needed: `sudo ./rollback.sh`

---

**Ready?** Run: `sudo ./complete-migration.sh`
