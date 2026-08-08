import { describe, expect, it } from 'vitest';
import { parseRepoSnapshot } from './schemas';

describe('parseRepoSnapshot tolerant JSON parser', () => {
  it('parses a valid complete snapshot', () => {
    const raw = {
      markets: [
        {
          id: 'm1',
          name: 'AI Startups',
          scopeDefinition: { vertical: 'AI', geography: 'Global', notes: null },
          refreshCadence: 'weekly',
          createdAt: '2026-08-01T00:00:00Z',
        },
      ],
      decks: [
        {
          id: 'd1',
          marketId: 'm1',
          createdAt: '2026-08-01T00:00:00Z',
          lastRefreshedAt: '2026-08-01T00:00:00Z',
        },
      ],
      companies: [
        {
          id: 'c1',
          name: 'Acme AI',
          oneLiner: 'AI code assistant',
          logoUrl: null,
          hqLocation: 'SF',
          websiteUrl: 'https://acme.ai',
          brandTheme: null,
        },
      ],
    };

    const result = parseRepoSnapshot(raw);
    expect(result.snapshot.markets).toHaveLength(1);
    expect(result.snapshot.decks).toHaveLength(1);
    expect(result.snapshot.companies).toHaveLength(1);
    expect(result.totalItems).toBe(3);
    expect(result.validItems).toBe(3);
    expect(result.skippedItems).toBe(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('skips invalid items tolerantly and reports warnings', () => {
    const raw = {
      markets: [
        {
          id: 'm1',
          name: 'Valid Market',
          scopeDefinition: { vertical: 'SaaS', geography: null, notes: null },
          refreshCadence: 'weekly',
          createdAt: '2026-08-01T00:00:00Z',
        },
        {
          id: 'm2', // missing name and required scopeDefinition
        },
      ],
      cards: [
        {
          invalidCard: true,
        },
      ],
    };

    const result = parseRepoSnapshot(raw);
    expect(result.snapshot.markets).toHaveLength(1);
    expect(result.snapshot.cards).toHaveLength(0);
    expect(result.totalItems).toBe(3);
    expect(result.validItems).toBe(1);
    expect(result.skippedItems).toBe(2);
    expect(result.warnings).toContain("Skipped 1 invalid item(s) in 'markets'.");
    expect(result.warnings).toContain("Skipped 1 invalid item(s) in 'cards'.");
  });

  it('handles non-object input gracefully', () => {
    const result = parseRepoSnapshot(null);
    expect(result.totalItems).toBe(0);
    expect(result.skippedItems).toBe(0);
    expect(result.warnings).toContain('Invalid JSON snapshot format: root must be an object.');
  });
});
