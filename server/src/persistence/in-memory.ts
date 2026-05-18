// Default in-memory persistence — fine for local dev and the
// single-instance Cloud Run deployment.
import type { GameRoom } from '../GameRoom.js';
import type { RoomRepository, RoomSnapshot } from './repository.js';

export class InMemoryRoomRepository implements RoomRepository {
  private readonly store = new Map<string, RoomSnapshot>();

  async save(room: GameRoom): Promise<void> {
    this.store.set(room.code, room.serialize());
  }

  async load(code: string): Promise<RoomSnapshot | null> {
    return this.store.get(code) ?? null;
  }

  async delete(code: string): Promise<void> {
    this.store.delete(code);
  }

  async available(): Promise<boolean> {
    return true;
  }
}
