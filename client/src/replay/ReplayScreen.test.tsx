import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReplayScreen } from './ReplayScreen';
import { t } from '../i18n';

describe('ReplayScreen', () => {
  it('renders the empty state before any match is generated', () => {
    render(<ReplayScreen onLeave={vi.fn()} />);
    expect(screen.getByText(t.replayEmpty)).toBeInTheDocument();
    expect(screen.queryByTestId('replay-progress')).toBeNull();
  });

  it('clicking Gerar partida produces a playable recording with a progress counter', async () => {
    render(<ReplayScreen onLeave={vi.fn()} />);
    fireEvent.click(screen.getByTestId('replay-record'));
    await waitFor(() => {
      expect(screen.getByTestId('replay-progress')).toBeInTheDocument();
    });
    const progress = screen.getByTestId('replay-progress').textContent ?? '';
    expect(progress).toMatch(/^\d+\/\d+$/);
  });

  it('Leave invokes the parent callback', () => {
    const onLeave = vi.fn();
    render(<ReplayScreen onLeave={onLeave} />);
    fireEvent.click(screen.getByRole('button', { name: t.leave }));
    expect(onLeave).toHaveBeenCalled();
  });
});
