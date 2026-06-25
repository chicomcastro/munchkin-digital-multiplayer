import type { RoomSnapshotInternal } from '@core/GameRoom.js';

/**
 * Single-game persistence for the offline mode. One slot, keyed by 'current'.
 * IndexedDB is used (not localStorage) so the GameRoom snapshot — which
 * routinely runs into kilobytes once decks are populated — fits comfortably
 * and round-trips structured data without the JSON.stringify ceremony.
 */

const DB_NAME = 'munchkin-offline';
const DB_VERSION = 1;
const STORE = 'games';
const KEY = 'current';

export interface SavedOfflineGame {
  snapshot: RoomSnapshotInternal;
  humanId: string;
  /** Wall-clock timestamp of the save (Date.now()). */
  savedAt: number;
  /** Bumped on schema changes so old saves can be invalidated. */
  schemaVersion: 1;
}

type IDBLike = IDBDatabase | null;

let dbPromise: Promise<IDBLike> | null = null;

function isAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBLike> {
  if (!isAvailable()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBLike>((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

export async function saveOfflineGame(record: SavedOfflineGame): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
}

export async function loadOfflineGame(): Promise<SavedOfflineGame | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise<SavedOfflineGame | null>((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => {
      const value = req.result as SavedOfflineGame | undefined;
      if (!value || value.schemaVersion !== 1) {
        resolve(null);
        return;
      }
      resolve(value);
    };
    req.onerror = () => resolve(null);
  });
}

export async function clearOfflineGame(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
}

/** Reset cached connection, used by tests between runs. */
export function _resetForTesting() {
  dbPromise = null;
}
