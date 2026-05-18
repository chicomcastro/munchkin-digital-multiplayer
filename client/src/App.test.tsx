import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { mockSocket, resetMockSocket } from './test/mockSocket';
import App from './App';
import { makeState, makeCard, makePlayer } from './test/fixtures';
import { t } from './i18n';

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
    expect(screen.getByText(t.disconnectedBanner)).toBeInTheDocument();
  });

  it('after create, transitions to Lobby once state arrives', async () => {
    mockSocket.queueAck('room:create', { ok: true, roomCode: 'MNK-ZZZ', playerId: 'p1' });
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(t.namePlaceholder), { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: t.createRoom }));
    await waitFor(() => expect(screen.getByText(t.connecting)).toBeInTheDocument());
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
    await waitFor(() => expect(screen.getByText(new RegExp(t.kickDoor))).toBeInTheDocument());
  });

  it('toggles to BoardView and back', async () => {
    localStorage.setItem('munchkin:session', JSON.stringify({ roomCode: 'MNK-AAA', playerId: 'p1', name: 'Alice' }));
    mockSocket.queueAck('room:join', { ok: true, roomCode: 'MNK-AAA', playerId: 'p1' });
    render(<App />);
    act(() => {
      mockSocket.serverEmit('game:stateUpdate', makeState({ phase: 'playing' }));
      mockSocket.serverEmit('game:yourHand', { hand: [], fist: [] });
    });
    await waitFor(() => expect(screen.getByText(new RegExp(t.kickDoor))).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.boardMode, 'i') }));
    await waitFor(() => expect(screen.getByRole('button', { name: new RegExp(t.playerMode, 'i') })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.playerMode, 'i') }));
    await waitFor(() => expect(screen.getByText(new RegExp(t.kickDoor))).toBeInTheDocument());
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
    await waitFor(() => expect(screen.getByText(new RegExp(t.kickDoor))).toBeInTheDocument());
    fireEvent.click(screen.getByText(t.leave));
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

  it('shows onboarding modal on first visit and hides after dismiss', () => {
    render(<App />);
    expect(screen.getByText(t.onboardingTitle1)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t.onboardingSkip }));
    expect(screen.queryByText(t.onboardingTitle1)).not.toBeInTheDocument();
  });

  it('hides onboarding when localStorage flag is set', () => {
    localStorage.setItem('munchkin:onboarding', '1');
    render(<App />);
    expect(screen.queryByText(t.onboardingTitle1)).not.toBeInTheDocument();
  });

  it('help button re-opens onboarding from the home screen', () => {
    localStorage.setItem('munchkin:onboarding', '1');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: t.onboardingHelp }));
    expect(screen.getByText(t.onboardingTitle1)).toBeInTheDocument();
  });

  it('uses ?code= from the URL as a deep-link', () => {
    const orig = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...orig, search: '?code=MNK-XYZ', reload: vi.fn() },
    });
    render(<App />);
    const input = screen.getByPlaceholderText(t.roomCodePlaceholder) as HTMLInputElement;
    expect(input.value).toBe('MNK-XYZ');
    // restore
    Object.defineProperty(window, 'location', { configurable: true, value: orig });
  });

  it('ignores ?code= when it does not match the MNK-XXX pattern', () => {
    const orig = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...orig, search: '?code=garbage', reload: vi.fn() },
    });
    render(<App />);
    const input = screen.getByPlaceholderText(t.roomCodePlaceholder) as HTMLInputElement;
    expect(input.value).toBe('');
    Object.defineProperty(window, 'location', { configurable: true, value: orig });
  });

  it('language picker switches the locale', () => {
    render(<App />);
    // The picker is a select with the current locale
    const select = screen.getByLabelText('Language') as HTMLSelectElement;
    expect(select.value).toBe('pt-BR');
    fireEvent.change(select, { target: { value: 'en' } });
    // The Home title changes to English
    expect(screen.getByText(/Digital Multiplayer/)).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'pt-BR' } });
  });

  it('sound toggle button starts as 🔇 and flips to 🔊', () => {
    localStorage.setItem('munchkin:session', JSON.stringify({ roomCode: 'MNK-AAA', playerId: 'p1', name: 'Alice' }));
    localStorage.setItem('munchkin:onboarding', '1');
    mockSocket.queueAck('room:join', { ok: true, roomCode: 'MNK-AAA', playerId: 'p1' });
    render(<App />);
    act(() => {
      mockSocket.serverEmit('game:stateUpdate', makeState({ phase: 'playing' }));
      mockSocket.serverEmit('game:yourHand', { hand: [], fist: [] });
    });
    const muted = screen.getByRole('button', { name: t.toggleSound });
    expect(muted.textContent).toContain('🔇');
    fireEvent.click(muted);
    expect(screen.getByRole('button', { name: t.toggleSound }).textContent).toContain('🔊');
  });
});
