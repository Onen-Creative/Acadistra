'use client'

import { useEffect } from 'react'
import { initServiceWorker, initPWAInstall } from '@/utils/serviceWorker'

export function ServiceWorkerInit() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      initServiceWorker()
      initPWAInstall()
    }
  }, [])

  return null
}
