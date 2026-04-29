# System Settings Feature

Complete implementation of system-wide configuration management for Acadistra.

## Overview

The System Settings feature allows system administrators to configure global settings that affect the entire application, including general information, security policies, email configuration, and backup settings.

## Features Implemented

### 1. Backend Components

#### Database
- **Migration**: `20260520000000_create_system_settings_table.sql`
  - Creates `system_settings` table with key-value storage
  - Includes default values for all settings
  - Supports timestamps for tracking changes

#### Models
- **SystemSetting** (`backend/internal/models/system_settings.go`)
  - Key-value pair storage
  - Automatic timestamp management
  - GORM integration

#### API Endpoints
- `GET /api/v1/settings` - Retrieve all system settings
- `PUT /api/v1/settings` - Update system settings (System Admin only)

#### Handler
- **SettingsHandler** (`backend/internal/handlers/settings_handler.go`)
  - GetSettings: Fetches and formats settings
  - UpdateSettings: Validates and saves settings
  - Proper error handling and validation

### 2. Frontend Components

#### Service Layer
- **settingsService** (`frontend/src/services/settings.ts`)
  - Type-safe API calls
  - Centralized settings management
  - Error handling

#### UI Page
- **SystemSettingsPage** (`frontend/src/app/system/settings/page.tsx`)
  - Beautiful card-based layout
  - Real-time form updates
  - Loading and saving states
  - Toast notifications for feedback

## Settings Categories

### 🌐 General Settings
- **System Name**: Application display name (default: "Acadistra")
- **Support Email**: Contact email for support (default: "support@acadistra.com")
- **Default Country**: Default country for schools (default: "Uganda")

### 🔒 Security Settings
- **Two-Factor Authentication**: Enable/disable 2FA requirement for admins
- **Session Timeout**: Auto-logout duration (30 min, 1 hour, 2 hours)

### 📧 Email Configuration
- **SMTP Host**: Mail server hostname (e.g., smtp.gmail.com)
- **SMTP Port**: Mail server port (default: 587)
- **SMTP Username**: Email account username

### 💾 Backup & Maintenance
- **Auto Backup**: Enable/disable automatic daily backups
- **Backup Time**: Scheduled backup time (default: 02:00 AM)
- **Manual Backup**: Run backup on-demand

## Usage

### Accessing Settings
1. Login as System Administrator
2. Navigate to **System** → **Settings**
3. Modify desired settings
4. Click **Save Settings**

### API Usage

#### Get Settings
```bash
curl -X GET https://acadistra.com/api/v1/settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Update Settings
```bash
curl -X PUT https://acadistra.com/api/v1/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "system_name": "My School System",
    "support_email": "support@myschool.com",
    "default_country": "Uganda",
    "two_factor_enabled": true,
    "session_timeout": 60,
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_username": "admin@myschool.com",
    "auto_backup": true,
    "backup_time": "03:00"
  }'
```

## Database Schema

```sql
CREATE TABLE system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security

- **Access Control**: Only System Admins can modify settings
- **Validation**: All inputs are validated before saving
- **Audit Trail**: Changes are tracked with timestamps
- **Sensitive Data**: Passwords are never stored in settings (use environment variables)

## Environment Variables

Settings complement but don't replace environment variables. Sensitive data should remain in `.env`:

```bash
# Backend .env
SMTP_PASSWORD=your_smtp_password  # NOT stored in settings
JWT_SECRET=your_jwt_secret        # NOT stored in settings
DB_PASSWORD=your_db_password      # NOT stored in settings
```

## Migration Guide

### Running the Migration

```bash
# Development
cd backend
go run cmd/api/main.go migrate

# Production
docker exec acadistra_backend ./main migrate

# Or via API (System Admin only)
curl -X POST https://acadistra.com/api/v1/migrate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Seeding Default Settings

Default settings are automatically created by the migration. To reset to defaults:

```sql
TRUNCATE TABLE system_settings;
-- Then run migration again
```

## Testing

### Manual Testing
1. Login as system admin
2. Navigate to Settings page
3. Modify each setting category
4. Save and verify changes persist
5. Refresh page and verify settings load correctly

### API Testing
```bash
# Test GET
curl -X GET http://localhost:8080/api/v1/settings \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test PUT
curl -X PUT http://localhost:8080/api/v1/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"system_name": "Test System"}'
```

## Future Enhancements

- [ ] Settings versioning and rollback
- [ ] Settings export/import
- [ ] Per-school settings override
- [ ] Settings validation rules
- [ ] Settings change notifications
- [ ] Backup automation implementation
- [ ] Settings search and filtering
- [ ] Settings categories expansion

## Troubleshooting

### Settings Not Saving
- Check user has System Admin role
- Verify JWT token is valid
- Check backend logs for errors
- Ensure database connection is active

### Settings Not Loading
- Check migration has run successfully
- Verify default values exist in database
- Check browser console for errors
- Verify API endpoint is accessible

### Database Errors
```bash
# Check if table exists
psql -d school_system_db -c "\dt system_settings"

# View current settings
psql -d school_system_db -c "SELECT * FROM system_settings"

# Reset settings
psql -d school_system_db -c "TRUNCATE TABLE system_settings"
```

## Files Modified/Created

### Backend
- ✅ `backend/migrations/20260520000000_create_system_settings_table.sql` (NEW)
- ✅ `backend/internal/models/system_settings.go` (NEW)
- ✅ `backend/internal/handlers/settings_handler.go` (UPDATED)
- ✅ `backend/internal/database/database.go` (UPDATED)
- ✅ `backend/cmd/api/main.go` (Already has routes)

### Frontend
- ✅ `frontend/src/services/settings.ts` (NEW)
- ✅ `frontend/src/app/system/settings/page.tsx` (UPDATED)

## Support

For issues or questions:
- 📧 Email: support@acadistra.com
- 🔒 Security: security@acadistra.com
- 📖 Documentation: See README.md

---

**Built for Ugandan Schools** 🇺🇬 | ECCE → S6 | UNEB & NCDC Compliant
