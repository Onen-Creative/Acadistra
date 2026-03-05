import { Workbox } from 'workbox-window'

export function initServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  const wb = new Workbox('/sw.js')

  // Add event listeners
  wb.addEventListener('installed', (event) => {
    
    if (event.isUpdate) {
      // Show update notification
      if (confirm('New version available! Reload to update?')) {
        window.location.reload()
      }
    }
  })

  wb.addEventListener('waiting', (event) => {
    
    // Show update prompt
    const updatePrompt = document.createElement('div')
    updatePrompt.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2196f3;
        color: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 300px;
      ">
        <div style="font-weight: 600; margin-bottom: 8px;">Update Available</div>
        <div style="font-size: 14px; margin-bottom: 12px;">A new version is ready to install.</div>
        <button onclick="this.parentElement.parentElement.remove(); window.location.reload()" 
                style="background: white; color: #2196f3; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 8px;">
          Update Now
        </button>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: transparent; color: white; border: 1px solid white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
          Later
        </button>
      </div>
    `
    document.body.appendChild(updatePrompt)
  })

  wb.addEventListener('controlling', (event) => {
    window.location.reload()
  })

  wb.addEventListener('activated', (event) => {
  })

  // Register the service worker
  wb.register().catch((error) => {
    console.error('Service Worker registration failed:', error)
  })

  // Handle offline/online status
  window.addEventListener('online', () => {
    showNetworkStatus('online')
  })

  window.addEventListener('offline', () => {
    showNetworkStatus('offline')
  })

  return wb
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

// PWA Install prompt
export function initPWAInstall() {
  let deferredPrompt: any

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault()
    // Stash the event so it can be triggered later
    deferredPrompt = e

    // Show install button
    showInstallPrompt()
  })

  function showInstallPrompt() {
    const installPrompt = document.createElement('div')
    installPrompt.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        border: 2px solid #2196f3;
        color: #2196f3;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 300px;
      ">
        <div style="font-weight: 600; margin-bottom: 8px;">📱 Install App</div>
        <div style="font-size: 14px; margin-bottom: 12px;">Install this app for a better experience!</div>
        <button id="install-button" style="background: #2196f3; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 8px;">
          Install
        </button>
        <button onclick="this.parentElement.parentElement.remove()" style="background: transparent; color: #2196f3; border: 1px solid #2196f3; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
          Not Now
        </button>
      </div>
    `
    
    document.body.appendChild(installPrompt)

    const installButton = document.getElementById('install-button')
    installButton?.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        deferredPrompt = null
      }
      installPrompt.remove()
    })
  }
}