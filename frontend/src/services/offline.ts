import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { OfflineMark } from '@/types';

interface SchoolDB extends DBSchema {
  marks: {
    key: string;
    value: OfflineMark;
    indexes: { 'by-status': string; 'by-assessment': string };
  };
}

let db: IDBPDatabase<SchoolDB> | null = null;

export async function initOfflineDB(): Promise<void> {
  db = await openDB<SchoolDB>('school-system', 1, {
    upgrade(db) {
      const markStore = db.createObjectStore('marks', { keyPath: 'id' });
      markStore.createIndex('by-status', 'status');
      markStore.createIndex('by-assessment', 'assessment_id');
    },
  });
}

export async function saveOfflineMark(mark: OfflineMark): Promise<void> {
  if (!db) await initOfflineDB();
  await db!.put('marks', mark);
}

export async function getOfflineMarks(status?: string): Promise<OfflineMark[]> {
  if (!db) await initOfflineDB();
  
  if (status) {
    return db!.getAllFromIndex('marks', 'by-status', status);
  }
  
  return db!.getAll('marks');
}

export async function getPendingMarks(): Promise<OfflineMark[]> {
  return getOfflineMarks('pending');
}

export async function updateMarkStatus(id: string, status: OfflineMark['status']): Promise<void> {
  if (!db) await initOfflineDB();
  
  const mark = await db!.get('marks', id);
  if (mark) {
    mark.status = status;
    mark.updated_at = Date.now();
    await db!.put('marks', mark);
  }
}

export async function deleteOfflineMark(id: string): Promise<void> {
  if (!db) await initOfflineDB();
  await db!.delete('marks', id);
}

export async function clearSyncedMarks(): Promise<void> {
  if (!db) await initOfflineDB();
  
  const synced = await getOfflineMarks('synced');
  const tx = db!.transaction('marks', 'readwrite');
  
  await Promise.all([
    ...synced.map(mark => tx.store.delete(mark.id)),
    tx.done,
  ]);
}

// Sync queue manager
export class SyncQueue {
  private syncing = false;
  private syncCallback?: (marks: OfflineMark[]) => Promise<void>;

  setSyncCallback(callback: (marks: OfflineMark[]) => Promise<void>): void {
    this.syncCallback = callback;
  }

  async sync(): Promise<void> {
    if (this.syncing || !this.syncCallback) return;

    this.syncing = true;
    try {
      const pending = await getPendingMarks();
      if (pending.length === 0) return;

      // Mark as syncing
      await Promise.all(
        pending.map(mark => updateMarkStatus(mark.id, 'syncing'))
      );

      // Attempt sync
      await this.syncCallback(pending);

      // Mark as synced
      await Promise.all(
        pending.map(mark => updateMarkStatus(mark.id, 'synced'))
      );
    } catch (error) {
      console.error('Sync failed:', error);
      
      // Revert to pending
      const syncing = await getOfflineMarks('syncing');
      await Promise.all(
        syncing.map(mark => updateMarkStatus(mark.id, 'pending'))
      );
    } finally {
      this.syncing = false;
    }
  }

  startAutoSync(intervalMs = 30000): void {
    setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      }
    }, intervalMs);

    // Sync when coming online
    window.addEventListener('online', () => this.sync());
  }
}

export const syncQueue = new SyncQueue();