import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { buildDataset } from '@mi/mocks';
import { renderWithProviders } from '@/test/test-utils';
import { CardReader } from './CardReader';

const data = buildDataset();

function hydrate(predicate: (c: (typeof data.cards)[number]) => boolean) {
  const card = data.cards.find(predicate)!;
  const company = card.companyId ? data.companies.find((c) => c.id === card.companyId)! : null;
  const metrics = card.companyId ? data.metrics.filter((m) => m.companyId === card.companyId) : [];
  const viceClaims = data.viceClaims.filter((v) => v.cardId === card.id);
  return { card, company, metrics, viceClaims };
}

const userValues = data.cards
  .filter((c) => c.cardType === 'company')
  .flatMap((c) => data.metrics.filter((m) => m.companyId === c.companyId))
  .filter((m) => m.metricType === 'users' && m.value !== null)
  .map((m) => m.value as number);

describe('CardReader', () => {
  it('shows the auditable CMS breakdown and an open-dashboard action for a company card', () => {
    const cwc = hydrate((c) => c.cardType === 'company' && c.companyId === 'cmp_holy-hype');
    renderWithProviders(
      <CardReader data={cwc} open onOpenChange={() => {}} deckUserValues={userValues} />,
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Company Maturity Score')).toBeInTheDocument();
    // Holy Hype has a +1 nudge with a reason — it must be surfaced.
    expect(within(dialog).getByText(/compounding/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /view more/i })).toBeInTheDocument();
  });

  it('shows sourced vice claims with citations', () => {
    const cwc = hydrate((c) => c.cardType === 'vice');
    renderWithProviders(
      <CardReader data={cwc} open onOpenChange={() => {}} deckUserValues={userValues} />,
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/risk & controversy/i)).toBeInTheDocument();
    // Every claim renders a Source link.
    // The link now NAMES the publisher (or admits "Publisher not recorded")
    // instead of a generic "Source" label — the provenance rule for vice claims.
    const sources = within(dialog)
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href')?.startsWith('http'));
    expect(sources.length).toBeGreaterThan(0);
    expect(sources[0]).toHaveAttribute('href');
  });

  it('shows how-we-got-this notes for estimated metrics', () => {
    const cwc = hydrate((c) => c.cardType === 'company' && c.companyId === 'cmp_grace-threads');
    renderWithProviders(
      <CardReader data={cwc} open onOpenChange={() => {}} deckUserValues={userValues} />,
    );
    expect(screen.getAllByText(/how we got this/i).length).toBeGreaterThan(0);
  });
});
