/**
 * Theme preference store — light / dark / system.
 *
 * The preference lives in localStorage (`mi.theme`) and nothing else; it is a
 * display setting, so unlike the API key there is nothing sensitive to protect
 * and no keychain involvement.
 *
 * Three modes rather than a boolean: "system" is a real, distinct state that has
 * to keep tracking the OS after it's chosen. A plain on/off toggle silently
 * strands anyone whose OS flips at sunset.
 *
 * The `.dark` class this manages on <html> is what the CSS variables in
 * index.css key off, so every semantic Tailwind token (`bg-surface`,
 * `text-content`, …) reflows without per-component `dark:` variants.
 */
import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/** Also read by the pre-paint script inlined in index.html — keep in sync. */
export const THEME_STORAGE_KEY = 'mi.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function isMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isMode(raw) ? raw : 'system';
  } catch {
    /* private mode / unavailable — fall back to following the OS */
    return 'system';
  }
}

function writeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* private mode / unavailable — preference simply won't persist */
  }
}

/** What the OS currently prefers. Light wherever the query is unsupported. */
export function systemPrefers(): ResolvedTheme {
  try {
    return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';
  } catch {
    /* jsdom / ancient browsers */
    return 'light';
  }
}

/** Mode → the theme actually being displayed. */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? systemPrefers() : mode;
}

/**
 * The only place that mutates the DOM for theming. The inline script in
 * index.html performs the equivalent write before first paint so there's no
 * light flash on a dark-mode boot.
 */
export function applyTheme(resolved: ResolvedTheme): void {
  try {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  } catch {
    /* no document (SSR / non-DOM test) — nothing to paint */
  }
}

/**
 * Toggle order for the single-button control in the top bar.
 *
 * A total Record rather than index arithmetic over an array: the compiler then
 * proves every mode has a successor, so this can't return undefined and can't
 * drift if a fourth mode is ever added.
 */
const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

export function nextMode(mode: ThemeMode): ThemeMode {
  return NEXT_MODE[mode];
}

interface ThemeState {
  /** What the user chose. */
  mode: ThemeMode;
  /** What's on screen — differs from `mode` only when mode is "system". */
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /** light → dark → system → light. */
  cycle: () => void;
  /** Re-resolve against the OS; called when the media query changes. */
  syncSystem: () => void;
}

const initialMode = readMode();

export const useTheme = create<ThemeState>((set, get) => ({
  mode: initialMode,
  resolved: resolveTheme(initialMode),
  setMode: (mode) => {
    writeMode(mode);
    const resolved = resolveTheme(mode);
    applyTheme(resolved);
    set({ mode, resolved });
  },
  cycle: () => get().setMode(nextMode(get().mode)),
  syncSystem: () => {
    // Only "system" follows the OS; an explicit choice must not be overridden.
    if (get().mode !== 'system') return;
    const resolved = systemPrefers();
    applyTheme(resolved);
    set({ resolved });
  },
}));

// Apply on boot. index.html already did this pre-paint, but this keeps the store
// authoritative when the app is mounted without that script (tests, Storybook,
// the Electron renderer).
applyTheme(useTheme.getState().resolved);

// Follow the OS while in "system" mode.
try {
  window
    .matchMedia?.(DARK_QUERY)
    .addEventListener?.('change', () => useTheme.getState().syncSystem());
} catch {
  /* unsupported — "system" then resolves once at boot and stays put */
}
