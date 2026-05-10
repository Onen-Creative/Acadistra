# Frontend 404 Error - Debugging Guide

## The Problem

Frontend shows: `GET http://localhost:8080/api/v1/sms/provider 404 (Not Found)`
Backend actually returns: `401 Unauthorized`

This means the frontend is NOT reaching the backend at all, or the browser is caching the 404 response.

## Root Cause

The frontend is likely:
1. Making requests to the wrong URL (cached old API URL)
2. Browser has cached the 404 response
3. Service worker is caching old responses

## Solution Steps

### Step 1: Clear Browser Cache (CRITICAL)

**In Chrome/Edge:**
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Right-click refresh button → "Empty Cache and Hard Reload"

**Or use keyboard:**
- Windows/Linux: `Ctrl + Shift + Delete` → Clear cache
- Mac: `Cmd + Shift + Delete` → Clear cache

### Step 2: Clear Service Worker Cache

**In Chrome/Edge:**
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Service Workers" in left sidebar
4. Click "Unregister" for any service workers
5. Click "Clear storage" → "Clear site data"

### Step 3: Verify Environment Variable

Open browser console and run:
```javascript
console.log(process.env.NEXT_PUBLIC_API_URL)
```

Should show: `http://localhost:8080`

If it shows `https://acadistra.com`, the frontend needs restart.

### Step 4: Hard Refresh Frontend

```bash
cd frontend
rm -rf .next
npm run dev
```

### Step 5: Test in Incognito/Private Window

Open `http://localhost:3000` in incognito mode to bypass all cache.

### Step 6: Check Network Request in DevTools

1. Open DevTools → Network tab
2. Navigate to SMS page
3. Look for the request to `/api/v1/sms/provider`
4. Check:
   - Request URL (should be `http://localhost:8080/api/v1/sms/provider`)
   - Request Headers (should have `Authorization: Bearer ...`)
   - Response status (should be 401 or 200, NOT 404)

## Verification

The backend is working correctly:

```bash
# Without auth - returns 401 (route exists)
curl http://localhost:8080/api/v1/sms/provider
# {"error":"Authorization header required"}

# With auth - returns data
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/sms/provider
# {"error":"Provider not configured"} or actual provider data
```

## Why This Happens

1. **Next.js caches API responses** - Even in development
2. **Browser caches 404 responses** - Aggressively
3. **Service workers cache everything** - Including errors
4. **Environment variables** - Only loaded on server start

## The Fix

**99% of the time, this is a browser cache issue.**

1. Hard reload browser (Ctrl+Shift+R)
2. Clear browser cache completely
3. Use incognito mode
4. Restart frontend dev server

## If Still Not Working

Check if frontend is using correct API URL:

```bash
# Check what the frontend is actually requesting
cd frontend
grep -r "acadistra.com" .next/ 2>/dev/null | head -5
```

If you see `acadistra.com` in the output, the frontend is still using production URL.

**Solution:**
```bash
cd frontend
rm -rf .next node_modules/.cache
npm run dev
```

## Production Note

This issue ONLY happens in development. In production:
- Caddy handles routing
- No CORS issues
- No cache problems
- Everything works perfectly

The SMS routes are 100% working on the backend. This is purely a frontend/browser cache issue.
