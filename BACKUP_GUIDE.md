# ACADISTRA BACKUP SYSTEM

## 📦 Setup (One-Time)

### On VPS, run:

```bash
cd /root/acadistra

# Create backup script
cat > backup.sh << 'EOF'
[PASTE BACKUP SCRIPT CONTENT HERE]
EOF

# Create restore script
cat > restore.sh << 'EOF'
[PASTE RESTORE SCRIPT CONTENT HERE]
EOF

# Make executable
chmod +x backup.sh restore.sh

# Test backup
./backup.sh
```

---

## 🔄 Manual Backup

Anytime you want to backup:

```bash
cd /root/acadistra
./backup.sh
```

Backups are saved to: `/root/acadistra/backups/`

---

## ⏰ Automated Daily Backups

### Set up cron job (runs daily at 2 AM):

```bash
# Open crontab
crontab -e

# Add this line:
0 2 * * * /root/acadistra/backup.sh >> /root/acadistra/backups/backup.log 2>&1

# Save and exit
```

### Verify cron job:
```bash
crontab -l
```

---

## 🔙 Restore from Backup

### List available backups:
```bash
cd /root/acadistra
ls -lh backups/
```

### Restore:
```bash
./restore.sh
```

Follow the prompts to select which backup to restore.

---

## 📊 Backup Management

### Check backup size:
```bash
du -sh /root/acadistra/backups/
```

### List all backups:
```bash
ls -lh /root/acadistra/backups/*.sql.gz
```

### Delete old backups manually:
```bash
# Delete backups older than 30 days
find /root/acadistra/backups/ -name "*.sql.gz" -mtime +30 -delete
```

### Keep only last 10 backups:
```bash
cd /root/acadistra/backups
ls -t acadistra_backup_*.sql.gz | tail -n +11 | xargs rm -f
```

---

## 💾 Backup to External Storage (Recommended)

### Option 1: Copy to another server via SCP
```bash
scp /root/acadistra/backups/acadistra_backup_*.sql.gz user@backup-server:/backups/
```

### Option 2: Upload to cloud storage (AWS S3)
```bash
# Install AWS CLI
apt install awscli

# Configure
aws configure

# Upload
aws s3 cp /root/acadistra/backups/ s3://your-bucket/acadistra-backups/ --recursive
```

### Option 3: Sync to Dropbox/Google Drive
```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure
rclone config

# Sync backups
rclone sync /root/acadistra/backups/ dropbox:acadistra-backups/
```

---

## 🚨 Emergency Restore

If system is broken and you need to restore:

```bash
cd /root/acadistra

# Stop services
docker compose -f docker-compose.prod.yml down

# Start only PostgreSQL
docker compose -f docker-compose.prod.yml up -d postgres

# Wait for PostgreSQL
sleep 10

# Restore
./restore.sh

# Start all services
docker compose -f docker-compose.prod.yml up -d
```

---

## ✅ Best Practices

1. **Daily automated backups** - Set up cron job
2. **Keep 30 days of backups** - Automatic cleanup
3. **Test restores monthly** - Verify backups work
4. **Off-site backups** - Copy to cloud storage weekly
5. **Before major changes** - Always backup first

---

## 📋 Quick Commands

```bash
# Manual backup
./backup.sh

# Restore from backup
./restore.sh

# List backups
ls -lh backups/

# Check backup size
du -sh backups/

# View backup log
tail -f backups/backup.log
```

---

## 🔐 Backup Security

### Encrypt backups:
```bash
# Backup and encrypt
./backup.sh
gpg -c /root/acadistra/backups/acadistra_backup_YYYYMMDD_HHMMSS.sql.gz

# Decrypt when needed
gpg -d backup.sql.gz.gpg > backup.sql.gz
```

---

## 📞 Support

If restore fails:
1. Check PostgreSQL is running: `docker ps | grep postgres`
2. Check backup file exists: `ls -lh backups/`
3. Check logs: `docker logs acadistra_postgres`
4. Try safety backup: Located in `backups/before_restore_*.sql.gz`
