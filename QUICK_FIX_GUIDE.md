# Quick Reference: Fix Subsidiary Grades on Live Server

## Step-by-Step Commands

### 1. SSH into Server
```bash
ssh your-user@your-server-ip
```

### 2. Navigate to Project
```bash
cd /path/to/acadistra
```

### 3. Pull Latest Code
```bash
git pull origin main
```

### 4. Rebuild Backend
```bash
docker compose -f docker-compose.prod.yml up -d --build backend
```

### 5. Run Fix Script
```bash
chmod +x fix_subsidiary_grades_docker.sh
./fix_subsidiary_grades_docker.sh
```

### 6. Enter Details When Prompted
- **Term**: Term 1
- **Year**: 2026
- **Email**: admin@acadistra.com (or press Enter for default)
- **Password**: [Your admin password]

---

## Expected Output

```
========================================
Subsidiary Grade Recalculation (Docker)
========================================

✅ Backend container found and running

Enter Term (e.g., Term 1, Term 2, Term 3): Term 1
Enter Year (e.g., 2026): 2026
Enter admin email [admin@acadistra.com]: 
Enter admin password: 

Logging in as admin@acadistra.com...
✅ Login successful!

Recalculating S5 subsidiary subject grades...
S5 Response:
{
  "message": "Grade recalculation completed",
  "updated": 15,
  "errors": 0,
  "skipped": 45,
  "total": 60
}

Recalculating S6 subsidiary subject grades...
S6 Response:
{
  "message": "Grade recalculation completed",
  "updated": 21,
  "errors": 0,
  "skipped": 39,
  "total": 60
}

========================================
✅ Grade recalculation completed!
========================================
```

---

## What Gets Fixed

### Subsidiary Subjects Detected:
- ✅ ICT / Information Communication Technology
- ✅ General Paper
- ✅ Subsidiary Mathematics
- ✅ Any subject starting with "Subsidiary"

### Grading Change:
**Before:** D1, D2, C3, C4, C5, C6, P7, P8, F9
**After:** O (Pass ≥50%) or F (Fail <50%)

### Example:
- 93.0 → **O** (was D1)
- 60.0 → **O** (was C6)
- 53.0 → **O** (was P7)
- 47.0 → **F** (was P8)
- 10.0 → **F** (was F9)

---

## Verify Changes

### Check Database
```bash
docker exec -it acadistra_postgres psql -U acadistra -d acadistra -c \
  "SELECT s.name, sr.final_grade, sr.raw_marks 
   FROM subject_results sr 
   JOIN standard_subjects s ON sr.subject_id = s.id 
   WHERE s.name ILIKE '%ict%' OR s.name ILIKE '%subsidiary%' 
   LIMIT 10;"
```

### Check Backend Logs
```bash
docker logs acadistra_backend --tail 50
```

---

## Rollback (If Needed)

If something goes wrong, you can restore from backup:

```bash
# Stop containers
docker compose -f docker-compose.prod.yml down

# Restore database backup
docker exec -i acadistra_postgres psql -U acadistra -d acadistra < backup.sql

# Restart containers
docker compose -f docker-compose.prod.yml up -d
```

---

## Support Contacts

- **Technical Issues**: Check logs with `docker logs acadistra_backend`
- **Database Issues**: Check PostgreSQL logs with `docker logs acadistra_postgres`
- **Documentation**: See SUBSIDIARY_GRADE_FIX.md for detailed info
