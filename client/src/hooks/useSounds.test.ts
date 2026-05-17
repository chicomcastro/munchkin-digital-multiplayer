import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSounds } from './useSounds';

beforeEach(() => {
  localStorage.clear();
  // jsdom doesn't ship AudioContext — install a minimal mock that records calls.
  const oscillators: any[] = [];
  const gains: any[] = [];
  class MockOscillator {
    type = 'sine';
    frequency = {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    };
    connect(target: any) { return target; }
    start = vi.fn();
    stop = vi.fn();
  }
  class MockGain {
    gain = {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    };
    connect(target: any) { return target; }
  }
  class MockCtx {
    state = 'running';
    currentTime = 0;
    destination = {};
    createOscillator() { const o = new MockOscillator(); oscillators.push(o); return o; }
    createGain() { const g = new MockGain(); gains.push(g); return g; }
    resume = vi.fn();
  }
  // @ts-expect-error mocking
  globalThis.AudioContext = MockCtx;
  // expose for assertions
  (globalThis as any).__oscillators = oscillators;
});

describe('useSounds', () => {
  it('starts disabled by default', () => {
    const { result } = renderHook(() => useSounds());
    expect(result.current.enabled).toBe(false);
  });

  it('toggle flips state and persists to localStorage', () => {
    const { result } = renderHook(() => useSounds());
    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(true);
    expect(localStorage.getItem('munchkin:sound')).toBe('1');
    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(false);
    expect(localStorage.getItem('munchkin:sound')).toBe('0');
  });

  it('respects stored preference on mount', () => {
    localStorage.setItem('munchkin:sound', '1');
    const { result } = renderHook(() => useSounds());
    expect(result.current.enabled).toBe(true);
  });

  it('play() is a no-op when disabled', () => {
    const { result } = renderHook(() => useSounds());
    act(() => result.current.play('kick'));
    expect(((globalThis as any).__oscillators as any[]).length).toBe(0);
  });

  it('play() creates oscillators when enabled', () => {
    const { result } = renderHook(() => useSounds());
    act(() => result.current.toggle());
    act(() => result.current.play('kick'));
    expect(((globalThis as any).__oscillators as any[]).length).toBeGreaterThan(0);
  });

  it.each(['kick', 'levelUp', 'death', 'victory', 'flee', 'select', 'error'] as const)(
    'play(%s) emits at least one oscillator',
    (name) => {
      const { result } = renderHook(() => useSounds());
      act(() => result.current.toggle());
      const before = ((globalThis as any).__oscillators as any[]).length;
      act(() => result.current.play(name));
      expect(((globalThis as any).__oscillators as any[]).length).toBeGreaterThan(before);
    },
  );

  it('play() is silent when AudioContext is unavailable', () => {
    // @ts-expect-error deleting mock to simulate missing API
    delete globalThis.AudioContext;
    const { result } = renderHook(() => useSounds());
    act(() => result.current.toggle());
    act(() => result.current.play('kick'));
    expect(result.current.enabled).toBe(true);
  });
});
