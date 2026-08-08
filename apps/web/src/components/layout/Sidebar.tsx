import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookmarkSimple,
  CaretLeft,
  CaretRight,
  ClockCounterClockwise,
  FileText,
  Gear,
  PlusCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useApiKey } from '@/lib/settings/apiKey';
import wordmark from '@/assets/wordmark.svg';

export function Sidebar() {
  const hasKey = useApiKey((s) => s.hasKey);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      'flex shrink-0 flex-col border-r border-border bg-surface py-6 transition-all duration-200',
      collapsed ? 'w-16 px-2' : 'w-56 px-4',
    )}>
      {/* Logo + collapse toggle */}
      <div className={cn('mb-8 flex items-center', collapsed ? 'flex-col gap-2' : 'justify-between px-2')}>
        {collapsed ? (
          /* Collapsed: just the icon mark */
          <img src={wordmark} alt="Stratemark" className="h-8 w-8" />
        ) : (
          /* Expanded: icon mark + brand name */
          <div className="flex items-center gap-2">
            <img src={wordmark} alt="" className="h-7 w-7" />
            <span className="font-display text-[15px] font-bold tracking-tight text-content">Stratemark</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="grid h-6 w-6 place-items-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-content"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <CaretRight size={14} /> : <CaretLeft size={14} />}
        </button>
      </div>

      {/* Workspace */}
      {!collapsed && (
        <p className="mb-2 px-3 text-[10px] font-medium tracking-[0.08em] text-faint">
          workspace
        </p>
      )}
      <nav className="flex flex-col gap-0.5" aria-label="Primary">
        <SidebarLink to="/" end icon={PlusCircle} label="New Deck" collapsed={collapsed} primary />
        <SidebarLink to="/history" icon={ClockCounterClockwise} label="Deck History" collapsed={collapsed} />
        <SidebarLink to="/saved" icon={BookmarkSimple} label="Saved Cards" collapsed={collapsed} />
        <SidebarLink to="/reports" icon={FileText} label="Reports" collapsed={collapsed} />
      </nav>

      {/* System */}
      {!collapsed && (
        <p className="mb-2 mt-6 px-3 text-[10px] font-medium tracking-[0.08em] text-faint">
          system
        </p>
      )}
      {collapsed && <div className="mt-6" />}
      <nav className="flex flex-col gap-0.5">
        <SidebarLink to="/settings" icon={Gear} label="Settings" collapsed={collapsed} />
      </nav>

      <div className="mt-auto px-2 pt-4">
        {!collapsed && (
          hasKey ? (
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
          )
        )}
        {collapsed && (
          <div className="flex justify-center">
            <span className={cn('h-2 w-2 rounded-full', hasKey ? 'bg-positive' : 'bg-neutral')} />
          </div>
        )}
      </div>
    </aside>
  );
}

function SidebarLink({
  to, end, icon: Icon, label, collapsed, primary,
}: {
  to: string; end?: boolean; icon: React.ElementType;
  label: string; collapsed: boolean; primary?: boolean;
}) {
  return (
    <NavLink
      to={to} end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) => cn(
        'flex items-center gap-3 rounded-lg transition-colors',
        collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2',
        collapsed ? 'text-[13px]' : 'text-[13px]',
        isActive
          ? 'bg-primary/8 font-semibold text-primary'
          : primary
            ? 'font-medium text-content hover:bg-surface-2'
            : 'font-medium text-muted hover:bg-surface-2 hover:text-content',
      )}
    >
      {({ isActive }) => (
        <>
          <Icon weight="duotone" size={collapsed ? 22 : 20} className={isActive ? 'text-primary' : ''} />
          {!collapsed && label}
        </>
      )}
    </NavLink>
  );
}
