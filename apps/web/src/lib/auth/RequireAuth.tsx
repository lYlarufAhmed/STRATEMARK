import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { FullPageLoader } from '@/components/states/FullPageLoader';

/**
 * Route guard. Displays session loading indicator during session check.
 * Unauthenticated users pass through to operate in Demo Mode.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) return <FullPageLoader label="Checking your session…" />;
  return <>{children}</>;
}
