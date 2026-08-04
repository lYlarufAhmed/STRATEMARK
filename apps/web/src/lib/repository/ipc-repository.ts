/**
 * IpcRepository — the drop-in back end for the Electron shell.
 *
 * It forwards every repository call to `window.mi` (exposed by the Electron
 * preload via contextBridge; see @mi/contracts `PreloadRepositoryApi`). Today,
 * in the plain web build, `window.mi` is undefined and the app uses
 * MockRepository instead — so this class is the wiring that makes the eventual
 * back end a zero-UI-change swap. It is intentionally a thin pass-through.
 */
import type {
  AskResearchInput,
  CardFilter,
  CardWithCompany,
  Company,
  CompanyMetric,
  CreateMarketInput,
  DashboardTab,
  DashboardTabResult,
  DeepDiveInput,
  DeepDiveResult,
  ExpandFocus,
  FactCheckInput,
  FactCheckResult,
  OverrideMetricInput,
  Report,
  ReportRequest,
  ResearchThread,
  Deck,
  DeckRefreshListener,
  DeckResearchBrief,
  Market,
  MarketIntelRepository,
  PreloadRepositoryApi,
  RefreshCadence,
  ResearchHandlers,
  Unsubscribe,
  ViceClaim,
} from '@mi/contracts';

export function isElectron(): boolean {
  return typeof window !== 'undefined' && typeof window.mi !== 'undefined';
}

export class IpcRepository implements MarketIntelRepository {
  constructor(private readonly api: PreloadRepositoryApi) {}

  listMarkets(): Promise<Market[]> {
    return this.api.listMarkets();
  }
  getMarket(id: string): Promise<Market | null> {
    return this.api.getMarket(id);
  }
  createMarket(input: CreateMarketInput): Promise<Market> {
    return this.api.createMarket(input);
  }
  updateMarketCadence(id: string, cadence: RefreshCadence): Promise<Market> {
    return this.api.updateMarketCadence(id, cadence);
  }
  getDeckByMarket(marketId: string): Promise<Deck | null> {
    return this.api.getDeckByMarket(marketId);
  }
  private bindProgress(handlers?: ResearchHandlers) {
    if (!handlers?.onProgress || !this.api.onResearchProgress) return undefined;
    return this.api.onResearchProgress((p) => {
      if (handlers.taskId && p.taskId && p.taskId !== handlers.taskId) {
        return;
      }
      handlers.onProgress?.(p);
    });
  }

  async refreshDeck(marketId: string, handlers?: ResearchHandlers): Promise<Deck> {
    const unsub = this.bindProgress(handlers);
    try {
      return await this.api.refreshDeck(marketId, handlers);
    } finally {
      unsub?.();
    }
  }
  async createResearchedDeck(
    brief: DeckResearchBrief,
    handlers?: ResearchHandlers,
  ): Promise<{ market: Market; deck: Deck }> {
    const unsub = this.bindProgress(handlers);
    try {
      return await this.api.createResearchedDeck(brief, handlers);
    } finally {
      unsub?.();
    }
  }
  listCards(deckId: string, filter?: CardFilter): Promise<CardWithCompany[]> {
    return this.api.listCards(deckId, filter);
  }
  getCard(cardId: string): Promise<CardWithCompany | null> {
    return this.api.getCard(cardId);
  }
  getCompany(companyId: string): Promise<Company | null> {
    return this.api.getCompany(companyId);
  }
  getCompanyMetrics(companyId: string): Promise<CompanyMetric[]> {
    return this.api.getCompanyMetrics(companyId);
  }
  getViceClaims(cardId: string): Promise<ViceClaim[]> {
    return this.api.getViceClaims(cardId);
  }
  getDashboardTab<T extends DashboardTab>(
    companyId: string,
    tab: T,
    force?: boolean,
  ): Promise<DashboardTabResult<T> | null> {
    return this.api.getDashboardTab(companyId, tab, force);
  }
  deepDive(input: DeepDiveInput): Promise<DeepDiveResult> {
    return this.api.deepDive(input);
  }
  factCheck(input: FactCheckInput): Promise<FactCheckResult> {
    return this.api.factCheck(input);
  }
  async expandDeck(
    marketId: string,
    focus: ExpandFocus,
    handlers?: ResearchHandlers,
  ): Promise<{ added: number }> {
    const unsub = this.bindProgress(handlers);
    try {
      return await this.api.expandDeck(marketId, focus, handlers);
    } finally {
      unsub?.();
    }
  }
  overrideMetric(input: OverrideMetricInput): Promise<CompanyMetric> {
    return this.api.overrideMetric(input);
  }
  getMarketOpportunity(marketId: string, force?: boolean): Promise<DeepDiveResult> {
    return this.api.getMarketOpportunity(marketId, force);
  }
  async generateReport(request: ReportRequest, handlers?: ResearchHandlers): Promise<Report> {
    const unsub = this.bindProgress(handlers);
    try {
      return await this.api.generateReport(request, handlers);
    } finally {
      unsub?.();
    }
  }
  listReports(): Promise<Report[]> {
    return this.api.listReports();
  }
  getReport(id: string): Promise<Report | null> {
    return this.api.getReport(id);
  }
  async askResearch(input: AskResearchInput, handlers?: ResearchHandlers): Promise<ResearchThread> {
    if (!this.api.askResearch) throw new Error('askResearch not supported on this IPC bridge');
    const unsub = this.bindProgress(handlers);
    try {
      return await this.api.askResearch(input, handlers);
    } finally {
      unsub?.();
    }
  }
  listResearchThreads(filter?: { deckId?: string; companyId?: string }): Promise<ResearchThread[]> {
    if (!this.api.listResearchThreads) return Promise.resolve([]);
    return this.api.listResearchThreads(filter);
  }
  getResearchThread(id: string): Promise<ResearchThread | null> {
    if (!this.api.getResearchThread) return Promise.resolve(null);
    return this.api.getResearchThread(id);
  }
  saveThreadAsReport(threadId: string, focus?: string | null): Promise<Report> {
    if (!this.api.saveThreadAsReport)
      throw new Error('saveThreadAsReport not supported on this IPC bridge');
    return this.api.saveThreadAsReport(threadId, focus);
  }
  exportBrain(): Promise<boolean> {
    if (!this.api.exportBrain) return Promise.resolve(false);
    return this.api.exportBrain();
  }
  importBrain(): Promise<boolean> {
    if (!this.api.importBrain) return Promise.resolve(false);
    return this.api.importBrain();
  }
  subscribeDeckRefresh(listener: DeckRefreshListener): Unsubscribe {
    return this.api.onDeckRefresh(listener);
  }
}
