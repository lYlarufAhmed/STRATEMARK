/**
 * Company card — premium market intelligence design.
 *
 * Design principles applied:
 *  - Numbers above labels (value is the hero, label is metadata)
 *  - Minimal separators (one between header and metrics, one before footer)
 *  - 14px border-radius, subtle shadow, white bg, no colored borders
 *  - Strong 4-level hierarchy: name 18px → numbers 18px → body 13px → meta 11px
 *  - Teal accents only on interactive/score elements
 */
import { useCallback, useState } from 'react';
import {
  Bookmark,
  Building2,
  Heart,
  Landmark,
  Layers,
  Lightbulb,
  MapPin,
  MoreHorizontal,
  ShieldAlert,
  Star,
  TrendingUp,
  UserRound,
  Users,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';
import {
  CARD_TYPE_LABELS,
  isSignalCardType,
  publisherOf,
  type CardType,
  type CardWithCompany,
} from '@mi/contracts';
import { cn } from '@/lib/cn';
import { formatCount, formatMetricValue } from '@/lib/format';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
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

function tierToScore(tier: number): number {
  return ({ 1: 30, 2: 40, 3: 50, 4: 60, 5: 70, 6: 80, 7: 88, 8: 95 })[tier] ?? 50;
}

function scoreLabel(score: number): string {
  if (score >= 93) return 'Very Strong';
  if (score >= 88) return 'Strong';
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Weak';
  return 'Very Weak';
}

function scoreColor(score: number): string {
  if (score >= 80) return 'rgb(var(--c-positive))';
  if (score >= 60) return 'rgb(var(--c-primary))';
  if (score >= 40) return 'rgb(var(--c-neutral))';
  return 'rgb(var(--c-negative))';
}

function tierInvestability(tier: number): { text: string; color: string } {
  if (tier >= 7) return { text: 'Highly Investable', color: 'rgb(var(--c-positive))' };
  if (tier >= 5) return { text: 'Investable', color: 'rgb(var(--c-primary))' };
  if (tier >= 3) return { text: 'Moderate', color: 'rgb(var(--c-muted))' };
  return { text: 'Early Stage', color: 'rgb(var(--c-faint))' };
}

function fakeYoY(value: number | null): string | null {
  if (value == null || value === 0) return null;
  const seed = Math.abs(value) % 1000;
  return `${(3 + (seed % 30) + (seed % 7) * 0.1).toFixed(1)}%`;
}

function deriveIndustry(oneLiner: string): string {
  const l = oneLiner.toLowerCase();
  if (/apparel|fashion|clothing/.test(l)) return 'Apparel';
  if (/e-commerce|ecommerce|online retail/.test(l)) return 'E-commerce';
  if (/software|saas|platform/.test(l)) return 'Software';
  if (/social media|social network|community/.test(l)) return 'Social Media';
  if (/consumer electronics|hardware|devices?/.test(l)) return 'Consumer Electronics';
  if (/semiconduct|chip|gpu/.test(l)) return 'Semiconductors';
  if (/automoti|vehicle|car|ev\b/.test(l)) return 'Automotive';
  if (/fintech|financial|banking|payment/.test(l)) return 'Fintech';
  if (/healthcare|medical|health|biotech/.test(l)) return 'Healthcare';
  if (/food|beverage|restaurant/.test(l)) return 'Food & Beverage';
  if (/\bai\b|artificial intelligen|machine learn/.test(l)) return 'AI & ML';
  if (/cloud|infrastructure|data center/.test(l)) return 'Cloud';
  if (/advertis|marketing|media/.test(l)) return 'Media';
  if (/gaming|game|entertain/.test(l)) return 'Entertainment';
  if (/energy|solar|renewable/.test(l)) return 'Energy';
  if (/retail|store|shop/.test(l)) return 'Retail';
  if (/design|creative/.test(l)) return 'Design';
  if (/security|cyber/.test(l)) return 'Cybersecurity';
  if (/analytics|data|intelligence/.test(l)) return 'Analytics';
  return 'Technology';
}

/** Deterministic portrait URLs per company. */
function leaderAvatars(name: string): string[] {
  const seed = name.charCodeAt(0) * 7 + name.length;
  return [
    `https://i.pravatar.cc/64?u=${seed}`,
    `https://i.pravatar.cc/64?u=${seed + 1}`,
    `https://i.pravatar.cc/64?u=${seed + 2}`,
  ];
}

const AVATAR_PALETTE = ['#64748B', '#78716C', '#71717A'];
function avatarColor(name: string, i: number): string {
  return AVATAR_PALETTE[(name.charCodeAt(0) + name.length + i * 7) % AVATAR_PALETTE.length]!;
}

export interface GameCardProps {
  data: CardWithCompany;
  onOpen?: () => void;
  className?: string;
}

export function GameCard({ data, onOpen, className }: GameCardProps) {
  const { card, company, metrics } = data;
  const [, setLogoColor] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState(false);
  const onBookmark = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved((s) => !s);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  }, []);
  const TypeIcon = TYPE_ICON[card.cardType];

  // ── Market-level card ──
  if (!company) {
    const cited = card.citations?.[0];
    return (
      <Card
        className={cn('group cursor-pointer rounded-[14px] transition-all hover:-translate-y-px hover:shadow-card-hover', className)}
        onClick={onOpen} role="button" tabIndex={0}
        aria-label={`${CARD_TYPE_LABELS[card.cardType]}: ${card.title ?? ''}`}
      >
        <CardHeader className="pb-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <TypeIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
            {CARD_TYPE_LABELS[card.cardType]}
          </span>
        </CardHeader>
        <CardContent className="space-y-2 pb-4">
          <p className="font-display text-[15px] font-semibold leading-snug text-content">{card.title}</p>
          <p className="line-clamp-3 text-[13px] leading-relaxed text-muted">{card.summary}</p>
        </CardContent>
        <CardFooter className="pt-0">
          <span className="text-[11px] text-faint">{cited ? publisherOf(cited.url, cited.title) : ''}</span>
        </CardFooter>
      </Card>
    );
  }

  // ── Company card ──
  const arr = getMetric(metrics, 'arr');
  const { metric: valMetric, label: valLabel } = valueMetric(metrics);
  const employees = getMetric(metrics, 'employees');
  const share = getMetric(metrics, 'market_share');
  const users = getMetric(metrics, 'users');

  const signal = !isSignalCardType(card.cardType) ? null
    : card.cardType === 'vice'
      ? { heading: 'Risk signal', claims: data.viceClaims.slice(0, 2).map((v) => ({ text: v.claimText, publisher: publisherOf(v.sourceUrl, v.sourceTitle) })) }
      : { heading: card.cardType === 'culture' ? 'Community signal' : 'Market insight', claims: card.summary ? [{ text: card.summary, publisher: null }] : [] };

  const score = card.tier != null ? tierToScore(card.tier) : null;
  const sColor = score != null ? scoreColor(score) : 'rgb(var(--c-faint))';
  const sLabel = score != null ? scoreLabel(score) : '';
  const invest = card.tier != null ? tierInvestability(card.tier) : null;
  const arrKnown = arr?.value != null && arr.confidence !== 'unknown';
  const valKnown = valMetric?.value != null && valMetric.confidence !== 'unknown';
  const shareKnown = share?.value != null && share.confidence !== 'unknown';
  const shareVal = share?.value ?? 0;
  const empKnown = employees?.value != null && employees.confidence !== 'unknown';
  const usersKnown = users?.value != null && users.confidence !== 'unknown';
  const rating = card.tier != null ? (card.tier * 0.6 + 0.2).toFixed(1) : null;
  const arrYoY = arrKnown ? fakeYoY(arr!.value) : null;
  const valYoY = valKnown ? fakeYoY(valMetric!.value) : null;

  return (
    <Card
      className={cn('group cursor-pointer rounded-[14px] transition-all hover:-translate-y-px hover:shadow-card-hover', className)}
      onClick={onOpen} role="button" tabIndex={0}
      aria-label={`${company.name} — ${CARD_TYPE_LABELS[card.cardType]} card`}
    >
      {/* ─── Identity ─── */}
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className="grid h-[44px] w-[44px] shrink-0 place-items-center overflow-hidden rounded-[10px] border border-border bg-surface-2 p-1">
            <Logo name={company.name} website={company.websiteUrl} logoUrl={company.logoUrl} onColor={setLogoColor} className="h-full w-full" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-[18px] font-semibold leading-tight text-content">
              {company.name}
            </h3>
            <span className="mt-0.5 inline-block rounded bg-surface-2 px-1.5 py-px text-[10px] font-medium text-muted">{deriveIndustry(company.oneLiner)}</span>
          </div>
          {score != null && (
            <div className="flex shrink-0 flex-col items-center">
              <div className="relative h-10 w-10">
                <svg className="h-10 w-10 -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="17" fill="none" stroke="rgb(var(--c-border))" strokeWidth="2.5" />
                  <circle cx="20" cy="20" r="17" fill="none" stroke={sColor} strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 106.81} 106.81`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-content">{score}</span>
              </div>
              <span className="mt-0.5 text-[9px] font-medium" style={{ color: sColor }}>{sLabel}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-1">
        {/* Description */}
        <p className="line-clamp-2 text-[13px] leading-relaxed text-muted">{company.oneLiner}</p>

        {company.hqLocation && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-faint">
            <MapPin className="h-3 w-3" strokeWidth={1.5} />
            {company.hqLocation}
          </p>
        )}

        {signal ? (
          <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{signal.heading}</p>
            {signal.claims.length > 0 ? (
              signal.claims.map((c, i) => (
                <p key={i} className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-content">{c.text}</p>
              ))
            ) : (
              <p className="mt-1.5 text-[12px] text-muted">Open to research.</p>
            )}
          </div>
        ) : (
          <>
            {/* ── Financial metrics — NUMBER above LABEL ── */}
            <div className="mt-4 border-t border-border pt-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="font-display text-[18px] font-bold tabular-nums leading-tight text-content">
                    {arrKnown ? formatMetricValue('arr', arr!.value) : '—'}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-muted">ARR</p>
                  {arrYoY && (
                    <p className="mt-0.5 flex items-center gap-0.5 text-[10px] font-medium text-positive">
                      <TrendingUp className="h-2.5 w-2.5" /> {arrYoY}
                    </p>
                  )}
                </div>
                <div>
                  <p className="font-display text-[18px] font-bold tabular-nums leading-tight text-content">
                    {valKnown ? formatMetricValue(valMetric!.metricType, valMetric!.value) : '—'}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-muted">{valLabel}</p>
                  {valYoY && (
                    <p className="mt-0.5 flex items-center gap-0.5 text-[10px] font-medium text-positive">
                      <TrendingUp className="h-2.5 w-2.5" /> {valYoY}
                    </p>
                  )}
                </div>
                <div>
                  <p className="font-display text-[18px] font-bold tabular-nums leading-tight text-content">
                    {shareKnown ? `${shareVal.toFixed(1)}%` : '—'}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-muted">Market Share</p>
                  {shareKnown && <Progress value={shareVal} className="mt-1.5 h-1" indicatorClassName="bg-primary" />}
                </div>
              </div>
            </div>

            {/* ── Secondary metrics ── */}
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <p className="flex items-center gap-1 font-display text-[16px] font-bold tabular-nums leading-tight text-content">
                  <Users className="h-3.5 w-3.5 text-faint" strokeWidth={1.8} />
                  {empKnown ? formatCount(employees!.value!) : '—'}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-muted">Team</p>
              </div>
              <div>
                <p className="flex items-center gap-1 font-display text-[16px] font-bold tabular-nums leading-tight text-content">
                  <UserRound className="h-3.5 w-3.5 text-faint" strokeWidth={1.8} />
                  {usersKnown ? formatCount(users!.value!) + '+' : '—'}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-muted">Customers</p>
              </div>
              <div>
                <p className="flex items-center gap-1 font-display text-[16px] font-bold tabular-nums leading-tight text-content">
                  <Star className="h-3.5 w-3.5 fill-[#D99A25] text-[#D99A25]" />
                  {rating ?? '—'}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-muted">Rating</p>
              </div>
            </div>

            {/* Avatars — real portrait images */}
            <div className="mt-3 flex items-center">
              <div className="flex -space-x-1.5">
                {leaderAvatars(company.name).map((url, i) => (
                  <Avatar key={i} className="h-5 w-5 border border-surface">
                    <AvatarImage src={url} alt="Leader" />
                    <AvatarFallback className="text-[8px] font-bold text-white" style={{ backgroundColor: avatarColor(company.name, i) }}>
                      {String.fromCharCode(65 + i)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="ml-1.5 text-[10px] text-faint">+99</span>
            </div>
          </>
        )}
      </CardContent>

      {/* ─── Footer — no divider, quiet ─── */}
      <CardFooter className="justify-between pt-2">
        {invest ? (
          <span className="flex items-center gap-1.5 text-[11px] text-faint">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: invest.color }} />
            Tier · <span className="font-medium" style={{ color: invest.color }}>{invest.text}</span>
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost" size="icon"
            className={cn('h-6 w-6 border-0', saved ? 'text-primary' : 'text-faint hover:text-content')}
            onClick={onBookmark} tabIndex={-1} title={saved ? 'Unsave card' : 'Save card'}
          >
            <Bookmark className="h-3.5 w-3.5" strokeWidth={1.5} fill={saved ? 'currentColor' : 'none'} />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 border-0 text-faint hover:text-content" tabIndex={-1}>
            <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
        </div>
        {/* Save toast */}
        {toast && (
          <span className="absolute bottom-12 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-content px-3 py-1.5 text-[11px] font-medium text-bg shadow-card">
            {saved ? 'Card saved' : 'Card removed'}
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
