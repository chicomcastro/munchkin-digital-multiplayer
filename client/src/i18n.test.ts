import { describe, it, expect } from 'vitest';
import { t, cardTypeLabels, variantLabels } from './i18n';

describe('i18n.resultLabel', () => {
  it('maps every combat result to a translated label', () => {
    expect(t.resultLabel('victory')).toBe(t.victory);
    expect(t.resultLabel('badStuff')).toBe(t.badStuff);
    expect(t.resultLabel('flee')).toBe('FUGA');
  });

  it('falls back to "em andamento" for unknown results', () => {
    expect(t.resultLabel('pending')).toBe(t.pending);
    expect(t.resultLabel('something-else')).toBe(t.pending);
  });
});

describe('i18n.selling', () => {
  it('uses singular for 1 item', () => {
    expect(t.selling(1)).toMatch(/1 item$/);
  });

  it('uses plural for more than one item', () => {
    expect(t.selling(2)).toMatch(/2 itens$/);
    expect(t.selling(0)).toMatch(/0 itens$/);
  });
});

describe('i18n.waitingForHost', () => {
  it('interpolates the host name', () => {
    expect(t.waitingForHost('Alice')).toContain('Alice');
  });
});

describe('label tables', () => {
  it('exposes a label for every card type', () => {
    for (const k of ['monster', 'curse', 'race', 'class', 'item', 'oneShot', 'levelUp', 'helper'] as const) {
      expect(cardTypeLabels[k]).toBeTruthy();
    }
  });

  it('exposes a label for every variant', () => {
    for (const k of ['quick', 'medium', 'long', 'cooperative'] as const) {
      expect(variantLabels[k]).toBeTruthy();
    }
  });

  it('translates winning hints with positive diff', () => {
    expect(t.playersWinning(3)).toContain('+3');
    expect(t.monstersWinning(5)).toContain('+5');
  });
});
