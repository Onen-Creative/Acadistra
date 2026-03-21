# Complete Deployment Guide - Step by Step

## Prerequisites
- A computer with internet
- Credit/debit card for server payment
- Domain name (optional but recommended)

---

## STEP 1: Buy a Server (5 minutes)

### 1.1 Go to Hetzner Cloud
- Visit: https://www.hetzner.com/cloud
- Click "Sign Up" (top right)

### 1.2 Create Account
- Enter email, password
- Verify email
- Add payment method (credit card or PayPal)

### 1.3 Create Project
- Click "New Project"
- Name: "Acadistra"

### 1.4 Create Server
- Click "Add Server"
- **Location:** Falkenstein, Germany (or Nuremberg)
- **Image:** Ubuntu 22.04
- **Type:** Shared vCPU → CPX31 (€8.21/month)
- **Networking:** Leave defaults
- **SSH Key:** Skip for now (we'll use password)
- **Name:** acadistra-server
- Click "Create & Buy Now"

### 1.5 Get Server Details
- Wait 1 minute for server to start
- Note down:
  - **IP Address:** (e.g., 95.217.123.45)
  - **Root Password:** (shown once, copy it!)

**Cost: €8.21/month**

---

## STEP 2: Buy a Domain (Optional, 10 minutes)

### Option A: Use Free Subdomain (Skip to Step 3)
You can use IP address: `http://95.217.123.45:3000`

### Option B: Buy Domain (Recommended)

**2.1 Go to Namecheap**
- Visit: https://www.namecheap.com
- Search for domain: `yourschool.com`
- Buy domain (~$10/year)

**2.2 Configure DNS**
- Go to Domain Dashboard
- Click "Manage"
- Click "Advanced DNS"
- Add these records:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_SERVER_IP | 300 |
| A | * | YOUR_SERVER_IP | 300 |
| A | api | YOUR_SERVER_IP | 300 |

Replace `YOUR_SERVER_IP` with your Hetzner IP (e.g., 95.217.123.45)

**Wait 10-30 minutes for DNS to propagate**

---

## STEP 3: Connect to Your Server (2 minutes)

### 3.1 Open Terminal

**On Windows:**
- Press `Win + R`
- Type: `cmd`
- Press Enter

**On Mac/Linux:**
- Press `Cmd + Space` (Mac) or `Ctrl + Alt + T` (Linux)
- Type: `terminal`
- Press Enter

### 3.2 Connect via SSH
```bash
ssh root@YOUR_SERVER_IP
```
Replace `YOUR_SERVER_IP` with your actual IP (e.g., `ssh root@95.217.123.45`)

**When prompted:**
- Type: `yes` (to accept fingerprint)
- Paste the root password you copied earlier
- Press Enter

**You're now connected to your server!** ✅

---

## STEP 4: Upload Your Code (5 minutes)

### 4.1 Install Git on Server
```bash
apt update
apt install -y git
```

### 4.2 Clone Your Repository

**If code is on GitHub:**
```bash
cd /home
git clone https://github.com/yourusername/acadistra.git
cd acadistra
```

**If code is on your computer:**

**On your computer (new terminal):**
```bash
# Compress your code
cd /path/to/your/acadistra/folder
tar czf acadistra.tar.gz .

# Upload to server
scp acadistra.tar.gz root@YOUR_SERVER_IP:/home/

# Back to server terminal
ssh root@YOUR_SERVER_IP
cd /home
tar xzf acadistra.tar.gz
mv acadistra-folder acadistra  # Rename if needed
cd acadistra
```

---

## STEP 5: Configure Domain (2 minutes)

### 5.1 Edit Caddyfile
```bash
nano Caddyfile
```

**Replace with your domain:**
```
# If you have a domain:
yourschool.com, *.yourschool.com, api.yourschool.com {
    # ... rest stays same
}

# If using IP only:
:80, :3000 {
    # ... rest stays same
}
```

Press `Ctrl + X`, then `Y`, then `Enter` to save.

### 5.2 Edit Environment File
```bash
cp .env.production.example .env.production
nano .env.production
```

**Update these lines:**
```bash
# Database
POSTGRES_PASSWORD=CHANGE_THIS_TO_STRONG_PASSWORD

# JWT Secret (random string)
JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING_32_CHARS

# Domain (if you have one)
DOMAIN=yourschool.com

# Or use IP
DOMAIN=95.217.123.45
```

Press `Ctrl + X`, then `Y`, then `Enter` to save.

---

## STEP 6: Deploy System (10 minutes)

### 6.1 Make Deploy Script Executable
```bash
chmod +x deploy.sh
```

### 6.2 Run Deployment
```bash
./deploy.sh
```

**This will:**
- Install Docker
- Build all containers
- Start database
- Run migrations
- Create admin user
- Seed subjects

**Wait 5-10 minutes for everything to install and start.**

---

## STEP 7: Access Your System (1 minute)

### 7.1 Open Browser

**If you have a domain:**
- Go to: `https://yourschool.com`

**If using IP only:**
- Go to: `http://YOUR_SERVER_IP:3000`
- Example: `http://95.217.123.45:3000`

### 7.2 Login

**Default Admin Credentials:**
- Email: `sysadmin@acadistra.com`
- Password: `Admin@123`

**⚠️ IMPORTANT: Change password immediately after first login!**

---

## STEP 8: Setup Backups (5 minutes)

### 8.1 Schedule Automatic Backups
```bash
crontab -e
```

**Choose editor:** Press `1` (for nano)

**Add this line at the bottom:**
```
0 2 * * * /home/acadistra/scripts/backup.sh >> /var/log/acadistra-backup.log 2>&1
```

Press `Ctrl + X`, then `Y`, then `Enter` to save.

### 8.2 Test Backup
```bash
/home/acadistra/scripts/backup.sh
```

**Check backup was created:**
```bash
ls -lh /home/acadistra/backups/
```

You should see a `.tar.gz` file.

---

## STEP 9: Download Backups to Your Computer (5 minutes)

### 9.1 Setup SSH Key (On Your Computer)

**Open new terminal on your computer:**
```bash
# Generate SSH key
ssh-keygen -t rsa

# Press Enter 3 times (accept defaults)

# Copy key to server
ssh-copy-id root@YOUR_SERVER_IP
```

### 9.2 Create Backup Folder
```bash
mkdir -p ~/acadistra-backups
```

### 9.3 Download Backups
```bash
# Download all backups
scp root@YOUR_SERVER_IP:/home/acadistra/backups/*.tar.gz ~/acadistra-backups/

# Check downloaded backups
ls -lh ~/acadistra-backups/
```

**Run this command weekly to download new backups.**

---

## STEP 10: Create Your First School (5 minutes)

### 10.1 Login as Admin
- Go to your website
- Login with: `sysadmin@acadistra.com` / `Admin@123`

### 10.2 Create School
- Click "Schools" in sidebar
- Click "Add School"
- Fill in:
  - Name: Your School Name
  - Code: SCHOOL1
  - Subdomain: school1 (if using domain)
  - Address, Phone, Email
- Click "Save"

### 10.3 Create School Admin
- Click "Staff" in sidebar
- Click "Add Staff"
- Fill in details
- Role: School Admin
- School: Select your school
- Click "Save"

### 10.4 Test School Admin Login
- Logout
- Login with school admin credentials
- You should see school dashboard

---

## STEP 11: Configure Firewall (Optional, 2 minutes)

### 11.1 Setup Basic Firewall
```bash
# Allow SSH
ufw allow 22

# Allow HTTP/HTTPS
ufw allow 80
ufw allow 443

# Allow app port (if not using domain)
ufw allow 3000

# Enable firewall
ufw enable
```

Type `y` and press Enter when prompted.

---

## STEP 12: Monitor System (2 minutes)

### 12.1 Check All Services Running
```bash
docker ps
```

You should see 6 containers running:
- acadistra_postgres
- acadistra_redis
- acadistra_minio
- acadistra_backend
- acadistra_frontend
- acadistra_caddy

### 12.2 View Logs
```bash
# View all logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service
docker logs acadistra_backend
```

Press `Ctrl + C` to exit logs.

---

## ✅ DEPLOYMENT COMPLETE!

### What You Have Now:

✅ Server running in Germany (€8.21/month)
✅ Database with all schools' data
✅ Website accessible via domain or IP
✅ Automatic backups every night at 2 AM
✅ SSL certificate (if using domain)
✅ Admin account created
✅ Ready to add schools and users

---

## 📋 Quick Reference

### Access System
- **Website:** `https://yourschool.com` or `http://YOUR_IP:3000`
- **Admin:** `sysadmin@acadistra.com` / `Admin@123`

### Server Commands
```bash
# Connect to server
ssh root@YOUR_SERVER_IP

# View running services
docker ps

# Restart all services
cd /home/acadistra
docker compose -f docker-compose.prod.yml restart

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop system
docker compose -f docker-compose.prod.yml down

# Start system
docker compose -f docker-compose.prod.yml up -d
```

### Backup Commands
```bash
# Manual backup on server
/home/acadistra/scripts/backup.sh

# Download backups to your computer
scp root@YOUR_SERVER_IP:/home/acadistra/backups/*.tar.gz ~/acadistra-backups/

# List server backups
ssh root@YOUR_SERVER_IP "ls -lh /home/acadistra/backups/"
```

---

## 🆘 Troubleshooting

### Website Not Loading
```bash
# Check if services are running
docker ps

# Restart services
cd /home/acadistra
docker compose -f docker-compose.prod.yml restart

# Check logs for errors
docker logs acadistra_backend
docker logs acadistra_frontend
```

### Can't Login
```bash
# Reset admin password
docker exec -it acadistra_backend ./main seed-admin
```

### Database Issues
```bash
# Check database is running
docker ps | grep postgres

# View database logs
docker logs acadistra_postgres

# Connect to database
docker exec -it acadistra_postgres psql -U acadistra
```

---

## 💰 Total Cost Summary

| Item | Cost |
|------|------|
| Hetzner Server | €8.21/month |
| Domain (optional) | $10/year (~€0.83/month) |
| Backups | €0 (pull method) |
| SSL Certificate | €0 (automatic) |
| **TOTAL** | **€8.21-9/month** |

**For 10 schools: €0.82-0.90 per school/month** 🎯

---

## 🎉 Congratulations!

Your school management system is now live and running!

**Next Steps:**
1. Change admin password
2. Create schools
3. Add staff and students
4. Start using the system
5. Download backups weekly

**Need help?** Check the other documentation files:
- `README.md` - System overview
- `QUICKSTART.md` - Quick reference
- `BACKUP.md` - Backup guide
- `TROUBLESHOOTING.md` - Common issues
