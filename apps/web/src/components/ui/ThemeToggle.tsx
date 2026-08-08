/**
 * Theme toggle — light / dark only (no system mode).
 */
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/settings/theme';

export function ThemeToggle() {
  const resolved = useTheme((s) => s.resolved);
  const setMode = useTheme((s) => s.setMode);

  const isDark = resolved === 'dark';

  return (
    <button
      type="button"
      onClick={() => setMode(isDark ? 'light' : 'dark')}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-content"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
