import { useAuth } from '@/lib/auth/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { initials } from '@/lib/format';

export function TopBar() {
  const { user } = useAuth();
  const name = user?.name ?? 'User';

  return (
    <header className="flex h-12 shrink-0 items-center justify-end gap-2 border-b border-border bg-surface px-5">
      <ThemeToggle />
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold text-muted">
          {initials(name)}
        </div>
        <span className="text-[13px] font-medium text-content">{name}</span>
      </div>
    </header>
  );
}
