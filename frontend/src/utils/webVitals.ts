import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

interface WebVitalMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
}

export function initWebVitals() {
  if (typeof window === 'undefined') return

  const sendToAnalytics = (metric: WebVitalMetric) => {
    // Send to your analytics service
    
    // Example: Send to Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        event_category: 'Web Vitals',
        event_label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        non_interaction: true,
      })
    }

    // Example: Send to custom analytics endpoint
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
      }).catch(console.error)
    }
  }

  // Measure Core Web Vitals
  getCLS(sendToAnalytics)
  getFID(sendToAnalytics)
  getFCP(sendToAnalytics)
  getLCP(sendToAnalytics)
  getTTFB(sendToAnalytics)
}

export function trackCustomMetric(name: string, value: number, unit = 'ms') {
  if (typeof window === 'undefined') return

  const metric = {
    name: `custom_${name}`,
    value,
    unit,
    timestamp: Date.now(),
  }


  // Send to analytics
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/analytics/custom-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    }).catch(console.error)
  }
}

// Performance monitoring hooks
export function usePerformanceMonitor() {
  const trackPageLoad = (pageName: string) => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const loadTime = endTime - startTime
      trackCustomMetric(`page_load_${pageName}`, loadTime)
    }
  }

  const trackUserAction = (action: string) => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const actionTime = endTime - startTime
      trackCustomMetric(`user_action_${action}`, actionTime)
    }
  }

  const trackAPICall = (endpoint: string) => {
    const startTime = performance.now()
    
    return (success: boolean) => {
      const endTime = performance.now()
      const apiTime = endTime - startTime
      trackCustomMetric(`api_${endpoint}_${success ? 'success' : 'error'}`, apiTime)
    }
  }

  return {
    trackPageLoad,
    trackUserAction,
    trackAPICall,
  }
}