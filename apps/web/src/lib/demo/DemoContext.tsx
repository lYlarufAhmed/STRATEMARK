import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

export interface DemoState {
  remainingDemoQueries: number;
  isDemoMode: boolean;
  isUpgradeModalOpen: boolean;
  upgradeReason: string | null;
  consumeDemoQuery: () => boolean;
  checkFeatureAccess: (featureName?: string) => boolean;
  openUpgradeModal: (reason?: string) => void;
  closeUpgradeModal: () => void;
  resetDemoQueries: () => void;
}

const DemoContext = createContext<DemoState | null>(null);

export const STORAGE_KEY_DEMO_QUERIES = 'stratemark_demo_queries_remaining';
const INITIAL_DEMO_QUERIES = 3;

export function DemoProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  const [remainingDemoQueries, setRemainingDemoQueries] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DEMO_QUERIES);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) {
          return Math.max(0, parsed);
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_DEMO_QUERIES;
  });

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

  // Demo mode is active if user is not authenticated or signed in on local free analyst
  const isDemoMode = useMemo(() => {
    if (!isAuthenticated || !user) return true;
    if (user.id === 'local') return true;
    return false;
  }, [isAuthenticated, user]);

  const openUpgradeModal = useCallback((reason?: string) => {
    setUpgradeReason(reason ?? 'Upgrade to unlock full features');
    setIsUpgradeModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false);
    setUpgradeReason(null);
  }, []);

  const resetDemoQueries = useCallback(() => {
    setRemainingDemoQueries(INITIAL_DEMO_QUERIES);
    try {
      localStorage.setItem(STORAGE_KEY_DEMO_QUERIES, INITIAL_DEMO_QUERIES.toString());
    } catch {
      // ignore
    }
  }, []);

  const consumeDemoQuery = useCallback((): boolean => {
    if (!isDemoMode) {
      return true; // Pro users have unlimited queries
    }

    if (remainingDemoQueries <= 0) {
      openUpgradeModal('You have used all 3 dynamic demo queries. Upgrade to Pro for unlimited AI research.');
      return false;
    }

    const nextCount = remainingDemoQueries - 1;
    setRemainingDemoQueries(nextCount);
    try {
      localStorage.setItem(STORAGE_KEY_DEMO_QUERIES, nextCount.toString());
    } catch {
      // ignore
    }

    if (nextCount === 0) {
      openUpgradeModal('That was your last demo query! Upgrade to Pro for unlimited AI market research.');
    }

    return true;
  }, [isDemoMode, remainingDemoQueries, openUpgradeModal]);

  const checkFeatureAccess = useCallback(
    (featureName?: string): boolean => {
      if (!isDemoMode) return true;
      openUpgradeModal(
        featureName
          ? `${featureName} is available in Pro. Upgrade to unlock full market research capabilities.`
          : 'Upgrade to Pro for full access to custom decks, web scraping, and executive exports.',
      );
      return false;
    },
    [isDemoMode, openUpgradeModal],
  );

  const value = useMemo<DemoState>(
    () => ({
      remainingDemoQueries,
      isDemoMode,
      isUpgradeModalOpen,
      upgradeReason,
      consumeDemoQuery,
      checkFeatureAccess,
      openUpgradeModal,
      closeUpgradeModal,
      resetDemoQueries,
    }),
    [
      remainingDemoQueries,
      isDemoMode,
      isUpgradeModalOpen,
      upgradeReason,
      consumeDemoQuery,
      checkFeatureAccess,
      openUpgradeModal,
      closeUpgradeModal,
      resetDemoQueries,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

const DEFAULT_DEMO_STATE: DemoState = {
  remainingDemoQueries: 3,
  isDemoMode: true,
  isUpgradeModalOpen: false,
  upgradeReason: null,
  consumeDemoQuery: () => true,
  checkFeatureAccess: () => true,
  openUpgradeModal: () => {},
  closeUpgradeModal: () => {},
  resetDemoQueries: () => {},
};

export function useDemo(): DemoState {
  const ctx = useContext(DemoContext);
  return ctx ?? DEFAULT_DEMO_STATE;
}
