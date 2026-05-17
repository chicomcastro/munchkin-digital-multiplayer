import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { DeathBanner } from './DeathBanner';
import { t } from '../i18n';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('DeathBanner', () => {
  it('renders nothing when trigger is 0', () => {
    const { container } = render(<DeathBanner trigger={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the banner when trigger is non-zero', () => {
    render(<DeathBanner trigger={1} />);
    expect(screen.getByText(t.deathBanner)).toBeInTheDocument();
    expect(screen.getByText(t.deathSub)).toBeInTheDocument();
  });

  it('auto-hides after 3.5s', () => {
    const { rerender } = render(<DeathBanner trigger={1} />);
    expect(screen.getByText(t.deathBanner)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3500); });
    rerender(<DeathBanner trigger={1} />);
    expect(screen.queryByText(t.deathBanner)).not.toBeInTheDocument();
  });

  it('shows again when trigger increments', () => {
    const { rerender } = render(<DeathBanner trigger={1} />);
    expect(screen.getByText(t.deathBanner)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3500); });
    rerender(<DeathBanner trigger={2} />);
    expect(screen.getByText(t.deathBanner)).toBeInTheDocument();
  });
});
