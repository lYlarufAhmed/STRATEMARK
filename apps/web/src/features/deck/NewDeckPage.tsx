/**
 * New deck — conversational creation flow.
 *
 * Research session state lives in a Zustand store (research-session.ts) so it
 * survives navigation. The user can click "Decks", browse, and come back to
 * "New Deck" — the running session is still here.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUp,
  Brain,
  ChevronDown,
  ChevronRight,
  Globe2,
  Loader2,
  Radar,
  ScanSearch,
  TrendingUp,
  X,
} from 'lucide-react';
import { useRepository } from '@/lib/repository/RepositoryProvider';
import { useApiKey } from '@/lib/settings/apiKey';
import { cn } from '@/lib/cn';
import wordmark from '@/assets/wordmark.svg';
import { useResearchSession } from './research-session';

const SUGGESTIONS = [
  'Christian apparel companies',
  'AI code-review startups',
  'Non-alcoholic spirits brands',
  'Precision fermentation companies',
  'Direct-to-consumer pet food',
  'Vertical farming startups',
];

const REGIONS = [
  'Global', 'North America', 'United States', 'Europe', 'United Kingdom',
  'Asia Pacific', 'Latin America', 'Middle East & Africa', 'California, USA',
  'New York, USA', 'Southeast Asia', 'India', 'China', 'Australia & NZ',
  'DACH (Germany, Austria, Switzerland)', 'Nordics',
];

// ── Research phases ──────────────────────────────────────────────────────────

const RESEARCH_PHASES = [
  { label: 'Brainstorming…', Icon: Brain },
  { label: 'Scanning the market…', Icon: Radar },
  { label: 'Discovering companies…', Icon: ScanSearch },
  { label: 'Analyzing metrics…', Icon: TrendingUp },
  { label: 'Scoring tiers…', Icon: Loader2 },
] as const;

function useResearchPhase(active: boolean) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) { setIndex(0); return; }
    const id = setInterval(() => setIndex((i) => (i + 1) % RESEARCH_PHASES.length), 3500);
    return () => clearInterval(id);
  }, [active]);
  return RESEARCH_PHASES[index]!;
}

// ── Region picker ────────────────────────────────────────────────────────────

function RegionPicker({
  value, onChange, disabled,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const hasValue = value.trim().length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button" disabled={disabled} onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
          hasValue ? 'border-primary/30 bg-primary/5 text-primary-ink' : 'border-border text-muted hover:border-content/20 hover:text-content',
        )}
      >
        <Globe2 className="h-3 w-3" />
        {hasValue ? value : 'Region'}
        {hasValue ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); }} className="ml-0.5 rounded-full p-0.5 hover:bg-primary/10" aria-label="Clear region">
            <X className="h-2.5 w-2.5" />
          </button>
        ) : (
          <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
        )}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-1 w-56 max-h-64 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-card">
          {REGIONS.map((r) => (
            <button key={r} type="button" onClick={() => { onChange(r === 'Global' ? '' : r); setOpen(false); }}
              className={cn('flex w-full items-center rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors',
                value === r || (r === 'Global' && !hasValue) ? 'bg-surface-2 font-medium text-content' : 'text-muted hover:bg-surface-2 hover:text-content',
              )}
            >{r}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Input pill ───────────────────────────────────────────────────────────────

function InputPill({
  prompt, setPrompt, region, setRegion, onSubmit, disabled, hasKey, showHint,
}: {
  prompt: string; setPrompt: (v: string) => void;
  region: string; setRegion: (v: string) => void;
  onSubmit: (e: FormEvent) => void; disabled: boolean;
  hasKey: boolean; showHint: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="w-full max-w-2xl">
      <div className="rounded-2xl border border-border bg-surface p-3 shadow-soft">
        <textarea
          className="w-full resize-none border-0 bg-transparent text-[15px] text-content placeholder:text-faint focus:outline-none"
          rows={1} placeholder="Describe a market…" value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void onSubmit(e); } }}
          disabled={disabled} autoFocus
        />
        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={wordmark} alt="" className="h-3.5 opacity-40" />
            <RegionPicker value={region} onChange={setRegion} disabled={disabled} />
          </div>
          <button type="submit" disabled={!prompt.trim() || disabled}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-fg transition-opacity disabled:opacity-30"
            aria-label="Research this market"
          ><ArrowUp className="h-4 w-4" /></button>
        </div>
      </div>
      {showHint && !hasKey && (
        <p className="mt-2 text-center text-[11px] text-faint">
          Demo mode — <Link to="/settings" className="text-primary-ink hover:underline">add API key</Link> for live research.
        </p>
      )}
    </form>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

function timeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function NewDeckPage() {
  const repo = useRepository();
  const hasKey = useApiKey((s) => s.hasKey);

  const [prompt, setPrompt] = useState('');
  const [region, setRegion] = useState('');
  const [logsOpen, setLogsOpen] = useState(false);

  // Session from the store — survives navigation
  const session = useResearchSession((s) => s.session);
  const startSession = useResearchSession((s) => s.startSession);
  const addLog = useResearchSession((s) => s.addLog);
  const finish = useResearchSession((s) => s.finish);
  const fail = useResearchSession((s) => s.fail);
  const clear = useResearchSession((s) => s.clear);

  // New Deck should always be a clean slate. If a previous session finished
  // (completed or errored), clear it on mount so the user sees the empty state.
  // Only a currently-running session stays visible here — its result will also
  // appear in the Decks list when it completes.
  useEffect(() => {
    if (session && !session.running) clear();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const phase = useResearchPhase(session?.running ?? false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = prompt.trim();
    if (!q || session?.running) return;

    const regionStr = region.trim();
    const userText = regionStr ? `${q} — ${regionStr}` : q;

    startSession(userText, timeLabel());
    setPrompt('');
    setRegion('');

    let cardCount = 0;
    try {
      const { market } = await repo.createResearchedDeck(
        { prompt: q, region: regionStr || null },
        {
          onProgress: (p) => {
            if (p.message) {
              addLog(p.message);
              if (p.kind === 'find') cardCount++;
            }
          },
        },
      );
      finish(`/markets/${market.id}/deck`, cardCount);
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Research failed.');
    }
  };

  const hasSession = session !== null;
  const running = session?.running ?? false;

  return (
    <div className="flex min-h-full flex-col">
      {/* Main content area */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
        {!hasSession ? (
          /* ── Empty state ── */
          <div className="w-full max-w-2xl pb-32">
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <img src={wordmark} alt="Stratemark" className="h-10" />
                <span className="text-[13px] text-muted">{timeLabel()}</span>
              </div>
              <h1 className="mt-1.5 font-display text-2xl font-semibold text-content md:text-3xl">
                What market should we dive into?
              </h1>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((ex) => (
                <button key={ex} type="button" onClick={() => setPrompt(ex)}
                  className="rounded-full border border-border bg-surface px-4 py-2 text-[13px] text-muted transition-colors hover:border-content/20 hover:bg-surface-2 hover:text-content"
                >{ex}</button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Active / completed session ── */
          <div className="w-full max-w-2xl pb-28 pt-8">
            {/* User message */}
            <div className="flex justify-end">
              <div>
                <div className="mb-1 text-right text-[11px] text-faint">{session.time}</div>
                <div className="rounded-2xl rounded-br-md bg-content/5 px-4 py-2.5 text-[14px] text-content">
                  {session.query}
                </div>
              </div>
            </div>

            {/* AI status card */}
            <div className="mt-5">
              <div className="mb-1 flex items-center gap-2 text-[11px] text-faint">
                <img src={wordmark} alt="Stratemark" className="h-4" />
              </div>

              {running && (
                <div className="glow-border rounded-xl bg-surface p-4">
                  <div className="flex items-center gap-2.5 text-[14px] text-content transition-all duration-300">
                    <phase.Icon className="h-4 w-4 animate-pulse text-muted" />
                    <span>{phase.label}</span>
                  </div>
                  {session.logLines.length > 0 && (
                    <div className="mt-3 border-t border-border pt-2.5">
                      <button type="button" onClick={() => setLogsOpen(!logsOpen)}
                        className="flex items-center gap-1 text-[12px] text-muted hover:text-content"
                      >
                        <ChevronRight className={cn('h-3 w-3 transition-transform', logsOpen && 'rotate-90')} />
                        {session.logLines.length} steps completed
                      </button>
                      {logsOpen && (
                        <div className="mt-2 max-h-48 overflow-y-auto text-[12px] text-muted">
                          {session.logLines.map((l, i) => <div key={i} className="py-0.5">{l}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {session.done && (
                <div className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-[14px] text-content">
                    Your deck is ready — {session.done.count > 0 ? `${session.done.count} cards built` : 'cards are built'}, metrics sourced, tiers scored.
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <Link to={session.done.link}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-fg transition-opacity hover:opacity-90"
                    >
                      View your deck <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <button type="button" onClick={clear}
                      className="text-[13px] text-muted hover:text-content"
                    >
                      New research
                    </button>
                  </div>
                </div>
              )}

              {session.error && (
                <div className="rounded-xl border border-negative/30 bg-negative/5 p-4">
                  <p className="text-[13px] text-negative">{session.error}</p>
                  <button type="button" onClick={clear}
                    className="mt-2 text-[13px] text-muted hover:text-content"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating input pill */}
      <div className="sticky bottom-0 z-20 flex justify-center px-6 pb-5 pt-3"
        style={{ background: 'linear-gradient(transparent, rgb(var(--c-bg)) 40%)' }}
      >
        <InputPill
          prompt={prompt} setPrompt={setPrompt}
          region={region} setRegion={setRegion}
          onSubmit={onSubmit} disabled={running}
          hasKey={hasKey} showHint={!hasSession}
        />
      </div>
    </div>
  );
}
