# Image URL Configuration Guide

## Overview
The system now uses a centralized utility function (`getImageUrl`) to handle image URLs for both local development and production environments. This ensures that school logos and student photos display correctly regardless of where the system is deployed.

## How It Works

### Utility Function
Location: `/frontend/src/utils/imageUrl.ts`

```typescript
export function getImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  
  // If already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Get API URL from environment or default to localhost
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${API_URL}${normalizedPath}`;
}
```

### Usage in Report Cards
All report card components now use this utility:

```tsx
import { getImageUrl } from '@/utils/imageUrl'

// School logo
<img src={getImageUrl(school.logo_url)} alt="Logo" />

// Student photo
<img src={getImageUrl(student.photo_url)} alt="Student" />
```

## Configuration

### Local Development
File: `/frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Production Deployment
File: `/.env` (root directory)

The production environment is already configured:

```env
NEXT_PUBLIC_API_URL=https://acadistra.com
API_URL=https://api.acadistra.com
FRONTEND_URL=https://acadistra.com
```

**Note:** The `.env` file in the root directory is used for both backend and frontend configuration in production.

## How Images Are Served

### Development
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8080`
- Images: `http://localhost:8080/uploads/...`

### Production
- Frontend: `https://acadistra.com`
- Backend API: `https://api.acadistra.com` (or proxied through main domain)
- Images: `https://acadistra.com/uploads/...` (using NEXT_PUBLIC_API_URL)

## Verification

### Check Image URLs in Browser
1. Open report card in production
2. Right-click on school logo or student photo
3. Select "Inspect" or "Inspect Element"
4. Check the `src` attribute - it should show your production URL

Example:
```html
<!-- Correct (Production) -->
<img src="https://acadistra.com/uploads/logos/school-logo.png" />

<!-- Incorrect (Would not work in production) -->
<img src="http://localhost:8080/uploads/logos/school-logo.png" />
```

## Troubleshooting

### Images Not Displaying in Production

1. **Check Environment Variable**
   ```bash
   # In root directory
   cat .env | grep NEXT_PUBLIC_API_URL
   ```
   Should show: `NEXT_PUBLIC_API_URL=https://acadistra.com`

2. **Verify Backend is Serving Images**
   ```bash
   # Test image URL directly
   curl -I https://acadistra.com/uploads/logos/school-logo.png
   ```

3. **Check Docker Container**
   ```bash
   # Ensure frontend container has the environment variable
   docker exec acadistra_frontend env | grep NEXT_PUBLIC_API_URL
   ```

4. **Rebuild and Restart**
   ```bash
   docker compose -f docker-compose.prod.yml down
   docker compose -f docker-compose.prod.yml up -d --build
   ```

### Images Display Locally But Not in Production

- Verify the `.env` file in root has `NEXT_PUBLIC_API_URL=https://acadistra.com`
- Ensure the backend URL is accessible from the internet
- Check that uploaded images are in the correct directory on the VPS
- Verify Caddy/nginx is properly proxying image requests
- Ensure file permissions allow the backend to serve the images

## Files Modified

### New Files
- `/frontend/src/utils/imageUrl.ts` - Utility function

### Updated Files
- `/frontend/src/components/ReportCard/AdvancedLevelReportCard.tsx`
- `/frontend/src/components/ReportCard/NurseryReportCard.tsx`
- `/frontend/src/components/ReportCard/OrdinaryLevelReportCard.tsx`
- `/frontend/src/components/ReportCard/PrimaryReportCard.tsx`
- `/frontend/src/components/ReportCard/ReportCardTemplate.tsx`

## Benefits

✅ **Works Everywhere**: Automatically adapts to local, staging, and production environments
✅ **Single Configuration**: Change one environment variable to update all image URLs
✅ **No Hardcoding**: No more hardcoded `localhost:8080` in components
✅ **Type Safe**: TypeScript utility with proper null handling
✅ **Flexible**: Supports both relative paths and absolute URLs

## Deployment

The system is already configured for production. When you deploy:

1. **Docker Compose** automatically passes environment variables from `.env` to containers
2. **Frontend** reads `NEXT_PUBLIC_API_URL` at build time
3. **Images** are served from the configured URL

No additional configuration needed - just rebuild and deploy:

```bash
./deploy.sh
```

Or manually:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```
