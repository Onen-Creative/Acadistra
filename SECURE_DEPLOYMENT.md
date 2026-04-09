# Secure Deployment Instructions

## ⚠️ IMPORTANT: Credentials Security

The deployment scripts **DO NOT** contain default credentials. You must provide your own credentials when running the scripts.

---

## Setup Credentials

### Option 1: Environment Variables (Recommended)

```bash
# Export credentials in your shell session
export ADMIN_EMAIL="your-admin@email.com"
export ADMIN_PASSWORD="YourSecurePassword"
export API_URL="https://acadistra.com"

# Run deployment
./deploy-grading-fix.sh
```

### Option 2: Inline with Command

```bash
# Provide credentials directly
ADMIN_EMAIL="your-admin@email.com" \
ADMIN_PASSWORD="YourPassword" \
./deploy-grading-fix.sh
```

### Option 3: Use .env File (Local Only)

```bash
# Copy example file
cp .env.deployment.example .env.deployment

# Edit with your credentials
nano .env.deployment

# Source it
source .env.deployment

# Run deployment
./deploy-grading-fix.sh
```

**IMPORTANT**: Never commit `.env.deployment` to Git!

---

## Finding Your Admin Credentials

If you don't know your admin credentials:

```bash
# Connect to database
docker exec -it acadistra_postgres psql -U acadistra -d acadistra

# List admin users
SELECT email, role FROM users WHERE role IN ('system_admin', 'school_admin');

# Exit
\q
```

Then use the email you find with your actual password.

---

## Alternative: Browser Method (No Credentials Needed)

If you don't want to use scripts with credentials:

1. **Deploy code manually**:
   ```bash
   git pull origin main
   docker compose -f docker-compose.prod.yml down
   docker compose -f docker-compose.prod.yml up -d --build
   ```

2. **Recalculate via browser**:
   - Login to your site as admin
   - Press F12 (open console)
   - Run:
     ```javascript
     fetch('https://acadistra.com/api/v1/recalculate-grades?term=Term%201&year=2026', {
       method: 'POST',
       headers: {'Authorization': 'Bearer ' + localStorage.getItem('access_token')}
     }).then(r => r.json()).then(console.log)
     ```

This method uses your logged-in session, so no password needed!

---

## Security Best Practices

✅ **DO:**
- Use environment variables for credentials
- Keep `.env.deployment` in `.gitignore`
- Use strong, unique passwords
- Rotate credentials regularly

❌ **DON'T:**
- Commit credentials to Git
- Share credentials in plain text
- Use default passwords in production
- Store credentials in scripts

---

## Need Help?

See `DEPLOYMENT_SCRIPTS_README.md` for full documentation.
