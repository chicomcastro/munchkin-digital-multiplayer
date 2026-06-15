import { describe, it, expect, vi } from 'vitest';
import { applyBotAction, IllegalBotAction } from './dispatcher.js';
import { GameRoom } from '../GameRoom.js';

function startedRoom() {
  const room = new GameRoom({ variant: 'long', playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0 });
  const a = room.addPlayer('A', 'sa');
  const b = room.addPlayer('B', 'sb');
  room.start();
  return { room, a, b };
}

describe('applyBotAction', () => {
  it('dispatches each kind to the corresponding GameRoom method', () => {
    const { room, a } = startedRoom();
    const spies = {
      kickDoor: vi.spyOn(room, 'kickDoor').mockImplementation(() => {}),
      listenAtDoor: vi.spyOn(room, 'listenAtDoor').mockImplementation(() => {}),
      resolveCombat: vi.spyOn(room, 'resolveCombat').mockImplementation(() => {}),
      flee: vi.spyOn(room, 'flee').mockImplementation(() => {}),
      lootRoom: vi.spyOn(room, 'lootRoom').mockImplementation(() => {}),
      endTurn: vi.spyOn(room, 'endTurn').mockImplementation(() => null),
      playCard: vi.spyOn(room, 'playCard').mockImplementation(() => {}),
      sellItems: vi.spyOn(room, 'sellItems').mockImplementation(() => {}),
      helpInCombat: vi.spyOn(room, 'helpInCombat').mockImplementation(() => {}),
    };
    applyBotAction(room, a.id, { kind: 'kickDoor' });
    applyBotAction(room, a.id, { kind: 'listenAtDoor' });
    applyBotAction(room, a.id, { kind: 'fight' });
    applyBotAction(room, a.id, { kind: 'flee' });
    applyBotAction(room, a.id, { kind: 'lootRoom' });
    applyBotAction(room, a.id, { kind: 'endTurn' });
    applyBotAction(room, a.id, { kind: 'playCard', cardId: 'xx' });
    applyBotAction(room, a.id, { kind: 'sellItems', cardIds: ['c1'] });
    applyBotAction(room, a.id, { kind: 'helpInCombat' });
    applyBotAction(room, a.id, { kind: 'pass' });
    expect(spies.kickDoor).toHaveBeenCalled();
    expect(spies.listenAtDoor).toHaveBeenCalled();
    expect(spies.resolveCombat).toHaveBeenCalledWith(a.id);
    expect(spies.flee).toHaveBeenCalledWith(a.id);
    expect(spies.lootRoom).toHaveBeenCalledWith(a.id);
    expect(spies.endTurn).toHaveBeenCalled();
    expect(spies.playCard).toHaveBeenCalledWith(a.id, 'xx', undefined);
    expect(spies.sellItems).toHaveBeenCalledWith(a.id, ['c1']);
    expect(spies.helpInCombat).toHaveBeenCalledWith(a.id);
  });

  it('wraps GameRoom errors in IllegalBotAction', () => {
    const { room, a } = startedRoom();
    // The acting player is A. Asking B to fight raises "Not your turn"-style errors.
    expect(() => applyBotAction(room, 'no-such-id', { kind: 'kickDoor' })).toThrow(IllegalBotAction);
  });
});
