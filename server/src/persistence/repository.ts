// Persistence interface — both in-memory and Firestore implementations
// behave the same from GameRoom's perspective. See docs/adr/0006.

import type { GameRoom } from '../GameRoom.js';

export interface RoomRepository {
  /** Insert or replace the persisted snapshot of a room. */
  save(room: GameRoom): Promise<void>;
  /** Look up a serialised room snapshot by code. */
  load(code: string): Promise<RoomSnapshot | null>;
  /** Drop the room from persistence. */
  delete(code: string): Promise<void>;
  /** Optional health check (for /health). */
  available(): Promise<boolean>;
}

/**
 * Plain-object representation of a GameRoom. Anything that touches the
 * persistence layer must be JSON-serialisable.
 */
export interface RoomSnapshot {
  code: string;
  config: unknown;
  phase: string;
  turnPhase: string;
  turn: number;
  activePlayerId: string | null;
  players: unknown[];
  market: unknown[];
  threatTrack: number;
  coopMonstersDefeated: number;
  coopBossHpRemaining: number;
  log: unknown[];
  combatState: unknown;
  winnerId: string | null;
  // Decks serialised as their card arrays so we can reconstitute exactly.
  doorsCards: unknown[];
  doorsDiscard: unknown[];
  treasuresCards: unknown[];
  treasuresDiscard: unknown[];
  creatorId: string | null;
  savedAt: number;
}
