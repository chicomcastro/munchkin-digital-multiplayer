import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastStack, type ToastEntry } from './Toast';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const baseToast = (over: Partial<ToastEntry> = {}): ToastEntry => ({
  id: 't1',
  text: 'Hello',
  kind: 'info',
  ...over,
});

describe('ToastStack', () => {
  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastStack toasts={[]} onDismiss={vi.fn()} />);
    expect(container.firstChild?.firstChild).toBeNull();
  });

  it('renders one toast per entry', () => {
    render(
      <ToastStack
        toasts={[baseToast(), baseToast({ id: 't2', text: 'World', kind: 'level' })]}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('World')).toBeInTheDocument();
  });

  it('auto-dismisses after 3s for non-death toasts', () => {
    const dismiss = vi.fn();
    render(<ToastStack toasts={[baseToast()]} onDismiss={dismiss} />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(dismiss).toHaveBeenCalledWith('t1');
  });

  it('auto-dismisses after 4.5s for death toasts', () => {
    const dismiss = vi.fn();
    render(<ToastStack toasts={[baseToast({ kind: 'death' })]} onDismiss={dismiss} />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(dismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(dismiss).toHaveBeenCalledWith('t1');
  });

  it.each(['level', 'combat', 'curse', 'death', 'info'] as const)(
    'renders kind=%s with its icon prefix',
    (kind) => {
      render(<ToastStack toasts={[baseToast({ kind, text: `t-${kind}` })]} onDismiss={vi.fn()} />);
      expect(screen.getByText(`t-${kind}`)).toBeInTheDocument();
    },
  );
});
