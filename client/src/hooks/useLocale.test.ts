import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocale } from './useLocale';
import { setLocale } from '../i18n';

beforeEach(() => {
  localStorage.clear();
  setLocale('pt-BR');
});

describe('useLocale', () => {
  it('starts with the current locale', () => {
    setLocale('en');
    const { result } = renderHook(() => useLocale());
    expect(result.current[0]).toBe('en');
  });

  it('updates after a direct setLocale call', () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current[0]).toBe('pt-BR');
    act(() => setLocale('es'));
    expect(result.current[0]).toBe('es');
  });

  it('changing through the hook persists across the global subscriber', () => {
    const { result } = renderHook(() => useLocale());
    act(() => result.current[1]('en'));
    expect(result.current[0]).toBe('en');
    expect(localStorage.getItem('munchkin:locale')).toBe('en');
  });
});
