/**
 * Theme toggle — icon-only, cycles light → dark → system.
 *
 * No text label. The icon communicates the current mode; the tooltip and
 * aria-label explain it for anyone who needs words.
 */
import { Laptop, Moon, Sun, type LucideIcon } from 'lucide-react';
import { nextMode, useTheme, type ThemeMode } from '@/lib/settings/theme';

const ICON: Record<ThemeMode, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Laptop,
};

const LABEL: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export function ThemeToggle() {
  const mode = useTheme((s) => s.mode);
  const resolved = useTheme((s) => s.resolved);
  const cycle = useTheme((s) => s.cycle);

  const Icon = ICON[mode];
  const state = mode === 'system' ? `System (${resolved})` : LABEL[mode];

  return (
    <button
      type="button"
      onClick={cycle}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-content"
      title={`${state} — switch to ${LABEL[nextMode(mode)]}`}
      aria-label={`Theme: ${state}. Switch to ${LABEL[nextMode(mode)]}.`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
