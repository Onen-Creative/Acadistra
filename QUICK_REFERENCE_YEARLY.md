# Quick Reference: Yearly Classes & Enrollments

## ✅ LOCAL SERVER - COMPLETED

### What Changed
1. **Classes:** No `term` column (yearly)
2. **Enrollments:** No `term` column (yearly)
3. **Code:** 6 files updated
4. **Migrations:** 2 SQL files applied

### Database State
```
classes:      (school_id, level, stream, year) ✅
enrollments:  (student_id, class_id, year) ✅
```

### Verification
```bash
# Check classes
psql -U postgres -d school_system_db -c "\d classes"
# Should NOT show 'term' column ✅

# Check enrollments  
psql -U postgres -d school_system_db -c "\d enrollments"
# Should NOT show 'term' column ✅
```

---

## 🚀 LIVE SERVER - TODO

### Pre-Deployment Checklist
- [ ] Backup database
- [ ] Test migrations on staging/dev
- [ ] Update frontend (remove term from enrollment forms)
- [ ] Schedule maintenance window
- [ ] Notify users

### Deployment Commands
```bash
# 1. Backup
docker exec acadistra_db pg_dump -U postgres school_system_db > backup.sql

# 2. Apply migrations
docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f /app/migrations/20260702000000_make_classes_yearly.sql"

docker exec acadistra_backend sh -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -f /app/migrations/20260703000000_make_enrollments_yearly.sql"

# 3. Restart
docker restart acadistra_backend

# 4. Verify
docker logs acadistra_backend --tail 50
```

### Expected Result
- ✅ Classes show for all terms
- ✅ Students show for all terms
- ✅ Marks entry works
- ✅ Attendance works
- ✅ Reports generate correctly

---

## 📝 API Changes

### No Breaking Changes
All endpoints still work, but:

**Before:**
```json
POST /api/students/register
{
  "first_name": "John",
  "class_id": "...",
  "term": "1",  // ❌ Ignored now
  "year": 2024
}
```

**After:**
```json
POST /api/students/register
{
  "first_name": "John",
  "class_id": "...",
  // No term field needed
  "year": 2024
}
```

### Query Parameters
```
GET /api/classes/{id}/students?year=2024&term=2
```
- `term` parameter is ignored
- Returns all students for the year
- Filter by term happens in marks/attendance, not enrollment

---

## 🔧 Frontend Updates Needed

### Remove Term From:
1. Student registration form
2. Student enrollment forms
3. Class student listing filters

### Keep Term In:
1. Marks entry
2. Attendance marking
3. Report generation
4. Fees management

---

## 📊 Data Impact

### Before Migration
```
Classes:     300 records (100 classes × 3 terms)
Enrollments: 3000 records (1000 students × 3 terms)
```

### After Migration
```
Classes:     100 records (100 classes × 1 year)
Enrollments: 1000 records (1000 students × 1 year)
```

**Reduction:** 67% fewer records!

---

## ⚠️ Important Notes

1. **Existing Data:** Migration only changes schema, doesn't migrate old data
2. **Old Enrollments:** Any term-specific enrollments will fail unique constraint
3. **Solution:** Run this before migration:
   ```sql
   -- Delete duplicate enrollments, keep one per year
   DELETE FROM enrollments a USING enrollments b
   WHERE a.id > b.id 
     AND a.student_id = b.student_id 
     AND a.class_id = b.class_id 
     AND a.year = b.year;
   ```

4. **Rollback:** Keep backup for 7 days minimum

---

## 🎯 Success Criteria

✅ No term column in classes table
✅ No term column in enrollments table
✅ Backend compiles without errors
✅ Students visible for all terms
✅ Marks entry works for all terms
✅ No duplicate enrollment errors

---

## 📞 Support

If issues occur:
1. Check logs: `docker logs acadistra_backend`
2. Verify migrations: `\d classes` and `\d enrollments`
3. Rollback if needed: Restore from backup
4. Contact: System administrator

---

**Status:** ✅ Local server ready | 🚀 Live server pending
