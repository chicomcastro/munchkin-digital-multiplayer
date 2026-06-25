import { describe, it, expect } from 'vitest';
import { nanoid } from 'nanoid';
import { HardPolicy } from './hard.js';
import { GameRoom } from '../GameRoom.js';
import type { Card, CombatState } from '../types.js';

function startedRoom() {
  const room = new GameRoom({ variant: 'long', playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0 });
  const a = room.addPlayer('A', 'sa');
  const b = room.addPlayer('B', 'sb');
  room.start();
  return { room, a, b };
}

function makeCard(over: Partial<Card> = {}): Card {
  return { id: nanoid(6), type: 'item', deck: 'treasure', name: 'X', description: '', ...over };
}

describe('HardPolicy', () => {
  it('reports hard difficulty', () => {
    expect(new HardPolicy().difficulty).toBe('hard');
  });

  it('fights when already winning, no boost needed', () => {
    const { room, a } = startedRoom();
    const player = room.players.find((p) => p.id === a.id)!;
    player.hand = [];
    room.combatState = {
      attackerId: a.id,
      monsters: [makeCard({ type: 'monster', deck: 'door', level: 2, treasures: 1, levelsAwarded: 1 })],
      monsterPower: 2,
      playerPower: 5,
      alliedPlayerId: null,
      cardsPlayedThisRound: [],
      resolved: false,
      result: 'pending',
      fleeBonus: 0,
    } satisfies CombatState;
    (room as unknown as { turnPhase: string }).turnPhase = 'combat';
    const action = new HardPolicy().decide({ room, playerId: a.id, rng: () => 0.5 });
    expect(action.kind).toBe('fight');
  });

  it('plays a boost card when it flips a losing combat', () => {
    const { room, a } = startedRoom();
    const player = room.players.find((p) => p.id === a.id)!;
    const boost = makeCard({ type: 'oneShot', combatBonus: 6, name: 'Big Boost' });
    player.hand = [boost];
    room.combatState = {
      attackerId: a.id,
      monsters: [makeCard({ type: 'monster', deck: 'door', level: 4, treasures: 1, levelsAwarded: 1 })],
      monsterPower: 4,
      playerPower: 2,
      alliedPlayerId: null,
      cardsPlayedThisRound: [],
      resolved: false,
      result: 'pending',
      fleeBonus: 0,
    } satisfies CombatState;
    (room as unknown as { turnPhase: string }).turnPhase = 'combat';
    const action = new HardPolicy().decide({ room, playerId: a.id, rng: () => 0.5 });
    expect(action.kind).toBe('playCard');
    if (action.kind === 'playCard') expect(action.cardId).toBe(boost.id);
  });

  it('prefers fleeing a deadly monster with no boost cards', () => {
    const { room, a } = startedRoom();
    const player = room.players.find((p) => p.id === a.id)!;
    player.hand = [];
    room.combatState = {
      attackerId: a.id,
      monsters: [makeCard({ type: 'monster', deck: 'door', level: 18, badStuff: 'death — death', treasures: 3, levelsAwarded: 3 })],
      monsterPower: 18,
      playerPower: 2,
      alliedPlayerId: null,
      cardsPlayedThisRound: [],
      resolved: false,
      result: 'pending',
      fleeBonus: 0,
    } satisfies CombatState;
    (room as unknown as { turnPhase: string }).turnPhase = 'combat';
    const action = new HardPolicy().decide({ room, playerId: a.id, rng: () => 0.5 });
    expect(action.kind).toBe('flee');
  });

  it('looks for trouble when the monster in hand is clearly winnable', () => {
    const { room, a } = startedRoom();
    const player = room.players.find((p) => p.id === a.id)!;
    player.combatPower = 12;
    const weak = makeCard({ type: 'monster', deck: 'door', level: 2, levelsAwarded: 2 });
    player.hand = [weak];
    (room as unknown as { turnPhase: string }).turnPhase = 'lookForTroubleOrLoot';
    const action = new HardPolicy().decide({ room, playerId: a.id, rng: () => 0.9 });
    expect(action.kind).toBe('playCard');
    if (action.kind === 'playCard') expect(action.cardId).toBe(weak.id);
  });

  it('shouldHelp accepts when the combat is flippable and the prize is worth it', () => {
    const { room, a } = startedRoom();
    const player = room.players.find((p) => p.id === a.id)!;
    player.combatPower = 5;
    room.combatState = {
      attackerId: 'someone-else',
      monsters: [makeCard({ type: 'monster', deck: 'door', level: 6, treasures: 2, levelsAwarded: 1 })],
      monsterPower: 6,
      playerPower: 2,
      alliedPlayerId: null,
      cardsPlayedThisRound: [],
      resolved: false,
      result: 'pending',
      fleeBonus: 0,
    } satisfies CombatState;
    expect(new HardPolicy().shouldHelp!({ room, playerId: a.id, rng: () => 0.5 })).toBe(true);
  });

  it('shouldHelp refuses when the helper would not flip the combat', () => {
    const { room, a } = startedRoom();
    const player = room.players.find((p) => p.id === a.id)!;
    player.combatPower = 1;
    room.combatState = {
      attackerId: 'someone-else',
      monsters: [makeCard({ type: 'monster', deck: 'door', level: 18, treasures: 4, levelsAwarded: 3 })],
      monsterPower: 18,
      playerPower: 2,
      alliedPlayerId: null,
      cardsPlayedThisRound: [],
      resolved: false,
      result: 'pending',
      fleeBonus: 0,
    } satisfies CombatState;
    expect(new HardPolicy().shouldHelp!({ room, playerId: a.id, rng: () => 0.5 })).toBe(false);
  });

  it('passes when it is not the bot turn in combat', () => {
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
    const action = new HardPolicy().decide({ room, playerId: a.id, rng: () => 0.5 });
    expect(action.kind).toBe('pass');
  });
});
