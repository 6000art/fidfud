import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'fidfud_storage_db';
const DB_VERSION = 1;

export interface StoredMediaBlob {
  id: string;
  blob: Blob;
  mimeType: string;
  size: number;
  createdAt: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getIndexedDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in the browser'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('media_blobs')) {
          db.createObjectStore('media_blobs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('offline_records')) {
          db.createObjectStore('offline_records', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('downloaded_videos')) {
          db.createObjectStore('downloaded_videos', { keyPath: 'id' });
        }
      }
    });
  }
  return dbPromise;
}

export async function saveMediaBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await getIndexedDB();
    await db.put('media_blobs', {
      id,
      blob,
      mimeType: blob.type,
      size: blob.size,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[IndexedDB] Error saving media blob:', err);
  }
}

export async function getMediaBlob(id: string): Promise<Blob | null> {
  try {
    const db = await getIndexedDB();
    const item = await db.get('media_blobs', id);
    return item ? item.blob : null;
  } catch (err) {
    console.warn('[IndexedDB] Error getting media blob:', err);
    return null;
  }
}

export async function deleteMediaBlob(id: string): Promise<void> {
  try {
    const db = await getIndexedDB();
    await db.delete('media_blobs', id);
  } catch (err) {
    console.warn('[IndexedDB] Error deleting media blob:', err);
  }
}

export async function saveOfflineItem<T = any>(key: string, data: T): Promise<void> {
  try {
    const db = await getIndexedDB();
    await db.put('offline_records', { key, data, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn(`[IndexedDB] Error saving offline item (${key}):`, err);
  }
}

export async function getOfflineItem<T = any>(key: string): Promise<T | null> {
  try {
    const db = await getIndexedDB();
    const item = await db.get('offline_records', key);
    return item ? (item.data as T) : null;
  } catch (err) {
    console.warn(`[IndexedDB] Error getting offline item (${key}):`, err);
    return null;
  }
}

export async function clearIndexedDBStorage(): Promise<void> {
  try {
    const db = await getIndexedDB();
    await db.clear('media_blobs');
    await db.clear('offline_records');
    await db.clear('downloaded_videos');
    console.log('[IndexedDB] Successfully purged all IndexedDB stores.');
  } catch (err) {
    console.warn('[IndexedDB] Error clearing IndexedDB stores:', err);
  }
}

export async function getIndexedDBStorageEstimate(): Promise<{ count: number; totalBytes: number; formattedMB: string }> {
  try {
    const db = await getIndexedDB();
    const mediaBlobs: StoredMediaBlob[] = await db.getAll('media_blobs');
    let totalBytes = 0;
    for (const item of mediaBlobs) {
      totalBytes += item.size || 0;
    }
    const formattedMB = (totalBytes / (1024 * 1024)).toFixed(2);
    return {
      count: mediaBlobs.length,
      totalBytes,
      formattedMB
    };
  } catch (err) {
    return { count: 0, totalBytes: 0, formattedMB: '0.00' };
  }
}
