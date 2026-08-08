import { NavLink } from 'react-router-dom';
import {
  BookmarkSimple,
  ClockCounterClockwise,
  FileText,
  Gear,
  PlusCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useApiKey } from '@/lib/settings/apiKey';
import { useTheme } from '@/lib/settings/theme';
import logoLight from '@/assets/logo-light.svg';
import logoDark from '@/assets/logo-dark.svg';

export function Sidebar() {
  const hasKey = useApiKey((s) => s.hasKey);
  const isDark = useTheme((s) => s.resolved) === 'dark';
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface px-4 py-6">
      {/* Logo — switches between light and dark versions */}
      <div className="mb-8 px-2">
        <img src={isDark ? logoDark : logoLight} alt="Stratemark" className="h-7" />
      </div>

      {/* Workspace */}
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
        Workspace
      </p>
      <nav className="flex flex-col gap-0.5" aria-label="Primary">
        <SidebarLink to="/" end icon={PlusCircle} label="New Deck" primary />
        <SidebarLink to="/history" icon={ClockCounterClockwise} label="Deck History" />
        <SidebarLink to="/saved" icon={BookmarkSimple} label="Saved Cards" />
        <SidebarLink to="/reports" icon={FileText} label="Reports" />
      </nav>

      {/* System */}
      <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
        System
      </p>
      <nav className="flex flex-col gap-0.5">
        <SidebarLink to="/settings" icon={Gear} label="Settings" />
      </nav>

      <div className="mt-auto px-2 pt-4">
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

function SidebarLink({
  to, end, icon: Icon, label, primary,
}: {
  to: string; end?: boolean; icon: React.ElementType;
  label: string; primary?: boolean;
}) {
  return (
    <NavLink
      to={to} end={end}
      className={({ isActive }) => cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors',
        isActive
          ? 'bg-primary/8 font-semibold text-primary'
          : primary
            ? 'font-medium text-content hover:bg-surface-2'
            : 'font-medium text-muted hover:bg-surface-2 hover:text-content',
      )}
    >
      {({ isActive }) => (
        <>
          <Icon weight="duotone" size={20} className={isActive ? 'text-primary' : ''} />
          {label}
        </>
      )}
    </NavLink>
  );
}
