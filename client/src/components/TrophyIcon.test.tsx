import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrophyIcon } from './TrophyIcon';

describe('TrophyIcon', () => {
  it('renders an SVG with a recognizable test id', () => {
    const { container } = render(<TrophyIcon />);
    expect(container.querySelector('[data-testid="trophy-icon"]')).not.toBeNull();
  });

  it('is hidden from assistive tech by default', () => {
    const { container } = render(<TrophyIcon />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('exposes a title and img role when title is provided', () => {
    render(<TrophyIcon title="Troféu" />);
    expect(screen.getByRole('img', { name: 'Troféu' })).toBeTruthy();
  });

  it('respects the size prop', () => {
    const { container } = render(<TrophyIcon size={64} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('64');
    expect(svg?.getAttribute('height')).toBe('64');
  });

  it('positions itself around (x, y) when rendered as svg child', () => {
    const { container } = render(
      <svg>
        <TrophyIcon asSvgChild size={20} x={50} y={30} />
      </svg>,
    );
    const inner = container.querySelector('svg svg');
    expect(inner).not.toBeNull();
    expect(inner!.getAttribute('x')).toBe('40');
    expect(inner!.getAttribute('y')).toBe('20');
    expect(inner!.getAttribute('width')).toBe('20');
  });

  it('defaults x/y to 0 when omitted in svg-child mode', () => {
    const { container } = render(
      <svg>
        <TrophyIcon asSvgChild size={10} />
      </svg>,
    );
    const inner = container.querySelector('svg svg');
    expect(inner!.getAttribute('x')).toBe('-5');
    expect(inner!.getAttribute('y')).toBe('-5');
  });
});
