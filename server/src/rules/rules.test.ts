import { describe, it, expect, vi } from 'vitest';
import { applyVariant, defaultConfig } from './variants.js';
import { computeEquippedBonus, computeMonsterPower, computePlayerCombatStrength, rollFlee, totals } from './combat.js';
import { nextPhase, PHASE_ORDER } from './phases.js';
import { monsterHasTag, passiveCombatBonus, sellGoldBonus, sellMultiplier, winsTies } from './abilities.js';
import type { Card, Player } from '../types.js';

function mkPlayer(over: Partial<Player> = {}): Player {
  return {
    id: 'p',
    name: 'P',
    socketId: null,
    level: 1,
    hand: [],
    equipped: [],
    carried: [],
    race: null,
    class: null,
    isAlive: true,
    combatPower: 1,
    fistCards: [],
    color: '#fff',
    ready: false,
    ...over,
  };
}

function mkCard(over: Partial<Card> = {}): Card {
  return {
    id: 'c',
    type: 'item',
    deck: 'treasure',
    name: 'X',
    description: '',
    ...over,
  };
}

describe('defaultConfig', () => {
  it('returns sensible defaults', () => {
    const c = defaultConfig();
    expect(c.playerCount).toBe(4);
    expect(c.winLevel).toBe(10);
    expect(c.variant).toBe('medium');
  });
});

describe('applyVariant', () => {
  it('caps winLevel for quick', () => {
    const out = applyVariant({ ...defaultConfig(), variant: 'quick' });
    expect(out.winLevel).toBe(6);
    expect(out.startingHandDoors).toBe(5);
    expect(out.startingHandTreasures).toBe(5);
    expect(out.listeningAtTheDoor).toBe(true);
    expect(out.turnTimerSeconds).toBe(40);
  });

  it('respects existing turnTimerSeconds in quick', () => {
    const out = applyVariant({ ...defaultConfig(), variant: 'quick', turnTimerSeconds: 90 });
    expect(out.turnTimerSeconds).toBe(90);
  });

  it('does not cap winLevel below 6 for quick', () => {
    const out = applyVariant({ ...defaultConfig(), variant: 'quick', winLevel: 5 });
    expect(out.winLevel).toBe(5);
  });

  it('enables market for medium with default globalTimer', () => {
    const out = applyVariant({ ...defaultConfig(), variant: 'medium' });
    expect(out.winLevel).toBe(10);
    expect(out.marketEnabled).toBe(true);
    expect(out.marketSize).toBe(5);
    expect(out.globalTimerMinutes).toBe(60);
  });

  it('keeps existing globalTimerMinutes in medium', () => {
    const out = applyVariant({ ...defaultConfig(), variant: 'medium', globalTimerMinutes: 30 });
    expect(out.globalTimerMinutes).toBe(30);
  });

  it('enables dual character for long with 2 players', () => {
    const out = applyVariant({ ...defaultConfig(), variant: 'long', playerCount: 2 });
    expect(out.twoPlayerDualCharacter).toBe(true);
    expect(out.globalTimerMinutes).toBeNull();
  });

  it('does not enable dual character for long with 3 players', () => {
    const out = applyVariant({ ...defaultConfig(), variant: 'long', playerCount: 3 });
    expect(out.twoPlayerDualCharacter).toBe(false);
  });

  it('cooperative disables curses and enables threat track', () => {
    const out = applyVariant({ ...defaultConfig(), variant: 'cooperative' });
    expect(out.noOffensiveCurses).toBe(true);
    expect(out.aggressionMinLevel).toBe(999);
    expect(out.threatTrackEnabled).toBe(true);
  });
});

describe('combat helpers', () => {
  it('computeEquippedBonus sums bonuses', () => {
    const p = mkPlayer({
      equipped: [mkCard({ bonus: 1 }), mkCard({ bonus: 2 }), mkCard({})],
    });
    expect(computeEquippedBonus(p)).toBe(3);
  });

  it('computePlayerCombatStrength adds level to equipment bonus', () => {
    const p = mkPlayer({ level: 4, equipped: [mkCard({ bonus: 2 })] });
    expect(computePlayerCombatStrength(p)).toBe(6);
  });

  it('computeMonsterPower sums monster levels', () => {
    const m1 = mkCard({ type: 'monster', level: 5 });
    const m2 = mkCard({ type: 'monster', level: 7 });
    expect(computeMonsterPower([m1, m2], 1)).toBe(12);
  });

  it('totals adds attacker, ally and played cards on both sides', () => {
    const attacker = mkPlayer({ level: 3, equipped: [mkCard({ bonus: 1 })] });
    const ally = mkPlayer({ id: 'a', level: 2 });
    const monsters = [mkCard({ type: 'monster', level: 4 })];
    const played = [
      { side: 'player' as const, card: mkCard({ combatBonus: 2 }) },
      { side: 'monster' as const, card: mkCard({ combatBonus: 3 }) },
    ];
    const t = totals({ attacker, ally, monsters, played });
    expect(t.playerSide).toBe(3 + 1 + 2 + 2);
    expect(t.monsterSide).toBe(4 + 3);
    expect(t.diff).toBe(t.playerSide - t.monsterSide);
  });

  it('totals works with no ally and no played cards', () => {
    const attacker = mkPlayer({ level: 2 });
    const t = totals({ attacker, ally: null, monsters: [mkCard({ type: 'monster', level: 3 })], played: [] });
    expect(t.playerSide).toBe(2);
    expect(t.monsterSide).toBe(3);
  });

  it('rollFlee succeeds on 6 with no modifier', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const r = rollFlee();
    expect(r.roll).toBe(6);
    expect(r.success).toBe(true);
    spy.mockRestore();
  });

  it('rollFlee fails on low rolls', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const r = rollFlee();
    expect(r.roll).toBe(1);
    expect(r.success).toBe(false);
    spy.mockRestore();
  });

  it('rollFlee modifier helps with low rolls', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5); // roll = 4
    const r = rollFlee(1);
    expect(r.roll).toBe(4);
    expect(r.success).toBe(true);
    spy.mockRestore();
  });
});

describe('phases', () => {
  it('PHASE_ORDER lists all phases in order', () => {
    expect(PHASE_ORDER).toEqual([
      'turnStart',
      'listening',
      'kickDoor',
      'combat',
      'lookForTroubleOrLoot',
      'charity',
      'endTurn',
    ]);
  });

  it('nextPhase from turnStart honors listening flag', () => {
    expect(nextPhase('turnStart', { listening: true })).toBe('listening');
    expect(nextPhase('turnStart', { listening: false })).toBe('kickDoor');
  });

  it('nextPhase from listening goes to kickDoor', () => {
    expect(nextPhase('listening', { listening: true })).toBe('kickDoor');
  });

  it('nextPhase from kickDoor moves on', () => {
    expect(nextPhase('kickDoor', { listening: false })).toBe('lookForTroubleOrLoot');
  });

  it('nextPhase from combat needs afterCombat=true to leave', () => {
    expect(nextPhase('combat', { listening: false })).toBe('combat');
    expect(nextPhase('combat', { listening: false, afterCombat: true })).toBe('lookForTroubleOrLoot');
  });

  it('nextPhase from lookForTroubleOrLoot goes to charity', () => {
    expect(nextPhase('lookForTroubleOrLoot', { listening: false })).toBe('charity');
  });

  it('nextPhase from charity goes to endTurn', () => {
    expect(nextPhase('charity', { listening: false })).toBe('endTurn');
  });

  it('nextPhase from endTurn wraps to turnStart', () => {
    expect(nextPhase('endTurn', { listening: false })).toBe('turnStart');
  });
});

describe('abilities', () => {
  it('passiveCombatBonus is 0 for Human/Cleric without weapons', () => {
    const p = mkPlayer({ race: mkCard({ name: 'Human', type: 'race' }) });
    expect(passiveCombatBonus(p)).toBe(0);
  });

  it('winsTies is false for non-Warriors', () => {
    expect(winsTies(mkPlayer())).toBe(false);
    expect(winsTies(mkPlayer({ class: mkCard({ name: 'Warrior', type: 'class' }) }))).toBe(true);
  });

  it('sellGoldBonus only applies to Elves', () => {
    expect(sellGoldBonus(mkPlayer())).toBe(0);
    expect(sellGoldBonus(mkPlayer({ race: mkCard({ name: 'Elf', type: 'race' }) }))).toBe(100);
  });

  it('sellMultiplier is 2 only for first sale of a Halfling', () => {
    const halfling = mkPlayer({ race: mkCard({ name: 'Halfling', type: 'race' }) });
    expect(sellMultiplier(halfling as any, true)).toBe(2);
    expect(sellMultiplier(halfling as any, false)).toBe(1);
    expect(sellMultiplier(mkPlayer() as any, true)).toBe(1);
  });

  it('monsterHasTag respects empty/missing tags', () => {
    expect(monsterHasTag(mkCard({ type: 'monster' }), 'undead')).toBe(false);
    expect(monsterHasTag(mkCard({ type: 'monster', tags: ['undead'] }), 'undead')).toBe(true);
    expect(monsterHasTag(mkCard({ type: 'monster', tags: ['undead'] }), 'other')).toBe(false);
  });
});
