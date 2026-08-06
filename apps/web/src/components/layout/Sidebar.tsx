import { NavLink } from 'react-router-dom';
import { Clock, FileText, Layers, PlusCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useApiKey } from '@/lib/settings/apiKey';

const NAV = [
  { to: '/', label: 'New Deck', icon: PlusCircle, end: true },
  { to: '/history', label: 'Deck History', icon: Clock, end: false },
  { to: '/reports', label: 'Reports', icon: FileText, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

export function Sidebar() {
  const hasKey = useApiKey((s) => s.hasKey);
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface px-3 py-5">
      {/* Logo — compact icon + text */}
      <div className="mb-8 flex items-center gap-2.5 px-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2">
          <Layers className="h-4 w-4 text-content" aria-hidden />
        </div>
        <span className="font-display text-[15px] font-semibold tracking-tight text-content">
          Stratemark
        </span>
      </div>

      <nav className="flex flex-col gap-0.5" aria-label="Primary">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-surface-2 text-content'
                  : 'text-muted hover:bg-surface-2 hover:text-content',
              )
            }
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-3 pt-4">
        {hasKey ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-positive">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" />
            Connected
          </span>
        ) : (
          <NavLink
            to="/settings"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted hover:text-content"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-neutral" />
            Demo mode
          </NavLink>
        )}
      </div>
    </aside>
  );
}
