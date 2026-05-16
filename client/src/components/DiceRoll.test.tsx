import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { DiceRoll } from './DiceRoll';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('DiceRoll', () => {
  it('renders a face number', () => {
    const { container } = render(<DiceRoll result={3} trigger={1} />);
    expect(container.textContent).toMatch(/[1-6]/);
  });

  it('animates and stops on the provided result', async () => {
    const { container, rerender } = render(<DiceRoll trigger={0} />);
    rerender(<DiceRoll result={5} trigger={1} />);
    // Let the interval kick a few times
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(container.textContent).toContain('5');
  });

  it('with no result still settles', async () => {
    const { container } = render(<DiceRoll trigger={1} />);
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(container.textContent).toMatch(/[1-6]/);
  });

  it('does nothing when trigger is 0', () => {
    const { container } = render(<DiceRoll trigger={0} />);
    expect(container.textContent).toBeTruthy();
  });
});
