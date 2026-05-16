import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { mockSocket, resetMockSocket } from '../test/mockSocket';
import { useSocket, emit, getSocket } from './useSocket';

beforeEach(() => {
  resetMockSocket();
});

describe('useSocket', () => {
  it('reports current connection state', async () => {
    mockSocket.connected = true;
    const { result } = renderHook(() => useSocket());
    await waitFor(() => expect(result.current.connected).toBe(true));
  });

  it('updates state on connect / disconnect events', async () => {
    const { result } = renderHook(() => useSocket());
    act(() => {
      mockSocket.serverEmit('disconnect');
    });
    await waitFor(() => expect(result.current.connected).toBe(false));
    act(() => {
      mockSocket.serverEmit('connect');
    });
    await waitFor(() => expect(result.current.connected).toBe(true));
  });
});

describe('getSocket', () => {
  it('returns the same singleton instance', () => {
    const a = getSocket();
    const b = getSocket();
    expect(a).toBe(b);
  });
});

describe('emit', () => {
  it('resolves when the server returns ok:true', async () => {
    mockSocket.queueAck('room:create', { ok: true, roomCode: 'MNK-AAA' });
    const res = await emit('room:create', { name: 'A' });
    expect(res.roomCode).toBe('MNK-AAA');
  });

  it('rejects when the server returns ok:false', async () => {
    mockSocket.queueAck('room:join', { ok: false, error: 'Room not found.' });
    await expect(emit('room:join', { roomCode: 'X' })).rejects.toThrow(/not found/i);
  });

  it('rejects with a default error when no error provided', async () => {
    mockSocket.queueAck('game:kickDoor', { ok: false });
    await expect(emit('game:kickDoor')).rejects.toThrow(/unknown error/i);
  });
});
