import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { resetMockSocket } from '../test/mockSocket';
import { BoardView } from './BoardView';
import { makeCard, makeCombat, makeConfig, makePlayer, makeState } from '../test/fixtures';
import { t } from '../i18n';

beforeEach(() => {
  resetMockSocket();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('BoardView', () => {
  it('renders header with active player', () => {
    render(<BoardView state={makeState()} onPlayerMode={vi.fn()} />);
    expect(screen.getAllByText(new RegExp(t.active2, 'i')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });

  it('shows a flavorful no-combat placeholder when none', () => {
    render(<BoardView state={makeState()} onPlayerMode={vi.fn()} />);
    expect(screen.getByText(t.emptyNoCombat)).toBeInTheDocument();
  });

  it('renders the combat arena when combat is active', () => {
    const state = makeState({ combatState: makeCombat({ playerPower: 6, monsterPower: 3 }) });
    render(<BoardView state={state} onPlayerMode={vi.fn()} />);
    expect(screen.getAllByText(new RegExp(`${t.combat}|${t.monsterSide}|${t.playerSide}`, 'i')).length).toBeGreaterThan(0);
  });

  it('renders the log entries', () => {
    const state = makeState({
      log: [
        { id: 'l1', ts: Date.now(), text: 'Combat started', kind: 'combat' },
        { id: 'l2', ts: Date.now(), text: 'Curse fell', kind: 'curse' },
        { id: 'l3', ts: Date.now(), text: 'Hit level 2', kind: 'level' },
        { id: 'l4', ts: Date.now(), text: 'Game ended', kind: 'system' },
        { id: 'l5', ts: Date.now(), text: 'Info message', kind: 'info' },
      ],
    });
    render(<BoardView state={state} onPlayerMode={vi.fn()} />);
    expect(screen.getByText('Combat started')).toBeInTheDocument();
    expect(screen.getByText('Curse fell')).toBeInTheDocument();
    expect(screen.getByText('Hit level 2')).toBeInTheDocument();
    expect(screen.getByText('Game ended')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('renders the market when enabled', () => {
    const state = makeState({
      config: makeConfig({ marketEnabled: true }),
      market: [makeCard({ id: 'mk1', name: 'Market Sword' })],
    });
    render(<BoardView state={state} onPlayerMode={vi.fn()} />);
    expect(screen.getByText('Market Sword')).toBeInTheDocument();
  });

  it('renders coop progress for boss fight', () => {
    const state = makeState({
      config: makeConfig({ variant: 'cooperative', coopObjective: 'bossFight', coopBossLevel: 20, threatTrackEnabled: true }),
      coopBossHpRemaining: 10,
      threatTrack: 4,
    });
    render(<BoardView state={state} onPlayerMode={vi.fn()} />);
    expect(screen.getByText(new RegExp(t.bossHp))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(t.threat))).toBeInTheDocument();
  });

  it('renders coop progress for dungeon trail', () => {
    const state = makeState({
      config: makeConfig({ variant: 'cooperative', coopObjective: 'dungeonTrail', coopTrailSize: 6 }),
      coopMonstersDefeated: 3,
    });
    render(<BoardView state={state} onPlayerMode={vi.fn()} />);
    expect(screen.getByText(new RegExp(t.trail))).toBeInTheDocument();
  });

  it('renders coop progress for surviveRounds', () => {
    const state = makeState({
      config: makeConfig({ variant: 'cooperative', coopObjective: 'surviveRounds', coopRounds: 8 }),
      turn: 4,
    });
    render(<BoardView state={state} onPlayerMode={vi.fn()} />);
    expect(screen.getByText(new RegExp(`${t.round} 4`))).toBeInTheDocument();
  });

  it('renders all player statuses', () => {
    const state = makeState({
      players: [
        makePlayer({ id: 'p1', name: 'Alice' }),
        makePlayer({ id: 'p2', name: 'Bob' }),
        makePlayer({ id: 'p3', name: 'Carol' }),
      ],
    });
    render(<BoardView state={state} onPlayerMode={vi.fn()} />);
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
  });

  it('shows game-over banner when phase is ended', () => {
    const state = makeState({ phase: 'ended', winnerId: 'p1' });
    render(<BoardView state={state} onPlayerMode={vi.fn()} />);
    expect(screen.getByText(t.gameOver)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(t.winner))).toBeInTheDocument();
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });

  it('shows ended state with no winner uses last log entry', () => {
    const state = makeState({
      phase: 'ended',
      winnerId: null,
      log: [{ id: 'last', ts: Date.now(), text: 'Threat track maxed out.', kind: 'system' }],
    });
    render(<BoardView state={state} onPlayerMode={vi.fn()} />);
    expect(screen.getAllByText(/Threat track maxed/).length).toBeGreaterThan(0);
  });

  it('renders global timer when set', () => {
    const state = makeState({ globalTimerEndsAt: Date.now() + 60_000 });
    render(<BoardView state={state} onPlayerMode={vi.fn()} />);
    expect(screen.getByText(new RegExp(t.globalTimer))).toBeInTheDocument();
  });

  it('clicking player mode triggers callback', () => {
    const cb = vi.fn();
    render(<BoardView state={makeState()} onPlayerMode={cb} />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.playerMode, 'i') }));
    expect(cb).toHaveBeenCalled();
  });

  it('turn timer ticks and goes red at low time', () => {
    vi.useFakeTimers();
    const state = makeState({ turnTimerEndsAt: Date.now() + 5000 });
    render(<BoardView state={state} onPlayerMode={vi.fn()} />);
    expect(screen.getByText(/\d+s/)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.getByText(/\d+s/)).toBeInTheDocument();
  });

  it('renders a turn timer progress bar when configured', () => {
    const state = makeState({
      config: makeConfig({ turnTimerSeconds: 30 }),
      turnTimerEndsAt: Date.now() + 15_000,
    });
    const { container } = render(<BoardView state={state} onPlayerMode={vi.fn()} />);
    // The progress bar is rendered with `width: NN%`
    const bar = Array.from(container.querySelectorAll('div')).find((el) => /width:/.test(el.getAttribute('style') ?? ''));
    expect(bar).toBeTruthy();
  });

  it('global timer ticks and renders M:SS', () => {
    vi.useFakeTimers();
    const state = makeState({ globalTimerEndsAt: Date.now() + 125_000 });
    render(<BoardView state={state} onPlayerMode={vi.fn()} />);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText(new RegExp(`${t.globalTimer} \\d+:\\d{2}`))).toBeInTheDocument();
  });
});
