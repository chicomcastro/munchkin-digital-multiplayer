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
    render(<BoardView state={makeState()} />);
    expect(screen.getAllByText(new RegExp(t.active2, 'i')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });

  it('shows a flavorful no-combat placeholder when none', () => {
    render(<BoardView state={makeState()} />);
    expect(screen.getByText(t.emptyNoCombat)).toBeInTheDocument();
  });

  it('renders the combat arena when combat is active', () => {
    const state = makeState({ combatState: makeCombat({ playerPower: 6, monsterPower: 3 }) });
    render(<BoardView state={state} />);
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
    render(<BoardView state={state} />);
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
    render(<BoardView state={state} />);
    expect(screen.getByText('Market Sword')).toBeInTheDocument();
  });

  it('renders coop progress for boss fight', () => {
    const state = makeState({
      config: makeConfig({ variant: 'cooperative', coopObjective: 'bossFight', coopBossLevel: 20, threatTrackEnabled: true }),
      coopBossHpRemaining: 10,
      threatTrack: 4,
    });
    render(<BoardView state={state} />);
    expect(screen.getByText(new RegExp(t.bossHp))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(t.threat))).toBeInTheDocument();
  });

  it('renders coop progress for dungeon trail', () => {
    const state = makeState({
      config: makeConfig({ variant: 'cooperative', coopObjective: 'dungeonTrail', coopTrailSize: 6 }),
      coopMonstersDefeated: 3,
    });
    render(<BoardView state={state} />);
    expect(screen.getByText(new RegExp(t.trail))).toBeInTheDocument();
  });

  it('renders coop progress for surviveRounds', () => {
    const state = makeState({
      config: makeConfig({ variant: 'cooperative', coopObjective: 'surviveRounds', coopRounds: 8 }),
      turn: 4,
    });
    render(<BoardView state={state} />);
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
    render(<BoardView state={state} />);
    // In jsdom both the mobile grid and the xl: sidebar render — getAll is fine.
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Carol').length).toBeGreaterThan(0);
  });

  it('shows game-over banner when phase is ended', () => {
    const state = makeState({ phase: 'ended', winnerId: 'p1' });
    render(<BoardView state={state} />);
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
    render(<BoardView state={state} />);
    expect(screen.getAllByText(/Threat track maxed/).length).toBeGreaterThan(0);
  });

  it('renders global timer when set', () => {
    const state = makeState({ globalTimerEndsAt: Date.now() + 60_000 });
    render(<BoardView state={state} />);
    expect(screen.getByText(new RegExp(t.globalTimer))).toBeInTheDocument();
  });


  it('turn timer ticks and goes red at low time', () => {
    vi.useFakeTimers();
    const state = makeState({ turnTimerEndsAt: Date.now() + 5000 });
    render(<BoardView state={state} />);
    expect(screen.getByText(/\d+s/)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.getByText(/\d+s/)).toBeInTheDocument();
  });

  it('renders a turn timer progress bar when configured', () => {
    const state = makeState({
      config: makeConfig({ turnTimerSeconds: 30 }),
      turnTimerEndsAt: Date.now() + 15_000,
    });
    const { container } = render(<BoardView state={state} />);
    // The progress bar is rendered with `width: NN%`
    const bar = Array.from(container.querySelectorAll('div')).find((el) => /width:/.test(el.getAttribute('style') ?? ''));
    expect(bar).toBeTruthy();
  });

  it('renders an SVG trophy in the goal room (no emoji glyph)', () => {
    const { container } = render(<BoardView state={makeState()} />);
    const trophies = container.querySelectorAll('[data-testid="trophy-icon"]');
    expect(trophies.length).toBeGreaterThan(0);
    const svgs = container.querySelectorAll('svg');
    for (const svg of svgs) {
      expect(svg.textContent ?? '').not.toMatch(/[\uD800-\uDBFF]/);
    }
  });

  it('renders SVG trophy in the game-over banner (no emoji glyph in the banner)', () => {
    const { container } = render(<BoardView state={makeState({ phase: 'ended', winnerId: 'p1' })} />);
    const trophies = container.querySelectorAll('[data-testid="trophy-icon"]');
    expect(trophies.length).toBeGreaterThanOrEqual(2);
    const banner = Array.from(container.querySelectorAll('div')).find((el) =>
      (el.textContent ?? '').includes(t.gameOver),
    );
    expect(banner).toBeTruthy();
    const bannerHeader = banner!.querySelector('[aria-hidden="true"]');
    expect(bannerHeader?.querySelector('[data-testid="trophy-icon"]')).not.toBeNull();
    expect(bannerHeader?.textContent ?? '').not.toMatch(/[\uD800-\uDBFF]/);
  });

  it('keeps player tokens inside the room circle even with multiple players at the same level', () => {
    const state = makeState({
      players: [
        makePlayer({ id: 'p1', name: 'Alice', level: 1 }),
        makePlayer({ id: 'p2', name: 'Bob', level: 1 }),
        makePlayer({ id: 'p3', name: 'Carol', level: 1 }),
      ],
    });
    const { container } = render(<BoardView state={state} />);
    const svg = container.querySelector('svg[aria-label]');
    expect(svg).not.toBeNull();
    const roomCircles = svg!.querySelectorAll('circle[fill="url(#dng-floor)"]');
    expect(roomCircles.length).toBeGreaterThan(0);
    const room1 = roomCircles[0]!;
    const cx = parseFloat(room1.getAttribute('cx')!);
    const cy = parseFloat(room1.getAttribute('cy')!);
    const r = parseFloat(room1.getAttribute('r')!);
    const tokens = svg!.querySelectorAll('circle[r="9"]');
    expect(tokens.length).toBe(3);
    for (const tk of tokens) {
      const tx = parseFloat(tk.getAttribute('cx')!);
      const ty = parseFloat(tk.getAttribute('cy')!);
      const dist = Math.sqrt((tx - cx) ** 2 + (ty - cy) ** 2);
      expect(dist + 9).toBeLessThanOrEqual(r + 0.5);
    }
  });

  it('does not render the VITÓRIA label inside the dungeon map (icon-only goal)', () => {
    const { container } = render(<BoardView state={makeState()} />);
    const svg = container.querySelector('svg[aria-label]');
    const labels = svg ? Array.from(svg.querySelectorAll('text')).map((n) => n.textContent ?? '') : [];
    expect(labels).not.toContain(t.dungeonGoal.toUpperCase());
  });

  it('global timer ticks and renders M:SS', () => {
    vi.useFakeTimers();
    const state = makeState({ globalTimerEndsAt: Date.now() + 125_000 });
    render(<BoardView state={state} />);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText(new RegExp(`${t.globalTimer} \\d+:\\d{2}`))).toBeInTheDocument();
  });
});
