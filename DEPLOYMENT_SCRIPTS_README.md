# Grading System Deployment Scripts

## Overview

Two scripts are provided for deploying the grading system fixes:

1. **`deploy-grading-fix.sh`** - Full deployment (pull code, rebuild, restart, recalculate)
2. **`recalculate-grades.sh`** - Recalculate grades only (after manual deployment)

---

## Prerequisites

### System Requirements

✅ **Required:**
- `bash` (shell)
- `curl` (HTTP requests)
- `git` (version control)
- `docker` and `docker compose` (containerization)
- `grep`, `cut`, `sed` (text processing - usually pre-installed)

✅ **Optional (for pretty JSON output):**
- `python3` with `json.tool` module, OR
- `jq` (JSON processor)

### Check Prerequisites

```bash
# Check if all required tools are installed
which bash curl git docker

# Check Docker Compose
docker compose version

# Check optional tools
which python3 jq
```

---

## Script 1: Full Deployment (`deploy-grading-fix.sh`)

### What It Does

1. ✅ Pulls latest code from Git
2. ✅ Stops running services
3. ✅ Rebuilds Docker images
4. ✅ Starts services
5. ✅ Waits for backend to be ready
6. ✅ Authenticates as admin
7. ✅ Recalculates all grades
8. ✅ Shows summary

### Usage

```bash
# Basic usage - requires credentials
ADMIN_EMAIL="your-admin@email.com" \
ADMIN_PASSWORD="YourPassword" \
./deploy-grading-fix.sh

# With custom configuration
ADMIN_EMAIL="admin@school.com" \
ADMIN_PASSWORD="MyPassword123" \
API_URL="https://myschool.acadistra.com" \
TERM="Term 2" \
YEAR="2025" \
./deploy-grading-fix.sh
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | _(required)_ | Admin email for authentication |
| `ADMIN_PASSWORD` | _(required)_ | Admin password |
| `API_URL` | `https://acadistra.com` | Your site URL |
| `TERM` | `Term 1` | Term to recalculate |
| `YEAR` | `2026` | Year to recalculate |

### Example Output

```
╔════════════════════════════════════════════════════════════╗
║     Acadistra - Grading System Fix Deployment             ║
╚════════════════════════════════════════════════════════════╝

📥 Step 1: Pulling latest changes from Git...
✅ Git pull successful

🔨 Step 2: Rebuilding and restarting services...
✅ Services stopped
✅ Services rebuilt and started

⏳ Step 3: Waiting for services to be ready...
✅ Backend is ready

📊 Step 4: Checking service status...
NAME                    STATUS    PORTS
acadistra_postgres      running   5432/tcp
acadistra_redis         running   6379/tcp
acadistra_backend       running   8080/tcp
acadistra_frontend      running   3000/tcp

🔐 Step 5: Authenticating as admin...
✅ Authentication successful

🔄 Step 6: Recalculating grades for Term 1 2026...
Response:
{
  "message": "Grade recalculation completed",
  "updated": 48,
  "errors": 0,
  "skipped": 5,
  "total": 53
}

✅ Grade recalculation completed!
   📊 Updated: 48
   ❌ Errors: 0
   ⏭️  Skipped: 5
   📈 Total: 53

✅ Step 7: Deployment Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Code deployed successfully
✅ Services restarted
✅ Backend is healthy
✅ Grades recalculated (48 updated)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Deployment complete!
```

---

## Script 2: Recalculate Grades Only (`recalculate-grades.sh`)

### What It Does

1. ✅ Authenticates as admin
2. ✅ Recalculates grades for specified term/year/level
3. ✅ Shows detailed results

### Usage

```bash
# Recalculate all grades for Term 1, 2026
ADMIN_EMAIL="your-admin@email.com" \
ADMIN_PASSWORD="YourPassword" \
./recalculate-grades.sh

# Recalculate specific term/year
ADMIN_EMAIL="your-admin@email.com" \
ADMIN_PASSWORD="YourPassword" \
TERM="Term 2" \
YEAR="2025" \
./recalculate-grades.sh

# Recalculate specific level only
ADMIN_EMAIL="your-admin@email.com" \
ADMIN_PASSWORD="YourPassword" \
LEVEL="P4" \
./recalculate-grades.sh

# Recalculate S1 for Term 1, 2026
ADMIN_EMAIL="your-admin@email.com" \
ADMIN_PASSWORD="YourPassword" \
TERM="Term 1" \
YEAR="2026" \
LEVEL="S1" \
./recalculate-grades.sh

# Custom API URL and credentials
API_URL="https://myschool.com" \
ADMIN_EMAIL="admin@school.com" \
ADMIN_PASSWORD="MyPass123" \
./recalculate-grades.sh
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | _(required)_ | Admin email |
| `ADMIN_PASSWORD` | _(required)_ | Admin password |
| `API_URL` | `https://acadistra.com` | Your site URL |
| `TERM` | `Term 1` | Term to recalculate (optional) |
| `YEAR` | `2026` | Year to recalculate (optional) |
| `LEVEL` | _(empty)_ | Specific level: P1-P7, S1-S6 (optional) |

---

## Troubleshooting

### Error: "Failed to get access token"

**Cause:** Wrong admin credentials or backend not running

**Solution:**
```bash
# Check if backend is running
docker compose -f docker-compose.prod.yml ps

# Check backend logs
docker compose -f docker-compose.prod.yml logs backend

# Verify credentials
echo "Email: $ADMIN_EMAIL"
echo "Password: $ADMIN_PASSWORD"
```

### Error: "Backend failed to start"

**Cause:** Services not healthy or port conflicts

**Solution:**
```bash
# Check all services
docker compose -f docker-compose.prod.yml ps

# Check specific service logs
docker compose -f docker-compose.prod.yml logs postgres
docker compose -f docker-compose.prod.yml logs backend

# Restart services
docker compose -f docker-compose.prod.yml restart
```

### Error: "Git pull failed"

**Cause:** Uncommitted changes or merge conflicts

**Solution:**
```bash
# Check git status
git status

# Stash local changes
git stash

# Pull again
git pull origin main

# Reapply changes if needed
git stash pop
```

### Error: "Permission denied"

**Cause:** Scripts not executable

**Solution:**
```bash
chmod +x deploy-grading-fix.sh recalculate-grades.sh
```

---

## Manual Recalculation (Browser Method)

If scripts fail, use browser console:

1. **Login** to your site as admin
2. **Press F12** to open console
3. **Run**:

```javascript
fetch('https://acadistra.com/api/v1/recalculate-grades?term=Term%201&year=2026', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
  }
})
.then(r => r.json())
.then(data => {
  console.log('✅ Result:', data);
  alert(`Updated: ${data.updated}\nErrors: ${data.errors}\nTotal: ${data.total}`);
});
```

---

## Verification

After running scripts, verify:

1. **Visit Results Management**: `https://acadistra.com/results`
2. **Check Primary (P1-P7)**: Grades show D1/D2/C3/C4 (not A/B/C)
3. **Check O-Level (S1-S4)**: 
   - Grades show D1/D2/C3/C4 (not A/B/C)
   - Column shows "AOI" (not "CA")
4. **Check totals**: Verify weighted totals are correct

---

## What Gets Updated

### Nursery (Baby, Middle, Top)
- ✅ Descriptive grades: Mastering, Secure, Developing, Emerging, Not Yet
- ✅ Formula: Average of CA(100) + Exam(100)

### Primary (P1-P7)
- ✅ Grades: D1, D2, C3, C4, C5, C6, P7, P8, F9
- ✅ Formula: (CA/40)×40 + (Exam/60)×60

### O-Level (S1-S4)
- ✅ Grades: D1, D2, C3, C4, C5, C6, P7, P8, F9
- ✅ Formula: (AOI/20)×20 + (Exam/80)×80
- ✅ Label: "AOI" instead of "CA"

### A-Level (S5-S6)
- ✅ Paper grades: D1, D2, C3, C4, C5, C6, P7, P8, F9
- ✅ Principal grades: A, B, C, D, E, O, F

---

## Support

If you encounter issues:

1. Check logs: `docker compose -f docker-compose.prod.yml logs backend`
2. Verify services: `docker compose -f docker-compose.prod.yml ps`
3. Check database: `docker exec -it acadistra_postgres psql -U acadistra -d acadistra`
4. Contact support with error messages

---

## Files Modified by Deployment

- `backend/internal/grading/grading.go` - Grading logic
- `backend/internal/handlers/result_handler.go` - Grade recalculation
- `backend/internal/handlers/staff_handler.go` - Log suppression
- `frontend/src/app/results/page.tsx` - UI labels

---

**Last Updated:** 2026-04-09
**Version:** 1.0.0
