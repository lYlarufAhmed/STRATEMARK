import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ErrorBoundary } from '@/components/states/ErrorBoundary';
import { FullPageLoader } from '@/components/states/FullPageLoader';
import { useDeckRefreshSubscription } from '@/hooks/data';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useDeepDive } from '@/features/deepdive/DeepDive';

export function AppShell() {
  useDeckRefreshSubscription();
  useAutoRefresh();
  const { isOpen: aiPanelOpen, closePanel } = useDeepDive();
  const location = useLocation();

  // Close the AI panel when the user navigates to a different page.
  useEffect(() => {
    closePanel();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg">
      <Sidebar />
      <div
        className="flex min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-out"
        style={{ marginRight: aiPanelOpen ? 400 : 0 }}
      >
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
  );
}
