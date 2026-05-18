import { describe, it, expect, beforeEach } from 'vitest';
import { t, cardTypeLabels, variantLabels, setLocale, getLocale, subscribe } from './index';

beforeEach(() => {
  localStorage.clear();
  setLocale('pt-BR');
});

describe('i18n.resultLabel', () => {
  it('maps every combat result to a translated label', () => {
    expect(t.resultLabel('victory')).toBe(t.victory);
    expect(t.resultLabel('badStuff')).toBe(t.badStuff);
    expect(t.resultLabel('flee')).toBe(t.fugaLabel);
  });

  it('falls back to pending for unknown results', () => {
    expect(t.resultLabel('something-else')).toBe(t.pending);
  });
});

describe('i18n.selling', () => {
  it('uses singular for 1', () => {
    expect(t.selling(1)).toMatch(/1 item$/);
  });

  it('uses plural for more', () => {
    expect(t.selling(2)).toMatch(/2 itens$/);
    expect(t.selling(0)).toMatch(/0 itens$/);
  });
});

describe('i18n.waitingForHost', () => {
  it('interpolates the host name', () => {
    expect(t.waitingForHost('Alice')).toContain('Alice');
  });
});

describe('event interpolations', () => {
  it('youGotCard puts the card name', () => {
    expect(t.youGotCard('Big Sword')).toContain('Big Sword');
  });
  it('combatWon and combatLost both name the opponent', () => {
    expect(t.combatWon('Goblin')).toContain('Goblin');
    expect(t.combatLost('Goblin')).toContain('Goblin');
  });
  it('gameWon includes the winner', () => {
    expect(t.gameWon('Alice')).toContain('Alice');
  });
  it('youLeveledUp includes the new level', () => {
    expect(t.youLeveledUp(7)).toContain('7');
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
});

describe('locale switching', () => {
  it('default is pt-BR after a fresh storage', () => {
    expect(getLocale()).toBe('pt-BR');
    expect(t.kickDoor).toBe('Chutar porta');
  });

  it('setLocale switches the live binding', () => {
    setLocale('en');
    expect(getLocale()).toBe('en');
    expect(t.kickDoor).toBe('Kick door');
    setLocale('es');
    expect(t.kickDoor).toBe('Patear puerta');
    setLocale('pt-BR');
    expect(t.kickDoor).toBe('Chutar porta');
  });

  it('persists choice to localStorage', () => {
    setLocale('en');
    expect(localStorage.getItem('munchkin:locale')).toBe('en');
  });

  it('rejects unknown locales silently', () => {
    setLocale('xx' as any);
    expect(['pt-BR', 'en', 'es']).toContain(getLocale());
  });

  it('subscribe is called on every change', () => {
    let calls = 0;
    const unsub = subscribe(() => calls++);
    setLocale('en');
    setLocale('es');
    expect(calls).toBe(2);
    unsub();
    setLocale('pt-BR');
    expect(calls).toBe(2);
  });

  it('cardTypeLabels also reflect the new locale', () => {
    setLocale('en');
    expect(cardTypeLabels.monster).toBe('monster');
    setLocale('es');
    expect(cardTypeLabels.monster).toBe('monstruo');
  });

  it('every locale implements resultLabel for all 4 results', () => {
    for (const loc of ['pt-BR', 'en', 'es'] as const) {
      setLocale(loc);
      expect(t.resultLabel('victory')).toBeTruthy();
      expect(t.resultLabel('flee')).toBeTruthy();
      expect(t.resultLabel('badStuff')).toBeTruthy();
      expect(t.resultLabel('unknown')).toBeTruthy();
    }
  });

  it('every locale implements all interpolation helpers', () => {
    for (const loc of ['pt-BR', 'en', 'es'] as const) {
      setLocale(loc);
      expect(t.waitingForHost('Alice')).toContain('Alice');
      expect(t.selling(1)).toMatch(/1/);
      expect(t.selling(0)).toMatch(/0/);
      expect(t.youGotCard('X')).toContain('X');
      expect(t.youLeveledUp(3)).toContain('3');
      expect(t.combatWon('Goblin')).toContain('Goblin');
      expect(t.combatLost('Goblin')).toContain('Goblin');
      expect(t.gameWon('Alice')).toContain('Alice');
      expect(t.playersWinning(2)).toContain('2');
      expect(t.monstersWinning(2)).toContain('2');
      expect(t.monsterStats(5, 2, 1)).toMatch(/5/);
      expect(t.slotLabel('head')).toContain('head');
    }
  });
});
