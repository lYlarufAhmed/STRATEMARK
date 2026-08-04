import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Sparkles } from 'lucide-react';
import { DASHBOARD_TABS, DASHBOARD_TAB_LABELS, type DashboardTab } from '@mi/contracts';
import { useCompany, useReports, useRerunDashboardTab } from '@/hooks/data';
import { useRepository } from '@/lib/repository/RepositoryProvider';
import { qk } from '@/lib/query/keys';
import { ReportButton, ThreadHistoryButton } from '@/features/research/ResearchControls';
import { QueryBoundary } from '@/components/states/QueryBoundary';
import { ContextRerun } from '@/components/ui/ContextRerun';
import { cn } from '@/lib/cn';
import { formatRelative } from '@/lib/format';
import { useApiKey } from '@/lib/settings/apiKey';
import { Logo } from '@/features/card/Logo';
import { DigDeeper, useDeepDive } from '@/features/deepdive/DeepDive';
import { OverviewTab } from './tabs/OverviewTab';
import { LiveIntelTab } from './tabs/LiveIntelTab';
import { TeamOrgTab } from './tabs/TeamOrgTab';
import { LiveLandingTab } from './tabs/LiveLandingTab';
import { MetricsTab } from './tabs/MetricsTab';
import { MissionGovernanceTab } from './tabs/MissionGovernanceTab';
import { HistoryTab } from './tabs/HistoryTab';
import { ProductsRoadmapTab } from './tabs/ProductsRoadmapTab';
import NotFoundPage from '@/features/NotFoundPage';

/**
 * "You're already halfway there" — free-text grounded research from inside the
 * company's context. Opens the sourced deep-dive sheet with whatever you ask.
 */
function ResearchComposer({ companyId, companyName }: { companyId: string; companyName: string }) {
  const { chat } = useDeepDive();
  const [q, setQ] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const question = q.trim();
    if (!question) return;
    // A question here starts a CONVERSATION anchored to this company — the
    // answer arrives in the Dig sheet, follow-ups continue the same thread,
    // and the whole exchange lands in the company's research history.
    chat({ kind: 'company', deckId: null, companyId, subject: companyName }, { seed: question });
    setQ('');
  };
  return (
    <form onSubmit={submit} className="flex min-w-0 flex-1 items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
        <input
          className="input py-2 pl-8 text-[13px]"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Research anything about ${companyName} — grounded & sourced…`}
          aria-label={`Research anything about ${companyName}`}
        />
      </div>
      <button type="submit" className="btn-ghost shrink-0 px-3 py-2 text-xs" disabled={!q.trim()}>
        Dig
      </button>
    </form>
  );
}

/** The company's intel file: every report generated about it, attached here. */
function IntelFile({ companyId }: { companyId: string }) {
  const reports = useReports();
  const mine = (reports.data ?? []).filter((r) => r.kind === 'company' && r.subjectId === companyId);
  if (mine.length === 0) return null;
  return (
    <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-faint">
        Intel file
      </span>
      {mine.slice(0, 4).map((r) => (
        <Link
          key={r.id}
          to={`/reports/${r.id}`}
          className="chip shrink-0 border-border text-muted hover:border-primary/50 hover:text-content"
          title={r.title}
        >
          <FileText className="h-3 w-3" />
          <span className="max-w-[180px] truncate">{r.title.replace(/ — Company Report.*$/, '')}</span>
          <span className="text-faint">{formatRelative(r.createdAt)}</span>
        </Link>
      ))}
      {mine.length > 4 && (
        <Link to="/reports" className="shrink-0 text-[11px] text-primary-ink hover:underline">
          +{mine.length - 4} more
        </Link>
      )}
    </div>
  );
}

function TabView({ tab, companyId }: { tab: DashboardTab; companyId: string }) {
  switch (tab) {
    case 'overview':
      return <OverviewTab companyId={companyId} />;
    case 'live_intel':
      return <LiveIntelTab companyId={companyId} />;
    case 'team_org':
      return <TeamOrgTab companyId={companyId} />;
    case 'live_landing':
      return <LiveLandingTab companyId={companyId} />;
    case 'metrics':
      return <MetricsTab companyId={companyId} />;
    case 'mission_governance':
      return <MissionGovernanceTab companyId={companyId} />;
    case 'history':
      return <HistoryTab companyId={companyId} />;
    case 'products_roadmap':
      return <ProductsRoadmapTab companyId={companyId} />;
  }
}

export default function DashboardPage() {
  const { companyId, tab } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromMarketId = params.get('deck');
  const company = useCompany(companyId);
  const hasKey = useApiKey((s) => s.hasKey);
  const activeTab = tab as DashboardTab;
  const rerunTab = useRerunDashboardTab(companyId, activeTab);
  const repo = useRepository();
  const qc = useQueryClient();

  // Warm EVERY tab the moment the dashboard opens (founder's audit: "as I'm
  // reading the overview I want all the other tabs to start loading"). Runs
  // sequentially so the free-tier rate limiter never sees a burst; each tab is
  // cached in the snapshot, so revisits cost nothing.
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    void (async () => {
      for (const t of DASHBOARD_TABS) {
        if (cancelled) return;
        await qc
          .prefetchQuery({
            queryKey: qk.dashboard(companyId, t),
            queryFn: () => repo.getDashboardTab(companyId, t),
            staleTime: Infinity,
          })
          .catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, qc, repo]);

  if (!companyId || !DASHBOARD_TABS.includes(activeTab)) return <NotFoundPage />;

  return (
    <div className="mx-auto max-w-6xl">
      <button
        type="button"
        // A real route back to the deck (audit: the back button "doesn't
        // actually take you back to the deck"). History fallback only when the
        // dashboard was reached without deck context.
        onClick={() => (fromMarketId ? navigate(`/markets/${fromMarketId}`) : navigate(-1))}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-content"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to deck
      </button>

      <QueryBoundary query={company}>
        {(c) => (
          <>
            <header className="mb-5 flex items-center gap-4">
              <Logo name={c.name} website={c.websiteUrl} logoUrl={c.logoUrl} className="h-14 w-14 border border-border" />
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-2xl font-semibold text-content">{c.name}</h1>
                <p className="text-sm text-muted">{c.oneLiner}</p>
              </div>
              <ThreadHistoryButton companyId={c.id} className="shrink-0" />
              <ReportButton kind="company" subjectId={c.id} className="shrink-0" />
              <DigDeeper
                topic="Recent developments & what to watch"
                companyId={c.id}
                companyName={c.name}
                label="Dig deeper"
                className="h-8 w-8 shrink-0"
              />
            </header>

            {/* Context-aware research row: ask anything + this company's intel file. */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <ResearchComposer companyId={companyId} companyName={c.name} />
              <IntelFile companyId={companyId} />
            </div>

            {/* Locked 8-tab order (spec §8), deep-linkable routes. */}
            <nav
              className="mb-6 flex gap-1 overflow-x-auto border-b border-border pb-px"
              aria-label="Company dashboard tabs"
            >
              {DASHBOARD_TABS.map((t) => (
                <NavLink
                  key={t}
                  to={`/company/${companyId}/dashboard/${t}${fromMarketId ? `?deck=${fromMarketId}` : ''}`}
                  className={({ isActive }) =>
                    cn(
                      'whitespace-nowrap rounded-t-lg border-b-2 px-3.5 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-primary text-content'
                        : 'border-transparent text-muted hover:text-content',
                    )
                  }
                >
                  {DASHBOARD_TAB_LABELS[t]}
                </NavLink>
              ))}
            </nav>

            {/* Right-click any tab's content → rerun just that research. */}
            <ContextRerun
              label={`the ${DASHBOARD_TAB_LABELS[activeTab]} tab`}
              onRerun={() => rerunTab.mutate()}
              running={rerunTab.isPending}
              disabled={!hasKey}
            >
              <TabView tab={activeTab} companyId={companyId} />
            </ContextRerun>
          </>
        )}
      </QueryBoundary>
    </div>
  );
}
