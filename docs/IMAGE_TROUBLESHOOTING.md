# Image Display Troubleshooting Guide

## Overview
This guide helps troubleshoot image display issues in both local development and production environments.

## Architecture

### Local Development
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8080
- **Images served from**: Backend directly at `http://localhost:8080/logos/*` and `http://localhost:8080/photos/*`

### Production
- **Frontend**: https://acadistra.com
- **Backend**: Internal container communication
- **Images served from**: Main domain via Caddy proxy at `https://acadistra.com/logos/*` and `https://acadistra.com/photos/*`

## Common Issues & Solutions

### 1. Images not displaying in development

**Symptoms:**
- Broken image icons
- 404 errors for image URLs
- Console errors about CORS

**Solutions:**
```bash
# Check if backend is running
curl http://localhost:8080/health

# Check if image directories exist
ls -la backend/public/logos/
ls -la backend/public/photos/

# Create directories if missing
mkdir -p backend/public/logos
mkdir -p backend/public/photos/thumbs

# Check CORS settings in backend
# Ensure main.go has proper CORS headers
```

### 2. Images not displaying in production

**Symptoms:**
- Images work locally but not in production
- HTTPS mixed content warnings
- 502/503 errors for image requests

**Solutions:**
```bash
# Check if containers are running
docker compose -f docker-compose.prod.yml ps

# Check Caddy configuration
docker compose -f docker-compose.prod.yml logs caddy

# Check backend logs
docker compose -f docker-compose.prod.yml logs backend

# Verify image directories in backend container
docker exec acadistra_backend ls -la public/
docker exec acadistra_backend ls -la public/logos/
docker exec acadistra_backend ls -la public/photos/

# Create directories if missing
docker exec acadistra_backend mkdir -p public/logos
docker exec acadistra_backend mkdir -p public/photos/thumbs
```

### 3. Upload functionality not working

**Symptoms:**
- Upload button doesn't work
- File selection works but upload fails
- Permission denied errors

**Solutions:**
```bash
# Check upload endpoint
curl -X POST http://localhost:8080/api/v1/upload/logo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "logo=@test-image.png"

# Check directory permissions
chmod 755 backend/public/
chmod 755 backend/public/logos/
chmod 755 backend/public/photos/

# In production container:
docker exec acadistra_backend chmod 755 public/
docker exec acadistra_backend chmod 755 public/logos/
docker exec acadistra_backend chmod 755 public/photos/
```

### 4. Environment variable issues

**Check environment variables:**
```bash
# Local development
echo $NEXT_PUBLIC_API_URL
echo $NEXT_PUBLIC_APP_URL

# Production (in container)
docker exec acadistra_frontend env | grep NEXT_PUBLIC
docker exec acadistra_backend env | grep API
```

**Expected values:**
- **Local**: `NEXT_PUBLIC_API_URL=http://localhost:8080`
- **Production**: `NEXT_PUBLIC_API_URL=https://acadistra.com`

## Testing Image URLs

### Manual URL Testing
```bash
# Test image serving directly
curl -I http://localhost:8080/logos/test.png        # Local
curl -I https://acadistra.com/logos/test.png        # Production

# Expected response: 200 OK or 404 Not Found (not 502/503)
```

### Browser Console Testing
```javascript
// Test image URL generation
console.log(getImageUrl('/logos/test.png'))

// Expected output:
// Local: "http://localhost:8080/logos/test.png"
// Production: "https://acadistra.com/logos/test.png"
```

## File Structure

### Backend Directory Structure
```
backend/
├── public/
│   ├── logos/
│   │   ├── .gitkeep
│   │   └── [uploaded-logos]
│   └── photos/
│       ├── .gitkeep
│       ├── [uploaded-photos]
│       └── thumbs/
│           ├── .gitkeep
│           └── [thumbnails]
```

### Frontend Components
```
frontend/src/
├── components/ui/
│   ├── ImageWithFallback.tsx    # Robust image component
│   └── ImageUpload.tsx          # Upload component
├── hooks/
│   └── useImageUpload.ts        # Upload hook
└── utils/
    └── imageUrl.ts              # URL generation utility
```

## Setup Commands

### Initial Setup
```bash
# Run image setup script
./scripts/setup-images.sh

# Or manually create directories
mkdir -p backend/public/logos
mkdir -p backend/public/photos/thumbs
chmod 755 backend/public/
```

### Production Deployment
```bash
# After deployment, run in backend container
docker exec acadistra_backend ./scripts/setup-images.sh

# Or manually
docker exec acadistra_backend mkdir -p public/logos public/photos/thumbs
docker exec acadistra_backend chmod 755 public/ public/logos/ public/photos/
```

## Monitoring

### Log Monitoring
```bash
# Watch for image-related errors
docker compose -f docker-compose.prod.yml logs -f backend | grep -i "logo\|photo\|image"
docker compose -f docker-compose.prod.yml logs -f caddy | grep -i "logo\|photo"
```

### Health Checks
```bash
# Check if image endpoints are accessible
curl -I https://acadistra.com/logos/.gitkeep
curl -I https://acadistra.com/photos/.gitkeep

# Should return 200 OK
```

## Security Considerations

1. **File Type Validation**: Only allow JPG, JPEG, PNG
2. **File Size Limits**: Maximum 10MB per file
3. **Directory Permissions**: 755 for directories, 644 for files
4. **CORS Headers**: Properly configured for cross-origin requests
5. **Authentication**: Upload endpoints require valid JWT tokens

## Performance Optimization

1. **Image Optimization**: Backend automatically optimizes uploaded images
2. **Caching**: Caddy serves images with long-term cache headers
3. **Thumbnails**: Automatic thumbnail generation for photos
4. **Compression**: Images are compressed during upload

## Contact Support

If issues persist after following this guide:
1. Check the application logs
2. Verify network connectivity
3. Ensure all containers are healthy
4. Contact the development team with specific error messages