/**
 * Preload — the ONLY channel between the sandboxed renderer and main.
 *
 * It exposes a typed `window.mi` object (the PreloadRepositoryApi contract from
 * @mi/contracts). The renderer's IpcRepository forwards to it. No Node APIs, no
 * secrets, and no ipcRenderer are leaked to page scripts — only these methods.
 */
import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  SECURE_CHANNELS,
  type DeckRefreshEvent,
  type DeckRefreshListener,
  type PreloadRepositoryApi,
  type ResearchProgress,
  type SecureApi,
} from '@mi/contracts';

const api: PreloadRepositoryApi = {
  listMarkets: () => ipcRenderer.invoke(IPC_CHANNELS.listMarkets),
  getMarket: (id) => ipcRenderer.invoke(IPC_CHANNELS.getMarket, id),
  createMarket: (input) => ipcRenderer.invoke(IPC_CHANNELS.createMarket, input),
  updateMarketCadence: (id, cadence) =>
    ipcRenderer.invoke(IPC_CHANNELS.updateMarketCadence, id, cadence),
  getDeckByMarket: (marketId) => ipcRenderer.invoke(IPC_CHANNELS.getDeckByMarket, marketId),
  refreshDeck: (marketId, handlers) => ipcRenderer.invoke(IPC_CHANNELS.refreshDeck, marketId, handlers?.taskId),
  // Progress handlers can't cross IPC; the renderer polls/receives events instead.
  createResearchedDeck: (brief, handlers) => ipcRenderer.invoke(IPC_CHANNELS.createResearchedDeck, brief, handlers?.taskId),
  listCards: (deckId, filter) => ipcRenderer.invoke(IPC_CHANNELS.listCards, deckId, filter),
  getCard: (cardId) => ipcRenderer.invoke(IPC_CHANNELS.getCard, cardId),
  getCompany: (companyId) => ipcRenderer.invoke(IPC_CHANNELS.getCompany, companyId),
  getCompanyMetrics: (companyId) => ipcRenderer.invoke(IPC_CHANNELS.getCompanyMetrics, companyId),
  getViceClaims: (cardId) => ipcRenderer.invoke(IPC_CHANNELS.getViceClaims, cardId),
  getDashboardTab: (companyId, tab, force) =>
    ipcRenderer.invoke(IPC_CHANNELS.getDashboardTab, companyId, tab, force),
  deepDive: (input) => ipcRenderer.invoke(IPC_CHANNELS.deepDive, input),
  factCheck: (input) => ipcRenderer.invoke(IPC_CHANNELS.factCheck, input),
  generateReport: (request, handlers) => ipcRenderer.invoke(IPC_CHANNELS.generateReport, request, handlers?.taskId),
  listReports: () => ipcRenderer.invoke(IPC_CHANNELS.listReports),
  getReport: (id) => ipcRenderer.invoke(IPC_CHANNELS.getReport, id),
  expandDeck: (marketId, focus, handlers) => ipcRenderer.invoke(IPC_CHANNELS.expandDeck, marketId, focus, handlers?.taskId),
  overrideMetric: (input) => ipcRenderer.invoke(IPC_CHANNELS.overrideMetric, input),
  getMarketOpportunity: (marketId, force) =>
    ipcRenderer.invoke(IPC_CHANNELS.getMarketOpportunity, marketId, force),
  askResearch: (input, handlers) => ipcRenderer.invoke(IPC_CHANNELS.askResearch, input, handlers?.taskId),
  listResearchThreads: (filter) => ipcRenderer.invoke(IPC_CHANNELS.listResearchThreads, filter),
  getResearchThread: (id) => ipcRenderer.invoke(IPC_CHANNELS.getResearchThread, id),
  saveThreadAsReport: (threadId, focus) =>
    ipcRenderer.invoke(IPC_CHANNELS.saveThreadAsReport, threadId, focus),
  exportBrain: () => ipcRenderer.invoke(IPC_CHANNELS.exportBrain),
  importBrain: () => ipcRenderer.invoke(IPC_CHANNELS.importBrain),
  onDeckRefresh: (listener: DeckRefreshListener) => {
    const handler = (_event: unknown, evt: DeckRefreshEvent) => listener(evt);
    ipcRenderer.on(IPC_CHANNELS.deckRefreshEvent, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.deckRefreshEvent, handler);
    };
  },
  onResearchProgress: (listener: (progress: ResearchProgress) => void) => {
    const handler = (_event: unknown, progress: ResearchProgress) => listener(progress);
    ipcRenderer.on(IPC_CHANNELS.researchProgressEvent, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.researchProgressEvent, handler);
    };
  },
};

contextBridge.exposeInMainWorld('mi', api);

const secure: SecureApi = {
  getApiKey: () => ipcRenderer.invoke(SECURE_CHANNELS.getApiKey),
  setApiKey: (key) => ipcRenderer.invoke(SECURE_CHANNELS.setApiKey, key),
};
contextBridge.exposeInMainWorld('miSecure', secure);
