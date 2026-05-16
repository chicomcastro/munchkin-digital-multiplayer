import { describe, it, expect, vi } from 'vitest';
import { Deck, shuffle } from './Deck.js';
import type { Card } from './types.js';

function makeCard(id: string): Card {
  return { id, type: 'item', deck: 'treasure', name: id, description: '' };
}

describe('shuffle', () => {
  it('returns an array of the same length', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffle(original);
    expect(shuffled.length).toBe(original.length);
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate the original array', () => {
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];
    shuffle(original);
    expect(original).toEqual(copy);
  });

  it('produces deterministic order when Math.random is stubbed', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const result = shuffle([1, 2, 3, 4, 5]);
    // With seed=0: j=0 each swap, the front of the array rotates back.
    expect(result).toEqual([2, 3, 4, 5, 1]);
    spy.mockRestore();
  });

  it('handles empty arrays', () => {
    expect(shuffle([])).toEqual([]);
  });
});

describe('Deck', () => {
  it('starts empty by default', () => {
    const d = new Deck();
    expect(d.size).toBe(0);
    expect(d.draw()).toBeNull();
    expect(d.discardTop).toBeNull();
  });

  it('initialises with provided cards', () => {
    const cards = [makeCard('a'), makeCard('b'), makeCard('c')];
    const d = new Deck(cards);
    expect(d.size).toBe(3);
  });

  it('draws from the top (LIFO of array)', () => {
    const cards = [makeCard('a'), makeCard('b'), makeCard('c')];
    const d = new Deck([...cards]);
    expect(d.draw()?.id).toBe('c');
    expect(d.draw()?.id).toBe('b');
    expect(d.draw()?.id).toBe('a');
    expect(d.draw()).toBeNull();
  });

  it('drawMany returns up to n cards', () => {
    const cards = [makeCard('a'), makeCard('b'), makeCard('c')];
    const d = new Deck([...cards]);
    const drawn = d.drawMany(2);
    expect(drawn).toHaveLength(2);
    expect(d.size).toBe(1);
  });

  it('drawMany stops when deck runs out and discard is empty', () => {
    const d = new Deck([makeCard('a')]);
    const drawn = d.drawMany(5);
    expect(drawn).toHaveLength(1);
  });

  it('recycles discard pile when deck empty', () => {
    const a = makeCard('a');
    const b = makeCard('b');
    const d = new Deck([], [a, b]);
    expect(d.size).toBe(0);
    const drawn = d.draw();
    expect(drawn).not.toBeNull();
    // After recycle, deck has been shuffled and one drawn
    expect(d.size + 1).toBe(2);
    expect(d.discard).toHaveLength(0);
  });

  it('discardCard adds to discard pile', () => {
    const d = new Deck();
    const c = makeCard('a');
    d.discardCard(c);
    expect(d.discardTop?.id).toBe('a');
  });

  it('shuffleDeck reorders cards in place', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const cards = [makeCard('a'), makeCard('b'), makeCard('c')];
    const d = new Deck([...cards]);
    d.shuffleDeck();
    // With seed=0 Fisher-Yates rotates: [a,b,c] → [b,c,a]
    expect(d.cards.map((c) => c.id)).toEqual(['b', 'c', 'a']);
    spy.mockRestore();
  });

  it('discardTop reflects the most recently added card', () => {
    const d = new Deck();
    d.discardCard(makeCard('a'));
    d.discardCard(makeCard('b'));
    expect(d.discardTop?.id).toBe('b');
  });
});
