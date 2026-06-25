import { describe, it, expect, afterEach } from 'vitest';
import { startOfflineGame, endOfflineGame, isOfflineActive, getOfflineGame, OFFLINE_ROOM_CODE } from './manager';
import { getSocket } from '../hooks/useSocket';

afterEach(() => endOfflineGame());

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
});
