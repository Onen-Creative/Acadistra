# Fix SMS 404 Error - Service Worker Cache Issue

## Problem
Frontend shows 404 for `/api/v1/sms/provider` even though backend returns 401 (route exists).

## Root Cause
**Service Worker is caching old 404 responses** from before SMS routes were added.

## Solution

### Step 1: Unregister Service Worker
1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** in left sidebar
4. Click **Unregister** next to the service worker
5. Check **Update on reload**

### Step 2: Clear All Site Data
1. Still in **Application** tab
2. Click **Storage** in left sidebar
3. Click **Clear site data** button
4. Confirm

### Step 3: Hard Refresh
Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)

### Step 4: Verify
1. Open **Network** tab in DevTools
2. Refresh the page
3. Look for `/api/v1/sms/provider` request
4. Should now show **401** (not 404)

## Alternative: Disable Service Worker Temporarily

Add this to `frontend/public/sw.js` at the top:
```javascript
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  return self.clients.claim();
});

// Clear all caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});
```

Then refresh the page.

## Why This Happened

1. Service worker cached API responses for offline functionality
2. When SMS routes didn't exist, it cached 404 responses
3. After adding SMS routes, service worker still serves cached 404
4. Backend actually returns 401 (route exists, needs auth)

## Permanent Fix

Update service worker to NOT cache API routes:

```javascript
// In frontend/public/sw.js
self.addEventListener('fetch', (event) => {
  // Don't cache API requests
  if (event.request.url.includes('/api/')) {
    return fetch(event.request);
  }
  
  // Cache other requests
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

## Verification Commands

```bash
# Test backend directly (should return 401)
curl http://localhost:8080/api/v1/sms/provider

# Test with auth token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/api/v1/sms/provider
```

## Summary
The backend SMS routes are working correctly. The issue is the service worker caching old 404 responses. Unregister the service worker and clear site data to fix.
