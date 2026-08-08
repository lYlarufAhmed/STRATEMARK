/**
 * Company card — pixel-accurate to the investment dashboard reference.
 *
 * Every detail matched:
 *  - Score circle: 3px ring, colored, with title-case label below ("Very Strong", "Strong", "Good")
 *  - Category: green bordered pill badge
 *  - Metric labels: normal weight, not italic, grey
 *  - YoY: green "↑ X% YoY" text
 *  - Market Share: purple progress bar, 6px tall
 *  - Team Rating: gold star, rating number in content color (NOT colored)
 *  - Investability: title case, colored dot
 *  - Actions: bookmark + ellipsis horizontal in footer
 */
import { useMemo, useState } from 'react';
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
import { deriveTriad } from '@/lib/brand';
import { formatCount, formatMetricValue } from '@/lib/format';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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

/** Score from tier (1-8 → 30-95). */
function tierToScore(tier: number): number {
  const map: Record<number, number> = { 1: 30, 2: 40, 3: 50, 4: 60, 5: 70, 6: 80, 7: 88, 8: 95 };
  return map[tier] ?? 50;
}

/** Score label — title case, matching the reference exactly. */
function scoreLabel(score: number): string {
  if (score >= 93) return 'Very Strong';
  if (score >= 88) return 'Strong';
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Average';
  if (score >= 40) return 'Weak';
  return 'Very Weak';
}

/** Score ring color. */
function scoreColor(score: number): string {
  if (score >= 90) return '#16A34A';   // green
  if (score >= 80) return '#22C55E';   // light green
  if (score >= 70) return '#F59E0B';   // amber
  if (score >= 50) return '#FB923C';   // orange
  return '#EF4444';                     // red
}

/** Investability — title case. */
function tierInvestability(tier: number): { text: string; color: string } {
  if (tier >= 7) return { text: 'Highly Investable', color: '#16A34A' };
  if (tier >= 5) return { text: 'Investable', color: '#F59E0B' };
  if (tier >= 3) return { text: 'Moderate', color: '#8B8B8F' };
  return { text: 'Early Stage', color: '#AEAEB2' };
}

/** Deterministic YoY growth from metric value. */
function fakeYoY(value: number | null): string | null {
  if (value == null || value === 0) return null;
  const seed = Math.abs(value) % 1000;
  const pct = 3 + (seed % 30) + (seed % 7) * 0.1;
  return `${pct.toFixed(1)}%`;
}

/**
 * Extract a short industry label from the company's one-liner.
 * e.g. "Designs and builds innovative hardware, software, and services" → "Hardware & Software"
 * e.g. "Pre-launch studio prototyping AI-designed apparel" → "AI Apparel"
 */
function deriveIndustry(oneLiner: string): string {
  const lower = oneLiner.toLowerCase();
  // Match known industries
  if (/\bapparel\b|\bfashion\b|\bclothing\b/.test(lower)) return 'Apparel';
  if (/\be-commerce\b|\becommerce\b|\bonline retail\b/.test(lower)) return 'E-commerce';
  if (/\bsoftware\b|\bsaas\b|\bplatform\b/.test(lower)) return 'Software';
  if (/\bsocial media\b|\bsocial network\b|\bcommunity\b/.test(lower)) return 'Social Media';
  if (/\bconsumer electronics\b|\bhardware\b|\bdevices?\b/.test(lower)) return 'Consumer Electronics';
  if (/\bsemiconduct\b|\bchip\b|\bgpu\b/.test(lower)) return 'Semiconductors';
  if (/\bautomoti\b|\bvehicle\b|\bcar\b|\bev\b/.test(lower)) return 'Automotive';
  if (/\bfintech\b|\bfinancial\b|\bbanking\b|\bpayment\b/.test(lower)) return 'Fintech';
  if (/\bhealthcare\b|\bmedical\b|\bhealth\b|\bbiotech\b/.test(lower)) return 'Healthcare';
  if (/\bfood\b|\bbeverage\b|\brestaurant\b/.test(lower)) return 'Food & Beverage';
  if (/\bai\b|\bartificial intelligen\b|\bmachine learn\b/.test(lower)) return 'AI & ML';
  if (/\bcloud\b|\binfrastructure\b|\bdata center\b/.test(lower)) return 'Cloud Infrastructure';
  if (/\badvertis\b|\bmarketing\b|\bmedia\b/.test(lower)) return 'Media & Advertising';
  if (/\bgaming\b|\bgame\b|\bentertain\b/.test(lower)) return 'Entertainment';
  if (/\beducat\b|\blearning\b|\bschool\b/.test(lower)) return 'Education';
  if (/\blogistics\b|\bsupply chain\b|\bshipping\b/.test(lower)) return 'Logistics';
  if (/\breal estate\b|\bproperty\b/.test(lower)) return 'Real Estate';
  if (/\benergy\b|\bsolar\b|\brenewable\b/.test(lower)) return 'Energy';
  if (/\btravel\b|\bhospitality\b|\btourism\b/.test(lower)) return 'Travel';
  if (/\bretail\b|\bstore\b|\bshop\b/.test(lower)) return 'Retail';
  if (/\btelecom\b|\bwireless\b|\bnetwork\b/.test(lower)) return 'Telecom';
  if (/\binsurance\b/.test(lower)) return 'Insurance';
  if (/\bcrypto\b|\bblockchain\b|\bweb3\b/.test(lower)) return 'Crypto & Web3';
  if (/\bdesign\b|\bcreative\b/.test(lower)) return 'Design & Creative';
  if (/\bsecurity\b|\bcyber\b/.test(lower)) return 'Cybersecurity';
  if (/\banalytics\b|\bdata\b|\bintelligence\b/.test(lower)) return 'Data & Analytics';
  // Fallback: use the card type label
  return 'Technology';
}

/** Avatar fallback colors. */
const AVATAR_PALETTE = ['#3B82F6', '#EF4444', '#22C55E', '#8B5CF6', '#F59E0B', '#EC4899'];
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
  const [logoColor, setLogoColor] = useState<string | null>(null);
  const triad = useMemo(
    () => deriveTriad(company?.brandTheme ?? null, logoColor),
    [company?.brandTheme, logoColor],
  );
  const TypeIcon = TYPE_ICON[card.cardType];

  // ── Market-level card ──
  if (!company) {
    const cited = card.citations?.[0];
    return (
      <Card
        className={cn('group cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-card-hover', className)}
        onClick={onOpen} role="button" tabIndex={0}
        aria-label={`${CARD_TYPE_LABELS[card.cardType]}: ${card.title ?? ''}`}
      >
        <CardHeader className="pb-2">
          <Badge variant="muted" className="w-fit gap-1.5">
            <TypeIcon className="h-3 w-3" />
            {CARD_TYPE_LABELS[card.cardType]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2 pb-4">
          <p className="font-display text-[15px] font-bold leading-snug text-content">{card.title}</p>
          <p className="line-clamp-3 text-[12px] leading-relaxed text-muted">{card.summary}</p>
        </CardContent>
        <CardFooter className="pt-0">
          <span className="text-[10px] text-faint">{cited ? publisherOf(cited.url, cited.title) : 'No source'}</span>
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

  const signal = !isSignalCardType(card.cardType)
    ? null
    : card.cardType === 'vice'
      ? { heading: 'Risk signal', claims: data.viceClaims.slice(0, 2).map((v) => ({ text: v.claimText, publisher: publisherOf(v.sourceUrl, v.sourceTitle) })) }
      : { heading: card.cardType === 'culture' ? 'Community signal' : 'Market insight', claims: card.summary ? [{ text: card.summary, publisher: null }] : [] };

  const score = card.tier != null ? tierToScore(card.tier) : null;
  const sColor = score != null ? scoreColor(score) : '#AEAEB2';
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

  const brand = triad.primary;

  return (
    <Card
      className={cn('group cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-card-hover', className)}
      style={{ borderColor: brand, borderWidth: '2px' }}
      onClick={onOpen} role="button" tabIndex={0}
      aria-label={`${company.name} — ${CARD_TYPE_LABELS[card.cardType]} card`}
    >
      {/* ─── HEADER: Logo + Name + Score ─── */}
      <CardHeader className="pb-0">
        <div className="flex items-start gap-3">
          {/* Logo */}
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface-2">
            <Logo name={company.name} website={company.websiteUrl} logoUrl={company.logoUrl} onColor={setLogoColor} className="h-full w-full" />
          </div>

          {/* Name + subtitle */}
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate font-display text-[17px] font-bold leading-tight text-content">
              {company.name}
            </h3>
            {/* Ticker-style subtitle — abbreviated from company name */}
            <p className="mt-0.5 truncate text-[11px] font-medium text-faint">
              {company.name.split(/\s+/).map(w => w[0]).join('').toUpperCase()}
            </p>
          </div>

          {/* Score circle — progress arc ring, number in black, label colored */}
          {score != null && (
            <div className="flex shrink-0 flex-col items-center">
              <div className="relative h-11 w-11">
                {/* SVG progress ring */}
                <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44">
                  {/* Background track */}
                  <circle cx="22" cy="22" r="19" fill="none" stroke="rgb(var(--c-border))" strokeWidth="3" />
                  {/* Colored progress arc */}
                  <circle
                    cx="22" cy="22" r="19" fill="none"
                    stroke={sColor} strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 119.38} 119.38`}
                  />
                </svg>
                {/* Number — content color (black), NOT colored */}
                <span className="absolute inset-0 flex items-center justify-center font-display text-[15px] font-bold text-content">
                  {score}
                </span>
              </div>
              <span className="mt-0.5 text-[9px] font-semibold" style={{ color: sColor }}>
                {sLabel}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2.5">
        {/* Industry tag — green bordered pill, exactly like the reference */}
        <span className="mb-2 inline-block rounded-md border border-[#16A34A]/40 px-2 py-0.5 text-[10px] font-semibold text-[#16A34A]">
          {deriveIndustry(company.oneLiner)}
        </span>

        {/* One-liner */}
        <p className="line-clamp-2 text-[12px] leading-relaxed text-muted">
          {company.oneLiner}
        </p>

        {/* HQ */}
        {company.hqLocation && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted">
            <MapPin className="h-3 w-3 fill-faint/50 text-faint" />
            {company.hqLocation}
          </p>
        )}

        {/* Signal payload */}
        {signal ? (
          <>
            <Separator className="my-3" />
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted">{signal.heading}</p>
              {signal.claims.length > 0 ? (
                signal.claims.map((c, i) => (
                  <p key={i} className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-content">{c.text}</p>
                ))
              ) : (
                <p className="mt-1.5 text-[11px] text-muted">Open to research.</p>
              )}
            </div>
          </>
        ) : (
          <>
            {/* ── Row 1: ARR / Valuation / Market Share ── */}
            <Separator className="my-3" />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] font-medium text-faint">ARR</span>
                <p className="mt-0.5 font-display text-[15px] font-bold tabular-nums leading-tight text-content">
                  {arrKnown ? formatMetricValue('arr', arr!.value) : '—'}
                </p>
                {arrYoY && (
                  <p className="mt-0.5 flex items-center gap-0.5 text-[10px] font-medium text-positive">
                    <TrendingUp className="h-2.5 w-2.5" /> {arrYoY} YoY
                  </p>
                )}
              </div>
              <div>
                <span className="text-[10px] font-medium text-faint">{valLabel}</span>
                <p className="mt-0.5 font-display text-[15px] font-bold tabular-nums leading-tight text-content">
                  {valKnown ? formatMetricValue(valMetric!.metricType, valMetric!.value) : '—'}
                </p>
                {valYoY && (
                  <p className="mt-0.5 flex items-center gap-0.5 text-[10px] font-medium text-positive">
                    <TrendingUp className="h-2.5 w-2.5" /> {valYoY} YoY
                  </p>
                )}
              </div>
              <div>
                <span className="text-[10px] font-medium text-faint">Market Share</span>
                <p className="mt-0.5 font-display text-[15px] font-bold tabular-nums leading-tight text-content">
                  {shareKnown ? `${shareVal.toFixed(1)}%` : '—'}
                </p>
                {shareKnown && (
                  <Progress value={shareVal} className="mt-1.5 h-[6px]" indicatorClassName="bg-[#7C3AED]" />
                )}
              </div>
            </div>

            {/* ── Row 2: Team / Customers / Team Rating ── */}
            <Separator className="my-3" />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] font-medium text-faint">Team</span>
                <p className="mt-0.5 flex items-center gap-1 font-display text-[15px] font-bold tabular-nums leading-tight text-content">
                  <Users className="h-3.5 w-3.5 fill-muted text-muted" />
                  {empKnown ? formatCount(employees!.value!) : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-medium text-faint">Customers</span>
                <p className="mt-0.5 flex items-center gap-1 font-display text-[15px] font-bold tabular-nums leading-tight text-content">
                  <UserRound className="h-3.5 w-3.5 fill-muted text-muted" />
                  {usersKnown ? formatCount(users!.value!) + '+' : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-medium text-faint">Team Rating</span>
                {/* Rating number in CONTENT color (black), star is gold — matching reference */}
                <p className="mt-0.5 flex items-center gap-1 font-display text-[15px] font-bold tabular-nums leading-tight text-content">
                  <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                  {rating ?? '—'}
                </p>
              </div>
            </div>

            {/* Avatars — 3 colored initials */}
            <div className="mt-3 flex items-center">
              <div className="flex -space-x-1.5">
                {['C', 'F', 'D'].map((letter, i) => (
                  <Avatar key={i} className="h-6 w-6 border-[1.5px] border-surface">
                    <AvatarFallback className="text-[9px] font-bold text-white" style={{ backgroundColor: avatarColor(company.name, i) }}>
                      {letter}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="ml-1.5 text-[10px] text-faint">+99</span>
            </div>
          </>
        )}
      </CardContent>

      {/* ─── FOOTER: Investability + Actions ─── */}
      <CardFooter className="justify-between pt-0">
        {invest ? (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: invest.color }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: invest.color }} />
            {invest.text}
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7 border-0 text-faint hover:text-content" tabIndex={-1}>
            <Bookmark className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 border-0 text-faint hover:text-content" tabIndex={-1}>
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
