import { describe, it, expect, vi } from 'vitest';
import { LocalGame } from './LocalGame';

function buildGame(humanName = 'Alice') {
  const g = new LocalGame(humanName, { playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0 });
  g.addBot('easy', 'BotEasy');
  return g;
}

describe('LocalGame', () => {
  it('puts the human and the bots in the same room', () => {
    const g = buildGame();
    const snapshot = g.state;
    expect(snapshot.players).toHaveLength(2);
    expect(snapshot.players[0]!.name).toBe('Alice');
    expect(snapshot.players[1]!.isBot).toBe(true);
    g.dispose();
  });

  it('emits game:stateUpdate and game:yourHand when the room state changes', () => {
    const g = buildGame();
    const states: any[] = [];
    const hands: any[] = [];
    g.on('game:stateUpdate', (s) => states.push(s));
    g.on('game:yourHand', (h) => hands.push(h));
    // Force a state change by emitting an action while in lobby.
    g.emit('room:updateConfig', { listeningAtTheDoor: true });
    expect(states.length).toBeGreaterThan(0);
    expect(hands.length).toBeGreaterThan(0);
    g.dispose();
  });

  it('reports an error via the ack and via the error event on invalid actions', () => {
    const g = buildGame();
    const ack = vi.fn();
    const onErr = vi.fn();
    g.on('error', onErr);
    g.emit('game:kickDoor', undefined, ack); // game has not started
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
    expect(onErr).toHaveBeenCalled();
    g.dispose();
  });

  it('routes room:start through to GameRoom.start', () => {
    const g = buildGame();
    g.emit('room:start');
    expect(g.state.phase).toBe('playing');
    g.dispose();
  });

  it('off removes a previously-registered handler', () => {
    const g = buildGame();
    const handler = vi.fn();
    g.on('game:stateUpdate', handler);
    g.off('game:stateUpdate', handler);
    g.emit('room:updateConfig', { listeningAtTheDoor: true });
    expect(handler).not.toHaveBeenCalled();
    g.dispose();
  });

  it('throws on unsupported events', () => {
    const g = buildGame();
    const ack = vi.fn();
    g.emit('garbage:event', undefined, ack);
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false, error: expect.stringMatching(/Unsupported/) }));
    g.dispose();
  });

  it('connected is true throughout the lifetime', () => {
    const g = buildGame();
    expect(g.connected).toBe(true);
    g.dispose();
  });
});
