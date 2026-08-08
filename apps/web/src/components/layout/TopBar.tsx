import { useAuth } from '@/lib/auth/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { initials } from '@/lib/format';

/** Right-side controls — rendered inside AppShell's header. */
export function TopBar() {
  const { user } = useAuth();
  const name = user?.name ?? 'User';

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold text-muted">
          {initials(name)}
        </div>
        <span className="hidden text-[13px] font-medium text-content sm:inline">{name}</span>
      </div>
    </div>
  );
}
