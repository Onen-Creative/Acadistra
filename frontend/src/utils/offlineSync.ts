import { offlineStorage } from './offlineStorage'
import api from '@/services/api'

export class OfflineSync {
  private syncing = false

  async syncMarks(): Promise<{ success: number; failed: number }> {
    if (this.syncing) {
      return { success: 0, failed: 0 }
    }

    this.syncing = true
    let success = 0
    let failed = 0

    try {
      const unsynced = await offlineStorage.getUnsyncedMarks()

      for (const mark of unsynced) {
        try {
          await api.post('/api/v1/marks', mark.data, {
            headers: {
              Authorization: `Bearer ${mark.token}`
            }
          })
          
          await offlineStorage.markAsSynced(mark.id)
          success++
        } catch (error) {
          console.error('Failed to sync mark:', error)
          failed++
        }
      }

      // Clean up synced marks older than 7 days
      await offlineStorage.clearSyncedMarks()
    } catch (error) {
      console.error('Sync process failed:', error)
    } finally {
      this.syncing = false
    }

    return { success, failed }
  }

  async saveOffline(data: any): Promise<number> {
    return await offlineStorage.saveMarks(data)
  }

  async getOfflineCount(): Promise<number> {
    const unsynced = await offlineStorage.getUnsyncedMarks()
    return unsynced.length
  }

  isSyncing(): boolean {
    return this.syncing
  }
}

export const offlineSync = new OfflineSync()

// Auto-sync when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    const result = await offlineSync.syncMarks()
    if (result.success > 0) {
      console.log(`Synced ${result.success} offline marks`)
    }
  })
}
