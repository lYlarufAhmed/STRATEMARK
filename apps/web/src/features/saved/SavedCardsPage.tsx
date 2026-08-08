import { BookmarkSimple } from '@phosphor-icons/react';
import { EmptyState } from '@/components/states/EmptyState';

export default function SavedCardsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 font-display text-[28px] font-bold tracking-tight text-content">
        Saved Cards
      </h1>
      <EmptyState
        title="No saved cards yet"
        description="Bookmark company cards from any deck to save them here for quick access."
        icon={<BookmarkSimple weight="duotone" size={24} />}
      />
    </div>
  );
}
