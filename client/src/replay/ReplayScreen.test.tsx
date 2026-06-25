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

  it('step buttons move the cursor through frames', async () => {
    render(<ReplayScreen onLeave={vi.fn()} />);
    fireEvent.click(screen.getByTestId('replay-record'));
    await waitFor(() => expect(screen.getByTestId('replay-progress')).toBeInTheDocument());
    // Pause immediately so playback doesn't race us.
    fireEvent.click(screen.getByTestId('replay-playpause'));
    const before = screen.getByTestId('replay-progress').textContent ?? '';
    fireEvent.click(screen.getByRole('button', { name: t.replayNext }));
    await waitFor(() => {
      expect(screen.getByTestId('replay-progress').textContent).not.toBe(before);
    });
    // Step back to the previous frame.
    const mid = screen.getByTestId('replay-progress').textContent;
    fireEvent.click(screen.getByRole('button', { name: t.replayPrev }));
    await waitFor(() => {
      expect(screen.getByTestId('replay-progress').textContent).not.toBe(mid);
    });
  });

  it('scrubbing the timeline jumps to the picked frame and pauses', async () => {
    render(<ReplayScreen onLeave={vi.fn()} />);
    fireEvent.click(screen.getByTestId('replay-record'));
    await waitFor(() => expect(screen.getByTestId('replay-progress')).toBeInTheDocument());
    const slider = screen.getByLabelText(t.replayScrub) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '0' } });
    await waitFor(() => {
      expect(screen.getByTestId('replay-progress').textContent?.startsWith('1/')).toBe(true);
    });
  });

  it('changing the speed updates the selected button', async () => {
    render(<ReplayScreen onLeave={vi.fn()} />);
    fireEvent.click(screen.getByTestId('replay-record'));
    await waitFor(() => expect(screen.getByTestId('replay-progress')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '4×' }));
    // The 4× button keeps the active styling — assertion is via class.
    expect(screen.getByRole('button', { name: '4×' }).className).toMatch(/bg-amber-500/);
  });

  it('switching the scenario preset preserves the empty state when no record yet', () => {
    render(<ReplayScreen onLeave={vi.fn()} />);
    const select = screen.getByLabelText(t.replayPreset);
    fireEvent.change(select, { target: { value: 'mix4' } });
    expect(screen.getByText(t.replayEmpty)).toBeInTheDocument();
  });
});
