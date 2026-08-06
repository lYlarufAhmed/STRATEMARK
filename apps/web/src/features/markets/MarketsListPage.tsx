import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, PlusCircle } from 'lucide-react';
import { useMarkets } from '@/hooks/data';
import { QueryBoundary } from '@/components/states/QueryBoundary';
import { CardGridSkeleton } from '@/components/states/Skeleton';
import { EmptyState } from '@/components/states/EmptyState';

export default function MarketsListPage() {
  const markets = useMarkets();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-content">Your decks</h1>
          <p className="mt-1 text-sm text-muted">
            Each deck is a market researched into competitive-intelligence cards.
          </p>
        </div>
        <Link to="/" className="btn-primary">
          <PlusCircle className="h-4 w-4" />
          New deck
        </Link>
      </div>

      <QueryBoundary
        query={markets}
        loading={<CardGridSkeleton count={3} />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            title="No decks yet"
            description="Describe a market in plain language and we'll research it into a deck of cards."
            action={
              <Link to="/" className="btn-primary mt-2">
                <PlusCircle className="h-4 w-4" />
                Create your first deck
              </Link>
            }
          />
        }
      >
        {(list) => (
          <ul className="grid gap-4 sm:grid-cols-2">
            {list.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/markets/${m.id}/deck`)}
                  className="panel group w-full cursor-pointer p-5 text-left transition-colors hover:border-primary/50 hover:bg-surface-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-lg font-semibold text-content">{m.name}</h2>
                    <ArrowRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-content" />
                  </div>
                  <p className="mt-1 text-sm text-muted">{m.scopeDefinition.vertical}</p>
                  {m.scopeDefinition.geography && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
                      <MapPin className="h-3 w-3" />
                      {m.scopeDefinition.geography}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>
    </div>
  );
}
