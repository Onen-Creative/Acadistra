# Subsidiary Subject Grade Recalculation

## Problem
ICT, Subsidiary Mathematics, and General Paper at Advanced Level (S5/S6) were being graded using the principal subject scale (D1, D2, C3, C4, C5, C6, P7, P8, F9) instead of the subsidiary scale (O for Pass, F for Fail).

## Solution
Updated the grading logic to detect subsidiary subjects and apply the correct grading:
- **O (Ordinary Pass)**: Marks ≥ 50%
- **F (Fail)**: Marks < 50%

## Subsidiary Subjects Detected
1. ICT / Information Communication Technology
2. General Paper
3. Subsidiary Mathematics
4. Any subject starting with "Subsidiary"

## How to Apply the Fix

### Option 1: Run on Live Server (Recommended)

1. **SSH into your production server**
   ```bash
   ssh user@your-server.com
   ```

2. **Navigate to the project directory**
   ```bash
   cd /path/to/acadistra
   ```

3. **Pull the latest code changes**
   ```bash
   git pull origin main
   ```

4. **Rebuild and restart the backend**
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build backend
   ```

5. **Run the recalculation script**
   ```bash
   chmod +x fix_subsidiary_grades_docker.sh
   ./fix_subsidiary_grades_docker.sh
   ```

6. **Follow the prompts:**
   - Enter Term (e.g., "Term 1")
   - Enter Year (e.g., "2026")
   - Enter admin email (default: admin@acadistra.com)
   - Enter admin password (the one you set during deployment)

### Option 2: Manual Docker Command

If you prefer to run commands manually:

```bash
# 1. Login and get token
LOGIN_RESPONSE=$(docker exec acadistra_backend curl -s -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acadistra.com","password":"YOUR_PASSWORD"}')

# 2. Extract token (you'll see it in the response)
echo $LOGIN_RESPONSE

# 3. Recalculate S6 grades (replace YOUR_TOKEN with actual token)
docker exec acadistra_backend curl -X POST \
  "http://localhost:8080/api/results/recalculate?level=S6&term=Term%201&year=2026" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# 4. Recalculate S5 grades
docker exec acadistra_backend curl -X POST \
  "http://localhost:8080/api/results/recalculate?level=S5&term=Term%201&year=2026" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## Expected Results

After running the recalculation:

**Before:**
- 93.0 → D1
- 60.0 → C6
- 53.0 → P7
- 47.0 → P8
- 10.0 → F9

**After:**
- 93.0 → O (Pass)
- 60.0 → O (Pass)
- 53.0 → O (Pass)
- 47.0 → F (Fail)
- 10.0 → F (Fail)

## Verification

After recalculation, check the response:
```json
{
  "message": "Grade recalculation completed",
  "updated": 50,
  "errors": 0,
  "skipped": 100,
  "total": 150
}
```

- **updated**: Number of grades that were changed
- **errors**: Number of errors encountered
- **skipped**: Number of records skipped (already correct or not subsidiary)
- **total**: Total records processed

## Troubleshooting

### "Login failed"
- Check your admin credentials
- Default admin email: `admin@acadistra.com`
- Password is the one you set during deployment
- Ensure you're using an admin account (not teacher/parent)

### "Backend container (acadistra_backend) is not running"
- Start the containers: `docker compose -f docker-compose.prod.yml up -d`
- Check container status: `docker ps`
- View logs: `docker logs acadistra_backend`

### "Docker not found"
- Install Docker on your server
- Or use Option 2 (Manual Docker Command) if Docker is installed but not in PATH

### "Permission denied"
- Make scripts executable: `chmod +x fix_subsidiary_grades_docker.sh`
- Run with sudo if needed: `sudo ./fix_subsidiary_grades_docker.sh`

### No grades updated (updated: 0)
- Check if the term and year are correct (case-sensitive: "Term 1" not "term 1")
- Verify that subsidiary subjects exist in the database
- Check if grades were already in O/F format
- View backend logs: `docker logs acadistra_backend --tail 100`

### "curl: command not found" inside container
- The backend container should have curl installed
- If not, rebuild: `docker compose -f docker-compose.prod.yml up -d --build backend`

## Support

If you encounter issues:
1. Check the backend logs: `docker logs acadistra_backend`
2. Verify the database has the correct subject names
3. Contact support with the error message
