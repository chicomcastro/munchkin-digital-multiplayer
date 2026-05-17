import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { Confetti } from './Confetti';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('Confetti', () => {
  it('renders nothing when trigger is 0', () => {
    const { container } = render(<Confetti trigger={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('spawns particles when triggered', () => {
    const { container } = render(<Confetti trigger={1} count={5} />);
    const overlay = container.querySelector('div.fixed');
    expect(overlay).toBeTruthy();
    expect(overlay?.children.length).toBe(5);
  });

  it('respawns when trigger increments', () => {
    const { container, rerender } = render(<Confetti trigger={1} count={3} />);
    expect(container.querySelector('div.fixed')?.children.length).toBe(3);
    rerender(<Confetti trigger={2} count={7} />);
    expect(container.querySelector('div.fixed')?.children.length).toBe(7);
  });

  it('clears after the longest particle lifetime', () => {
    const { container } = render(<Confetti trigger={1} count={2} />);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(container.firstChild).toBeNull();
  });
});
