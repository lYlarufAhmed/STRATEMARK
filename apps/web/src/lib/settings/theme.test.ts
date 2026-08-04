/**
 * Theme store contract.
 *
 * The invariants worth guarding are the ones that break silently: "system" must
 * keep following the OS, an explicit choice must NOT be overridden when the OS
 * flips, and a storage failure must not take the app down with it.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyTheme,
  nextMode,
  resolveTheme,
  systemPrefers,
  THEME_STORAGE_KEY,
  useTheme,
} from './theme';

const realMatchMedia = window.matchMedia;

function stubPrefersDark(dark: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: dark,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  stubPrefersDark(false);
  useTheme.setState({ mode: 'system', resolved: 'light' });
});

afterEach(() => {
  window.matchMedia = realMatchMedia;
});

describe('nextMode', () => {
  it('cycles light → dark → system → light', () => {
    expect(nextMode('light')).toBe('dark');
    expect(nextMode('dark')).toBe('system');
    expect(nextMode('system')).toBe('light');
  });
});

describe('resolveTheme', () => {
  it('passes explicit modes straight through, ignoring the OS', () => {
    stubPrefersDark(true);
    expect(resolveTheme('light')).toBe('light');
    stubPrefersDark(false);
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('follows the OS in system mode', () => {
    stubPrefersDark(true);
    expect(resolveTheme('system')).toBe('dark');
    stubPrefersDark(false);
    expect(resolveTheme('system')).toBe('light');
  });
});

describe('systemPrefers', () => {
  it('falls back to light when the media query is unavailable', () => {
    // Some environments (jsdom without the polyfill, old WebViews) have no
    // matchMedia at all — that must not throw.
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    expect(systemPrefers()).toBe('light');
  });
});

describe('applyTheme', () => {
  it('drives the .dark class the CSS variables key off', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

describe('setMode', () => {
  it('persists the choice and paints it', () => {
    useTheme.getState().setMode('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(useTheme.getState().resolved).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('resolves system against the OS rather than storing a concrete theme', () => {
    stubPrefersDark(true);
    useTheme.getState().setMode('system');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
    expect(useTheme.getState().mode).toBe('system');
    expect(useTheme.getState().resolved).toBe('dark');
  });
});

describe('cycle', () => {
  it('advances the mode through the toggle order', () => {
    useTheme.getState().setMode('light');
    useTheme.getState().cycle();
    expect(useTheme.getState().mode).toBe('dark');
    useTheme.getState().cycle();
    expect(useTheme.getState().mode).toBe('system');
  });
});

describe('syncSystem', () => {
  it('re-resolves while in system mode', () => {
    useTheme.getState().setMode('system');
    expect(useTheme.getState().resolved).toBe('light');

    stubPrefersDark(true);
    useTheme.getState().syncSystem();
    expect(useTheme.getState().resolved).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('leaves an explicit choice alone when the OS flips', () => {
    useTheme.getState().setMode('light');

    stubPrefersDark(true);
    useTheme.getState().syncSystem();

    expect(useTheme.getState().resolved).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
