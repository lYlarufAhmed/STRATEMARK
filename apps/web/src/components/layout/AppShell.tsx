import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ErrorBoundary } from '@/components/states/ErrorBoundary';
import { FullPageLoader } from '@/components/states/FullPageLoader';
import { useDeckRefreshSubscription } from '@/hooks/data';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { TaskManagerProvider } from '@/lib/tasks/TaskManagerContext';

export function AppShell() {
  // Keep caches fresh when the research pipeline emits refresh events, and run
  // the cadence scheduler (on-launch-if-elapsed + periodic while open).
  useDeckRefreshSubscription();
  useAutoRefresh();
  return (
    <TaskManagerProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-bg">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <ErrorBoundary>
              <Suspense fallback={<FullPageLoader />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </TaskManagerProvider>
  );
}
