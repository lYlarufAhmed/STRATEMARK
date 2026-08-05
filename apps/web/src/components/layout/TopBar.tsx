import { useState, useRef, useEffect } from 'react';
import { Monitor, Globe, User, LogOut, ChevronDown, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useDemo } from '@/lib/demo/DemoContext';
import { isElectron } from '@/lib/repository/ipc-repository';
import { TaskNotificationButton } from './TaskNotificationPanel';

function GoogleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function TopBar() {
  const { user, isAuthenticated, isLoading, error, signInWithGoogle, signOut, clearError } =
    useAuth();
  const { isDemoMode, remainingDemoQueries, openUpgradeModal } = useDemo();
  const desktop = isElectron();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface/40 px-6">
      <div className="text-sm text-muted">Competitive intelligence, card by card</div>
      <div className="flex items-center gap-3">
        {isDemoMode && (
          <button
            onClick={() => openUpgradeModal('Upgrade to Pro for unlimited AI market research queries.')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer"
            title="Click to upgrade to Stratemark Pro"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              Demo Mode — {remainingDemoQueries} AI {remainingDemoQueries === 1 ? 'query' : 'queries'} remaining
            </span>
          </button>
        )}

        <TaskNotificationButton />
        <span
          className="chip border-border text-muted"
          title={desktop ? 'Running in the Electron desktop shell' : 'Running in the browser'}
        >
          {desktop ? <Monitor className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
          {desktop ? 'Desktop' : 'Web'}
        </span>

        {error && (
          <div
            className="flex cursor-pointer items-center gap-1.5 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600"
            onClick={clearError}
            title={error}
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[150px] truncate">Auth Error</span>
          </div>
        )}

        {isAuthenticated && user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="chip flex cursor-pointer items-center gap-2 border-border text-content transition-colors hover:bg-surface-2"
              aria-expanded={dropdownOpen}
              aria-label="User profile menu"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.name}
                  className="h-4 w-4 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <User className="h-3.5 w-3.5 text-muted" />
              )}
              <span className="max-w-[140px] truncate font-medium">{user.name}</span>
              <ChevronDown className="h-3 w-3 text-muted" />
            </button>

            {dropdownOpen && (
              <div className="animate-in fade-in-50 zoom-in-95 absolute right-0 z-50 mt-2 w-64 rounded-xl border border-border bg-surface p-3 shadow-lg ring-1 ring-black/5">
                <div className="flex items-center gap-3 border-b border-border pb-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.name}
                      className="h-10 w-10 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 font-bold text-primary">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="truncate text-sm font-semibold text-content">{user.name}</p>
                    <p className="truncate text-xs text-muted">
                      {user.email ?? 'No email provided'}
                    </p>
                    <span className="mt-1 inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                      <GoogleIcon className="h-2.5 w-2.5" /> Google Account
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={async () => {
                      setDropdownOpen(false);
                      await signOut();
                    }}
                    disabled={isLoading}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openUpgradeModal('Upgrade to Pro for unlimited AI market research queries.')}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm hover:from-amber-400 hover:to-amber-500 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>Upgrade to Pro ($49)</span>
            </button>
            <button
              onClick={() => signInWithGoogle()}
              disabled={isLoading}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface/80 px-2.5 py-1.5 text-xs font-medium text-muted hover:text-content hover:bg-surface-2 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
              ) : (
                <GoogleIcon className="h-3.5 w-3.5" />
              )}
              <span>Already purchased? Sign in</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
