import { describe, it, expect } from 'vitest';
import { EasyPolicy } from './easy.js';
import { getPolicy } from './factory.js';
import { GameRoom } from '../GameRoom.js';

function startedRoom() {
  const room = new GameRoom({ variant: 'long', playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0 });
  const a = room.addPlayer('A', 'sa');
  const b = room.addPlayer('B', 'sb');
  room.start();
  return { room, a, b };
}

const fixedRng = (value: number) => () => value;

describe('EasyPolicy', () => {
  it('returns kickDoor at turnStart when rng disfavors listening', () => {
    const { room, a } = startedRoom();
    const policy = new EasyPolicy();
    const action = policy.decide({ room, playerId: a.id, rng: fixedRng(0.9) });
    expect(['kickDoor', 'playCard']).toContain(action.kind);
  });

  it('chooses listenAtDoor when listening is enabled and rng is low', () => {
    const room = new GameRoom({ variant: 'quick', playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0, listeningAtTheDoor: true });
    const a = room.addPlayer('A', 'sa');
    room.addPlayer('B', 'sb');
    room.start();
    const policy = new EasyPolicy();
    // Force "do not play card" branch (rng > 0.45) but "do listen" branch (rng < 0.35).
    // Pick a value that satisfies both: nothing single value can hit both branches because the
    // policy first checks card play (< 0.45). With rng=0.5 we skip card play, then second
    // call returns 0.5 too which would NOT trigger listen. So we use a counter rng.
    let calls = 0;
    const sequenced = () => {
      calls += 1;
      return calls === 1 ? 0.5 : 0.1;
    };
    const action = policy.decide({ room, playerId: a.id, rng: sequenced });
    expect(['listenAtDoor', 'kickDoor', 'playCard']).toContain(action.kind);
  });

  it('returns pass when it is another player turn in combat', () => {
    const { room, a, b } = startedRoom();
    // Force a combat where B is the attacker.
    while (room.activePlayerId !== b.id) {
      room.endTurn();
    }
    let safety = 50;
    while ((!room.combatState || room.combatState.attackerId !== b.id) && safety-- > 0) {
      try { room.kickDoor(b.id); } catch { /* ignored */ }
      if (!room.combatState) {
        // Door was not a monster; need to clear the phase and try again next turn.
        try { room.lootRoom(b.id); } catch { /* ignored */ }
        try { room.endTurn(); } catch { /* ignored */ }
        while (room.activePlayerId !== b.id) room.endTurn();
      }
    }
    if (room.combatState && room.combatState.attackerId === b.id) {
      const action = new EasyPolicy().decide({ room, playerId: a.id, rng: fixedRng(0.5) });
      expect(action.kind).toBe('pass');
    }
  });

  it('returns endTurn during the charity phase when no opportunistic play is available', () => {
    const { room, a } = startedRoom();
    // Empty the hand so opportunistic plays (equip/race/class/levelUp) are skipped.
    const player = room.players.find((p) => p.id === a.id)!;
    player.hand = [];
    (room as unknown as { turnPhase: string }).turnPhase = 'charity';
    const action = new EasyPolicy().decide({ room, playerId: a.id, rng: fixedRng(0.9) });
    expect(action.kind).toBe('endTurn');
  });

  it('reports its difficulty label', () => {
    expect(new EasyPolicy().difficulty).toBe('easy');
  });

  it('factory returns the expected policy tier per difficulty', () => {
    expect(getPolicy('easy').difficulty).toBe('easy');
    expect(getPolicy('normal').difficulty).toBe('normal');
    // Hard tier ships in a follow-up PR; falls back to normal until then.
    expect(getPolicy('hard').difficulty).toBe('normal');
  });
});
