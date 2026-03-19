# COMPLETE BACKUP SYSTEM SETUP

## 🎯 Overview

This backup system provides:
- ✅ **Automatic daily backups** on VPS (database + uploaded files)
- ✅ **Local storage** on VPS (keeps 30 days)
- ✅ **Optional remote sync** to another server
- ✅ **Easy download** to local machine anytime
- ✅ **Compressed backups** to save space

---

## 📦 Setup on VPS

### Step 1: Deploy Backup Scripts

```bash
cd /root/acadistra

# Pull latest code (includes backup scripts)
git pull origin main

# Make scripts executable
chmod +x backup-enhanced.sh restore.sh

# Test backup
./backup-enhanced.sh
```

### Step 2: Set Up Automated Daily Backups

```bash
# Open crontab
crontab -e

# Add this line (runs daily at 2 AM):
0 2 * * * /root/acadistra/backup-enhanced.sh >> /root/acadistra/backups/backup.log 2>&1

# Save and exit (Ctrl+X, Y, Enter)
```

### Step 3: Verify Cron Job

```bash
# List cron jobs
crontab -l

# Check if backup ran (next day)
cat /root/acadistra/backups/backup.log
```

---

## 💾 What Gets Backed Up

1. **Database** - All tables and data
   - File: `acadistra_backup_YYYYMMDD_HHMMSS.sql.gz`
   
2. **Uploaded Files** - Logos, student photos, documents
   - File: `uploads_backup_YYYYMMDD_HHMMSS.tar.gz`

---

## 📥 Download Backups to Local Machine

### Option 1: Using Download Script (Recommended)

On your **local machine**:

```bash
cd "/home/od/workspace/programming/school management system"

# Make download script executable
chmod +x download-backups.sh

# Run it
./download-backups.sh
```

Follow the prompts to:
- Download latest backup only
- Download all backups
- Download backups from specific date

### Option 2: Manual Download via SCP

```bash
# Download latest database backup
scp root@185.208.207.16:/root/acadistra/backups/acadistra_backup_*.sql.gz ./

# Download latest uploads backup
scp root@185.208.207.16:/root/acadistra/backups/uploads_backup_*.tar.gz ./

# Download all backups
scp root@185.208.207.16:/root/acadistra/backups/*.gz ./backups-from-vps/
```

### Option 3: Using rsync (Faster for Multiple Files)

```bash
# Sync all backups
rsync -avz --progress root@185.208.207.16:/root/acadistra/backups/ ./backups-from-vps/
```

---

## 🔄 Restore Backup Locally

After downloading a backup to your local machine:

```bash
# Extract backup
gunzip acadistra_backup_20260318_020000.sql.gz

# Restore to local PostgreSQL
psql -U postgres -d acadistra < acadistra_backup_20260318_020000.sql

# Or create new database first
createdb -U postgres acadistra
psql -U postgres -d acadistra < acadistra_backup_20260318_020000.sql
```

---

## 🌐 Optional: Remote Backup Server

For extra safety, sync backups to another server automatically.

### Setup SSH Key Authentication

On VPS:
```bash
# Generate SSH key (if not exists)
ssh-keygen -t rsa -b 4096

# Copy to backup server
ssh-copy-id user@backup-server.com
```

### Configure Remote Backup

On VPS, create config file:
```bash
cat > /root/acadistra/backup-config.sh << 'EOF'
export REMOTE_BACKUP_ENABLED=true
export REMOTE_HOST="backup-server.com"
export REMOTE_USER="backupuser"
export REMOTE_PATH="/backups/acadistra"
EOF
```

Update crontab:
```bash
crontab -e

# Change to:
0 2 * * * source /root/acadistra/backup-config.sh && /root/acadistra/backup-enhanced.sh >> /root/acadistra/backups/backup.log 2>&1
```

---

## 📊 Backup Management

### Check Backup Status

```bash
# List all backups
ls -lh /root/acadistra/backups/

# Check total size
du -sh /root/acadistra/backups/

# Count backups
ls -1 /root/acadistra/backups/*.sql.gz | wc -l

# View backup log
tail -f /root/acadistra/backups/backup.log
```

### Manual Backup Anytime

```bash
cd /root/acadistra
./backup-enhanced.sh
```

### Delete Old Backups Manually

```bash
# Delete backups older than 60 days
find /root/acadistra/backups/ -name "*.gz" -mtime +60 -delete

# Keep only last 10 backups
cd /root/acadistra/backups
ls -t acadistra_backup_*.sql.gz | tail -n +11 | xargs rm -f
```

---

## 🔐 Backup Security

### Encrypt Backups

```bash
# Encrypt a backup
gpg -c /root/acadistra/backups/acadistra_backup_20260318_020000.sql.gz

# Decrypt when needed
gpg -d acadistra_backup_20260318_020000.sql.gz.gpg > acadistra_backup_20260318_020000.sql.gz
```

### Secure Backup Transfer

Already using SSH/SCP which is encrypted by default.

---

## 📅 Backup Schedule

| Time | Action | Retention |
|------|--------|-----------|
| Daily 2 AM | Full backup (database + uploads) | 30 days on VPS |
| On-demand | Manual backup anytime | Until manually deleted |
| Weekly | Download to local machine (recommended) | Keep indefinitely |

---

## 🚨 Disaster Recovery

### Scenario 1: VPS Crashes

1. Download latest backup from local machine (if you've been downloading regularly)
2. Or restore from remote backup server (if configured)
3. Deploy to new VPS
4. Restore backup

### Scenario 2: Accidental Data Deletion

1. Stop making changes immediately
2. Run restore script on VPS: `./restore.sh`
3. Select backup from before deletion
4. Verify data is restored

### Scenario 3: Need to Test Locally

1. Download backup: `./download-backups.sh`
2. Restore to local database
3. Test changes locally
4. Deploy to VPS when ready

---

## ✅ Best Practices

1. **Test restores monthly** - Verify backups actually work
2. **Download weekly** - Keep local copies on your machine
3. **Monitor backup logs** - Check for failures
4. **Keep 30 days on VPS** - Automatic cleanup
5. **Keep 90+ days locally** - Long-term retention
6. **Use remote backup** - Extra safety layer
7. **Backup before major changes** - Always!

---

## 📋 Quick Commands

```bash
# VPS - Manual backup
cd /root/acadistra && ./backup-enhanced.sh

# VPS - Restore backup
cd /root/acadistra && ./restore.sh

# VPS - List backups
ls -lh /root/acadistra/backups/

# VPS - Check backup log
tail -f /root/acadistra/backups/backup.log

# Local - Download backups
./download-backups.sh

# Local - Download latest only
scp root@185.208.207.16:/root/acadistra/backups/acadistra_backup_*.sql.gz ./
```

---

## 🎯 Summary

**Automated:**
- ✅ Daily backups at 2 AM
- ✅ Keeps 30 days on VPS
- ✅ Compresses to save space
- ✅ Logs all activity

**Manual:**
- ✅ Download to local machine anytime
- ✅ Restore with one command
- ✅ Sync to remote server (optional)

**You're protected!** 🛡️
