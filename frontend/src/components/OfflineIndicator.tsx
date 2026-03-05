'use client'

import { useState, useEffect } from 'react'
import { offlineSync } from '@/utils/offlineSync'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [offlineCount, setOfflineCount] = useState(0)

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    const updateOfflineCount = async () => {
      const count = await offlineSync.getOfflineCount()
      setOfflineCount(count)
    }

    updateOnlineStatus()
    updateOfflineCount()

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    const interval = setInterval(updateOfflineCount, 5000)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
      clearInterval(interval)
    }
  }, [])

  if (isOnline && offlineCount === 0) return null

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {!isOnline && (
        <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          <span className="font-semibold">Offline Mode</span>
        </div>
      )}
      {offlineCount > 0 && (
        <div className="bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg mt-2">
          <span className="font-semibold">{offlineCount} marks pending sync</span>
        </div>
      )}
    </div>
  )
}
