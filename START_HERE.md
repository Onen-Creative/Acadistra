# COMPLETE SYSTEM MIGRATION - READY TO RUN

## 📋 Summary

I've created **ONE comprehensive migration script** that will:

1. ✅ Backup your existing database
2. ✅ Drop and recreate the database (fresh start)
3. ✅ Rebuild all Docker containers with latest code
4. ✅ Create ALL 65 tables (including 9 new ones)
5. ✅ Seed admin user and standard subjects
6. ✅ Verify everything works

## 🚀 How to Run

```bash
cd "/home/od/workspace/programming/school management system"
sudo ./complete-migration.sh
```

Type `YES` when prompted. Takes 5-10 minutes.

## 📁 Files Created

1. **complete-migration.sh** - Main migration script (RUN THIS)
2. **rollback.sh** - Restore from backup if needed
3. **MIGRATION_README.md** - Detailed documentation
4. **QUICK_REFERENCE.txt** - Quick command reference

## ⚠️ Important Notes

### This is a COMPLETE FRESH INSTALLATION
- All existing data will be DELETED
- A backup is created automatically first
- You can rollback using `./rollback.sh`

### What Gets Created
- **All 65 tables** from scratch
- **9 new tables**: lesson_records, budgets, budget_transfers, requisitions, requisition_items, requisition_approval_flows, inventory_categories, inventory_items, inventory_transactions
- **Admin user**: sysadmin@school.ug / Admin@123
- **Standard subjects**: All UNEB/NCDC subjects (ECCE → S6)

### After Migration
Test these pages (should NOT show 500 errors):
- ✅ Lessons page
- ✅ Budget page
- ✅ Requisitions page
- ✅ Inventory page

## 🔍 Verify Success

```bash
# Count tables (should be 65+)
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"

# Check new tables exist
docker exec acadistra_postgres psql -U acadistra -d acadistra -c "\dt" | grep -E "lesson|budget|requisition|inventory"
```

## 🔄 If Something Goes Wrong

```bash
# Rollback to backup
sudo ./rollback.sh

# Check logs
docker logs acadistra_backend

# Restart services
docker compose -f docker-compose.prod.yml restart
```

## 📦 Backup Location

Backups saved to:
```
/home/od/workspace/programming/school management system/backups/
```

Format: `acadistra_full_backup_YYYYMMDD_HHMMSS.sql`

## ✅ Success Criteria

After migration completes:
- ✅ 65+ tables created
- ✅ No 500 errors on lessons/budget/requisitions/inventory pages
- ✅ Can login with sysadmin@school.ug
- ✅ All services running (check with `docker compose ps`)
- ✅ Backend logs show no errors

## 🎯 Ready to Run?

```bash
sudo ./complete-migration.sh
```

---

**Need help?** Check:
- MIGRATION_README.md - Full documentation
- QUICK_REFERENCE.txt - Command reference
- Backend logs: `docker logs acadistra_backend`
