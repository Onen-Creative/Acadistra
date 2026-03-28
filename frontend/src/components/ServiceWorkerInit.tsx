'use client'

import { useEffect } from 'react'

export function ServiceWorkerInit() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker directly without Workbox
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration)
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  if (confirm('New version available! Reload to update?')) {
                    window.location.reload()
                  }
                }
              })
            }
          })
        })
        .catch((error) => {
          console.log('SW registration failed: ', error)
        })

      // Handle offline/online status
      window.addEventListener('online', () => {
        showNetworkStatus('online')
      })

      window.addEventListener('offline', () => {
        showNetworkStatus('offline')
      })
    }
  }, [])

  return null
}

function showNetworkStatus(status: 'online' | 'offline') {
  const existingStatus = document.getElementById('network-status')
  if (existingStatus) {
    existingStatus.remove()
  }

  const statusElement = document.createElement('div')
  statusElement.id = 'network-status'
  statusElement.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: ${status === 'online' ? '#4caf50' : '#f44336'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
    ">
      ${status === 'online' ? '🟢 Back Online' : '🔴 You are offline'}
    </div>
  `
  
  document.body.appendChild(statusElement)

  // Auto-remove after 3 seconds
  setTimeout(() => {
    statusElement.remove()
  }, 3000)
}
