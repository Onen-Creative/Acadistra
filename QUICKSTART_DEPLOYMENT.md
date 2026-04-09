# Quick Start: Deploy Grading Fix to Live Server

## 🚀 One-Command Deployment

```bash
# SSH into your server
ssh user@your-server-ip

# Navigate to project
cd /path/to/acadistra

# Run deployment script
./deploy-grading-fix.sh
```

That's it! The script will:
1. Pull latest code
2. Rebuild services
3. Restart everything
4. Recalculate all grades automatically

---

## 📋 Step-by-Step (If You Prefer Manual Control)

### Step 1: Upload Scripts to Server

```bash
# From your local machine
scp deploy-grading-fix.sh user@server:/path/to/acadistra/
scp recalculate-grades.sh user@server:/path/to/acadistra/
```

### Step 2: SSH and Deploy

```bash
# SSH into server
ssh user@server

# Go to project
cd /path/to/acadistra

# Make scripts executable
chmod +x deploy-grading-fix.sh recalculate-grades.sh

# Deploy
./deploy-grading-fix.sh
```

---

## ⚙️ Custom Configuration

If your setup is different:

```bash
# Custom admin credentials
ADMIN_EMAIL="admin@myschool.com" \
ADMIN_PASSWORD="MySecurePass123" \
API_URL="https://myschool.acadistra.com" \
./deploy-grading-fix.sh
```

---

## 🔄 Recalculate Grades Only (After Manual Deployment)

If you already deployed manually and just need to recalculate:

```bash
./recalculate-grades.sh
```

Or for specific term/level:

```bash
TERM="Term 2" YEAR="2025" LEVEL="S1" ./recalculate-grades.sh
```

---

## ✅ Verify Deployment

1. **Check Services**:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

2. **Check Logs**:
   ```bash
   docker compose -f docker-compose.prod.yml logs backend | tail -50
   ```

3. **Visit Website**:
   - Go to: `https://acadistra.com/results`
   - Select P4 or S1 class
   - Verify grades show **D1/D2/C3/C4** (not A/B/C)
   - Verify S1-S4 shows **"AOI"** column (not "CA")

---

## 🆘 If Something Goes Wrong

### Script Fails?

```bash
# Check what went wrong
docker compose -f docker-compose.prod.yml logs backend

# Restart services manually
docker compose -f docker-compose.prod.yml restart

# Try recalculation again
./recalculate-grades.sh
```

### Use Browser Method Instead

1. Login to your site as admin
2. Press **F12** (open console)
3. Run:
   ```javascript
   fetch('https://acadistra.com/api/v1/recalculate-grades?term=Term%201&year=2026', {
     method: 'POST',
     headers: {'Authorization': 'Bearer ' + localStorage.getItem('access_token')}
   }).then(r => r.json()).then(console.log)
   ```

---

## 📊 Expected Results

After successful deployment:

```
✅ Deployment Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Code deployed successfully
✅ Services restarted
✅ Backend is healthy
✅ Grades recalculated (48 updated)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Deployment complete!
```

---

## 📝 What Changed

### Backend
- ✅ S1-S4 grading: A/B/C → D1/D2/C3/C4/C5/C6/P7/P8/F9
- ✅ Grade recalculation for all levels
- ✅ Suppressed unnecessary logs

### Frontend
- ✅ S1-S4 column: "CA" → "AOI"
- ✅ Excel export updated

### Database
- ✅ All existing grades recalculated with new logic

---

## 🎯 Time Estimate

- **Full deployment**: 2-5 minutes
- **Grade recalculation**: 10-30 seconds (depends on data size)

---

**Need help?** Check `DEPLOYMENT_SCRIPTS_README.md` for detailed troubleshooting.
