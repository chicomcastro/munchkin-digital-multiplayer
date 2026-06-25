import { describe, it, expect, afterEach } from 'vitest';
import { startOfflineGame, endOfflineGame, isOfflineActive, getOfflineGame, OFFLINE_ROOM_CODE, resumeOfflineGame, hasSavedOfflineGame } from './manager';
import { getSocket } from '../hooks/useSocket';
import { clearOfflineGame, loadOfflineGame } from './storage';

afterEach(async () => {
  endOfflineGame({ clearSaved: true });
  await clearOfflineGame();
});

describe('offline manager', () => {
  it('OFFLINE_ROOM_CODE is a stable identifier', () => {
    expect(OFFLINE_ROOM_CODE).toBe('LOCAL');
  });

  it('startOfflineGame creates a local game with the requested bot lineup', () => {
    const { playerId } = startOfflineGame({ name: 'Alice', difficulties: ['easy', 'normal'] });
    expect(playerId).toBeTruthy();
    expect(isOfflineActive()).toBe(true);
    const game = getOfflineGame()!;
    expect(game.state.players).toHaveLength(3);
    expect(game.state.players.filter((p) => p.isBot)).toHaveLength(2);
  });

  it('installs itself as the socket override so emit() routes locally', () => {
    startOfflineGame({ name: 'Alice', difficulties: ['easy'] });
    expect(getSocket()).toBe(getOfflineGame());
  });

  it('endOfflineGame tears down the game and clears the override', () => {
    startOfflineGame({ name: 'Alice', difficulties: ['easy'] });
    endOfflineGame();
    expect(isOfflineActive()).toBe(false);
    // getSocket would build a real Socket.IO here; in tests we just check it
    // is no longer the LocalGame.
    const s = getSocket();
    expect(s).not.toBe(getOfflineGame());
  });

  it('replaces an existing local game when called twice', () => {
    startOfflineGame({ name: 'Alice', difficulties: ['easy'] });
    const first = getOfflineGame();
    startOfflineGame({ name: 'Bob', difficulties: ['hard'] });
    expect(getOfflineGame()).not.toBe(first);
  });

  it('persists the game to IndexedDB on broadcast and resumes from it', async () => {
    const { playerId } = startOfflineGame({ name: 'Alice', difficulties: ['easy'] });
    // Force a state change so the debounced save fires.
    getOfflineGame()!.emit('room:start');
    await new Promise((r) => setTimeout(r, 500));
    expect(await hasSavedOfflineGame()).toBe(true);

    // Tear down without clearing storage.
    endOfflineGame();
    expect(isOfflineActive()).toBe(false);

    // Now resume — should pick up the same playerId and restore phase.
    const resumed = await resumeOfflineGame();
    expect(resumed).not.toBeNull();
    expect(resumed!.playerId).toBe(playerId);
    expect(isOfflineActive()).toBe(true);
    expect(getOfflineGame()!.room.phase).toBe('playing');
  });

  it('resumeOfflineGame returns null when no save exists', async () => {
    const result = await resumeOfflineGame();
    expect(result).toBeNull();
  });

  it('clearSaved=true on endOfflineGame wipes the saved record', async () => {
    startOfflineGame({ name: 'Alice', difficulties: ['easy'] });
    getOfflineGame()!.emit('room:start');
    await new Promise((r) => setTimeout(r, 500));
    expect(await hasSavedOfflineGame()).toBe(true);
    endOfflineGame({ clearSaved: true });
    // Give the async clear a moment to settle.
    await new Promise((r) => setTimeout(r, 50));
    expect(await loadOfflineGame()).toBeNull();
  });
});
