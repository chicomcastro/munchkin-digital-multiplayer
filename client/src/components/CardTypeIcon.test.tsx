import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardTypeIcon } from './CardTypeIcon';
import type { CardType } from '../types';

const allTypes: CardType[] = ['monster', 'curse', 'race', 'class', 'item', 'oneShot', 'levelUp', 'helper'];

describe('CardTypeIcon', () => {
  it('renders a unique SVG for every card type', () => {
    const seen = new Set<string>();
    for (const type of allTypes) {
      const { container, unmount } = render(<CardTypeIcon type={type} />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('data-testid')).toBe(`card-type-icon-${type}`);
      const markup = svg!.innerHTML;
      expect(markup.length).toBeGreaterThan(0);
      expect(seen.has(markup)).toBe(false);
      seen.add(markup);
      unmount();
    }
  });

  it('falls back to a generic icon when the type is unknown', () => {
    const { container } = render(<CardTypeIcon type="unknown-type" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('data-testid')).toBe('card-type-icon-unknown-type');
  });

  it('is hidden from assistive tech by default', () => {
    const { container } = render(<CardTypeIcon type="monster" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('exposes a title and img role when a title is provided', () => {
    render(<CardTypeIcon type="monster" title="Monstro" />);
    const svg = screen.getByRole('img', { name: 'Monstro' });
    expect(svg.getAttribute('aria-hidden')).toBeNull();
  });

  it('respects the size prop', () => {
    const { container } = render(<CardTypeIcon type="item" size={48} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('48');
    expect(svg?.getAttribute('height')).toBe('48');
  });

  it('inherits text color via currentColor', () => {
    const { container } = render(<CardTypeIcon type="item" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('stroke')).toBe('currentColor');
  });
});
