/**
 * Company card — Apple-minimalist design language.
 *
 * A flat white rectangle with generous padding. No brand-colored frame, no
 * material system, no foil, no banner. The company's identity is its logo
 * (small, inline with the title) and its name — not a visual gimmick.
 *
 * The honest-data language is preserved: verified/estimated/unknown still
 * read differently, just through quiet typographic cues (solid vs. muted
 * text, confidence dots) rather than striped bars.
 */
import {
  Building2,
  Landmark,
  Layers,
  Lightbulb,
  ShieldAlert,
  Heart,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';
import {
  CARD_TYPE_LABELS,
  TIER_LABELS,
  isSignalCardType,
  publisherOf,
  type CardType,
  type CardWithCompany,
  type Confidence,
  type MetricType,
} from '@mi/contracts';
import { cn } from '@/lib/cn';
import { formatCount, formatMetricValue } from '@/lib/format';
import { Logo } from './Logo';
import { getMetric, valueMetric } from './metrics';

const TYPE_ICON: Record<CardType, LucideIcon> = {
  company: Building2,
  infrastructure: Layers,
  distribution: Waypoints,
  culture: Heart,
  vice: ShieldAlert,
  insight: Lightbulb,
  barrier: Landmark,
};

// ---- Stat display -----------------------------------------------------------
//
// Confidence dots removed from the card summary. At grid density they're noise;
// the detailed confidence indicators live in the Metrics tab and card reader
// where users are doing real analysis and the dots earn their space.

function StatItem({
  label,
  type,
  value,
  confidence,
}: {
  label: string;
  type: MetricType;
  value: number | null;
  confidence: Confidence | undefined;
}) {
  const known = value != null && confidence !== 'unknown';
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-faint">{label}</span>
      <span
        className={cn(
          'font-display text-sm font-semibold tabular-nums',
          known ? 'text-content' : 'text-faint',
        )}
      >
        {known ? formatMetricValue(type, value) : '—'}
      </span>
    </div>
  );
}

/** Tier label — quiet, typographic, no gold foil in this design language. */
function TierLabel({ tier }: { tier: number }) {
  return (
    <span
      className="inline-flex items-baseline gap-1 text-[10px] font-semibold uppercase tracking-wider text-faint"
      title={TIER_LABELS[tier as keyof typeof TIER_LABELS]}
    >
      <span className="tabular-nums text-content">T{tier}</span>
      <span>{TIER_LABELS[tier as keyof typeof TIER_LABELS]}</span>
    </span>
  );
}

export interface GameCardProps {
  data: CardWithCompany;
  onOpen?: () => void;
  className?: string;
}

export function GameCard({ data, onOpen, className }: GameCardProps) {
  const { card, company, metrics } = data;
  // Brand-color extraction is available on Logo but the minimal card doesn't
  // use it (no brand-colored chrome to drive). Keep the prop wired so the
  // dashboard can still pick up the dominant color if it wants to.

  const TypeIcon = TYPE_ICON[card.cardType];

  // ---- Market-level card (Barrier, Insight) --------------------------------
  if (!company) {
    const cited = card.citations?.[0];
    return (
      <button
        type="button"
        onClick={onOpen}
        className={cn('mi-card group w-full', className)}
        aria-label={`${CARD_TYPE_LABELS[card.cardType]}: ${card.title ?? ''}`}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
            <TypeIcon className="h-3.5 w-3.5" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {CARD_TYPE_LABELS[card.cardType]}
          </span>
        </div>
        <p className="mt-3 font-display text-[15px] font-semibold leading-snug text-content">
          {card.title}
        </p>
        <p className="mt-1.5 line-clamp-4 text-[13px] leading-relaxed text-muted">
          {card.summary}
        </p>
        <p className="mt-auto pt-3 text-[10px] text-faint">
          {cited ? publisherOf(cited.url, cited.title) : 'No source recorded'}
        </p>
      </button>
    );
  }

  // ---- Company card (minimalist) -------------------------------------------

  const arr = getMetric(metrics, 'arr');
  const { metric: valMetric, label: valLabel } = valueMetric(metrics);
  const employees = getMetric(metrics, 'employees');
  const share = getMetric(metrics, 'market_share');
  const users = getMetric(metrics, 'users');

  const signal = !isSignalCardType(card.cardType)
    ? null
    : card.cardType === 'vice'
      ? {
          heading: 'Risk signal',
          claims: data.viceClaims.slice(0, 2).map((v) => ({
            text: v.claimText,
            publisher: publisherOf(v.sourceUrl, v.sourceTitle),
          })),
        }
      : {
          heading: card.cardType === 'culture' ? 'Community signal' : 'Market insight',
          claims: card.summary ? [{ text: card.summary, publisher: null }] : [],
        };

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('mi-card group w-full', className)}
      aria-label={`${company.name} — ${CARD_TYPE_LABELS[card.cardType]} card`}
    >
      {/* Header: logo inline with title and description */}
      <div className="flex gap-3.5">
        {/* Logo — small, circular, inline left */}
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface-2">
          <Logo
            name={company.name}
            website={company.websiteUrl}
            logoUrl={company.logoUrl}
            className="h-full w-full"
          />
        </div>

        {/* Title + subtitle + card type */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-display text-[15px] font-semibold leading-tight text-content">
              {company.name}
            </h3>
            <span
              className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-surface-2 text-faint"
              title={CARD_TYPE_LABELS[card.cardType]}
            >
              <TypeIcon className="h-3 w-3" />
            </span>
          </div>
          {company.hqLocation && (
            <p className="mt-0.5 truncate text-[11px] text-faint">{company.hqLocation}</p>
          )}
          <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted">
            {company.oneLiner}
          </p>
        </div>
      </div>

      {/* Payload */}
      {signal ? (
        <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            {signal.heading}
          </p>
          {signal.claims.length > 0 ? (
            signal.claims.map((c, i) => (
              <p key={i} className="mt-1.5 text-[12px] leading-snug text-content">
                <span className="line-clamp-3">{c.text}</span>
                {c.publisher && (
                  <span className="mt-0.5 block text-[10px] text-faint">{c.publisher}</span>
                )}
              </p>
            ))
          ) : (
            <p className="mt-1.5 text-[12px] text-muted">
              Open the card to research this signal.
            </p>
          )}
        </div>
      ) : (
        /* Stats as a clean horizontal grid */
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-border pt-3.5">
          <StatItem type="market_share" label="Share" value={share?.value ?? null} confidence={share?.confidence} />
          <StatItem type="arr" label="ARR" value={arr?.value ?? null} confidence={arr?.confidence} />
          <StatItem
            type={valMetric?.metricType ?? 'valuation'}
            label={valLabel}
            value={valMetric?.value ?? null}
            confidence={valMetric?.confidence}
          />
          <StatItem type="employees" label="Team" value={employees?.value ?? null} confidence={employees?.confidence} />
        </div>
      )}

      {/* Footer: users count + tier */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="min-w-0 text-left">
          {!signal && users?.value != null && (
            <span className="text-[10px] text-faint">
              {formatCount(users.value)} users
            </span>
          )}
        </span>
        {card.tier != null && <TierLabel tier={card.tier} />}
      </div>
    </button>
  );
}
