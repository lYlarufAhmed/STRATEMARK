import { Monitor, Globe, User } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { isElectron } from '@/lib/repository/ipc-repository';
import { TaskNotificationButton } from './TaskNotificationPanel';

export function TopBar() {
  const { user } = useAuth();
  const desktop = isElectron();
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface/40 px-6">
      <div className="text-sm text-muted">
        Competitive intelligence, card by card
      </div>
      <div className="flex items-center gap-3">
        <TaskNotificationButton />
        <span
          className="chip border-border text-muted"
          title={desktop ? 'Running in the Electron desktop shell' : 'Running in the browser'}
        >
          {desktop ? <Monitor className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
          {desktop ? 'Desktop' : 'Web'}
        </span>
        <span className="chip border-border text-content">
          <User className="h-3.5 w-3.5" />
          {user?.name ?? 'Guest'}
        </span>
      </div>
    </header>
  );
}
