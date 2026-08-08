import { useState } from 'react';
import { Check } from 'lucide-react';
import type { CardWithCompany } from '@mi/contracts';
import { cn } from '@/lib/cn';
import { GameCard } from '@/features/card/GameCard';
import { CardReader } from '@/features/card/CardReader';

/**
 * A responsive grid of game cards.
 *
 * Two modes:
 *  · browse (default) — clicking a card opens the CardReader.
 *  · select — clicking toggles selection (ring + check badge). Used by the
 *    deck-level "compare" flow: pick companies, then ask a grounded question
 *    about exactly those cards.
 */
export function CardGrid({
  cards,
  deckUserValues,
  marketId,
  selectable = false,
  selected,
  onToggle,
}: {
  cards: CardWithCompany[];
  deckUserValues: number[];
  /** Lets the reader hand the dashboard a real way back to this deck. */
  marketId?: string;
  selectable?: boolean;
  selected?: Set<string>;
  onToggle?: (cardId: string) => void;
}) {
  const [active, setActive] = useState<CardWithCompany | null>(null);
  return (
    <>
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]"
        data-testid="card-grid"
      >
        {cards.map((c) => {
          const isSelected = selectable && (selected?.has(c.card.id) ?? false);
          return (
            <div key={c.card.id} className={cn('relative', selectable && 'cursor-pointer')}>
              <GameCard
                data={c}
                onOpen={() => (selectable ? onToggle?.(c.card.id) : setActive(c))}
                className={cn(
                  selectable && 'transition-opacity',
                  selectable && !isSelected && 'opacity-80 hover:opacity-100',
                  isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-app',
                )}
              />
              {isSelected && (
                <span className="pointer-events-none absolute -right-2 -top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-primary text-white shadow">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          );
        })}
      </div>
      <CardReader
        data={active}
        open={active !== null}
        onOpenChange={(o) => {
          if (!o) setActive(null);
        }}
        deckUserValues={deckUserValues}
        marketId={marketId}
      />
    </>
  );
}
