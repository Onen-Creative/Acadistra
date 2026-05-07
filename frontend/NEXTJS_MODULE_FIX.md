# Next.js Module Resolution Fix

## Issue
```
Module not found: Can't resolve 'zustand'
./src/stores/modulesStore.ts
```

**Error Context**: The `modulesStore.ts` was being imported in a Server Component context but:
1. Used browser-only APIs (`localStorage`)
2. Missing the `'use client'` directive
3. Missing the `zustand` dependency

---

## Root Causes

### 1. Missing 'use client' Directive
The store uses browser-only APIs but wasn't marked as a client component:
- `localStorage.getItem('token')` - only available in browser
- `fetch()` with browser context

### 2. Missing Dependency
The `zustand` package was not installed in `package.json`

---

## Fixes Applied

### ✅ Fix 1: Added 'use client' Directive

**File**: `src/stores/modulesStore.ts`

**Before**:
```typescript
import { create } from 'zustand';

interface ModulesStore {
  // ...
}
```

**After**:
```typescript
'use client';

import { create } from 'zustand';

interface ModulesStore {
  // ...
}
```

**Why**: Zustand stores that use browser APIs must be client components in Next.js 13+ App Router.

---

### ✅ Fix 2: Installed Zustand

**Command**:
```bash
npm install zustand --legacy-peer-deps
```

**Why**: The `--legacy-peer-deps` flag was needed due to React 19 peer dependency conflicts with the `ai` package.

---

## Component Architecture

```
Server Components (SSR)
└── layout.tsx
    └── providers.tsx ('use client')
        └── ModulesInitializer.tsx ('use client')
            └── modulesStore.ts ('use client') ✅ FIXED
```

**Key Points**:
- `layout.tsx` - Server Component (no 'use client')
- `providers.tsx` - Client Component (has 'use client')
- `ModulesInitializer.tsx` - Client Component (has 'use client')
- `modulesStore.ts` - Now marked as Client Component ✅

---

## Why This Matters

### Server vs Client Components in Next.js

**Server Components** (default):
- Rendered on server
- No access to browser APIs
- Cannot use hooks like `useState`, `useEffect`
- Better performance, smaller bundle

**Client Components** ('use client'):
- Rendered in browser
- Access to browser APIs (localStorage, window, etc.)
- Can use React hooks
- Required for interactive features

### Zustand in Next.js App Router

Zustand stores that:
- Use browser APIs → Need `'use client'`
- Are pure state containers → Can work without `'use client'`
- Use `localStorage`, `fetch`, etc. → **Must have** `'use client'`

---

## Build Status

✅ **Build Successful**
- All routes compiled
- No module resolution errors
- Static and dynamic routes working

---

## Testing Checklist

- [x] Build completes without errors
- [ ] Module subscription features work
- [ ] `useModulesStore` hook works in components
- [ ] `useHasModule` helper works correctly
- [ ] Module codes are fetched on app load
- [ ] localStorage token is read correctly

---

## Related Files

- `src/stores/modulesStore.ts` - Fixed with 'use client'
- `src/components/ModulesInitializer.tsx` - Already had 'use client'
- `src/app/providers.tsx` - Already had 'use client'
- `package.json` - Added zustand dependency

---

## Best Practices for Future Stores

When creating new Zustand stores in Next.js App Router:

1. **Add 'use client' if**:
   - Using `localStorage`, `sessionStorage`
   - Using `window`, `document`, `navigator`
   - Using browser-only APIs
   - Using React hooks

2. **Don't add 'use client' if**:
   - Pure state management
   - No browser APIs
   - Can be serialized for SSR

3. **Always check**:
   - Dependencies are installed
   - Import paths are correct
   - TypeScript types are defined

---

**Fixed By**: Amazon Q Developer  
**Date**: 2025-05-05  
**Status**: ✅ Resolved
