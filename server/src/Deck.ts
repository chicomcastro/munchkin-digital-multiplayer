import type { Card } from './types.js';

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

export class Deck {
  constructor(public cards: Card[] = [], public discard: Card[] = []) {}

  shuffleDeck() {
    this.cards = shuffle(this.cards);
  }

  draw(): Card | null {
    if (this.cards.length === 0) {
      if (this.discard.length === 0) return null;
      this.cards = shuffle(this.discard);
      this.discard = [];
    }
    return this.cards.pop() ?? null;
  }

  drawMany(n: number): Card[] {
    const out: Card[] = [];
    for (let i = 0; i < n; i++) {
      const c = this.draw();
      if (!c) break;
      out.push(c);
    }
    return out;
  }

  discardCard(c: Card) {
    this.discard.push(c);
  }

  get size() {
    return this.cards.length;
  }

  get discardTop(): Card | null {
    return this.discard.length > 0 ? this.discard[this.discard.length - 1]! : null;
  }
}
