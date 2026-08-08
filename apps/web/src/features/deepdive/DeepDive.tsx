/**
 * AI Research Panel — docked conversation.
 *
 * Instead of an overlay/modal, the AI panel docks to the right side of the
 * app layout, sharing the screen width with the main content (like Shopify's
 * Sidekick). The panel slides in/out and the main content area flexes to
 * accommodate it.
 *
 * Grounding contract (non-negotiable): answers come from the deck's stored
 * research plus a fresh Google Search — never from model memory.
 */
import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowUp,
  ExternalLink,
  FilePlus2,
  FileText,
  Loader2,
  MessageCircle,
  X,
} from 'lucide-react';
import { publisherOf, type Citation, type DeepDiveInput, type ResearchScope, type ResearchThread } from '@mi/contracts';
import { useRepository } from '@/lib/repository/RepositoryProvider';
import { cn } from '@/lib/cn';

interface ChatOptions {
  seed?: string;
  placeholder?: string;
}

interface DeepDiveContextValue {
  open: (input: DeepDiveInput) => void;
  chat: (scope: ResearchScope, opts?: ChatOptions) => void;
  openThread: (threadId: string) => void;
  /** Close the AI panel. Called by AppShell on route changes. */
  closePanel: () => void;
  /** Whether the AI panel is currently open — used by AppShell to adjust layout. */
  isOpen: boolean;
}

const DeepDiveContext = createContext<DeepDiveContextValue | null>(null);

export function useDeepDive(): DeepDiveContextValue {
  const ctx = useContext(DeepDiveContext);
  if (!ctx) throw new Error('useDeepDive must be used within a DeepDiveProvider');
  return ctx;
}

function SourceChips({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {citations.slice(0, 6).map((c, i) => (
        <a
          key={i}
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10.5px] text-muted hover:border-primary/50 hover:text-primary-ink"
          title={c.url}
        >
          <ExternalLink className="h-2.5 w-2.5" />
          {publisherOf(c.url, c.title)}
        </a>
      ))}
      {citations.length > 6 && (
        <span className="text-[10.5px] text-faint">+{citations.length - 6} more</span>
      )}
    </div>
  );
}

/**
 * Lightweight provider for tests — no panel UI, just the context so consumers
 * (useDeepDive, DigDeeper) don't throw. The production app uses
 * DeepDiveProviderWithPanel instead.
 */
export function DeepDiveProvider({ children }: { children: ReactNode }) {
  const noop = () => {};
  return (
    <DeepDiveContext.Provider value={{ open: noop, chat: noop, openThread: noop, closePanel: noop, isOpen: false }}>
      {children}
    </DeepDiveContext.Provider>
  );
}

/**
 * Full provider with the docked AI conversation panel. Used by main.tsx.
 * The panel is fixed-positioned at the right edge; AppShell reads `isOpen`
 * and applies a right margin so the main content area shrinks to accommodate.
 */
export function DeepDiveProviderWithPanel({ children }: { children: ReactNode }) {
  const repo = useRepository();
  const qc = useQueryClient();
  const conversational = typeof repo.askResearch === 'function';

  const [openState, setOpenState] = useState(false);
  const [scope, setScope] = useState<ResearchScope | null>(null);
  const [thread, setThread] = useState<ResearchThread | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeholder, setPlaceholder] = useState<string | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [savingReport, setSavingReport] = useState(false);
  const [reportFocus, setReportFocus] = useState('');
  const [showReportForm, setShowReportForm] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof el.scrollTo === 'function') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [thread?.messages.length, busy]);

  const reset = () => {
    setThread(null);
    setError(null);
    setShowReportForm(false);
    setReportFocus('');
    setDraft('');
  };

  const ask = async (question: string, forScope: ResearchScope | null, threadId?: string) => {
    if (!repo.askResearch) return;
    setBusy(true);
    setError(null);
    try {
      const t = await repo.askResearch(
        threadId ? { threadId, question } : { scope: forScope ?? undefined, question },
      );
      setThread(t);
      void qc.invalidateQueries({ queryKey: ['researchThreads'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const chat = (s: ResearchScope, opts?: ChatOptions) => {
    reset();
    setScope(s);
    setPlaceholder(opts?.placeholder);
    setOpenState(true);
    if (opts?.seed) void ask(opts.seed, s);
  };

  const openThread = (threadId: string) => {
    reset();
    setOpenState(true);
    setBusy(true);
    void repo
      .getResearchThread?.(threadId)
      .then((t) => {
        if (t) {
          setThread(t);
          setScope(t.scope);
        } else setError('That research thread was not found.');
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };

  const open = (input: DeepDiveInput) => {
    const s: ResearchScope = {
      kind: input.companyId ? 'datapoint' : 'deck',
      deckId: null,
      companyId: input.companyId,
      subject: input.topic,
    };
    const seed = `${input.topic}${input.context ? ` — ${input.context}` : ''}${
      input.companyName ? ` (for ${input.companyName})` : ''
    }`;
    if (conversational) chat(s, { seed });
    else {
      reset();
      setScope(s);
      setOpenState(true);
      setBusy(true);
      void repo
        .deepDive(input)
        .then((r) => {
          setThread({
            id: 'oneshot',
            scope: s,
            title: input.topic,
            messages: [
              { id: 'q', role: 'user', text: seed, citations: [], at: new Date().toISOString() },
              { id: 'a', role: 'assistant', text: r.markdown, citations: r.citations, at: new Date().toISOString() },
            ],
            reportId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
        .finally(() => setBusy(false));
    }
  };

  const close = () => setOpenState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    if (!q || busy) return;
    setDraft('');
    void ask(q, scope, thread && thread.id !== 'oneshot' ? thread.id : undefined);
  };

  const saveReport = async () => {
    if (!repo.saveThreadAsReport || !thread || thread.id === 'oneshot') return;
    setSavingReport(true);
    setError(null);
    try {
      const report = await repo.saveThreadAsReport(thread.id, reportFocus.trim() || null);
      setThread({ ...thread, reportId: report.id });
      setShowReportForm(false);
      void qc.invalidateQueries({ queryKey: ['reports'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingReport(false);
    }
  };

  const scopeLabel =
    scope?.subject ??
    (scope?.kind === 'cards'
      ? `${scope.cardIds?.length ?? 0} selected cards`
      : scope?.kind === 'deck'
        ? 'This deck'
        : 'Research');
  const canConverse = conversational && thread?.id !== 'oneshot';
  const hasAnswer = (thread?.messages ?? []).some((m) => m.role === 'assistant');

  return (
    <DeepDiveContext.Provider value={{ open, chat, openThread, closePanel: close, isOpen: openState }}>
      {children}

      {/* Docked AI panel — no backdrop overlay, slides from right edge.
          AppShell adds a right margin to the main area when this is open. */}
      <aside
        className={cn(
          'fixed right-0 top-0 z-40 flex h-full w-full flex-col border-l border-border bg-surface transition-transform duration-300 ease-out sm:w-[400px]',
          openState ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-label="AI Research"
        aria-hidden={!openState}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-[14px] font-semibold text-content">
              {thread?.title ?? scopeLabel}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {canConverse && hasAnswer && repo.saveThreadAsReport && !thread?.reportId && (
              <button
                type="button"
                onClick={() => setShowReportForm((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-muted hover:border-primary/50 hover:text-primary-ink"
              >
                <FilePlus2 className="h-3 w-3" /> Report
              </button>
            )}
            {thread?.reportId && (
              <Link
                to={`/reports/${thread.reportId}`}
                onClick={close}
                className="inline-flex items-center gap-1 rounded-lg border border-positive/40 bg-positive/10 px-2 py-1 text-[11px] text-positive"
              >
                <FileText className="h-3 w-3" /> Saved
              </Link>
            )}
            <button
              type="button"
              onClick={close}
              className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-content"
              aria-label="Close AI panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {showReportForm && (
          <div className="border-b border-border bg-surface-2 px-4 py-2.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted" htmlFor="report-focus">
              Report focus
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="report-focus"
                className="input flex-1 py-1.5 text-[13px]"
                placeholder={thread?.title ?? 'e.g. who is winning enterprise'}
                value={reportFocus}
                onChange={(e) => setReportFocus(e.target.value)}
              />
              <button type="button" className="btn-primary px-2.5 py-1 text-[11px]" onClick={() => void saveReport()} disabled={savingReport}>
                {savingReport ? 'Saving…' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {/* Conversation */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {(thread?.messages ?? []).length === 0 && !busy && !error && (
            <div className="flex flex-col items-center justify-center gap-1 py-16 text-center text-muted">
              <p className="text-[13px]">
                Ask anything about <span className="font-medium text-content">{scopeLabel.toLowerCase()}</span>.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {(thread?.messages ?? []).map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-content/5 px-3 py-2 text-[13px] text-content">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="max-w-full">
                  <article className="markdown text-[13px]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                  </article>
                  <SourceChips citations={m.citations} />
                </div>
              ),
            )}
          </div>

          {busy && (
            <div className="flex items-center gap-2 py-6 text-muted">
              <Loader2 className="h-4 w-4 animate-spin text-muted" />
              <span className="text-[13px]">Searching…</span>
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-negative/40 bg-negative/10 p-3 text-[13px] text-negative">
              {error}
            </div>
          )}
        </div>

        {/* Composer */}
        {conversational && (
          <form onSubmit={submit} className="border-t border-border px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                className="input max-h-28 min-h-[38px] flex-1 resize-none py-2 text-[13px]"
                rows={1}
                placeholder={placeholder ?? 'Ask a question…'}
                aria-label="Ask a research question"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submit(e);
                  }
                }}
              />
              <button
                type="submit"
                className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-primary text-primary-fg transition-opacity disabled:opacity-40"
                disabled={!draft.trim() || busy}
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}
      </aside>
    </DeepDiveContext.Provider>
  );
}

/**
 * AI affordance icon — replaces the old "Shovel" with a MessageCircle icon.
 * Appears beside data points everywhere, so it stays quiet.
 */
export function DigDeeper({
  topic,
  companyId,
  companyName,
  context,
  className,
  label = 'Ask AI',
}: {
  topic: string;
  companyId: string | null;
  companyName: string;
  context?: string | null;
  className?: string;
  label?: string;
}) {
  const { open } = useDeepDive();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        open({ topic, companyId, companyName, context: context ?? null });
      }}
      className={cn(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-primary/50 hover:text-primary',
        className,
      )}
      aria-label={label}
      title={label}
    >
      <MessageCircle className="h-3 w-3" />
    </button>
  );
}
