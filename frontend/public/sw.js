/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'acadistra-v1'
const API_CACHE = 'acadistra-api-v1'
const STATIC_CACHE = 'acadistra-static-v1'

// Cache API responses with Network First strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API requests - Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && request.method === 'GET') {
            const responseClone = response.clone()
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Static assets - Cache First
  if (request.destination === 'image' || request.destination === 'style' || request.destination === 'script') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
      })
    )
    return
  }

  // Default - Network First
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})

// Background sync for offline marks submission
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-marks') {
    event.waitUntil(syncOfflineMarks())
  }
})

async function syncOfflineMarks() {
  try {
    const db = await openDB()
    const marks = await getAllOfflineMarks(db)
    
    for (const mark of marks) {
      try {
        const response = await fetch('/api/v1/marks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mark.token}`
          },
          body: JSON.stringify(mark.data)
        })
        
        if (response.ok) {
          await deleteOfflineMark(db, mark.id)
        }
      } catch (error) {
        console.error('Failed to sync mark:', error)
      }
    }
  } catch (error) {
    console.error('Sync failed:', error)
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('acadistra-offline', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('marks')) {
        db.createObjectStore('marks', { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

function getAllOfflineMarks(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['marks'], 'readonly')
    const store = transaction.objectStore('marks')
    const request = store.getAll()
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

function deleteOfflineMark(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['marks'], 'readwrite')
    const store = transaction.objectStore('marks')
    const request = store.delete(id)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// Install event
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
