# State Management in Acadistra Next.js Frontend

## Overview

The Acadistra frontend uses a **hybrid state management approach** combining multiple solutions for different use cases.

---

## State Management Stack

### 1. 🎯 **TanStack Query (React Query)** - Server State
**Primary tool for server-side data management**

**Package**: `@tanstack/react-query` v5.17.0

**Usage**: 165+ instances across the codebase

**Purpose**:
- Fetching data from backend API
- Caching server responses
- Automatic background refetching
- Optimistic updates
- Request deduplication

**Configuration** (in `providers.tsx`):
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
})
```

**Example Usage**:
```typescript
// Fetching students
const { data, isLoading } = useQuery({
  queryKey: ['students', schoolId],
  queryFn: () => studentsApi.getAll(schoolId)
})

// Creating a student
const mutation = useMutation({
  mutationFn: studentsApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries(['students'])
  }
})
```

**Best For**:
- API data fetching
- CRUD operations
- Data synchronization
- Cache management

---

### 2. 🐻 **Zustand** - Global Client State
**Lightweight global state management**

**Package**: `zustand` v5.0.13

**Usage**: 1 store (currently)

**Purpose**:
- Global application state
- Cross-component state sharing
- Persistent state (with localStorage)

**Current Store**:
- `modulesStore.ts` - Active subscription modules

**Example** (`modulesStore.ts`):
```typescript
export const useModulesStore = create<ModulesStore>((set, get) => ({
  activeModules: [],
  loading: true,
  
  setActiveModules: (modules) => set({ activeModules: modules }),
  setLoading: (loading) => set({ loading }),
  
  hasModule: (moduleCode) => {
    const { activeModules } = get();
    return activeModules.includes(moduleCode);
  },
  
  fetchModules: async () => {
    // Fetch from API and update state
  },
}))

// Usage in components
const hasPayroll = useModulesStore(state => state.hasModule('PAYROLL'))
```

**Best For**:
- Feature flags (module subscriptions)
- User preferences
- UI state (theme, sidebar open/closed)
- Shopping cart-like state
- Global notifications

---

### 3. ⚛️ **React Built-in Hooks** - Local Component State
**Native React state management**

**Usage**: 781+ instances of `useState`

**Hooks Used**:
- `useState` - Local component state
- `useReducer` - Complex state logic
- `useContext` - Prop drilling avoidance
- `useEffect` - Side effects
- `useMemo` / `useCallback` - Performance optimization

**Example**:
```typescript
function StudentForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    admissionNo: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Component-specific state
}
```

**Best For**:
- Form state
- UI toggles (modals, dropdowns)
- Component-specific data
- Temporary state

---

### 4. 📝 **React Hook Form** - Form State
**Specialized form state management**

**Package**: `react-hook-form` v7.70.0

**Purpose**:
- Form validation
- Form state management
- Performance optimization (uncontrolled inputs)

**Example**:
```typescript
import { useForm } from 'react-hook-form'

function StudentForm() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  
  const onSubmit = (data) => {
    // Handle form submission
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('firstName', { required: true })} />
      {errors.firstName && <span>Required</span>}
    </form>
  )
}
```

**Best For**:
- Complex forms
- Form validation
- Multi-step forms
- Dynamic form fields

---

### 5. 🎨 **Mantine Form** - UI-Integrated Forms
**Mantine UI's form management**

**Package**: `@mantine/form` v7.3.2

**Purpose**:
- Tight integration with Mantine components
- Built-in validation
- Form state management

**Example**:
```typescript
import { useForm } from '@mantine/form'

function StudentForm() {
  const form = useForm({
    initialValues: {
      firstName: '',
      lastName: ''
    },
    validate: {
      firstName: (value) => value.length < 2 ? 'Too short' : null
    }
  })
  
  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <TextInput {...form.getInputProps('firstName')} />
    </form>
  )
}
```

**Best For**:
- Mantine UI forms
- Simple validation
- Quick prototyping

---

### 6. 💾 **IndexedDB (IDB)** - Offline Storage
**Browser database for offline functionality**

**Package**: `idb` v8.0.0

**Purpose**:
- Offline data storage
- Marks entry offline mode
- Queue pending requests

**Implementation** (`services/offline.ts`):
```typescript
import { openDB } from 'idb'

const db = await openDB('acadistra-offline', 1, {
  upgrade(db) {
    db.createObjectStore('marks')
    db.createObjectStore('queue')
  }
})

// Store marks offline
await db.put('marks', marksData, studentId)

// Sync when online
syncQueue.startAutoSync()
```

**Best For**:
- Offline-first features
- Large datasets
- Background sync
- PWA functionality

---

### 7. 🔌 **Context API** - Specialized Providers
**React Context for specific features**

**Current Contexts**:
- `SocketProvider` - WebSocket connections
- `AIProvider` - AI assistant state
- `ModalsProvider` - Modal management (Mantine)

**Example** (`services/socket.tsx`):
```typescript
const SocketContext = createContext<SocketContextType | null>(null)

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  
  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL)
    setSocket(newSocket)
    
    return () => newSocket.close()
  }, [])
  
  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
```

**Best For**:
- WebSocket connections
- Theme management
- Authentication state
- Feature-specific state

---

## State Management Decision Tree

```
┌─────────────────────────────────────┐
│ What type of state do you need?    │
└─────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────┐
│ Server │  │ Global │  │ Local  │
│  Data  │  │ Client │  │  UI    │
└────────┘  └────────┘  └────────┘
    │            │            │
    ▼            ▼            ▼
React Query   Zustand    useState
    │            │            │
    │            │            ▼
    │            │       React Hook Form
    │            │            │
    │            ▼            ▼
    │      Context API   Mantine Form
    │            │
    ▼            ▼
IndexedDB   localStorage
```

---

## When to Use What?

### ✅ Use **React Query** when:
- Fetching data from API
- Need caching
- Need background refetching
- Need optimistic updates
- Managing server state

### ✅ Use **Zustand** when:
- Need global state across many components
- State doesn't come from server
- Need simple API
- Want persistence (localStorage)
- Feature flags / user preferences

### ✅ Use **useState** when:
- State is local to component
- Simple UI toggles
- Temporary state
- No need to share with other components

### ✅ Use **React Hook Form** when:
- Complex forms with validation
- Need performance optimization
- Multi-step forms
- Dynamic fields

### ✅ Use **Context API** when:
- Need to avoid prop drilling
- State is feature-specific
- WebSocket connections
- Theme management

### ✅ Use **IndexedDB** when:
- Offline functionality
- Large datasets
- Need persistence beyond localStorage
- Background sync

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Router                    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │                   Providers.tsx                     │ │
│  │                                                     │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │         QueryClientProvider                   │ │ │
│  │  │  (React Query - Server State)                │ │ │
│  │  │                                               │ │ │
│  │  │  ┌─────────────────────────────────────────┐ │ │ │
│  │  │  │        SocketProvider                    │ │ │ │
│  │  │  │  (WebSocket Context)                    │ │ │ │
│  │  │  │                                          │ │ │ │
│  │  │  │  ┌────────────────────────────────────┐ │ │ │ │
│  │  │  │  │       AIProvider                    │ │ │ │ │
│  │  │  │  │  (AI Assistant Context)            │ │ │ │ │
│  │  │  │  │                                     │ │ │ │ │
│  │  │  │  │  ┌───────────────────────────────┐ │ │ │ │ │
│  │  │  │  │  │   ModulesInitializer          │ │ │ │ │ │
│  │  │  │  │  │   (Zustand Store Init)        │ │ │ │ │ │
│  │  │  │  │  │                                │ │ │ │ │ │
│  │  │  │  │  │   ┌─────────────────────────┐ │ │ │ │ │ │
│  │  │  │  │  │   │   Page Components       │ │ │ │ │ │ │
│  │  │  │  │  │   │   (useState, forms)     │ │ │ │ │ │ │
│  │  │  │  │  │   └─────────────────────────┘ │ │ │ │ │ │
│  │  │  │  │  └───────────────────────────────┘ │ │ │ │ │
│  │  │  │  └────────────────────────────────────┘ │ │ │ │
│  │  │  └─────────────────────────────────────────┘ │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   External Storage                       │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  IndexedDB   │  │ localStorage │  │ sessionStorage│  │
│  │  (Offline)   │  │ (Preferences)│  │   (Temp)     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Current State Stores

### 1. Zustand Stores
- ✅ `modulesStore.ts` - Active subscription modules

### 2. React Query Keys (Examples)
- `['students', schoolId]`
- `['staff', schoolId]`
- `['classes', schoolId]`
- `['subjects', schoolId]`
- `['fees', studentId, term, year]`
- `['results', studentId, term, year]`

### 3. Context Providers
- ✅ `SocketProvider` - WebSocket state
- ✅ `AIProvider` - AI assistant state
- ✅ `ModalsProvider` - Modal management

---

## Best Practices

### ✅ DO:
- Use React Query for all API calls
- Use Zustand for global client state
- Use useState for local component state
- Keep stores small and focused
- Use TypeScript for type safety
- Implement proper error handling

### ❌ DON'T:
- Mix server state in Zustand (use React Query)
- Put everything in global state
- Use Context for frequently changing values
- Forget to handle loading/error states
- Ignore cache invalidation

---

## Performance Considerations

### React Query Optimizations:
- ✅ Stale time: 5 minutes
- ✅ Automatic deduplication
- ✅ Background refetching
- ✅ Optimistic updates

### Zustand Optimizations:
- ✅ Selector-based subscriptions
- ✅ Shallow equality checks
- ✅ No unnecessary re-renders

### React Optimizations:
- ✅ `useMemo` for expensive calculations
- ✅ `useCallback` for stable function references
- ✅ `React.memo` for component memoization
- ✅ `startTransition` for non-urgent updates (React 19)

---

## Future Considerations

### Potential Additions:
1. **More Zustand Stores**:
   - `authStore` - Authentication state
   - `uiStore` - UI preferences (theme, sidebar)
   - `notificationStore` - In-app notifications

2. **Middleware**:
   - Zustand persist middleware for localStorage
   - Zustand devtools for debugging

3. **Optimizations**:
   - React Query devtools in development
   - Performance monitoring
   - State persistence strategies

---

## Summary

**Primary Stack**:
- 🎯 **React Query** - Server state (165+ uses)
- 🐻 **Zustand** - Global client state (1 store)
- ⚛️ **React Hooks** - Local state (781+ uses)
- 📝 **React Hook Form** - Form management
- 💾 **IndexedDB** - Offline storage

**Architecture**: Hybrid approach using the right tool for each use case

**Philosophy**: 
- Server state → React Query
- Global client state → Zustand
- Local state → React Hooks
- Forms → React Hook Form / Mantine Form
- Offline → IndexedDB

---

**Last Updated**: 2025-05-05  
**Version**: Next.js 16.1.6, React 19.0.0
