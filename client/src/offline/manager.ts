import { setSocketOverride } from '../hooks/useSocket';
import { LocalGame } from './LocalGame';
import type { RoomConfig } from '../types';
import type { BotDifficulty } from '@core/bots/policy.js';
import { clearOfflineGame, loadOfflineGame } from './storage';

export const OFFLINE_ROOM_CODE = 'LOCAL';

let current: LocalGame | null = null;

export interface StartOfflineOptions {
  name: string;
  difficulties: BotDifficulty[];   // one per bot (count = length)
  config?: Partial<RoomConfig>;
}

/**
 * Spin up an in-browser game with the given human player and bot lineup,
 * route the socket transport through it, and return the human's id so the
 * caller can finalize the session.
 */
export function startOfflineGame({ name, difficulties, config }: StartOfflineOptions): { playerId: string } {
  if (current) {
    current.dispose();
    current = null;
  }
  const seatCount = Math.max(2, 1 + difficulties.length);
  const game = new LocalGame(name, { playerCount: seatCount, ...(config ?? {}) });
  difficulties.forEach((d, i) => game.addBot(d, `Bot ${i + 1}`));
  setSocketOverride(game);
  current = game;
  // setSocketOverride causes hooks to re-bind their listeners; queue a
  // re-broadcast on the next tick so they receive the initial snapshot.
  queueMicrotask(() => { try { game.rebroadcast(); } catch { /* disposed */ } });
  return { playerId: game.humanId };
}

export function isOfflineActive(): boolean {
  return current != null;
}

export function getOfflineGame(): LocalGame | null {
  return current;
}

export function endOfflineGame(opts: { clearSaved?: boolean } = {}): void {
  if (current) {
    current.dispose();
    current = null;
  }
  setSocketOverride(null);
  if (opts.clearSaved) void clearOfflineGame();
}

/**
 * Restore a previously-saved offline game from IndexedDB and install it
 * as the active transport. Returns the human player's id or null when no
 * save is present (or storage is unavailable).
 */
export async function resumeOfflineGame(): Promise<{ playerId: string } | null> {
  const saved = await loadOfflineGame();
  if (!saved) return null;
  if (current) {
    current.dispose();
    current = null;
  }
  const game = LocalGame.fromSnapshot(saved.snapshot, saved.humanId);
  setSocketOverride(game);
  current = game;
  queueMicrotask(() => { try { game.rebroadcast(); } catch { /* disposed */ } });
  return { playerId: game.humanId };
}

export function hasSavedOfflineGame(): Promise<boolean> {
  return loadOfflineGame().then((s) => !!s);
}
