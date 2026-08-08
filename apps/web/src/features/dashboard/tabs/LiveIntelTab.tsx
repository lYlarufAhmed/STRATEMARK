import { AlertCircle, ExternalLink, MessageSquare, Newspaper, Hash } from 'lucide-react';
import { publisherOf, type LiveIntelItem } from '@mi/contracts';
import { useCompany, useDashboardTab } from '@/hooks/data';
import { QueryBoundary } from '@/components/states/QueryBoundary';
import { LiveBadge } from '../LiveBadge';
import { DigDeeper } from '@/features/deepdive/DeepDive';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';

const SOURCE_ICON = { news: Newspaper, x: Hash, reddit: MessageSquare } as const;
const SENTIMENT_STYLE = {
  positive: 'text-positive',
  neutral: 'text-neutral',
  negative: 'text-negative',
} as const;

function IntelRow({ item, companyId, companyName }: { item: LiveIntelItem; companyId: string; companyName: string }) {
  const Icon = SOURCE_ICON[item.source];
  const hasUrl = /^https?:\/\//.test(item.url);
  return (
    <li className={cn('panel p-4', item.stale && 'opacity-60')}>
      <div className="flex items-center gap-2 text-xs text-muted">
        <Icon className="h-3.5 w-3.5" />
        <span className="uppercase">{item.source}</span>
        <span>·</span>
        <span>{formatRelative(item.publishedAt)}</span>
        <span className={cn('ml-auto font-semibold', SENTIMENT_STYLE[item.sentiment])}>
          {item.sentiment}
        </span>
      </div>
      {/* A dead anchor is worse than no anchor: the headline only links when a
          real URL exists, and the publisher is named so the reader can judge it. */}
      {hasUrl ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 block font-medium text-content hover:text-primary-ink"
        >
          {item.title}
        </a>
      ) : (
        <p className="mt-1.5 font-medium text-content">{item.title}</p>
      )}
      <p className="mt-1 text-sm text-muted">{item.summary}</p>
      <div className="mt-2 flex items-center gap-2">
        {hasUrl && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10.5px] text-muted hover:border-primary/50 hover:text-primary-ink"
          >
            <ExternalLink className="h-2.5 w-2.5" />
            {publisherOf(item.url, null)}
          </a>
        )}
        <DigDeeper
          topic={item.title}
          companyId={companyId}
          companyName={companyName}
          context={item.summary || null}
          label="Research this"
          className="ml-auto"
        />
      </div>
      {item.stale && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
          <AlertCircle className="h-3.5 w-3.5" />
          Flagged stale — pruned from the rest of the dashboard on next refresh.
        </p>
      )}
    </li>
  );
}

export function LiveIntelTab({ companyId }: { companyId: string }) {
  const query = useDashboardTab(companyId, 'live_intel');
  const companyName = useCompany(companyId).data?.name ?? 'this company';
  return (
    <QueryBoundary query={query} isEmpty={(r) => r.content.items.length === 0}>
      {(result) => (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted">
              News, X, and Reddit sentiment. Stale or contradicted items are flagged and pruned
              (spec §8).
            </p>
            <LiveBadge lastRefreshedAt={result.content.lastRefreshedAt} />
          </div>
          <ul className="space-y-3">
            {result.content.items.map((item) => (
              <IntelRow key={item.id} item={item} companyId={companyId} companyName={companyName} />
            ))}
          </ul>
        </div>
      )}
    </QueryBoundary>
  );
}
