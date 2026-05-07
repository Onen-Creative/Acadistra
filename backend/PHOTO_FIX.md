# ✅ Photo URL Fixed

## Issue
Student photos were loading from wrong URL:
```
❌ http://localhost:3000/photos/... (404 Not Found)
```

## Fix Applied
Updated `/frontend/src/app/students/[id]/edit/page.tsx`:

1. **Added import**:
   ```typescript
   import { getImageUrl } from '@/utils/imageUrl'
   ```

2. **Fixed image src**:
   ```typescript
   // Before:
   src={photoPreview || studentData?.photo_url}
   
   // After:
   src={photoPreview || getImageUrl(studentData?.photo_url)}
   ```

## How It Works
The `getImageUrl()` utility automatically:
- ✅ Adds the correct API URL (`http://localhost:8080`)
- ✅ Handles both development and production
- ✅ Works with full URLs and relative paths

## Test
1. Restart frontend: `npm run dev`
2. Go to edit student page
3. Photo should now load correctly from `http://localhost:8080/photos/...`

---

**Status**: ✅ Fixed
**File Modified**: `frontend/src/app/students/[id]/edit/page.tsx`
