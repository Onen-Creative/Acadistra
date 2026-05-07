# 📸 Photo URL Issue - Frontend Configuration

## Issue
Frontend is trying to load photos from wrong URL:
```
❌ GET http://localhost:3000/photos/0b6d3c07-a516-4084-940a-7874e98a4463.jpg 404
```

## Root Cause
This is a **frontend configuration issue**, NOT a backend issue.

### Backend Status: ✅ Working Correctly
```bash
# Test backend route:
curl -I http://localhost:8080/photos/0b6d3c07-a516-4084-940a-7874e98a4463.jpg

# Result:
HTTP/1.1 200 OK ✅
```

The backend static routes are working perfectly:
- ✅ Routes configured in main.go (lines 128-129)
- ✅ Files exist in `backend/public/photos/`
- ✅ Backend serves files correctly on port 8080

### Frontend Issue: ❌ Wrong URL
The frontend is requesting:
```
http://localhost:3000/photos/...  ❌ Wrong (frontend port)
```

Should be requesting:
```
http://localhost:8080/photos/...  ✅ Correct (backend port)
```

## Solution

### Option 1: Fix Frontend Image URLs (Recommended)
Update your frontend code to use the correct API URL for images:

```typescript
// ❌ Wrong
const photoUrl = `/photos/${student.photo_url}`;

// ✅ Correct
const photoUrl = `${process.env.NEXT_PUBLIC_API_URL}/photos/${student.photo_url}`;
// or
const photoUrl = `http://localhost:8080/photos/${student.photo_url}`;
```

### Option 2: Use Next.js Image Proxy
Configure Next.js to proxy image requests:

```javascript
// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/photos/:path*',
        destination: 'http://localhost:8080/photos/:path*',
      },
      {
        source: '/logos/:path*',
        destination: 'http://localhost:8080/logos/:path*',
      },
    ];
  },
};
```

### Option 3: Use Environment Variable
Set up API URL in frontend `.env`:

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Then use it in your code:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const photoUrl = `${API_URL}/photos/${student.photo_url}`;
```

## Verification

### Backend (Already Working ✅)
```bash
# Test from command line:
curl http://localhost:8080/photos/0b6d3c07-a516-4084-940a-7874e98a4463.jpg

# Should download the image
```

### Frontend (After Fix)
1. Update image URLs in your code
2. Restart frontend dev server
3. Images should load correctly

## Files to Check in Frontend

Look for these patterns in your frontend code:
```typescript
// Find files using photo URLs
grep -r "photo_url" frontend/
grep -r "/photos/" frontend/
grep -r "photoURL" frontend/

// Common locations:
// - components/StudentCard.tsx
// - components/StudentProfile.tsx
// - pages/students/[id]/edit.tsx
// - etc.
```

## Summary

| Component | Status | Action Needed |
|-----------|--------|---------------|
| **Backend Routes** | ✅ Working | None - already correct |
| **Backend Files** | ✅ Present | None - files exist |
| **Frontend URLs** | ❌ Wrong | Update to use API URL |

---

**Backend is fine! This is a frontend configuration issue.**

Update your frontend image URLs to point to `http://localhost:8080` instead of `http://localhost:3000`.
