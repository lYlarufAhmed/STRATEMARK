/**
 * Research session store — persists across navigation.
 *
 * When the user starts a deck research and navigates away, this store keeps
 * the session alive. Coming back to "New Deck" reconnects to the running
 * session without losing progress.
 */
import { create } from 'zustand';

export interface ResearchSession {
  /** The user's original query. */
  query: string;
  time: string;
  /** Research is actively running. */
  running: boolean;
  /** Log lines from the research progress callbacks. */
  logLines: string[];
  /** Completed deck link + card count. */
  done: { link: string; count: number } | null;
  /** Error message if research failed. */
  error: string | null;
}

interface ResearchSessionStore {
  session: ResearchSession | null;
  startSession: (query: string, time: string) => void;
  addLog: (message: string) => void;
  finish: (link: string, count: number) => void;
  fail: (error: string) => void;
  clear: () => void;
}

export const useResearchSession = create<ResearchSessionStore>((set, get) => ({
  session: null,

  startSession: (query, time) =>
    set({
      session: {
        query,
        time,
        running: true,
        logLines: [],
        done: null,
        error: null,
      },
    }),

  addLog: (message) => {
    const s = get().session;
    if (!s) return;
    // Deduplicate
    if (s.logLines[s.logLines.length - 1] === message) return;
    set({ session: { ...s, logLines: [...s.logLines, message] } });
  },

  finish: (link, count) => {
    const s = get().session;
    if (!s) return;
    set({ session: { ...s, running: false, done: { link, count } } });
  },

  fail: (error) => {
    const s = get().session;
    if (!s) return;
    set({ session: { ...s, running: false, error } });
  },

  clear: () => set({ session: null }),
}));
