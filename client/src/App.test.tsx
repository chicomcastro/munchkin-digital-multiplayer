import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { mockSocket, resetMockSocket } from './test/mockSocket';
import App from './App';
import { makeState, makeCard, makePlayer } from './test/fixtures';

beforeEach(() => {
  resetMockSocket();
  localStorage.clear();
  vi.spyOn(window, 'location', 'get').mockReturnValue({
    ...window.location,
    reload: vi.fn(),
  } as any);
});

describe('App', () => {
  it('shows Home when no session is stored', () => {
    render(<App />);
    expect(screen.getByText('Munchkin')).toBeInTheDocument();
  });

  it('shows ConnectingBanner when disconnected', () => {
    mockSocket.connected = false;
    render(<App />);
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
  });

  it('after create, transitions to Lobby once state arrives', async () => {
    mockSocket.queueAck('room:create', { ok: true, roomCode: 'MNK-ZZZ', playerId: 'p1' });
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Adventurer'), { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: /create room/i }));
    await waitFor(() => expect(screen.getByText(/Connecting/i)).toBeInTheDocument());
    // Server pushes lobby state
    act(() => {
      mockSocket.serverEmit('game:stateUpdate', makeState({
        phase: 'lobby',
        roomCode: 'MNK-ZZZ',
        players: [makePlayer({ id: 'p1', name: 'Alice' })],
      }));
    });
    await waitFor(() => expect(screen.getByText('MNK-ZZZ')).toBeInTheDocument());
  });

  it('shows PlayerView when game is playing', async () => {
    localStorage.setItem('munchkin:session', JSON.stringify({ roomCode: 'MNK-AAA', playerId: 'p1', name: 'Alice' }));
    mockSocket.queueAck('room:join', { ok: true, roomCode: 'MNK-AAA', playerId: 'p1' });
    render(<App />);
    act(() => {
      mockSocket.serverEmit('game:stateUpdate', makeState({ phase: 'playing' }));
      mockSocket.serverEmit('game:yourHand', { hand: [makeCard()], fist: [] });
    });
    await waitFor(() => expect(screen.getByText(/Kick door/)).toBeInTheDocument());
  });

  it('toggles to BoardView and back', async () => {
    localStorage.setItem('munchkin:session', JSON.stringify({ roomCode: 'MNK-AAA', playerId: 'p1', name: 'Alice' }));
    mockSocket.queueAck('room:join', { ok: true, roomCode: 'MNK-AAA', playerId: 'p1' });
    render(<App />);
    act(() => {
      mockSocket.serverEmit('game:stateUpdate', makeState({ phase: 'playing' }));
      mockSocket.serverEmit('game:yourHand', { hand: [], fist: [] });
    });
    await waitFor(() => expect(screen.getByText(/Kick door/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /board mode/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /player mode/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /player mode/i }));
    await waitFor(() => expect(screen.getByText(/Kick door/)).toBeInTheDocument());
  });

  it('shows error toast when error event fires', async () => {
    localStorage.setItem('munchkin:session', JSON.stringify({ roomCode: 'MNK-AAA', playerId: 'p1', name: 'Alice' }));
    mockSocket.queueAck('room:join', { ok: true, roomCode: 'MNK-AAA', playerId: 'p1' });
    render(<App />);
    act(() => {
      mockSocket.serverEmit('game:stateUpdate', makeState({ phase: 'playing' }));
      mockSocket.serverEmit('game:yourHand', { hand: [], fist: [] });
      mockSocket.serverEmit('error', 'Not your turn.');
    });
    await waitFor(() => expect(screen.getByText('Not your turn.')).toBeInTheDocument());
  });

  it('leave clears session and reloads', async () => {
    localStorage.setItem('munchkin:session', JSON.stringify({ roomCode: 'MNK-AAA', playerId: 'p1', name: 'Alice' }));
    mockSocket.queueAck('room:join', { ok: true, roomCode: 'MNK-AAA', playerId: 'p1' });
    render(<App />);
    act(() => {
      mockSocket.serverEmit('game:stateUpdate', makeState({ phase: 'playing' }));
      mockSocket.serverEmit('game:yourHand', { hand: [], fist: [] });
    });
    await waitFor(() => expect(screen.getByText(/Kick door/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('leave'));
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('clears session on join error during reconnect', async () => {
    localStorage.setItem('munchkin:session', JSON.stringify({ roomCode: 'MNK-AAA', playerId: 'p1', name: 'Alice' }));
    mockSocket.queueAck('room:join', { ok: false, error: 'Room not found.' });
    render(<App />);
    await waitFor(() => {
      expect(localStorage.getItem('munchkin:session')).toBeNull();
    });
  });

  it('handles malformed session JSON gracefully', () => {
    localStorage.setItem('munchkin:session', 'not-json');
    render(<App />);
    expect(screen.getByText('Munchkin')).toBeInTheDocument();
  });
});
