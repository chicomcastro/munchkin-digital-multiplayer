import { describe, it, expect } from 'vitest';
import { buildDoorDeck } from './doors.js';
import { buildTreasureDeck } from './treasures.js';

describe('door deck', () => {
  const deck = buildDoorDeck();

  it('contains the configured number of cards', () => {
    // 40 monsters + 20 curses + 5 races + 8 classes = 73
    expect(deck.length).toBe(73);
  });

  it('every card has a unique id', () => {
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(deck.length);
  });

  it('every card belongs to the door deck', () => {
    for (const c of deck) expect(c.deck).toBe('door');
  });

  it('contains all required curse specials', () => {
    const specials = deck.filter((c) => c.type === 'curse').map((c) => c.special);
    const required = [
      'loseLevel', 'loseClass', 'loseRace', 'discardEquipped',
      'chickenHead', 'loseBigItem', 'loseHeadgear', 'loseFootgear',
      'incomeTax', 'doubleBad',
    ];
    for (const r of required) expect(specials).toContain(r);
  });

  it('monsters have level + treasures + levelsAwarded + badStuff', () => {
    for (const m of deck.filter((c) => c.type === 'monster')) {
      expect(typeof m.level).toBe('number');
      expect(typeof m.treasures).toBe('number');
      expect(typeof m.levelsAwarded).toBe('number');
      expect(typeof m.badStuff).toBe('string');
    }
  });

  it('has at least 5 distinct race names', () => {
    const names = new Set(deck.filter((c) => c.type === 'race').map((c) => c.name));
    expect(names.size).toBeGreaterThanOrEqual(5);
  });

  it('has all four MVP classes', () => {
    const names = new Set(deck.filter((c) => c.type === 'class').map((c) => c.name));
    expect(names.has('Warrior')).toBe(true);
    expect(names.has('Cleric')).toBe(true);
    expect(names.has('Thief')).toBe(true);
    expect(names.has('Wizard')).toBe(true);
  });
});

describe('treasure deck', () => {
  const deck = buildTreasureDeck();

  it('contains enough cards for MVP', () => {
    expect(deck.length).toBeGreaterThanOrEqual(30);
  });

  it('every card has a unique id', () => {
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(deck.length);
  });

  it('every card belongs to the treasure deck', () => {
    for (const c of deck) expect(c.deck).toBe('treasure');
  });

  it('includes items, helpers, oneShots and levelUps', () => {
    const types = new Set(deck.map((c) => c.type));
    expect(types.has('item')).toBe(true);
    expect(types.has('helper')).toBe(true);
    expect(types.has('oneShot')).toBe(true);
    expect(types.has('levelUp')).toBe(true);
  });

  it('helpers have positive combat bonus or special', () => {
    for (const h of deck.filter((c) => c.type === 'helper')) {
      expect((h.combatBonus ?? 0) >= 0 || h.special).toBeTruthy();
    }
  });

  it('items with slots have valid slot names', () => {
    const valid = ['head', 'body', 'feet', 'hand', 'twoHands', 'none'];
    for (const it of deck.filter((c) => c.type === 'item')) {
      if (it.slot) expect(valid).toContain(it.slot);
    }
  });
});
