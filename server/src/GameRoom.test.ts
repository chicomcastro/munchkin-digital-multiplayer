import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameRoom } from './GameRoom.js';
import {
  buildTestRoom,
  curse,
  clazz,
  helper,
  item,
  levelUp,
  monster,
  oneShot,
  pushTop,
  race,
} from './test-helpers.js';

describe('GameRoom — lobby & lifecycle', () => {
  it('generates a room code with MNK- prefix', () => {
    const r = new GameRoom();
    expect(r.code.startsWith('MNK-')).toBe(true);
    expect(r.code.length).toBe(7);
  });

  it('applies variant on construction', () => {
    const r = new GameRoom({ variant: 'quick' });
    expect(r.config.winLevel).toBe(6);
    expect(r.config.startingHandDoors).toBe(5);
  });

  it('addPlayer assigns sequential colors and IDs', () => {
    const r = new GameRoom({ playerCount: 3 });
    const a = r.addPlayer('Alice', 'sA');
    const b = r.addPlayer('Bob', 'sB');
    expect(a.color).not.toBe(b.color);
    expect(a.id).not.toBe(b.id);
    expect(a.name).toBe('Alice');
  });

  it('truncates long names to 24 chars', () => {
    const r = new GameRoom();
    const p = r.addPlayer('A'.repeat(40), 's');
    expect(p.name.length).toBe(24);
  });

  it('falls back to "Player N" for empty names', () => {
    const r = new GameRoom();
    const p = r.addPlayer('', 's');
    expect(p.name).toMatch(/^Player /);
  });

  it('first joining player becomes creator', () => {
    const r = new GameRoom();
    const a = r.addPlayer('A', 'sA');
    const b = r.addPlayer('B', 'sB');
    expect(r.isCreator(a.id)).toBe(true);
    expect(r.isCreator(b.id)).toBe(false);
  });

  it('rejects players when room is full', () => {
    const r = new GameRoom({ playerCount: 2 });
    r.addPlayer('A', 'sA');
    r.addPlayer('B', 'sB');
    expect(() => r.addPlayer('C', 'sC')).toThrow(/full/i);
  });

  it('rejects players after start', () => {
    const { room } = buildTestRoom({
      players: 2,
      doors: [monster(), monster()],
      treasures: [item(), item(), item(), item(), item(), item(), item(), item()],
    });
    room.start();
    expect(() => room.addPlayer('C', 'sC')).toThrow(/already started/i);
  });

  it('reconnect refreshes the socketId', () => {
    const r = new GameRoom();
    const p = r.addPlayer('A', 'old');
    const re = r.reconnect(p.id, 'new');
    expect(re?.socketId).toBe('new');
    expect(r.reconnect('missing', 's')).toBeNull();
  });

  it('disconnect nulls out the socketId', () => {
    const r = new GameRoom();
    const p = r.addPlayer('A', 'sA');
    r.disconnect('sA');
    expect(r.players.find((x) => x.id === p.id)?.socketId).toBeNull();
    // No-op for unknown
    r.disconnect('unknown');
  });

  it('updateConfig is applied through applyVariant in the lobby', () => {
    // Use cooperative variant since it doesn't override playerCount.
    const r = new GameRoom({ variant: 'cooperative' });
    r.addPlayer('A', 'sA');
    r.addPlayer('B', 'sB');
    r.updateConfig({ playerCount: 5 });
    expect(r.config.playerCount).toBe(5);
  });

  it('updateConfig becomes a no-op after start', () => {
    const { room } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    const before = room.config.winLevel;
    room.updateConfig({ winLevel: 99 });
    expect(room.config.winLevel).toBe(before);
  });

  it('subscribe notifies on emit and unsubscribe cancels', () => {
    const r = new GameRoom();
    const calls: number[] = [];
    const unsub = r.subscribe(() => calls.push(1));
    r.addPlayer('A', 's');
    expect(calls.length).toBeGreaterThan(0);
    unsub();
    const before = calls.length;
    r.addPlayer('B', 's2');
    expect(calls.length).toBe(before);
  });

  it('snapshot hides hands and fist cards', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { startingHandDoors: 2, startingHandTreasures: 2 },
      doors: Array.from({ length: 10 }, () => race()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    const snap = room.snapshot();
    for (const p of snap.players) {
      expect(p.hand).toEqual([]);
      expect(p.fistCards).toEqual([]);
    }
    expect(room.privateHandFor(players[0]!.id).length).toBeGreaterThan(0);
    expect(room.fistFor(players[0]!.id)).toEqual([]);
    expect(room.privateHandFor('missing')).toEqual([]);
  });

  it('start requires at least 2 players', () => {
    const r = new GameRoom();
    r.addPlayer('A', 's');
    expect(() => r.start()).toThrow(/at least 2/i);
  });

  it('start is a no-op if not in lobby', () => {
    const { room } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    const turn = room.turn;
    room.start();
    expect(room.turn).toBe(turn);
  });

  it('start initialises a market when enabled', () => {
    const { room } = buildTestRoom({
      players: 2,
      config: { marketEnabled: true, marketSize: 3 },
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 15 }, () => item()),
    });
    room.start();
    expect(room.market.length).toBe(3);
  });

  it('start primes coop boss HP', () => {
    const { room } = buildTestRoom({
      players: 2,
      config: { variant: 'cooperative', coopBossLevel: 18 },
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    expect(room.coopBossHpRemaining).toBe(18);
  });
});

describe('GameRoom — kickDoor branches', () => {
  it('kickDoor with a monster starts combat', () => {
    const m = monster({ name: 'BigBad', level: 10 });
    const treasures = Array.from({ length: 10 }, () => item());
    const doors: any[] = Array.from({ length: 4 }, () => race());
    doors.push(m); // top
    const { room, players } = buildTestRoom({ players: 2, doors, treasures });
    room.start();
    room.kickDoor(players[0]!.id);
    expect(room.combatState).not.toBeNull();
    expect(room.combatState!.monsters[0]?.name).toBe('BigBad');
    expect(room.turnPhase).toBe('combat');
  });

  it('kickDoor with a curse applies it and moves to look phase', () => {
    const c = curse({ special: 'loseLevel' });
    const treasures = Array.from({ length: 10 }, () => item());
    const doors: any[] = Array.from({ length: 4 }, () => race());
    doors.push(c);
    const { room, players } = buildTestRoom({ players: 2, doors, treasures });
    room.start();
    players[0]!.level = 5;
    room.kickDoor(players[0]!.id);
    expect(players[0]!.level).toBe(4);
    expect(room.turnPhase).toBe('lookForTroubleOrLoot');
  });

  it('kickDoor with non-monster non-curse puts card in hand', () => {
    const r = race({ name: 'Elf' });
    const treasures = Array.from({ length: 10 }, () => item());
    const doors: any[] = Array.from({ length: 4 }, () => clazz());
    doors.push(r);
    const { room, players } = buildTestRoom({ players: 2, doors, treasures });
    room.start();
    const before = players[0]!.hand.length;
    room.kickDoor(players[0]!.id);
    expect(players[0]!.hand.length).toBe(before + 1);
    expect(room.turnPhase).toBe('lookForTroubleOrLoot');
  });

  it('kickDoor throws for non-active player', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 6 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    expect(() => room.kickDoor(players[1]!.id)).toThrow(/not your turn/i);
  });

  it('kickDoor throws in wrong phase', () => {
    const m = monster();
    const { room, players } = buildTestRoom({
      players: 2,
      doors: [...Array.from({ length: 4 }, () => race()), m],
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    room.kickDoor(players[0]!.id);
    // Now in combat — kickDoor should fail
    expect(() => room.kickDoor(players[0]!.id)).toThrow(/cannot kick door/i);
  });

  it('kickDoor throws if game not running', () => {
    const r = new GameRoom();
    const a = r.addPlayer('A', 's');
    r.addPlayer('B', 's2');
    expect(() => r.kickDoor(a.id)).toThrow(/not running/i);
  });

  it('kickDoor throws when door deck is empty', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 4 }, () => race()),
      treasures: Array.from({ length: 10 }, () => item()),
      // Starting hand of 4 doors per player will empty an 8-card door deck
      config: { startingHandDoors: 2 },
    });
    room.start();
    // Drain the door deck completely
    while ((room as any).doors.size > 0) (room as any).doors.draw();
    expect(() => room.kickDoor(players[0]!.id)).toThrow(/empty/i);
  });
});

describe('GameRoom — listenAtDoor', () => {
  it('adds a card to hand and moves to kickDoor phase', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { listeningAtTheDoor: true },
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    const before = players[0]!.hand.length;
    room.listenAtDoor(players[0]!.id);
    expect(players[0]!.hand.length).toBe(before + 1);
    expect(room.turnPhase).toBe('kickDoor');
  });

  it('listenAtDoor errors when disabled', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { listeningAtTheDoor: false },
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    expect(() => room.listenAtDoor(players[0]!.id)).toThrow(/disabled/i);
  });

  it('listenAtDoor errors out of phase', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { listeningAtTheDoor: true },
      doors: [...Array.from({ length: 4 }, () => race()), monster()],
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    room.kickDoor(players[0]!.id); // enters combat
    expect(() => room.listenAtDoor(players[0]!.id)).toThrow(/wrong phase/i);
  });
});

describe('GameRoom — applyCurse via kickDoor', () => {
  function setupWithCurse(c: any, prepare: (player: any) => void) {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: [...Array.from({ length: 4 }, () => race()), c],
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    prepare(players[0]!);
    room.kickDoor(players[0]!.id);
    return { room, players };
  }

  it('loseLevel decreases level (floor 1)', () => {
    const { players } = setupWithCurse(curse({ special: 'loseLevel' }), (p) => { p.level = 1; });
    expect(players[0]!.level).toBe(1);
  });

  it('loseClass discards equipped class', () => {
    const c = clazz({ name: 'Wizard' });
    const { players } = setupWithCurse(curse({ special: 'loseClass' }), (p) => { p.class = c; });
    expect(players[0]!.class).toBeNull();
  });

  it('loseClass is a no-op when no class', () => {
    const { players } = setupWithCurse(curse({ special: 'loseClass' }), () => {});
    expect(players[0]!.class).toBeNull();
  });

  it('loseRace discards equipped race', () => {
    const r = race();
    const { players } = setupWithCurse(curse({ special: 'loseRace' }), (p) => { p.race = r; });
    expect(players[0]!.race).toBeNull();
  });

  it('discardEquipped removes first equipped', () => {
    const sword = item({ slot: 'hand', bonus: 2 });
    const { players } = setupWithCurse(curse({ special: 'discardEquipped' }), (p) => { p.equipped = [sword]; });
    expect(players[0]!.equipped.length).toBe(0);
  });

  it('loseBigItem discards a big item only', () => {
    const small = item({ bigItem: false });
    const big = item({ bigItem: true });
    const { players } = setupWithCurse(curse({ special: 'loseBigItem' }), (p) => { p.equipped = [small, big]; });
    expect(players[0]!.equipped).toEqual([small]);
  });

  it('loseHeadgear discards head slot only', () => {
    const head = item({ slot: 'head' });
    const body = item({ slot: 'body' });
    const { players } = setupWithCurse(curse({ special: 'loseHeadgear' }), (p) => { p.equipped = [body, head]; });
    expect(players[0]!.equipped.map((c) => c.slot)).toEqual(['body']);
  });

  it('loseFootgear discards feet slot only', () => {
    const feet = item({ slot: 'feet' });
    const { players } = setupWithCurse(curse({ special: 'loseFootgear' }), (p) => { p.equipped = [feet]; });
    expect(players[0]!.equipped.length).toBe(0);
  });

  it('incomeTax discards items valued at 600+', () => {
    const cheap = item({ value: 200 });
    const expensive = item({ value: 600 });
    const { players } = setupWithCurse(curse({ special: 'incomeTax' }), (p) => { p.equipped = [cheap, expensive]; });
    expect(players[0]!.equipped).toEqual([cheap]);
  });

  it('chickenHead equips a -1 head item', () => {
    const { players } = setupWithCurse(curse({ special: 'chickenHead' }), () => {});
    expect(players[0]!.equipped.some((c) => c.bonus === -1 && c.slot === 'head')).toBe(true);
  });

  it('doubleBad reduces level by 2 and discards an item', () => {
    const sword = item();
    const { players } = setupWithCurse(curse({ special: 'doubleBad' }), (p) => {
      p.level = 5;
      p.equipped = [sword];
    });
    expect(players[0]!.level).toBe(3);
    expect(players[0]!.equipped.length).toBe(0);
  });
});

describe('GameRoom — playCard', () => {
  function setup(overrides: any = {}) {
    return buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
      ...overrides,
    });
  }

  it('errors when not playing', () => {
    const r = new GameRoom();
    const a = r.addPlayer('A', 's');
    r.addPlayer('B', 's2');
    expect(() => r.playCard(a.id, 'nope')).toThrow(/not running/i);
  });

  it('errors when card not in hand', () => {
    const { room, players } = setup();
    room.start();
    expect(() => room.playCard(players[0]!.id, 'no-such-card')).toThrow(/not in hand/i);
  });

  it('playing a race card sets the race and discards previous', () => {
    const { room, players } = setup();
    room.start();
    const r1 = race({ name: 'Elf' });
    const r2 = race({ name: 'Dwarf' });
    players[0]!.race = r1;
    players[0]!.hand.push(r2);
    room.playCard(players[0]!.id, r2.id);
    expect(players[0]!.race?.name).toBe('Dwarf');
  });

  it('playing a class card sets the class and discards previous', () => {
    const { room, players } = setup();
    room.start();
    const c1 = clazz({ name: 'Cleric' });
    const c2 = clazz({ name: 'Warrior' });
    players[0]!.class = c1;
    players[0]!.hand.push(c2);
    room.playCard(players[0]!.id, c2.id);
    expect(players[0]!.class?.name).toBe('Warrior');
  });

  it('equipping an item with slot conflict moves old to carried', () => {
    const { room, players } = setup();
    room.start();
    const oldSword = item({ slot: 'hand', bonus: 1 });
    const newSword = item({ slot: 'hand', bonus: 3 });
    players[0]!.equipped = [oldSword];
    players[0]!.hand.push(newSword);
    room.playCard(players[0]!.id, newSword.id);
    expect(players[0]!.equipped).toEqual([newSword]);
    expect(players[0]!.carried).toEqual([oldSword]);
  });

  it('equipping a no-slot item works without conflict', () => {
    const { room, players } = setup();
    room.start();
    const trinket = item({ slot: 'none', bonus: 1 });
    players[0]!.hand.push(trinket);
    room.playCard(players[0]!.id, trinket.id);
    expect(players[0]!.equipped).toContain(trinket);
  });

  it('levelUp card increments level', () => {
    const { room, players } = setup();
    room.start();
    const card = levelUp();
    players[0]!.hand.push(card);
    const before = players[0]!.level;
    room.playCard(players[0]!.id, card.id);
    expect(players[0]!.level).toBe(before + 1);
  });

  it('oneShot card errors without combat', () => {
    const { room, players } = setup();
    room.start();
    const potion = oneShot({ combatBonus: 2 });
    players[0]!.hand.push(potion);
    expect(() => room.playCard(players[0]!.id, potion.id)).toThrow(/no active combat/i);
  });

  it('oneShot card applies to player side during combat', () => {
    const m = monster({ level: 5 });
    const doors: any[] = Array.from({ length: 4 }, () => race());
    doors.push(m);
    const { room, players } = buildTestRoom({
      players: 2,
      doors,
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    const potion = oneShot({ combatBonus: 3 });
    players[0]!.hand.push(potion);
    room.kickDoor(players[0]!.id);
    room.playCard(players[0]!.id, potion.id);
    expect(room.combatState!.playerPower).toBeGreaterThan(0);
  });

  it('curse cannot target other player when offensive curses disabled', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { noOffensiveCurses: true },
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    const c = curse({ special: 'loseLevel' });
    players[0]!.hand.push(c);
    expect(() => room.playCard(players[0]!.id, c.id, players[1]!.id)).toThrow(/disabled/i);
  });

  it('curse on self is allowed even when offensive curses disabled', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { noOffensiveCurses: true },
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    const c = curse({ special: 'loseLevel' });
    players[0]!.level = 4;
    players[0]!.hand.push(c);
    room.playCard(players[0]!.id, c.id, players[0]!.id);
    expect(players[0]!.level).toBe(3);
  });

  it('curse on target below aggressionMinLevel is rejected', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { aggressionMinLevel: 5 },
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    const c = curse({ special: 'loseLevel' });
    players[0]!.hand.push(c);
    players[1]!.level = 1;
    expect(() => room.playCard(players[0]!.id, c.id, players[1]!.id)).toThrow(/aggression/i);
  });

  it('playing monster from hand outside lookForTrouble phase errors', () => {
    const { room, players } = setup();
    room.start();
    const m = monster();
    players[0]!.hand.push(m);
    expect(() => room.playCard(players[0]!.id, m.id)).toThrow(/wrong phase/i);
  });

  it('playing monster as non-active player errors', () => {
    const { room, players } = setup();
    room.start();
    const m = monster();
    players[1]!.hand.push(m);
    expect(() => room.playCard(players[1]!.id, m.id)).toThrow(/only active player/i);
  });

  it('look for trouble plays monster from hand into combat', () => {
    const doors: any[] = Array.from({ length: 4 }, () => race());
    doors.push(clazz()); // ensure kickDoor yields a "card to hand" branch
    const { room, players } = buildTestRoom({
      players: 2,
      doors,
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    room.kickDoor(players[0]!.id);
    // Now in lookForTroubleOrLoot phase
    const m = monster({ name: 'Hand Beast', level: 1 });
    players[0]!.hand.push(m);
    room.playCard(players[0]!.id, m.id);
    expect(room.combatState?.monsters[0]?.name).toBe('Hand Beast');
    expect(room.turnPhase).toBe('combat');
  });
});

describe('GameRoom — combat resolution', () => {
  function setupCombat(overrides: { monster?: any; equipP1?: any[]; level?: number } = {}) {
    const m = overrides.monster ?? monster({ level: 3 });
    const doors: any[] = Array.from({ length: 4 }, () => race());
    doors.push(m);
    const { room, players } = buildTestRoom({
      players: 2,
      doors,
      treasures: Array.from({ length: 12 }, () => item()),
    });
    room.start();
    if (overrides.equipP1) players[0]!.equipped = overrides.equipP1;
    if (overrides.level) players[0]!.level = overrides.level;
    (room as any).recomputePower?.(players[0]!);
    room.kickDoor(players[0]!.id);
    return { room, players };
  }

  it('resolveCombat awards levels and treasures on victory', () => {
    const m = monster({ level: 1, treasures: 2, levelsAwarded: 1, badStuff: 'lose 1' });
    const { room, players } = setupCombat({ monster: m, level: 5 });
    const before = players[0]!.level;
    const handBefore = players[0]!.hand.length;
    room.resolveCombat(players[0]!.id);
    expect(players[0]!.level).toBe(before + 1);
    expect(players[0]!.hand.length).toBe(handBefore + 2);
    expect(room.combatState!.result).toBe('victory');
    expect(room.turnPhase).toBe('lookForTroubleOrLoot');
  });

  it('resolveCombat on defeat applies bad stuff', () => {
    const m = monster({ level: 99, badStuff: 'lose 2 levels' });
    const { room, players } = setupCombat({ monster: m, level: 5 });
    room.resolveCombat(players[0]!.id);
    expect(players[0]!.level).toBe(3);
    expect(room.combatState!.result).toBe('badStuff');
  });

  it('resolveCombat handles "discard" bad stuff', () => {
    const sword = item({ slot: 'hand' });
    const m = monster({ level: 99, badStuff: 'Discard 1 weapon.' });
    const { room, players } = setupCombat({ monster: m, level: 1, equipP1: [sword] });
    room.resolveCombat(players[0]!.id);
    expect(players[0]!.equipped.length).toBe(0);
  });

  it('resolveCombat handles "lose all your treasure"', () => {
    const m = monster({ level: 99, badStuff: 'Lose all your treasure.' });
    const sword = item();
    const { room, players } = setupCombat({ monster: m, level: 1, equipP1: [sword] });
    players[0]!.carried = [item()];
    room.resolveCombat(players[0]!.id);
    expect(players[0]!.equipped).toEqual([]);
    expect(players[0]!.carried).toEqual([]);
  });

  it('resolveCombat default badStuff applies "lose 1 level"', () => {
    const m = monster({ level: 99, badStuff: undefined });
    const { room, players } = setupCombat({ monster: m, level: 5 });
    room.resolveCombat(players[0]!.id);
    expect(players[0]!.level).toBe(4);
  });

  it('resolveCombat death kills the player unless noDeath set', () => {
    const m = monster({ level: 99, badStuff: 'It eats you — death.' });
    const { room, players } = setupCombat({ monster: m, level: 5, equipP1: [item()] });
    room.resolveCombat(players[0]!.id);
    expect(players[0]!.level).toBe(1);
    expect(players[0]!.equipped).toEqual([]);
    expect(players[0]!.race).toBeNull();
  });

  it('noDeath causes half-loss instead of full kill', () => {
    const m = monster({ level: 99, badStuff: 'death' });
    const { room, players } = buildTestRoom({
      players: 2,
      config: { noDeath: true },
      doors: [...Array.from({ length: 4 }, () => race()), m],
      treasures: Array.from({ length: 12 }, () => item()),
    });
    room.start();
    players[0]!.equipped = [item(), item(), item(), item()];
    room.kickDoor(players[0]!.id);
    room.resolveCombat(players[0]!.id);
    expect(players[0]!.equipped.length).toBe(2);
  });

  it('resolveCombat only allowed by attacker', () => {
    const m = monster({ level: 1 });
    const { room, players } = setupCombat({ monster: m, level: 5 });
    expect(() => room.resolveCombat(players[1]!.id)).toThrow(/only attacker/i);
  });

  it('resolveCombat with no active combat throws', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => race()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    expect(() => room.resolveCombat(players[0]!.id)).toThrow(/no active combat/i);
  });

  it('helpInCombat adds an ally', () => {
    const m = monster({ level: 99 });
    const { room, players } = setupCombat({ monster: m, level: 1 });
    room.helpInCombat(players[1]!.id);
    expect(room.combatState!.alliedPlayerId).toBe(players[1]!.id);
  });

  it('helpInCombat rejects self-help', () => {
    const m = monster();
    const { room, players } = setupCombat({ monster: m, level: 5 });
    expect(() => room.helpInCombat(players[0]!.id)).toThrow(/cannot ally with yourself/i);
  });

  it('helpInCombat rejects duplicate', () => {
    const { room, players } = setupCombat({ monster: monster({ level: 99 }), level: 1 });
    room.helpInCombat(players[1]!.id);
    expect(() => room.helpInCombat(players[1]!.id)).toThrow(/already has an ally/i);
  });

  it('helpInCombat rejects dead helper', () => {
    const { room, players } = setupCombat({ monster: monster({ level: 99 }), level: 1 });
    players[1]!.isAlive = false;
    expect(() => room.helpInCombat(players[1]!.id)).toThrow(/dead/i);
  });

  it('helpInCombat with no combat throws', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => race()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    expect(() => room.helpInCombat(players[1]!.id)).toThrow(/no active combat/i);
  });

  it('ally receives half treasures on victory', () => {
    const m = monster({ level: 1, treasures: 4, levelsAwarded: 1 });
    const { room, players } = setupCombat({ monster: m, level: 5 });
    room.helpInCombat(players[1]!.id);
    const allyBefore = players[1]!.hand.length;
    room.resolveCombat(players[0]!.id);
    expect(players[1]!.hand.length).toBeGreaterThan(allyBefore);
  });

  it('flee succeeds on high roll', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.999); // roll 6
    const { room, players } = setupCombat({ monster: monster({ level: 99 }), level: 1 });
    room.flee(players[0]!.id);
    expect(room.combatState!.result).toBe('flee');
    expect(room.turnPhase).toBe('lookForTroubleOrLoot');
    spy.mockRestore();
  });

  it('flee failure applies bad stuff', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0); // roll 1
    const { room, players } = setupCombat({ monster: monster({ level: 99, badStuff: 'lose 1' }), level: 5 });
    room.flee(players[0]!.id);
    expect(room.combatState!.result).toBe('badStuff');
    expect(players[0]!.level).toBeLessThan(5);
    spy.mockRestore();
  });

  it('flee from non-combatant rejected', () => {
    const { room, players } = setupCombat({ monster: monster(), level: 1 });
    expect(() => room.flee(players[1]!.id)).toThrow(/not in combat/i);
  });

  it('flee with no combat throws', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => race()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    expect(() => room.flee(players[0]!.id)).toThrow(/no active combat/i);
  });

  it('ally can flee too', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const { room, players } = setupCombat({ monster: monster({ level: 99 }), level: 1 });
    room.helpInCombat(players[1]!.id);
    room.flee(players[1]!.id);
    expect(room.combatState!.result).toBe('flee');
    spy.mockRestore();
  });
});

describe('GameRoom — loot, sell, endTurn, market, fist', () => {
  it('lootRoom adds a card', () => {
    const doors: any[] = Array.from({ length: 6 }, () => race());
    const { room, players } = buildTestRoom({
      players: 2,
      doors,
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    room.kickDoor(players[0]!.id);
    const before = players[0]!.hand.length;
    room.lootRoom(players[0]!.id);
    expect(players[0]!.hand.length).toBe(before + 1);
    expect(room.turnPhase).toBe('charity');
  });

  it('lootRoom is fine if door deck empty', () => {
    const doors: any[] = [race(), race(), race(), race(), race()];
    const { room, players } = buildTestRoom({ players: 2, doors, treasures: Array.from({ length: 10 }, () => item()) });
    room.start();
    room.kickDoor(players[0]!.id);
    // empty doors entirely
    while ((room as any).doors.size > 0) (room as any).doors.draw();
    (room as any).doors.discard = [];
    room.lootRoom(players[0]!.id);
    expect(room.turnPhase).toBe('charity');
  });

  it('lootRoom in wrong phase throws', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    expect(() => room.lootRoom(players[0]!.id)).toThrow(/wrong phase/i);
  });

  it('sellItems requires 1000+ gold', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    const cheap = item({ value: 200 });
    players[0]!.equipped = [cheap];
    expect(() => room.sellItems(players[0]!.id, [cheap.id])).toThrow(/1000/i);
  });

  it('sellItems converts gold to levels', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    const a = item({ value: 600 });
    const b = item({ value: 400 });
    const c = item({ value: 500 });
    players[0]!.equipped = [a];
    players[0]!.carried = [b];
    players[0]!.hand.push(c);
    room.sellItems(players[0]!.id, [a.id, b.id, c.id]);
    expect(players[0]!.level).toBe(2);
    expect(players[0]!.equipped.length).toBe(0);
  });

  it('sellItems requires running game', () => {
    const r = new GameRoom();
    const a = r.addPlayer('A', 's');
    r.addPlayer('B', 's2');
    expect(() => r.sellItems(a.id, [])).toThrow(/not running/i);
  });

  it('sellItems keeps non-item cards in hand even if their id was passed', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    const sword = item({ value: 1200 });
    const buff = oneShot({ value: 5000 });
    players[0]!.equipped = [sword];
    players[0]!.hand.push(buff);
    room.sellItems(players[0]!.id, [sword.id, buff.id]);
    // Only the sword counts; the buff is not an item and must remain.
    expect(players[0]!.level).toBe(2);
    expect(players[0]!.hand).toContain(buff);
  });

  it('endTurn cycles active player', () => {
    const { room, players } = buildTestRoom({
      players: 3,
      doors: Array.from({ length: 30 }, () => monster()),
      treasures: Array.from({ length: 30 }, () => item()),
    });
    room.start();
    expect(room.activePlayerId).toBe(players[0]!.id);
    room.endTurn();
    expect(room.activePlayerId).toBe(players[1]!.id);
    room.endTurn();
    expect(room.activePlayerId).toBe(players[2]!.id);
    room.endTurn();
    expect(room.activePlayerId).toBe(players[0]!.id);
  });

  it('endTurn skips dead players', () => {
    const { room, players } = buildTestRoom({
      players: 3,
      doors: Array.from({ length: 30 }, () => monster()),
      treasures: Array.from({ length: 30 }, () => item()),
    });
    room.start();
    players[1]!.isAlive = false;
    room.endTurn();
    expect(room.activePlayerId).toBe(players[2]!.id);
  });

  it('endTurn enforces hand limit of 5', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 30 }, () => monster()),
      treasures: Array.from({ length: 30 }, () => item()),
    });
    room.start();
    while (players[0]!.hand.length < 10) {
      players[0]!.hand.push(item());
    }
    room.endTurn();
    expect(players[0]!.hand.length).toBeLessThanOrEqual(5);
  });

  it('endTurn is a no-op when game ended', () => {
    const r = new GameRoom();
    r.addPlayer('A', 's');
    r.addPlayer('B', 's2');
    expect(r.endTurn()).toBeNull();
  });

  it('endTurn returns timeout result when global timer expires', () => {
    const { room } = buildTestRoom({
      players: 2,
      config: { globalTimerMinutes: 1 },
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    // Force expiration
    room.globalTimerEndsAt = Date.now() - 1000;
    const res = room.endTurn();
    expect(res?.outcome).toBe('timeout');
    expect(room.phase).toBe('ended');
  });

  it('endTurn also discards hand cards based on deck (door)', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 30 }, () => monster()),
      treasures: Array.from({ length: 30 }, () => item()),
    });
    room.start();
    // Mix door cards into hand
    const doorCard = race();
    players[0]!.hand = [doorCard, doorCard, doorCard, doorCard, doorCard, doorCard, doorCard];
    room.endTurn();
    expect(players[0]!.hand.length).toBeLessThanOrEqual(5);
  });

  it('marketTrade swaps cards of equal or higher value', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { marketEnabled: true, marketSize: 2, startingHandTreasures: 1 },
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 20 }, () => item({ value: 400 })),
    });
    room.start();
    const handCard = players[0]!.hand[0]!;
    const target = room.market[0]!;
    room.marketTrade(players[0]!.id, handCard.id, target.id);
    expect(players[0]!.hand.find((c) => c.id === target.id)).toBeTruthy();
  });

  it('marketTrade with disabled market throws', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    expect(() => room.marketTrade(players[0]!.id, 'x', 'y')).toThrow(/disabled/i);
  });

  it('marketTrade with missing cards throws', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { marketEnabled: true, marketSize: 2 },
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 20 }, () => item()),
    });
    room.start();
    expect(() => room.marketTrade(players[0]!.id, 'no', 'no')).toThrow(/not found/i);
  });

  it('marketTrade with too low value throws', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { marketEnabled: true, marketSize: 1 },
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: [item({ value: 800 }), ...Array.from({ length: 10 }, () => item({ value: 100 }))],
    });
    room.start();
    const cheap = players[0]!.hand.find((c) => (c.value ?? 0) === 100);
    if (cheap && room.market[0]) {
      expect(() => room.marketTrade(players[0]!.id, cheap.id, room.market[0]!.id)).toThrow(/too low/i);
    }
  });

  it('playFist with disabled mechanic throws', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    expect(() => room.playFist(players[0]!.id, 'x', false)).toThrow(/disabled/i);
  });

  it('playFist returns card to hand when not targeting combat', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { fistMechanicEnabled: true },
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    const card = oneShot();
    players[0]!.fistCards = [card];
    room.playFist(players[0]!.id, card.id, false);
    expect(players[0]!.hand).toContain(card);
    expect(players[0]!.fistCards.length).toBe(0);
  });

  it('playFist throws when card not in fist', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { fistMechanicEnabled: true },
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    expect(() => room.playFist(players[0]!.id, 'missing', false)).toThrow(/not in fist/i);
  });

  it('playFist boosts monster side during combat', () => {
    const m = monster({ level: 1 });
    const { room, players } = buildTestRoom({
      players: 2,
      config: { fistMechanicEnabled: true },
      doors: [...Array.from({ length: 4 }, () => race()), m],
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    const fistCard = oneShot({ combatBonus: 5 });
    players[1]!.fistCards = [fistCard];
    room.kickDoor(players[0]!.id);
    room.playFist(players[1]!.id, fistCard.id, true);
    expect(room.combatState!.monsterPower).toBeGreaterThanOrEqual(6);
  });
});

describe('GameRoom — playerById / requireActive errors', () => {
  it('playerById throws for unknown id (via kickDoor)', () => {
    const { room } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    expect(() => room.kickDoor('no-such-player')).toThrow(/not your turn/i);
  });
});

describe('GameRoom — victory conditions', () => {
  it('non-coop game ends when a player reaches winLevel via combat', () => {
    // Long variant forces winLevel=10. Player at lv9 needs +1 to win.
    const m = monster({ level: 1, levelsAwarded: 1 });
    const { room, players } = buildTestRoom({
      players: 2,
      doors: [m],
      treasures: Array.from({ length: 12 }, () => item()),
    });
    room.start();
    players[0]!.level = 9;
    room.kickDoor(players[0]!.id);
    room.resolveCombat(players[0]!.id);
    expect(room.phase).toBe('ended');
    expect(room.winnerId).toBe(players[0]!.id);
  });

  it('coop bossFight win', () => {
    const m = monster({ level: 99, treasures: 1, levelsAwarded: 0 });
    const { room, players } = buildTestRoom({
      players: 2,
      config: { variant: 'cooperative', coopObjective: 'bossFight', coopBossLevel: 50 },
      doors: [...Array.from({ length: 4 }, () => race()), m],
      treasures: Array.from({ length: 12 }, () => item()),
    });
    room.start();
    players[0]!.level = 50;
    players[0]!.equipped = [item({ bonus: 60 })];
    (room as any).recomputePower?.(players[0]!);
    room.kickDoor(players[0]!.id);
    room.resolveCombat(players[0]!.id);
    expect(room.phase).toBe('ended');
  });

  it('coop dungeonTrail win', () => {
    const m = monster({ level: 1, treasures: 1, levelsAwarded: 0 });
    const { room, players } = buildTestRoom({
      players: 2,
      config: { variant: 'cooperative', coopObjective: 'dungeonTrail', coopTrailSize: 1 },
      doors: [...Array.from({ length: 4 }, () => race()), m],
      treasures: Array.from({ length: 12 }, () => item()),
    });
    room.start();
    players[0]!.level = 50;
    (room as any).recomputePower?.(players[0]!);
    room.kickDoor(players[0]!.id);
    room.resolveCombat(players[0]!.id);
    expect(room.phase).toBe('ended');
  });

  it('coop surviveRounds win', () => {
    const { room } = buildTestRoom({
      players: 2,
      config: { variant: 'cooperative', coopObjective: 'surviveRounds', coopRounds: 1 },
      doors: Array.from({ length: 10 }, () => race()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    room.endTurn();
    // turn incremented; sellItems triggers checkVictory
    // Force a check via sellItems on hand (will throw not enough gold, fine), but we can call sellItems-like via cards.
    // Easier: simulate progress via reach turn >= rounds — already true after endTurn, but checkVictory only runs after combat/selling.
    // Trigger checkVictory by calling sellItems with enough gold.
    const p = room.players[0]!;
    p.hand.push(item({ value: 1000 }));
    room.sellItems(p.id, [p.hand[p.hand.length - 1]!.id]);
    expect(room.phase).toBe('ended');
  });

  it('coop threat track full = lose', () => {
    const m = monster({ level: 99, badStuff: 'lose 1' });
    const { room, players } = buildTestRoom({
      players: 2,
      config: { variant: 'cooperative', threatTrackEnabled: true, coopObjective: 'bossFight' },
      doors: [...Array.from({ length: 4 }, () => race()), m, m, m, m, m, m, m, m, m, m],
      treasures: Array.from({ length: 50 }, () => item()),
    });
    room.start();
    // Force the threat to 9, then a single defeat should push it to 10
    room.threatTrack = 9;
    players[0]!.level = 1;
    room.kickDoor(players[0]!.id);
    room.resolveCombat(players[0]!.id);
    expect(room.phase).toBe('ended');
  });
});

describe('GameRoom — ready toggle', () => {
  it('flips a player ready flag', () => {
    const r = new GameRoom();
    const a = r.addPlayer('A', 's');
    r.addPlayer('B', 's2');
    expect(a.ready).toBe(false);
    r.setReady(a.id, true);
    expect(a.ready).toBe(true);
    r.setReady(a.id, false);
    expect(a.ready).toBe(false);
  });

  it('refuses to flip ready after game starts', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    expect(() => room.setReady(players[0]!.id, true)).toThrow(/already started/i);
  });
});

describe('GameRoom — stealItem', () => {
  function setupThief(noStealing = false) {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { noStealing },
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    players[0]!.class = clazz({ name: 'Thief' });
    return { room, players };
  }

  it('Thief succeeds on a 4+ roll and takes a small item from the target', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5); // roll = 4
    const { room, players } = setupThief();
    const small = item({ bigItem: false, name: 'Tiny Knife' });
    players[1]!.equipped = [small];
    const res = room.stealItem(players[0]!.id, players[1]!.id);
    expect(res.success).toBe(true);
    expect(players[0]!.carried.find((c) => c.id === small.id)).toBeTruthy();
    expect(players[1]!.equipped).toEqual([]);
    spy.mockRestore();
  });

  it('falls back to a carried item when no equipped small item is available', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { room, players } = setupThief();
    const small = item({ bigItem: false, name: 'Pouch' });
    players[1]!.carried = [small];
    const res = room.stealItem(players[0]!.id, players[1]!.id);
    expect(res.success).toBe(true);
    expect(players[0]!.carried.find((c) => c.id === small.id)).toBeTruthy();
    spy.mockRestore();
  });

  it('ignores big items when picking what to steal', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { room, players } = setupThief();
    const big = item({ bigItem: true, name: 'Big' });
    players[1]!.equipped = [big];
    const res = room.stealItem(players[0]!.id, players[1]!.id);
    expect(res.success).toBe(false); // no small item to steal
    expect(players[1]!.equipped).toEqual([big]);
    spy.mockRestore();
  });

  it('fumble on 1 makes the Thief lose a level', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const { room, players } = setupThief();
    players[0]!.level = 4;
    players[1]!.equipped = [item({ bigItem: false })];
    const res = room.stealItem(players[0]!.id, players[1]!.id);
    expect(res.success).toBe(false);
    expect(players[0]!.level).toBe(3);
    spy.mockRestore();
  });

  it('rejects steal when noStealing config is true', () => {
    const { room, players } = setupThief(true);
    expect(() => room.stealItem(players[0]!.id, players[1]!.id)).toThrow(/disabled/i);
  });

  it('rejects stealing from yourself', () => {
    const { room, players } = setupThief();
    expect(() => room.stealItem(players[0]!.id, players[0]!.id)).toThrow(/yourself/i);
  });

  it('rejects non-Thief players', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    expect(() => room.stealItem(players[0]!.id, players[1]!.id)).toThrow(/Thieves/);
  });

  it('rejects steal before game starts', () => {
    const r = new GameRoom();
    const a = r.addPlayer('A', 's');
    r.addPlayer('B', 's2');
    expect(() => r.stealItem(a.id, a.id)).toThrow(/not running/i);
  });
});

describe('GameRoom — passive abilities', () => {
  function basicRoom() {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    return { room, players };
  }

  it('Elf gets +1 to combat power passively', () => {
    const { room, players } = basicRoom();
    const before = players[0]!.combatPower;
    players[0]!.race = race({ name: 'Elf' });
    (room as any).recomputePower(players[0]!);
    expect(players[0]!.combatPower).toBe(before + 1);
  });

  it('Orc gets +1 only when armed', () => {
    const { room, players } = basicRoom();
    players[0]!.race = race({ name: 'Orc' });
    (room as any).recomputePower(players[0]!);
    const withoutWeapon = players[0]!.combatPower;
    players[0]!.equipped = [item({ slot: 'hand', bonus: 0 })];
    (room as any).recomputePower(players[0]!);
    expect(players[0]!.combatPower).toBe(withoutWeapon + 1);
  });

  it('Warrior wins on ties', () => {
    // Monster level 1, player level 1 (would normally lose).
    const m = monster({ level: 1, levelsAwarded: 1 });
    const { room, players } = buildTestRoom({
      players: 2,
      doors: [m],
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    players[0]!.class = clazz({ name: 'Warrior' });
    (room as any).recomputePower(players[0]!);
    room.kickDoor(players[0]!.id);
    room.resolveCombat(players[0]!.id);
    expect(room.combatState!.result).toBe('victory');
  });

  it('Warrior gets +1 to combat power passively', () => {
    const { room, players } = basicRoom();
    const before = players[0]!.combatPower;
    players[0]!.class = clazz({ name: 'Warrior' });
    (room as any).recomputePower(players[0]!);
    expect(players[0]!.combatPower).toBe(before + 1);
  });

  it('Elf gets +100 gold bonus on sell', () => {
    const { room, players } = basicRoom();
    players[0]!.race = race({ name: 'Elf' });
    // 900 worth of items → with +100 bonus = 1000 = 1 level
    players[0]!.equipped = [item({ value: 900 })];
    const before = players[0]!.level;
    room.sellItems(players[0]!.id, players[0]!.equipped.map((c) => c.id));
    expect(players[0]!.level).toBe(before + 1);
  });

  it('Halfling doubles the first sale per turn', () => {
    const { room, players } = basicRoom();
    players[0]!.race = race({ name: 'Halfling' });
    players[0]!.equipped = [item({ value: 600 })]; // doubled = 1200 → 1 level
    const before = players[0]!.level;
    room.sellItems(players[0]!.id, players[0]!.equipped.map((c) => c.id));
    expect(players[0]!.level).toBe(before + 1);
    expect(players[0]!.halflingSoldThisTurn).toBe(true);
  });

  it('Halfling second sale of the same turn is NOT doubled', () => {
    const { room, players } = basicRoom();
    players[0]!.race = race({ name: 'Halfling' });
    players[0]!.equipped = [item({ value: 600 }), item({ value: 600 })];
    // First sale: 600 * 2 = 1200 (1 level). Then second: 600 * 1 = 600 (no level).
    room.sellItems(players[0]!.id, [players[0]!.equipped[0]!.id]);
    expect(() =>
      room.sellItems(players[0]!.id, [players[0]!.equipped[0]!.id]),
    ).toThrow(/1000/);
  });

  it('Halfling flag resets on endTurn', () => {
    const { room, players } = basicRoom();
    players[0]!.halflingSoldThisTurn = true;
    room.endTurn();
    expect(players[0]!.halflingSoldThisTurn).toBe(false);
  });
});

describe('GameRoom — Cleric and Wizard active abilities', () => {
  function combatWithUndead(undead = true) {
    const m = monster({
      level: 5,
      treasures: 2,
      levelsAwarded: 1,
      tags: undead ? ['undead'] : [],
    });
    const { room, players } = buildTestRoom({
      players: 2,
      doors: [m],
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    room.kickDoor(players[0]!.id);
    return { room, players, monsterCard: m };
  }

  it('Cleric +3 vs Undead per discarded card', () => {
    const { room, players } = combatWithUndead();
    players[0]!.class = clazz({ name: 'Cleric' });
    players[0]!.hand.push(item({ id: 'discard-1' }), item({ id: 'discard-2' }));
    const beforePower = room.combatState!.playerPower;
    room.clericVsUndead(players[0]!.id, ['discard-1', 'discard-2']);
    expect(room.combatState!.playerPower).toBe(beforePower + 6);
  });

  it('Cleric rejects when no undead in combat', () => {
    const { room, players } = combatWithUndead(false);
    players[0]!.class = clazz({ name: 'Cleric' });
    players[0]!.hand.push(item({ id: 'd-1' }));
    expect(() => room.clericVsUndead(players[0]!.id, ['d-1'])).toThrow(/undead/i);
  });

  it('Cleric rejects non-Cleric players', () => {
    const { room, players } = combatWithUndead();
    expect(() => room.clericVsUndead(players[0]!.id, [])).toThrow(/Clerics/);
  });

  it('Cleric requires at least one card', () => {
    const { room, players } = combatWithUndead();
    players[0]!.class = clazz({ name: 'Cleric' });
    expect(() => room.clericVsUndead(players[0]!.id, [])).toThrow(/at least one/i);
  });

  it('Cleric rejects unknown card ids', () => {
    const { room, players } = combatWithUndead();
    players[0]!.class = clazz({ name: 'Cleric' });
    expect(() => room.clericVsUndead(players[0]!.id, ['nope'])).toThrow(/not in hand/i);
  });

  it('Wizard charm forces flee on the active combat', () => {
    const { room, players } = combatWithUndead(false);
    players[0]!.class = clazz({ name: 'Wizard' });
    players[0]!.hand.push(item({ id: 'w-1' }), item({ id: 'w-2' }), item({ id: 'w-3' }));
    room.wizardCharm(players[0]!.id, ['w-1', 'w-2', 'w-3']);
    expect(room.combatState!.result).toBe('flee');
    expect(room.turnPhase).toBe('lookForTroubleOrLoot');
  });

  it('Wizard charm requires 3 cards', () => {
    const { room, players } = combatWithUndead();
    players[0]!.class = clazz({ name: 'Wizard' });
    players[0]!.hand.push(item({ id: 'w-1' }), item({ id: 'w-2' }));
    expect(() => room.wizardCharm(players[0]!.id, ['w-1', 'w-2'])).toThrow(/3 cards/);
  });

  it('Wizard charm rejects non-Wizard players', () => {
    const { room, players } = combatWithUndead();
    expect(() => room.wizardCharm(players[0]!.id, [])).toThrow(/Wizards/);
  });

  it('Cleric and Wizard fail outside combat', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => race()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    expect(() => room.clericVsUndead(players[0]!.id, [])).toThrow(/No active combat/);
    expect(() => room.wizardCharm(players[0]!.id, [])).toThrow(/No active combat/);
  });
});

describe('GameRoom — Fist deposit', () => {
  it('moves a door card from hand to the Fist reserve', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { fistMechanicEnabled: true },
      doors: Array.from({ length: 10 }, () => race()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    const doorCard = race({ name: 'Halfling' });
    players[0]!.hand.push(doorCard);
    room.depositFist(players[0]!.id, doorCard.id);
    expect(players[0]!.fistCards).toContain(doorCard);
    expect(players[0]!.hand).not.toContain(doorCard);
  });

  it('refuses to deposit treasure cards', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { fistMechanicEnabled: true },
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    const treasure = item();
    players[0]!.hand.push(treasure);
    expect(() => room.depositFist(players[0]!.id, treasure.id)).toThrow(/door cards/i);
  });

  it('refuses when Fist is full (3 cards)', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { fistMechanicEnabled: true },
      doors: Array.from({ length: 10 }, () => race()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    players[0]!.fistCards = [race(), race(), race()];
    const extra = race();
    players[0]!.hand.push(extra);
    expect(() => room.depositFist(players[0]!.id, extra.id)).toThrow(/full/i);
  });

  it('refuses when mechanic is disabled', () => {
    const { room, players } = buildTestRoom({
      players: 2,
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    expect(() => room.depositFist(players[0]!.id, 'x')).toThrow(/disabled/i);
  });
});

describe('GameRoom — Dual character', () => {
  function dualRoom() {
    const { room, players } = buildTestRoom({
      players: 2,
      config: { twoPlayerDualCharacter: true },
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    return { room, players };
  }

  it('initializes one alternate character per player at level 1', () => {
    const { players } = dualRoom();
    for (const p of players) {
      expect(p.characters).toHaveLength(1);
      expect(p.characters![0]!.level).toBe(1);
    }
  });

  it('swap exchanges current main state with the chosen alt', () => {
    const { room, players } = dualRoom();
    players[0]!.level = 5;
    players[0]!.race = race({ name: 'Elf' });
    (room as any).recomputePower(players[0]!);
    room.swapCharacter(players[0]!.id, 0);
    // Now main is the alt (lv 1, no race), and the saved alt has level 5
    expect(players[0]!.level).toBe(1);
    expect(players[0]!.race).toBeNull();
    expect(players[0]!.characters![0]!.level).toBe(5);
  });

  it('preserves the player hand across a swap', () => {
    const { room, players } = dualRoom();
    // Seed a non-empty hand so we can assert it isn't lost in the swap.
    const seeded = [item({ name: 'Sword' }), item({ name: 'Shield' })];
    players[0]!.hand.push(...seeded);
    const handBefore = [...players[0]!.hand];
    room.swapCharacter(players[0]!.id, 0);
    expect(players[0]!.hand).toEqual(handBefore);
    // Stored alt should not be hoarding the player's cards either.
    expect(players[0]!.characters![0]!.hand).toEqual([]);
    // Swapping back still leaves the hand intact.
    room.swapCharacter(players[0]!.id, 0);
    expect(players[0]!.hand).toEqual(handBefore);
  });

  it('rejects swap when mechanic disabled', () => {
    // Use 3 players so the Long variant's auto-dual doesn't kick in.
    const { room, players } = buildTestRoom({
      players: 3,
      doors: Array.from({ length: 10 }, () => monster()),
      treasures: Array.from({ length: 10 }, () => item()),
    });
    room.start();
    expect(() => room.swapCharacter(players[0]!.id, 0)).toThrow(/disabled/i);
  });

  it('rejects an out-of-range alternate index', () => {
    const { room, players } = dualRoom();
    expect(() => room.swapCharacter(players[0]!.id, 5)).toThrow(/invalid alternate/i);
  });
});

describe('GameRoom — requestHelpInCombat', () => {
  function setupCombat() {
    const room = new GameRoom({ variant: 'long', playerCount: 3, turnTimerSeconds: 0, globalTimerMinutes: 0 });
    const attacker = room.addPlayer('Alice', 's1');
    const helperBot = room.addBot('hard', 'BotHard');
    room.addBot('easy', 'BotEasy');
    room.start();
    // Force a combat with Alice as the attacker by mutating the room state.
    (room as unknown as { activePlayerId: string }).activePlayerId = attacker.id;
    (room as unknown as { turnPhase: string }).turnPhase = 'combat';
    room.combatState = {
      attackerId: attacker.id,
      monsters: [{ id: 'm1', type: 'monster', deck: 'door', name: 'Beast', description: '', level: 8, treasures: 2, levelsAwarded: 1 }],
      monsterPower: 8,
      playerPower: 4,
      alliedPlayerId: null,
      cardsPlayedThisRound: [],
      resolved: false,
      result: 'pending',
      fleeBonus: 0,
    };
    return { room, attacker, helperBot };
  }

  it('returns null when no bot accepts', () => {
    const { room, attacker } = setupCombat();
    const helperId = room.requestHelpInCombat(attacker.id, () => false);
    expect(helperId).toBeNull();
    expect(room.combatState?.alliedPlayerId).toBeNull();
  });

  it('binds the first bot that accepts as the ally', () => {
    const { room, attacker } = setupCombat();
    let called = 0;
    const helperId = room.requestHelpInCombat(attacker.id, () => {
      called += 1;
      return called === 1;
    });
    expect(helperId).not.toBeNull();
    expect(room.combatState?.alliedPlayerId).toBe(helperId);
  });

  it('rejects requests outside an active combat', () => {
    const room = new GameRoom({ variant: 'long', playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0 });
    const a = room.addPlayer('A', 'sa');
    room.addBot('easy');
    room.start();
    expect(() => room.requestHelpInCombat(a.id, () => true)).toThrow(/active combat/i);
  });

  it('rejects requests from non-attackers', () => {
    const { room, helperBot } = setupCombat();
    expect(() => room.requestHelpInCombat(helperBot.id, () => true)).toThrow(/attacker/i);
  });

  it('rejects when the combat already has an ally', () => {
    const { room, attacker, helperBot } = setupCombat();
    room.combatState!.alliedPlayerId = helperBot.id;
    expect(() => room.requestHelpInCombat(attacker.id, () => true)).toThrow(/already/i);
  });
});

describe('GameRoom — bot seats', () => {
  it('adds a bot with the requested difficulty', () => {
    const room = new GameRoom({ variant: 'long', playerCount: 4, turnTimerSeconds: 0, globalTimerMinutes: 0 });
    room.addPlayer('Host', 'sh');
    const bot = room.addBot('normal');
    expect(bot.isBot).toBe(true);
    expect(bot.botDifficulty).toBe('normal');
    expect(bot.socketId).toBeNull();
    expect(bot.name).toBe('Bot 1');
  });

  it('refuses to add bots once the game has started', () => {
    const room = new GameRoom({ variant: 'long', playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0 });
    room.addPlayer('Host', 'sh');
    room.addBot('easy');
    room.start();
    expect(() => room.addBot('easy')).toThrow(/already started/i);
  });

  it('refuses to add bots beyond the room cap', () => {
    const room = new GameRoom({ variant: 'long', playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0 });
    room.addBot('easy');
    room.addBot('easy');
    expect(() => room.addBot('easy')).toThrow(/room is full/i);
  });

  it('removes a bot by id', () => {
    const room = new GameRoom({ variant: 'long', playerCount: 3, turnTimerSeconds: 0, globalTimerMinutes: 0 });
    room.addPlayer('Host', 'sh');
    const bot = room.addBot('easy');
    room.removeBot(bot.id);
    expect(room.players.find((p) => p.id === bot.id)).toBeUndefined();
  });

  it('rejects removing a human player', () => {
    const room = new GameRoom({ variant: 'long', playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0 });
    const human = room.addPlayer('Host', 'sh');
    expect(() => room.removeBot(human.id)).toThrow(/cannot remove human/i);
  });

  it('rejects removing once the game has started', () => {
    const room = new GameRoom({ variant: 'long', playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0 });
    room.addPlayer('Host', 'sh');
    const bot = room.addBot('easy');
    room.start();
    expect(() => room.removeBot(bot.id)).toThrow(/game has started/i);
  });

  it('marks the first added bot as the creator when no human exists', () => {
    const room = new GameRoom({ variant: 'long', playerCount: 2, turnTimerSeconds: 0, globalTimerMinutes: 0 });
    const bot = room.addBot('easy');
    expect(room.isCreator(bot.id)).toBe(true);
  });
});
