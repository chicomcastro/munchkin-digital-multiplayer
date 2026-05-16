import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { mockSocket, resetMockSocket } from '../test/mockSocket';
import { useGameState } from './useGameState';
import { makeCard, makeState } from '../test/fixtures';

beforeEach(() => {
  resetMockSocket();
});

describe('useGameState', () => {
  it('initialises with null state, empty hand and fist', () => {
    const { result } = renderHook(() => useGameState());
    expect(result.current.state).toBeNull();
    expect(result.current.hand).toEqual([]);
    expect(result.current.fist).toEqual([]);
    expect(result.current.errorMsg).toBeNull();
  });

  it('captures game:stateUpdate events', async () => {
    const { result } = renderHook(() => useGameState());
    const state = makeState();
    act(() => {
      mockSocket.serverEmit('game:stateUpdate', state);
    });
    await waitFor(() => expect(result.current.state?.roomCode).toBe('MNK-AAA'));
  });

  it('captures game:yourHand events', async () => {
    const { result } = renderHook(() => useGameState());
    const card = makeCard();
    act(() => {
      mockSocket.serverEmit('game:yourHand', { hand: [card], fist: [] });
    });
    await waitFor(() => expect(result.current.hand).toHaveLength(1));
  });

  it('surfaces error events and clears them after a timeout', async () => {
    const { result } = renderHook(() => useGameState());
    act(() => {
      mockSocket.serverEmit('error', 'Not your turn.');
    });
    await waitFor(() => expect(result.current.errorMsg).toBe('Not your turn.'));
  });
});
