import { describe, it, expect, afterEach } from 'vitest';
import { _resetForTesting, clearOfflineGame, loadOfflineGame, saveOfflineGame } from './storage';

afterEach(async () => {
  await clearOfflineGame();
  _resetForTesting();
});

const sampleSnapshot = {
  code: 'MNK-OFFLINE',
  config: { variant: 'long' as const, playerCount: 2 },
  phase: 'playing' as const,
  turnPhase: 'turnStart' as const,
  turn: 3,
  activePlayerId: 'p1',
  players: [],
  market: [],
  threatTrack: 0,
  coopMonstersDefeated: 0,
  coopBossHpRemaining: 0,
  log: [],
  combatState: null,
  winnerId: null,
  doorsCards: [],
  doorsDiscard: [],
  treasuresCards: [],
  treasuresDiscard: [],
  creatorId: null,
  savedAt: 0,
} as any;

describe('offline storage (IndexedDB)', () => {
  it('returns null when nothing is saved', async () => {
    expect(await loadOfflineGame()).toBeNull();
  });

  it('round-trips a saved game record', async () => {
    await saveOfflineGame({
      snapshot: sampleSnapshot,
      humanId: 'p1',
      savedAt: 1234,
      schemaVersion: 1,
    });
    const loaded = await loadOfflineGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.humanId).toBe('p1');
    expect(loaded!.snapshot.code).toBe('MNK-OFFLINE');
    expect(loaded!.snapshot.turn).toBe(3);
  });

  it('clearOfflineGame removes the saved record', async () => {
    await saveOfflineGame({ snapshot: sampleSnapshot, humanId: 'p1', savedAt: 1, schemaVersion: 1 });
    await clearOfflineGame();
    expect(await loadOfflineGame()).toBeNull();
  });

  it('ignores records with a different schemaVersion', async () => {
    // Bypass type with `as any` since we are intentionally writing a bad shape.
    await saveOfflineGame({ snapshot: sampleSnapshot, humanId: 'p1', savedAt: 1, schemaVersion: 999 as any });
    expect(await loadOfflineGame()).toBeNull();
  });
});
