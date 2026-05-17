import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToasts } from './useToasts';
import { makePlayer, makeState } from '../test/fixtures';

describe('useToasts', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useToasts(makeState(), 'p1'));
    expect(result.current.toasts).toEqual([]);
  });

  it('emits a level-up toast when player level increases', () => {
    const initial = makeState({ players: [makePlayer({ id: 'p1', level: 1 })] });
    const { result, rerender } = renderHook(({ state }) => useToasts(state, 'p1'), { initialProps: { state: initial } });
    expect(result.current.toasts).toEqual([]);
    rerender({ state: makeState({ players: [makePlayer({ id: 'p1', level: 2 })] }) });
    expect(result.current.toasts.some((t) => t.kind === 'level')).toBe(true);
  });

  it('emits a death toast when log says "Alice died!"', () => {
    const initial = makeState();
    const { result, rerender } = renderHook(({ state }) => useToasts(state, 'p1'), { initialProps: { state: initial } });
    rerender({
      state: makeState({
        log: [
          { id: 'l1', ts: Date.now(), text: 'Game started!', kind: 'system' },
          { id: 'l2', ts: Date.now(), text: 'Alice died!', kind: 'system' },
        ],
      }),
    });
    expect(result.current.toasts.some((t) => t.kind === 'death')).toBe(true);
  });

  it('emits a combat-win toast when player defeated a monster', () => {
    const initial = makeState();
    const { result, rerender } = renderHook(({ state }) => useToasts(state, 'p1'), { initialProps: { state: initial } });
    rerender({
      state: makeState({
        log: [
          { id: 'l1', ts: Date.now(), text: 'Game started!', kind: 'system' },
          { id: 'l2', ts: Date.now(), text: 'Alice defeated Gazebo — +1 levels, +2 treasures.', kind: 'combat' },
        ],
      }),
    });
    expect(result.current.toasts.some((tt) => tt.kind === 'combat')).toBe(true);
  });

  it('dismiss removes a toast by id', () => {
    const initial = makeState({ players: [makePlayer({ id: 'p1', level: 1 })] });
    const { result, rerender } = renderHook(({ state }) => useToasts(state, 'p1'), { initialProps: { state: initial } });
    rerender({ state: makeState({ players: [makePlayer({ id: 'p1', level: 2 })] }) });
    const id = result.current.toasts[0]!.id;
    act(() => result.current.dismiss(id));
    expect(result.current.toasts).toEqual([]);
  });

  it('does nothing when state is null', () => {
    const { result } = renderHook(() => useToasts(null, 'p1'));
    expect(result.current.toasts).toEqual([]);
  });
});
