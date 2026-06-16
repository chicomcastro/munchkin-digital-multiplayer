import { describe, it, expect } from 'vitest';
import { NormalPolicy } from './normal.js';
import { GameRoom } from '../GameRoom.js';
import { nanoid } from 'nanoid';
import type { Card, CombatState } from '../types.js';

function startedRoom() {
  const room = new GameRoom({ variant: 'long', playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0 });
  const a = room.addPlayer('A', 'sa');
  const b = room.addPlayer('B', 'sb');
  room.start();
  return { room, a, b };
}

function makeCard(over: Partial<Card> = {}): Card {
  return {
    id: nanoid(6),
    type: 'item',
    deck: 'treasure',
    name: 'X',
    description: '',
    ...over,
  };
}

describe('NormalPolicy', () => {
  it('reports normal difficulty', () => {
    expect(new NormalPolicy().difficulty).toBe('normal');
  });

  it('plays a boost card in combat when it would flip the result', () => {
    const { room, a } = startedRoom();
    const boost = makeCard({ type: 'oneShot', combatBonus: 5, name: 'Big Boost' });
    const player = room.players.find((p) => p.id === a.id)!;
    player.hand = [boost];
    room.combatState = {
      attackerId: a.id,
      monsters: [makeCard({ type: 'monster', deck: 'door', level: 5 })],
      monsterPower: 5,
      playerPower: 2,
      alliedPlayerId: null,
      cardsPlayedThisRound: [],
      resolved: false,
      result: 'pending',
      fleeBonus: 0,
    } satisfies CombatState;
    (room as unknown as { turnPhase: string }).turnPhase = 'combat';
    const action = new NormalPolicy().decide({ room, playerId: a.id, rng: () => 0.5 });
    expect(action.kind).toBe('playCard');
    if (action.kind === 'playCard') expect(action.cardId).toBe(boost.id);
  });

  it('fights when winning even without boost cards', () => {
    const { room, a } = startedRoom();
    const player = room.players.find((p) => p.id === a.id)!;
    player.hand = [];
    room.combatState = {
      attackerId: a.id,
      monsters: [makeCard({ type: 'monster', deck: 'door', level: 1 })],
      monsterPower: 1,
      playerPower: 3,
      alliedPlayerId: null,
      cardsPlayedThisRound: [],
      resolved: false,
      result: 'pending',
      fleeBonus: 0,
    } satisfies CombatState;
    (room as unknown as { turnPhase: string }).turnPhase = 'combat';
    const action = new NormalPolicy().decide({ room, playerId: a.id, rng: () => 0.5 });
    expect(action.kind).toBe('fight');
  });

  it('flees when losing badly with no boost cards', () => {
    const { room, a } = startedRoom();
    const player = room.players.find((p) => p.id === a.id)!;
    player.hand = [];
    room.combatState = {
      attackerId: a.id,
      monsters: [makeCard({ type: 'monster', deck: 'door', level: 10 })],
      monsterPower: 10,
      playerPower: 1,
      alliedPlayerId: null,
      cardsPlayedThisRound: [],
      resolved: false,
      result: 'pending',
      fleeBonus: 0,
    } satisfies CombatState;
    (room as unknown as { turnPhase: string }).turnPhase = 'combat';
    const action = new NormalPolicy().decide({ room, playerId: a.id, rng: () => 0.5 });
    expect(action.kind).toBe('flee');
  });

  it('passes during combat when it is not the bot turn', () => {
    const { room, a, b } = startedRoom();
    room.combatState = {
      attackerId: b.id,
      monsters: [makeCard({ type: 'monster', deck: 'door', level: 3 })],
      monsterPower: 3,
      playerPower: 1,
      alliedPlayerId: null,
      cardsPlayedThisRound: [],
      resolved: false,
      result: 'pending',
      fleeBonus: 0,
    } satisfies CombatState;
    (room as unknown as { turnPhase: string }).turnPhase = 'combat';
    const action = new NormalPolicy().decide({ room, playerId: a.id, rng: () => 0.5 });
    expect(action.kind).toBe('pass');
  });

  it('aggressively sells late-game when close to winLevel', () => {
    const { room, a } = startedRoom();
    const player = room.players.find((p) => p.id === a.id)!;
    player.hand = [];
    player.equipped = [
      makeCard({ value: 600 }),
      makeCard({ value: 500 }),
    ];
    player.level = room.config.winLevel - 2;
    (room as unknown as { turnPhase: string }).turnPhase = 'lookForTroubleOrLoot';
    const action = new NormalPolicy().decide({ room, playerId: a.id, rng: () => 0.99 });
    expect(action.kind).toBe('sellItems');
  });

  it('plays an unequipped item when one is in hand', () => {
    const { room, a } = startedRoom();
    const player = room.players.find((p) => p.id === a.id)!;
    const item = makeCard({ type: 'item', bonus: 2, slot: 'hand' });
    player.hand = [item];
    player.equipped = [];
    (room as unknown as { turnPhase: string }).turnPhase = 'lookForTroubleOrLoot';
    const action = new NormalPolicy().decide({ room, playerId: a.id, rng: () => 0.99 });
    expect(action.kind).toBe('playCard');
    if (action.kind === 'playCard') expect(action.cardId).toBe(item.id);
  });
});
