// Firestore persistence. Lazy-loads the SDK so the dependency stays optional.
// See docs/adr/0006.
//
// Activated when PERSISTENCE=firestore. Credentials come from the default
// google-cloud auth chain (GOOGLE_APPLICATION_CREDENTIALS, GCE metadata, etc.).

import type { GameRoom } from '../GameRoom.js';
import type { RoomRepository, RoomSnapshot } from './repository.js';

interface FirestoreLike {
  collection: (name: string) => CollectionLike;
}
interface CollectionLike {
  doc: (id: string) => DocLike;
}
interface DocLike {
  set: (data: any) => Promise<unknown>;
  get: () => Promise<{ exists: boolean; data: () => any }>;
  delete: () => Promise<unknown>;
}

const COLLECTION = 'munchkin_rooms';

export class FirestoreRoomRepository implements RoomRepository {
  private dbPromise: Promise<FirestoreLike | null> | null = null;

  private async db(): Promise<FirestoreLike | null> {
    if (!this.dbPromise) {
      this.dbPromise = (async (): Promise<FirestoreLike | null> => {
        try {
          const mod = await import('@google-cloud/firestore');
          const Firestore = (mod as any).Firestore;
          const projectId = process.env.FIRESTORE_PROJECT_ID;
          const f = projectId ? new Firestore({ projectId }) : new Firestore();
          return f as FirestoreLike;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Firestore SDK unavailable; falling back to no-op persistence.', (e as Error).message);
          return null;
        }
      })();
    }
    return this.dbPromise;
  }

  async save(room: GameRoom): Promise<void> {
    const db = await this.db();
    if (!db) return;
    try {
      await db.collection(COLLECTION).doc(room.code).set(room.serialize());
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Firestore save failed:', (e as Error).message);
    }
  }

  async load(code: string): Promise<RoomSnapshot | null> {
    const db = await this.db();
    if (!db) return null;
    try {
      const snap = await db.collection(COLLECTION).doc(code).get();
      if (!snap.exists) return null;
      return snap.data() as RoomSnapshot;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Firestore load failed:', (e as Error).message);
      return null;
    }
  }

  async delete(code: string): Promise<void> {
    const db = await this.db();
    if (!db) return;
    try {
      await db.collection(COLLECTION).doc(code).delete();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Firestore delete failed:', (e as Error).message);
    }
  }

  async available(): Promise<boolean> {
    return !!(await this.db());
  }
}

export function makeRepository(): RoomRepository | null {
  if (process.env.PERSISTENCE === 'firestore') return new FirestoreRoomRepository();
  return null;
}
