import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockSocket, resetMockSocket } from '../test/mockSocket';
import { Lobby } from './Lobby';
import { makeState, makePlayer, makeConfig } from '../test/fixtures';

beforeEach(() => {
  resetMockSocket();
});

describe('Lobby', () => {
  it('renders room code and player list', () => {
    const state = makeState({
      phase: 'lobby',
      players: [
        makePlayer({ id: 'p1', name: 'Alice' }),
        makePlayer({ id: 'p2', name: 'Bob', color: '#3b82f6' }),
      ],
    });
    render(<Lobby state={state} myId="p1" onBoardMode={vi.fn()} />);
    expect(screen.getByText('MNK-AAA')).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
    expect(screen.getByText(/\(you\)/)).toBeInTheDocument();
  });

  it('allows the creator (first player) to start when enough players', async () => {
    mockSocket.queueAck('room:start', { ok: true });
    const state = makeState({
      phase: 'lobby',
      players: [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2', name: 'Bob' })],
    });
    render(<Lobby state={state} myId="p1" onBoardMode={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /start game/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    await waitFor(() => {
      expect(mockSocket.lastEmit('room:start')).toBeTruthy();
    });
  });

  it('disables start button with fewer than 2 players', () => {
    const state = makeState({ phase: 'lobby', players: [makePlayer({ id: 'p1' })] });
    render(<Lobby state={state} myId="p1" onBoardMode={vi.fn()} />);
    expect(screen.getByRole('button', { name: /start game/i })).toBeDisabled();
  });

  it('shows waiting message for non-creator', () => {
    const state = makeState({
      phase: 'lobby',
      players: [makePlayer({ id: 'p1', name: 'Alice' }), makePlayer({ id: 'p2', name: 'Bob' })],
    });
    render(<Lobby state={state} myId="p2" onBoardMode={vi.fn()} />);
    expect(screen.getByText(/Waiting for Alice/)).toBeInTheDocument();
  });

  it('creator can switch variants', async () => {
    const state = makeState({ phase: 'lobby', players: [makePlayer({ id: 'p1' })] });
    render(<Lobby state={state} myId="p1" onBoardMode={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue(/Média/), { target: { value: 'quick' } });
    await waitFor(() => {
      const last = mockSocket.lastEmit('room:updateConfig');
      expect(last?.payload.variant).toBe('quick');
    });
  });

  it('creator can adjust win level', async () => {
    const state = makeState({ phase: 'lobby', players: [makePlayer({ id: 'p1' })] });
    render(<Lobby state={state} myId="p1" onBoardMode={vi.fn()} />);
    const winSelect = screen.getAllByRole('combobox').find((el) => (el as HTMLSelectElement).value === '10')!;
    fireEvent.change(winSelect, { target: { value: '7' } });
    await waitFor(() => {
      const last = mockSocket.lastEmit('room:updateConfig');
      expect(last?.payload.winLevel).toBe(7);
    });
  });

  it('creator can toggle market on', async () => {
    const state = makeState({
      phase: 'lobby',
      config: makeConfig({ marketEnabled: false }),
      players: [makePlayer({ id: 'p1' })],
    });
    render(<Lobby state={state} myId="p1" onBoardMode={vi.fn()} />);
    const toggle = screen.getByLabelText(/Market$/i);
    fireEvent.click(toggle);
    await waitFor(() => {
      const last = mockSocket.lastEmit('room:updateConfig');
      expect(last?.payload.marketEnabled).toBe(true);
    });
  });

  it('configures cooperative-only fields when variant is cooperative', () => {
    const state = makeState({
      phase: 'lobby',
      config: makeConfig({ variant: 'cooperative' }),
      players: [makePlayer({ id: 'p1' })],
    });
    render(<Lobby state={state} myId="p1" onBoardMode={vi.fn()} />);
    expect(screen.getByText(/Coop objective/i)).toBeInTheDocument();
    expect(screen.getByText(/Boss level/i)).toBeInTheDocument();
  });

  it('board mode button triggers callback', () => {
    const cb = vi.fn();
    const state = makeState({ phase: 'lobby', players: [makePlayer({ id: 'p1' })] });
    render(<Lobby state={state} myId="p1" onBoardMode={cb} />);
    fireEvent.click(screen.getByRole('button', { name: /board mode/i }));
    expect(cb).toHaveBeenCalled();
  });

  it('shows disconnected banner when not connected', () => {
    const me = makePlayer({ id: 'p1', socketId: null });
    const state = makeState({ phase: 'lobby', players: [me] });
    render(<Lobby state={state} myId="p1" onBoardMode={vi.fn()} />);
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
  });

  it('clearing turn timer sends null', async () => {
    const state = makeState({
      phase: 'lobby',
      config: makeConfig({ turnTimerSeconds: 40 }),
      players: [makePlayer({ id: 'p1' })],
    });
    render(<Lobby state={state} myId="p1" onBoardMode={vi.fn()} />);
    const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    const turnInput = inputs.find((i) => i.value === '40')!;
    fireEvent.change(turnInput, { target: { value: '0' } });
    await waitFor(() => {
      const last = mockSocket.lastEmit('room:updateConfig');
      expect(last?.payload.turnTimerSeconds).toBeNull();
    });
  });

  it('setting turn timer to a positive value sends the number', async () => {
    const state = makeState({
      phase: 'lobby',
      config: makeConfig({ turnTimerSeconds: null }),
      players: [makePlayer({ id: 'p1' })],
    });
    render(<Lobby state={state} myId="p1" onBoardMode={vi.fn()} />);
    const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    // First spinbutton is "starting doors", we need turn timer (value 0)
    const turnInput = inputs.find((i) => i.value === '0')!;
    fireEvent.change(turnInput, { target: { value: '45' } });
    await waitFor(() => {
      const last = mockSocket.lastEmit('room:updateConfig');
      expect(last?.payload.turnTimerSeconds).toBe(45);
    });
  });

  it('setting global timer to positive then zero sends number then null', async () => {
    const state = makeState({
      phase: 'lobby',
      config: makeConfig({ globalTimerMinutes: 30 }),
      players: [makePlayer({ id: 'p1' })],
    });
    render(<Lobby state={state} myId="p1" onBoardMode={vi.fn()} />);
    const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    const globalInput = inputs.find((i) => i.value === '30')!;
    fireEvent.change(globalInput, { target: { value: '90' } });
    await waitFor(() => {
      expect(mockSocket.lastEmit('room:updateConfig')?.payload.globalTimerMinutes).toBe(90);
    });
    fireEvent.change(globalInput, { target: { value: '0' } });
    await waitFor(() => {
      expect(mockSocket.lastEmit('room:updateConfig')?.payload.globalTimerMinutes).toBeNull();
    });
  });

  it('every config toggle and number input emits an update', async () => {
    const state = makeState({
      phase: 'lobby',
      config: makeConfig({ marketEnabled: true, marketSize: 3 }),
      players: [makePlayer({ id: 'p1' })],
    });
    render(<Lobby state={state} myId="p1" onBoardMode={vi.fn()} />);

    // Player count — the only <select> with value 4 (number input also shows 4)
    const playerSelect = screen.getAllByDisplayValue('4').find((el) => el.tagName === 'SELECT') as HTMLSelectElement;
    fireEvent.change(playerSelect, { target: { value: '3' } });
    await waitFor(() => {
      expect(mockSocket.lastEmit('room:updateConfig')?.payload.playerCount).toBe(3);
    });

    // Market size
    const marketSelect = (screen.getByDisplayValue('3') as HTMLSelectElement);
    fireEvent.change(marketSelect, { target: { value: '5' } });
    await waitFor(() => {
      expect(mockSocket.lastEmit('room:updateConfig')?.payload.marketSize).toBe(5);
    });

    // Starting hand inputs
    const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    const startDoors = inputs.find((i) => i.value === '4')!;
    fireEvent.change(startDoors, { target: { value: '5' } });
    await waitFor(() => {
      expect(mockSocket.lastEmit('room:updateConfig')?.payload.startingHandDoors).toBe(5);
    });

    // Toggles
    const togglesToCheck = [
      /Listen at the door/i,
      /Fist mechanic/i,
      /No offensive curses/i,
      /No stealing/i,
      /No death/i,
    ];
    for (const lbl of togglesToCheck) {
      fireEvent.click(screen.getByLabelText(lbl));
    }
    expect(mockSocket.emittedEvents.filter((e) => e.event === 'room:updateConfig').length).toBeGreaterThanOrEqual(togglesToCheck.length);
  });

  it('cooperative-specific selects and inputs work', async () => {
    const state = makeState({
      phase: 'lobby',
      config: makeConfig({ variant: 'cooperative' }),
      players: [makePlayer({ id: 'p1' })],
    });
    render(<Lobby state={state} myId="p1" onBoardMode={vi.fn()} />);

    // Coop objective select
    const objSelect = screen.getByDisplayValue(/Boss fight/) as HTMLSelectElement;
    fireEvent.change(objSelect, { target: { value: 'dungeonTrail' } });
    await waitFor(() => {
      expect(mockSocket.lastEmit('room:updateConfig')?.payload.coopObjective).toBe('dungeonTrail');
    });

    // Boss level
    const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    const boss = inputs.find((i) => i.value === '20')!;
    fireEvent.change(boss, { target: { value: '15' } });
    await waitFor(() => {
      expect(mockSocket.lastEmit('room:updateConfig')?.payload.coopBossLevel).toBe(15);
    });

    // Trail size
    const trail = inputs.find((i) => i.value === '6')!;
    fireEvent.change(trail, { target: { value: '10' } });
    await waitFor(() => {
      expect(mockSocket.lastEmit('room:updateConfig')?.payload.coopTrailSize).toBe(10);
    });

    // Rounds
    const rounds = inputs.find((i) => i.value === '8')!;
    fireEvent.change(rounds, { target: { value: '12' } });
    await waitFor(() => {
      expect(mockSocket.lastEmit('room:updateConfig')?.payload.coopRounds).toBe(12);
    });

    // Threat track toggle
    fireEvent.click(screen.getByLabelText(/Threat track/i));
    await waitFor(() => {
      expect(mockSocket.lastEmit('room:updateConfig')?.payload).toHaveProperty('threatTrackEnabled');
    });
  });
});
