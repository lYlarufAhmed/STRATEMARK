/**
 * Typed data hooks — the ONLY way feature components read/write data. They wrap
 * the repository behind TanStack Query, so the mock↔IPC swap is invisible here.
 */
import { useEffect } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  CardFilter,
  CardWithCompany,
  Company,
  CompanyMetric,
  CreateMarketInput,
  DashboardTab,
  DashboardTabResult,
  Deck,
  DeckRefreshEvent,
  Market,
  RefreshCadence,
} from '@mi/contracts';
import { useRepository } from '@/lib/repository/RepositoryProvider';
import { qk } from '@/lib/query/keys';

export function useMarkets(): UseQueryResult<Market[]> {
  const repo = useRepository();
  return useQuery({ queryKey: qk.markets, queryFn: () => repo.listMarkets() });
}

export function useMarket(id: string | undefined): UseQueryResult<Market | null> {
  const repo = useRepository();
  return useQuery({
    queryKey: qk.market(id ?? ''),
    queryFn: () => repo.getMarket(id as string),
    enabled: !!id,
  });
}

export function useDeckByMarket(marketId: string | undefined): UseQueryResult<Deck | null> {
  const repo = useRepository();
  return useQuery({
    queryKey: qk.deck(marketId ?? ''),
    queryFn: () => repo.getDeckByMarket(marketId as string),
    enabled: !!marketId,
  });
}

export function useCards(
  deckId: string | undefined,
  filter?: CardFilter,
): UseQueryResult<CardWithCompany[]> {
  const repo = useRepository();
  return useQuery({
    queryKey: qk.cards(deckId ?? '', filter),
    queryFn: () => repo.listCards(deckId as string, filter),
    enabled: !!deckId,
  });
}

export function useCard(cardId: string | undefined): UseQueryResult<CardWithCompany | null> {
  const repo = useRepository();
  return useQuery({
    queryKey: qk.card(cardId ?? ''),
    queryFn: () => repo.getCard(cardId as string),
    enabled: !!cardId,
  });
}

export function useCompany(companyId: string | undefined): UseQueryResult<Company | null> {
  const repo = useRepository();
  return useQuery({
    queryKey: qk.company(companyId ?? ''),
    queryFn: () => repo.getCompany(companyId as string),
    enabled: !!companyId,
  });
}

export function useCompanyMetrics(
  companyId: string | undefined,
): UseQueryResult<CompanyMetric[]> {
  const repo = useRepository();
  return useQuery({
    queryKey: qk.companyMetrics(companyId ?? ''),
    queryFn: () => repo.getCompanyMetrics(companyId as string),
    enabled: !!companyId,
  });
}

export function useDashboardTab<T extends DashboardTab>(
  companyId: string | undefined,
  tab: T,
): UseQueryResult<DashboardTabResult<T> | null> {
  const repo = useRepository();
  return useQuery({
    queryKey: qk.dashboard(companyId ?? '', tab),
    queryFn: () => repo.getDashboardTab(companyId as string, tab),
    enabled: !!companyId,
  });
}

export function useCreateMarket() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMarketInput) => repo.createMarket(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.markets }),
  });
}

export function useUpdateCadence() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cadence }: { id: string; cadence: RefreshCadence }) =>
      repo.updateMarketCadence(id, cadence),
    onSuccess: (market) => {
      qc.invalidateQueries({ queryKey: qk.markets });
      qc.invalidateQueries({ queryKey: qk.market(market.id) });
    },
  });
}

import { useTaskManager } from '@/lib/tasks/TaskManagerContext';

export function useRefreshDeck() {
  const repo = useRepository();
  const qc = useQueryClient();
  const taskManager = useTaskManager();

  return useMutation({
    mutationFn: async (marketId: string) => {
      const market = await repo.getMarket(marketId);
      const title = `Refreshing ${market?.name ?? 'market'}`;
      const taskId = taskManager.startTask('deck_refresh', title, { marketId });
      try {
        const deck = await repo.refreshDeck(marketId, {
          taskId,
          onProgress: (p) => {
            taskManager.appendLog(taskId, p.message, p.kind ?? 'step', p.progress);
          },
        });
        taskManager.completeTask(taskId, {
          marketId,
          deckId: deck.id,
          message: `Refresh complete for ${market?.name ?? 'deck'}.`,
        });
        return deck;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Refresh failed.';
        taskManager.failTask(taskId, msg);
        throw err;
      }
    },
    onSuccess: (deck) => {
      qc.invalidateQueries({ queryKey: qk.deck(deck.marketId) });
      qc.invalidateQueries({ queryKey: ['cards', deck.id] });
    },
  });
}

// Reports ------------------------------------------------------------------
export function useReports() {
  const repo = useRepository();
  return useQuery({ queryKey: ['reports'], queryFn: () => repo.listReports() });
}

export function useReport(id: string | undefined) {
  const repo = useRepository();
  return useQuery({
    queryKey: ['report', id ?? ''],
    queryFn: () => repo.getReport(id as string),
    enabled: !!id,
  });
}

export function useGenerateReport() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (request: Parameters<typeof repo.generateReport>[0]) =>
      repo.generateReport(request),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });
}

export function useFactCheck() {
  const repo = useRepository();
  return useMutation({
    mutationFn: (input: Parameters<typeof repo.factCheck>[0]) => repo.factCheck(input),
  });
}

/** Targeted micro-research to fill an empty tier/category (intelligent empty states). */
export function useExpandDeck(marketId: string | undefined) {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (focus: Parameters<typeof repo.expandDeck>[1]) =>
      repo.expandDeck(marketId as string, focus),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cards'] }),
  });
}

/** Human-in-the-loop metric correction → user_verified → CMS re-tier. */
export function useOverrideMetric() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof repo.overrideMetric>[0]) => repo.overrideMetric(input),
    onSuccess: (metric) => {
      qc.invalidateQueries({ queryKey: qk.companyMetrics(metric.companyId) });
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['dashboard', metric.companyId] });
    },
  });
}

export function useMarketOpportunity(marketId: string | undefined) {
  const repo = useRepository();
  return useQuery({
    queryKey: ['opportunity', marketId ?? ''],
    queryFn: () => repo.getMarketOpportunity(marketId as string),
    enabled: !!marketId,
    staleTime: Infinity,
  });
}

/**
 * User-directed rerun of a single dashboard tab (right-click → Rerun).
 * Bypasses the cached research and replaces it in place — the curated-deck
 * primitive: fix exactly the piece that's wrong, touch nothing else.
 */
export function useRerunDashboardTab(companyId: string | undefined, tab: DashboardTab) {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => repo.getDashboardTab(companyId as string, tab, true),
    onSuccess: (result) => {
      if (result) qc.setQueryData(qk.dashboard(companyId as string, tab), result);
    },
  });
}

/** User-directed rerun of the market-opportunity whitespace analysis. */
export function useRerunOpportunity(marketId: string | undefined) {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => repo.getMarketOpportunity(marketId as string, true),
    onSuccess: (result) => {
      qc.setQueryData(['opportunity', marketId ?? ''], result);
    },
  });
}

/** Subscribe to live deck-refresh events (spec §9) and invalidate affected caches. */
export function useDeckRefreshSubscription(onEvent?: (evt: DeckRefreshEvent) => void): void {
  const repo = useRepository();
  const qc = useQueryClient();
  useEffect(() => {
    const unsub = repo.subscribeDeckRefresh((evt) => {
      qc.invalidateQueries({ queryKey: ['cards', evt.deckId] });
      qc.invalidateQueries({ queryKey: qk.deck(evt.marketId) });
      onEvent?.(evt);
    });
    return unsub;
  }, [repo, qc, onEvent]);
}
