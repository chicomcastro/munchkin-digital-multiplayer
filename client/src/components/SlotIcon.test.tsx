import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SlotIcon } from './SlotIcon';

describe('SlotIcon', () => {
  const slots = ['head', 'body', 'hand', 'feet', 'twoHands'] as const;

  it('renders a unique SVG silhouette for every slot kind', () => {
    const seen = new Set<string>();
    for (const slot of slots) {
      const { container, unmount } = render(<SlotIcon slot={slot} />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('data-testid')).toBe(`slot-icon-${slot}`);
      const markup = svg!.innerHTML;
      expect(seen.has(markup)).toBe(false);
      seen.add(markup);
      unmount();
    }
  });

  it('is hidden from assistive tech', () => {
    const { container } = render(<SlotIcon slot="head" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('respects the size prop', () => {
    const { container } = render(<SlotIcon slot="body" size={32} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('height')).toBe('32');
  });
});
