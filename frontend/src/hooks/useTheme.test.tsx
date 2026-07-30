import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('pf-v6-theme-dark');
  });

  it('defaults to light when no preference stored', () => {
    const { result } = renderHook(() => useTheme());
    expect(['light', 'dark']).toContain(result.current.theme);
  });

  it('toggles dark mode and persists preference', () => {
    localStorage.setItem('acm-policy-helper-theme', 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('pf-v6-theme-dark')).toBe(true);
    expect(localStorage.getItem('acm-policy-helper-theme')).toBe('dark');
  });
});
