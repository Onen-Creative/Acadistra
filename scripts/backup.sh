#!/bin/bash

# Acadistra Automated Backup Script
# Run daily at 2 AM via cron: 0 2 * * * /home/acadistra/scripts/backup.sh

set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/acadistra/backups/$DATE"
RETENTION_DAYS=30

echo "Starting backup at $(date)"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup single database (contains all schools)
echo "Backing up database..."
docker exec acadistra_postgres pg_dump -U acadistra -Fc acadistra > $BACKUP_DIR/acadistra.dump

# Backup MinIO data
echo "Backing up MinIO storage..."
docker exec acadistra_minio tar czf /tmp/minio_backup.tar.gz /data
docker cp acadistra_minio:/tmp/minio_backup.tar.gz $BACKUP_DIR/minio.tar.gz
docker exec acadistra_minio rm /tmp/minio_backup.tar.gz

# Backup environment and configs
echo "Backing up configs..."
cp /home/acadistra/acadistra/.env $BACKUP_DIR/env.backup
cp /home/acadistra/acadistra/Caddyfile $BACKUP_DIR/Caddyfile.backup

# Create backup manifest
cat > $BACKUP_DIR/manifest.txt << EOF
Backup Date: $(date)
Databases: acadistra_school1 to acadistra_school5
Storage: MinIO data
Configs: .env, Caddyfile
EOF

# Compress entire backup
echo "Compressing backup..."
cd /home/acadistra/backups
tar czf ${DATE}.tar.gz $DATE
rm -rf $DATE

# Remove old backups
echo "Cleaning old backups (older than $RETENTION_DAYS days)..."
find /home/acadistra/backups -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

# Calculate backup size
BACKUP_SIZE=$(du -h /home/acadistra/backups/${DATE}.tar.gz | cut -f1)
echo "Backup completed: ${DATE}.tar.gz ($BACKUP_SIZE)"

# Optional: Upload to remote storage (uncomment if using)
# aws s3 cp /home/acadistra/backups/${DATE}.tar.gz s3://your-bucket/backups/

echo "Backup finished at $(date)"
