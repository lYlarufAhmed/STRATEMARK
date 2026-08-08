import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { buildDataset } from '@mi/mocks';
import { renderWithProviders } from '@/test/test-utils';
import { GameCard } from './GameCard';

const data = buildDataset();
const companyCard = data.cards.find(
  (c) => c.cardType === 'company' && c.companyId === 'cmp_gracewear-global',
)!;
const viceCard = data.cards.find((c) => c.cardType === 'vice')!;
const barrierCard = data.cards.find((c) => c.cardType === 'barrier')!;

function hydrate(cardId: string) {
  const card = data.cards.find((c) => c.id === cardId)!;
  const company = card.companyId ? data.companies.find((c) => c.id === card.companyId)! : null;
  const metrics = card.companyId ? data.metrics.filter((m) => m.companyId === card.companyId) : [];
  const viceClaims = data.viceClaims.filter((v) => v.cardId === card.id);
  return { card, company, metrics, viceClaims };
}

describe('GameCard', () => {
  it('renders the required face fields (spec §7) for a company card', () => {
    const cwc = hydrate(companyCard.id);
    renderWithProviders(<GameCard data={cwc} />);
    expect(screen.getAllByText('GraceWear Global').length).toBeGreaterThan(0);
    expect(screen.getByText(cwc.company!.oneLiner)).toBeInTheDocument();
    expect(screen.getByText('ARR')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    // Compact tier badge present (this is a Titan → T8; full label lives in the tooltip).
    // Tier 8 = score 95 + "The Titans" label
    expect(screen.getByText('95')).toBeInTheDocument();
    // HQ shown.
    expect(screen.getByText(/Los Angeles/)).toBeInTheDocument();
  });

  it('fires onOpen when clicked', async () => {
    const onOpen = vi.fn();
    const { user } = renderWithProviders(<GameCard data={hydrate(companyCard.id)} onOpen={onOpen} />);
    await user.click(screen.getByRole('button', { name: /GraceWear Global/ }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('shows a sourced-risk indicator on a Vice card', () => {
    renderWithProviders(<GameCard data={hydrate(viceCard.id)} />);
    expect(screen.getByText(/risk signal/i)).toBeInTheDocument();
  });

  it('renders a non-company Barrier card with its title, no metrics', () => {
    const cwc = hydrate(barrierCard.id);
    renderWithProviders(<GameCard data={cwc} />);
    expect(screen.getByText(cwc.card.title!)).toBeInTheDocument();
    expect(screen.queryByText('ARR')).not.toBeInTheDocument();
  });
});
