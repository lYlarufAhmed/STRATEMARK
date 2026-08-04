/**
 * The research stage — the most emotionally important screen in the app.
 *
 * Two views of the same live run, switchable:
 *  · Live log  — the glass box. The agent's actual steps, streaming. Earns trust.
 *  · Market brief — a cinematic, auto-advancing carousel that primes you on the
 *    market while you wait. Every card is built from data ALREADY streaming in
 *    (scope, search angles, companies found, gaps). Nothing is invented; the
 *    two "how this works" cards are labelled as method, not findings.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Compass, Layers, ListTree, Radio, ShieldCheck, Sparkles, Terminal } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface LogLine {
  message: string;
  kind: 'step' | 'find' | 'warn';
  at: number;
}

interface Insight {
  id: string;
  eyebrow: string;
  body: string;
  icon: typeof Compass;
  /** Method explainers are labelled so they're never mistaken for findings. */
  method?: boolean;
}

/** Build carousel cards out of the real event stream. */
function deriveInsights(lines: LogLine[]): Insight[] {
  const out: Insight[] = [];

  // 1. Scope and Angles from "Market defined: ... · angles: ..."
  const scopeLine = lines.find((l) => /Market defined:/i.test(l.message))?.message;
  if (scopeLine) {
    const parts = scopeLine.replace(/^Market defined:\s*/i, '').split(/·\s*angles:\s*/i);
    const scopeText = parts[0]?.trim();
    const anglesText = parts[1]?.trim();

    if (scopeText) {
      out.push({
        id: 'scope',
        eyebrow: 'The market, as defined',
        body: scopeText,
        icon: Compass,
      });
    }

    if (anglesText) {
      out.push({
        id: 'angles',
        eyebrow: 'Search angles explored',
        body: anglesText,
        icon: ListTree,
      });
    }
  }

  // 2. Discovered entity cohort
  const discoveryLine = lines.find((l) => /Discovered \d+ entities:/i.test(l.message))?.message;
  if (discoveryLine) {
    const playersText = discoveryLine.replace(/^Discovered \d+ entities:\s*/i, '').trim();
    if (playersText) {
      out.push({
        id: 'players',
        eyebrow: 'Entities discovered',
        body: playersText,
        icon: Radio,
      });
    }
  }

  // 3. Live Assembled Cards (e.g. "+ company card: OpenAI (T7) · 4 metrics")
  const cardLines = lines
    .filter((l) => l.message.startsWith('+ ') || /card:/i.test(l.message))
    .map((l) => l.message.replace(/^\+\s*/, ''));

  if (cardLines.length > 0) {
    out.push({
      id: 'cards_assembled',
      eyebrow: `Cards Assembled · ${cardLines.length}`,
      body: cardLines.slice(-5).join(' · '),
      icon: Layers,
    });
  }

  // 4. Honest gaps & warnings
  const warns = lines.filter((l) => l.kind === 'warn');
  if (warns.length > 0) {
    out.push({
      id: 'gaps',
      eyebrow: `Gaps & Exclusions · ${warns.length}`,
      body: warns.slice(-2).map((w) => w.message).join(' · '),
      icon: ShieldCheck,
    });
  }

  // Method primers — always present, clearly labelled, so the carousel has
  // substance in the first seconds before findings arrive.
  out.push({
    id: 'signals',
    eyebrow: 'What we capture per company',
    body:
      'Market share, ARR, valuation or market cap, team size, and user base — then a maturity tier from T1 The Sandbox up to T8 The Titans.',
    icon: Layers,
    method: true,
  });
  out.push({
    id: 'discipline',
    eyebrow: 'The rule we don’t break',
    body:
      'Every figure is tagged verified, estimated, or unknown, with a source. Anything we can’t stand behind stays Unknown — we never invent a number to fill a gap.',
    icon: ShieldCheck,
    method: true,
  });

  return out;
}

function LiveLog({ lines }: { lines: LogLine[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const startAt = lines[0]?.at ?? Date.now();

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [lines.length]);

  const color = (k: LogLine['kind']) =>
    k === 'find' ? 'text-emerald-300' : k === 'warn' ? 'text-amber-300' : 'text-sky-300';
  const prefix = (k: LogLine['kind']) => (k === 'find' ? '✓' : k === 'warn' ? '!' : '▸');

  return (
    <div
      ref={ref}
      className="h-60 overflow-y-auto rounded-xl bg-[#1B1F27] p-4 font-mono text-[12.5px] leading-relaxed"
      aria-live="polite"
      aria-label="Live research log"
    >
      {lines.map((l, i) => {
        const elapsedSec = Math.max(0, Math.round((l.at - startAt) / 1000));
        return (
          /* Single Log Line Row: Displays timestamp prefix, log kind icon (step/find/warn), and message */
          <div key={i} className="flex items-start gap-2 py-0.5">
            <span className="shrink-0 text-[#6B7280] text-[11px] select-none">
              [+{elapsedSec}s]
            </span>
            <span className={cn('shrink-0 font-bold', color(l.kind))}>{prefix(l.kind)}</span>
            <span className={l.kind === 'find' ? 'text-white' : 'text-[#D6DAE3]'}>{l.message}</span>
          </div>
        );
      })}
      {/* Live Pulsing Cursor Footer: Indicates live incoming event stream */}
      <div className="mt-1 flex items-center gap-2 text-[#8A93A6]">
        <span className="animate-pulse text-sky-400">▮</span>
        <span className="text-[11px] italic">Researching live…</span>
      </div>
    </div>
  );
}

function MarketBrief({ insights }: { insights: Insight[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = insights.length;

  // Keep the index in range as new insights stream in.
  useEffect(() => {
    if (i >= count) setI(0);
  }, [count, i]);

  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setTimeout(() => setI((n) => (n + 1) % count), 5200);
    return () => clearTimeout(t);
  }, [i, paused, count]);

  if (!count) return null;
  const active = insights[Math.min(i, count - 1)]!;
  const Icon = active.icon;

  return (
    <div
      className="relative flex h-60 flex-col justify-between overflow-hidden rounded-xl border border-border bg-gradient-to-br from-white to-surface-2 p-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="polite"
    >
      {/* Slide Content Block: Active insight eyebrow, body text, and methodology tag */}
      <div key={active.id} className="mi-brief-in">
        <div className="flex items-center gap-2 text-primary-ink">
          <Icon className="h-4 w-4" />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em]">
            {active.eyebrow}
          </span>
          {active.method && (
            <span className="chip border-border px-1.5 py-0 text-[9px] uppercase tracking-wide text-faint">
              how it works
            </span>
          )}
        </div>
        <p className="mt-3 max-w-2xl font-display text-[19px] font-medium leading-snug text-content">
          {active.body}
        </p>
      </div>

      {/* Slide Navigation Dots Footer: Interactive indicator dots for carousel slides */}
      <div className="flex items-center gap-1.5">
        {insights.map((s, n) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Show ${s.eyebrow}`}
            onClick={() => setI(n)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              n === i ? 'w-6 bg-primary' : 'w-1.5 bg-border hover:bg-faint',
            )}
          />
        ))}
        <span className="ml-auto text-[10px] text-faint">
          {paused ? 'paused' : 'auto-advancing'}
        </span>
      </div>
    </div>
  );
}

export function ResearchStage({
  lines,
  message,
  pct,
}: {
  lines: LogLine[];
  message: string;
  pct: number;
}) {
  const [tab, setTab] = useState<'log' | 'brief'>('log');
  const insights = useMemo(() => deriveInsights(lines), [lines]);

  return (
    <div className="panel mt-6 p-6">
      {/* Stage Header Controls: Section title and toggle buttons between 'Live log' terminal and 'Market brief' insights carousel */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 animate-pulse text-primary-ink" />
          <span className="font-medium text-content">Researching your market…</span>
        </div>
        {/* Switcher Pill Bar: Toggle between watching live terminal logs and reading the synthesized market brief */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-surface-2 p-1">
          {(
            [
              ['log', 'Live log', Terminal],
              ['brief', 'Market brief', Compass],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                tab === id ? 'bg-surface text-content shadow-soft' : 'text-muted hover:text-content',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress Bar Container: Animated percentage track illustrating overall research pass completion */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.round(Math.min(1, pct) * 100)}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-muted">{message}</p>

      {/* Viewport Switcher Container: Dynamically renders either LiveLog or MarketBrief based on active tab */}
      <div className="mt-4">
        {tab === 'log' ? <LiveLog lines={lines} /> : <MarketBrief insights={insights} />}
      </div>

      <p className="mt-3 text-xs text-muted">
        {tab === 'log'
          ? 'You’re watching the agent’s actual research steps — grounded Google searches, companies found, and cards assembled. This typically takes a few minutes.'
          : 'A read on the market while the deck builds. Findings come from this run; “how it works” cards explain the method.'}
      </p>
    </div>
  );
}
