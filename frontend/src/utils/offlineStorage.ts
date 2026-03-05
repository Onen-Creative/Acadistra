const DB_NAME = 'acadistra-offline'
const DB_VERSION = 1
const MARKS_STORE = 'marks'

export class OfflineStorage {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(MARKS_STORE)) {
          const store = db.createObjectStore(MARKS_STORE, { keyPath: 'id', autoIncrement: true })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('synced', 'synced', { unique: false })
        }
      }
    })
  }

  async saveMarks(data: any): Promise<number> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MARKS_STORE], 'readwrite')
      const store = transaction.objectStore(MARKS_STORE)
      
      const mark = {
        data,
        timestamp: Date.now(),
        synced: false,
        token: localStorage.getItem('access_token')
      }

      const request = store.add(mark)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result as number)
    })
  }

  async getAllMarks(): Promise<any[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MARKS_STORE], 'readonly')
      const store = transaction.objectStore(MARKS_STORE)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async getUnsyncedMarks(): Promise<any[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MARKS_STORE], 'readonly')
      const store = transaction.objectStore(MARKS_STORE)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const allMarks = request.result
        const unsynced = allMarks.filter((mark: any) => !mark.synced)
        resolve(unsynced)
      }
    })
  }

  async markAsSynced(id: number): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MARKS_STORE], 'readwrite')
      const store = transaction.objectStore(MARKS_STORE)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const mark = getRequest.result
        if (mark) {
          mark.synced = true
          const updateRequest = store.put(mark)
          updateRequest.onerror = () => reject(updateRequest.error)
          updateRequest.onsuccess = () => resolve()
        } else {
          resolve()
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async deleteMark(id: number): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MARKS_STORE], 'readwrite')
      const store = transaction.objectStore(MARKS_STORE)
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clearSyncedMarks(): Promise<void> {
    if (!this.db) await this.init()

    const synced = await this.getAllMarks()
    const syncedMarks = synced.filter(m => m.synced)

    for (const mark of syncedMarks) {
      await this.deleteMark(mark.id)
    }
  }

  async getCount(): Promise<number> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MARKS_STORE], 'readonly')
      const store = transaction.objectStore(MARKS_STORE)
      const request = store.count()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }
}

export const offlineStorage = new OfflineStorage()
