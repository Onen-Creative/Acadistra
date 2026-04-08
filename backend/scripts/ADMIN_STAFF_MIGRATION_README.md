# Create Staff Records for Existing School Admins

This migration creates staff records (with employee IDs) for school admins who were created before the staff integration was implemented.

## What it does:
- Finds all school admins in the `users` table
- Checks if they already have a staff record
- Creates a staff record with auto-generated employee ID (e.g., `ABC/STF/2025/001`)
- Links the staff record to the user account via `user_id`

## Production Setup (PostgreSQL in Docker)

Your production environment uses:
- Database: `acadistra`
- User: `acadistra`
- Container: `acadistra_postgres` and `acadistra_backend`

## How to run on live VPS:

### Method 1: Using the provided script (Recommended)
```bash
# SSH into your VPS
ssh user@your-vps-ip

# Navigate to the project directory
cd /path/to/acadistra/backend

# Make script executable
chmod +x scripts/run_admin_staff_migration.sh

# Run the migration
./scripts/run_admin_staff_migration.sh
```

### Method 2: Manual Docker execution
```bash
# SSH into your VPS
ssh user@your-vps-ip

# Navigate to the project directory
cd /path/to/acadistra

# Copy SQL file to backend container
docker cp backend/scripts/create_staff_for_admins.sql acadistra_backend:/tmp/

# Execute the SQL script
docker exec -i acadistra_backend psql -h postgres -U acadistra -d acadistra -f /tmp/create_staff_for_admins.sql
```

### Method 3: Direct PostgreSQL container execution
```bash
# SSH into your VPS
ssh user@your-vps-ip

# Copy SQL file to postgres container
docker cp backend/scripts/create_staff_for_admins.sql acadistra_postgres:/tmp/

# Execute inside postgres container
docker exec -i acadistra_postgres psql -U acadistra -d acadistra -f /tmp/create_staff_for_admins.sql
```

## What to expect:
The script will output:
```
NOTICE: Created staff record for admin@school.com - Employee ID: ABC/STF/2025/001
NOTICE: Staff record already exists for: existing@school.com
...
NOTICE: === Summary ===
NOTICE: Staff records created: 5
NOTICE: Skipped (already exists or no school): 2
```

## Verification:
After running, verify by:
1. Logging into the system as a school admin
2. Going to Staff Management
3. School admins should now appear in the staff list with employee IDs

## Safe to run multiple times:
The script checks if staff records already exist, so it's safe to run multiple times without creating duplicates.

## Troubleshooting:

If you get permission errors:
```bash
# Enter the backend container
docker exec -it acadistra_backend sh

# Run the SQL directly
psql -h postgres -U acadistra -d acadistra -f /tmp/create_staff_for_admins.sql
```

If you need the PostgreSQL password:
```bash
# Check your .env.production file
cat .env.production | grep POSTGRES_PASSWORD
```
