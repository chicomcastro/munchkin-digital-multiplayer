import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockSocket, resetMockSocket } from '../test/mockSocket';
import { Home } from './Home';
import { t } from '../i18n';

beforeEach(() => {
  resetMockSocket();
  localStorage.clear();
});

describe('Home', () => {
  it('renders the title and two primary actions', () => {
    render(<Home onJoined={vi.fn()} />);
    expect(screen.getByText('Munchkin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.createRoom })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.joinRoom })).toBeInTheDocument();
  });

  it('requires a name to create a room (inline error on the name field)', () => {
    render(<Home onJoined={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: t.createRoom }));
    expect(screen.getByText(t.errChooseName)).toBeInTheDocument();
  });

  it('requires a name to join a room', () => {
    render(<Home onJoined={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: t.joinRoom }));
    expect(screen.getByText(t.errChooseName)).toBeInTheDocument();
  });

  it('requires a code to join', () => {
    render(<Home onJoined={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(t.namePlaceholder), { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: t.joinRoom }));
    expect(screen.getByText(t.errEnterRoomCode)).toBeInTheDocument();
  });

  it('clears inline error once the user starts typing again', () => {
    render(<Home onJoined={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: t.createRoom }));
    expect(screen.getByText(t.errChooseName)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(t.namePlaceholder), { target: { value: 'A' } });
    expect(screen.queryByText(t.errChooseName)).not.toBeInTheDocument();
  });

  it('emits room:create and calls onJoined on success', async () => {
    const onJoined = vi.fn();
    mockSocket.queueAck('room:create', { ok: true, roomCode: 'MNK-XYZ', playerId: 'p1' });
    render(<Home onJoined={onJoined} />);
    fireEvent.change(screen.getByPlaceholderText(t.namePlaceholder), { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: t.createRoom }));
    await waitFor(() => expect(onJoined).toHaveBeenCalledWith('MNK-XYZ', 'p1', 'Alice'));
    expect(localStorage.getItem('munchkin:name')).toBe('Alice');
  });

  it('surfaces server errors from room:create as a generic error message', async () => {
    mockSocket.queueAck('room:create', { ok: false, error: 'Server boom.' });
    render(<Home onJoined={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(t.namePlaceholder), { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: t.createRoom }));
    await waitFor(() => expect(screen.getByText(/server boom/i)).toBeInTheDocument());
  });

  it('joins by code and uppercases input', async () => {
    const onJoined = vi.fn();
    mockSocket.queueAck('room:join', { ok: true, roomCode: 'MNK-ABC', playerId: 'p2' });
    render(<Home onJoined={onJoined} />);
    fireEvent.change(screen.getByPlaceholderText(t.namePlaceholder), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByPlaceholderText(t.roomCodePlaceholder), { target: { value: 'mnk-abc' } });
    fireEvent.click(screen.getByRole('button', { name: t.joinRoom }));
    await waitFor(() => expect(onJoined).toHaveBeenCalledWith('MNK-ABC', 'p2', 'Bob'));
    const last = mockSocket.lastEmit('room:join');
    expect(last?.payload.roomCode).toBe('MNK-ABC');
  });

  it('surfaces join errors', async () => {
    mockSocket.queueAck('room:join', { ok: false, error: 'Room not found.' });
    render(<Home onJoined={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(t.namePlaceholder), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByPlaceholderText(t.roomCodePlaceholder), { target: { value: 'mnk-xyz' } });
    fireEvent.click(screen.getByRole('button', { name: t.joinRoom }));
    await waitFor(() => expect(screen.getByText(/not found/i)).toBeInTheDocument());
  });

  it('pre-fills name from localStorage', () => {
    localStorage.setItem('munchkin:name', 'PreviousName');
    render(<Home onJoined={vi.fn()} />);
    const input = screen.getByPlaceholderText(t.namePlaceholder) as HTMLInputElement;
    expect(input.value).toBe('PreviousName');
  });

  it('pre-fills code from prefilledCode prop (deep-link)', () => {
    render(<Home onJoined={vi.fn()} prefilledCode="MNK-ABC" />);
    const codeInput = screen.getByPlaceholderText(t.roomCodePlaceholder) as HTMLInputElement;
    expect(codeInput.value).toBe('MNK-ABC');
  });

  it('paste button reads a bare code from clipboard', async () => {
    const readText = vi.fn().mockResolvedValue('MNK-XYZ');
    Object.defineProperty(navigator, 'clipboard', { value: { readText }, configurable: true });
    render(<Home onJoined={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.pasteCode) }));
    await waitFor(() => {
      const input = screen.getByPlaceholderText(t.roomCodePlaceholder) as HTMLInputElement;
      expect(input.value).toBe('MNK-XYZ');
    });
    expect(screen.getByText(new RegExp(t.pasted))).toBeInTheDocument();
  });

  it('paste button extracts code from a deep-link URL', async () => {
    const readText = vi.fn().mockResolvedValue('Entra na sala https://app.example/?code=MNK-JX6 agora');
    Object.defineProperty(navigator, 'clipboard', { value: { readText }, configurable: true });
    render(<Home onJoined={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.pasteCode) }));
    await waitFor(() => {
      const input = screen.getByPlaceholderText(t.roomCodePlaceholder) as HTMLInputElement;
      expect(input.value).toBe('MNK-JX6');
    });
  });

  it('paste button ignores clipboard text without a code', async () => {
    const readText = vi.fn().mockResolvedValue('something random');
    Object.defineProperty(navigator, 'clipboard', { value: { readText }, configurable: true });
    render(<Home onJoined={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.pasteCode) }));
    await waitFor(() => expect(readText).toHaveBeenCalled());
    const input = screen.getByPlaceholderText(t.roomCodePlaceholder) as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('paste button swallows clipboard errors silently', async () => {
    const readText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { value: { readText }, configurable: true });
    render(<Home onJoined={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.pasteCode) }));
    await waitFor(() => expect(readText).toHaveBeenCalled());
  });

  it('renders the brand tagline', () => {
    render(<Home onJoined={vi.fn()} />);
    expect(screen.getByText(t.brandTagline)).toBeInTheDocument();
  });

  it('solo offline button calls onJoined with the LOCAL room code', async () => {
    const onJoined = vi.fn();
    render(<Home onJoined={onJoined} />);
    const nameInput = screen.getByPlaceholderText(t.namePlaceholder);
    fireEvent.change(nameInput, { target: { value: 'Alice' } });
    fireEvent.click(screen.getByTestId('solo-easy'));
    await waitFor(() => {
      expect(onJoined).toHaveBeenCalled();
    });
    const call = onJoined.mock.calls[0]!;
    expect(call[0]).toBe('LOCAL');
    expect(call[2]).toBe('Alice');
  });

  it('solo offline button without a name surfaces a name error', () => {
    const onJoined = vi.fn();
    render(<Home onJoined={onJoined} />);
    fireEvent.click(screen.getByTestId('solo-hard'));
    expect(onJoined).not.toHaveBeenCalled();
    expect(screen.getByText(t.errChooseName)).toBeInTheDocument();
  });

  it('Watch bots button calls the onWatchBots callback when provided', () => {
    const onWatchBots = vi.fn();
    render(<Home onJoined={vi.fn()} onWatchBots={onWatchBots} />);
    fireEvent.click(screen.getByTestId('watch-bots'));
    expect(onWatchBots).toHaveBeenCalled();
  });

  it('Watch bots button is hidden when no callback is provided', () => {
    render(<Home onJoined={vi.fn()} />);
    expect(screen.queryByTestId('watch-bots')).toBeNull();
  });
});
