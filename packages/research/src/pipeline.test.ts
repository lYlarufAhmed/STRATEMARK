import { describe, expect, it, vi } from 'vitest';
import type { ZodType } from 'zod';
import type { LlmClient } from './types';
import { runDeckResearch } from './pipeline';
import { GeminiRepository, type ResearchStore, type RepoSnapshot } from './repository';

/**
 * A fake LLM that returns canned grounded text + citations and canned structured
 * objects (validated through the real Zod schema the pipeline passes in). Lets us
 * verify the entire orchestration — discovery, enrichment, citation threading,
 * CMS scoring, vice-claim sourcing, barrier cards — with zero network.
 */
function fakeClient(): LlmClient {
  const citations = [
    { title: 'techcrunch.com', url: 'https://tc.example/a' },
    { title: 'sec.gov', url: 'https://sec.example/b' },
    { title: 'reddit.com', url: 'https://reddit.com/r/testing/comments/arr' },
  ];
  return {
    ground: vi.fn(async (prompt: string) => ({ text: prompt, citations, queries: ['q'] })),
    structure: (async (prompt: string, schema: ZodType<unknown>) => {
      let obj: unknown;
      if (prompt.includes('market definition')) {
        obj = {
          marketName: 'Test Market',
          vertical: 'Testing',
          geography: 'CA',
          notes: null,
          searchThemes: ['a', 'b'],
        };
      } else if (prompt.includes('"companies"')) {
        const fallback = prompt.includes('Fallback search angle');
        obj = {
          companies: fallback
            ? Array.from({ length: 7 }, (_, i) => ({
                name: `Fallback Company ${i + 1}`,
                domain: `fallback-${i + 1}.com`,
                descriptor: 'additional company',
                cardTypes: ['company'],
              }))
            : [
                {
                  name: 'Alpha Inc',
                  domain: 'alpha.com',
                  descriptor: 'big co',
                  cardTypes: ['company'],
                },
                {
                  name: 'Beta LLC',
                  domain: 'beta.com',
                  descriptor: 'risky co',
                  cardTypes: ['company', 'vice'],
                },
                // The audit's defect, reproduced in shape: discovery hands back a
                // TOPIC dressed as a company, tagged only as a signal.
                {
                  name: 'Alpha Inc / Safety / Governance Controversy Entity',
                  domain: null,
                  descriptor: 'governance concerns',
                  cardTypes: ['vice'],
                },
                // A REAL business whose newsworthy angle is a controversy. Live data
                // produced exactly this (Civitai): signal-only tag, real domain.
                {
                  name: 'Gamma Media',
                  domain: 'gamma.com',
                  descriptor: 'contested platform',
                  cardTypes: ['vice'],
                },
              ],
        };
      } else if (prompt.includes('Convert the research notes on "Alpha Inc"')) {
        obj = {
          oneLiner: 'Alpha does things',
          hqLocation: 'SF, CA',
          website: 'https://alpha.com',
          brand: { primary: '#111', secondary: '#222', accent: '#333' },
          metrics: {
            market_cap: {
              value: 120_000_000_000,
              confidence: 'verified',
              sourceIndex: 1,
              method: null,
            },
            arr: {
              value: 8_000_000_000,
              confidence: 'verified',
              sourceIndex: 2,
              method: null,
              sourceDate: '2026-07-01',
              alternatives: [
                {
                  value: 6_000_000_000,
                  confidence: 'verified',
                  sourceIndex: 1,
                  method: null,
                  sourceDate: '2026-06-01',
                },
              ],
            },
            employees: { value: 60_000, confidence: 'verified', sourceIndex: 0, method: null },
            users: {
              value: 40_000_000,
              confidence: 'estimated',
              sourceIndex: 0,
              method: 'app installs',
            },
            market_share: { value: 45, confidence: 'verified', sourceIndex: 0, method: null },
          },
          viceClaims: [],
          cultureNote: null,
        };
      } else if (prompt.includes('Convert the research notes on "Gamma Media"')) {
        obj = {
          oneLiner: 'Gamma hosts user models',
          hqLocation: 'Austin, TX',
          website: 'https://gamma.com',
          brand: null,
          metrics: {
            valuation: {
              value: 40_000_000,
              confidence: 'estimated',
              sourceIndex: 0,
              method: 'press reports',
            },
            employees: { value: 30, confidence: 'verified', sourceIndex: 0, method: null },
          },
          viceClaims: [{ text: 'Named in a 2026 copyright suit', sourceIndex: 0 }],
          cultureNote: null,
        };
      } else if (prompt.includes('Convert the research notes on "Beta LLC"')) {
        obj = {
          oneLiner: 'Beta does risky things',
          hqLocation: 'LA, CA',
          website: 'https://beta.com',
          brand: null,
          metrics: {
            valuation: {
              value: 8_000_000,
              confidence: 'estimated',
              sourceIndex: 0,
              method: 'seed round',
            },
            arr: { value: 400_000, confidence: 'estimated', sourceIndex: 0, method: 'proxy' },
            employees: { value: 12, confidence: 'verified', sourceIndex: 0, method: null },
            users: { value: 1_000, confidence: 'estimated', sourceIndex: 0, method: 'followers' },
          },
          viceClaims: [
            { text: 'Sued in 2025', sourceIndex: 0 },
            { text: 'Unsourced rumor', sourceIndex: null }, // must be dropped
          ],
          cultureNote: null,
        };
      } else if (prompt.includes('"barriers"')) {
        obj = {
          barriers: [
            { title: 'Capital intensity', summary: 'Expensive to enter.', sourceIndex: 0 },
          ],
          insights: [
            {
              title: 'Margins are shifting',
              summary: 'Compute costs falling fast.',
              sourceIndex: 1,
            },
          ],
        };
      } else if (prompt.includes('"markdown"')) {
        obj = { markdown: '# Overview\n\n## What they do\nStuff.\n\n## Why it matters\nReasons.' };
      } else if (prompt.includes('"verdict"')) {
        obj = { verdict: 'supported', rationale: 'Multiple filings state this figure.' };
      } else if (prompt.includes('nudge')) {
        obj = { nudge: 0, reason: null };
      } else {
        obj = {};
      }
      return schema.parse(obj);
    }) as LlmClient['structure'],
  };
}

describe('runDeckResearch (full orchestration, fake LLM)', () => {
  it('produces company, vice, and barrier cards with grounded sources', async () => {
    const events: string[] = [];
    const result = await runDeckResearch({ prompt: 'test market', region: 'CA' }, fakeClient(), {
      apiKey: '',
      onEvent: (e) => events.push(e.type),
    });

    expect(result.market.name).toBe('Test Market');
    // Alpha, Beta, and Gamma Media (promoted from a signal-only tag because it
    // has a real domain). The pseudo-entity with no domain is not among them.
    const companyCards = result.cards.filter((c) => c.card.cardType === 'company');
    expect(companyCards).toHaveLength(10);

    // Alpha should score as a top-tier titan; Beta near the bottom.
    const alpha = companyCards.find((c) => c.company?.name === 'Alpha Inc')!;
    const beta = companyCards.find((c) => c.company?.name === 'Beta LLC')!;
    expect(alpha.card.tier).toBeGreaterThanOrEqual(7);
    expect(beta.card.tier).toBeLessThanOrEqual(3);

    // Metrics carry citation URLs from grounding.
    const cap = alpha.metrics.find((m) => m.metricType === 'market_cap');
    expect(cap?.source).toBe('https://sec.example/b');
    const arr = alpha.metrics.find((m) => m.metricType === 'arr');
    expect(arr?.value).toBe(6_000_000_000);
    expect(arr?.confidence).toBe('verified');
    expect(arr?.source).toBe('https://sec.example/b');
    expect(arr?.methodNote).toMatch(/conflicting sourced value/i);

    // Logos resolved from the domain.
    expect(alpha.company?.logoUrl).toContain('faviconV2');

    // Vice card: sourced claim kept, unsourced claim dropped.
    const vice = result.cards.find((c) => c.card.cardType === 'vice')!;
    expect(vice.viceClaims).toHaveLength(1);
    expect(vice.viceClaims[0]!.sourceUrl).toBe('https://tc.example/a');

    // Barrier card is company-agnostic.
    const barrier = result.cards.find((c) => c.card.cardType === 'barrier')!;
    expect(barrier.company).toBeNull();
    expect(barrier.card.title).toBe('Capital intensity');

    // Insight card rides along on the same market-level pass, with its source.
    const insight = result.cards.find((c) => c.card.cardType === 'insight')!;
    expect(insight.company).toBeNull();
    expect(insight.card.citations[0]?.url).toBe('https://sec.example/b');
    expect(barrier.card.citations[0]?.url).toBe('https://tc.example/a');

    expect(events).toContain('market');
    expect(events).toContain('done');
  });

  it('refuses to mint a company from a topic, and warns instead of failing silently', async () => {
    const warnings: string[] = [];
    const result = await runDeckResearch({ prompt: 'test market', region: 'CA' }, fakeClient(), {
      apiKey: '',
      onEvent: (e) => {
        if (e.type === 'warning') warnings.push(e.message);
      },
    });

    // Audit Finding 1.2: this pseudo-entity used to become a card AND inherit a
    // real company's valuation/ARR/users as unsourced "verified" figures.
    const names = result.cards.map((c) => c.company?.name ?? c.card.title ?? '');
    expect(names.some((n) => /Controversy Entity/.test(n))).toBe(false);
    expect(warnings.join(' ')).toMatch(/topic rather than a company/i);
    expect(warnings.join(' ')).toMatch(/Controversy Entity/);
  });

  it('keeps a real business that discovery tagged only as a controversy', async () => {
    // "Controversial" and "not a company" are different things. A resolvable
    // domain is evidence of an operating entity, so a signal-only tag on one is
    // a mis-tag to correct, not a topic to discard. The first version of the
    // entity rule conflated them and threw away a real company.
    const result = await runDeckResearch({ prompt: 'test market', region: 'CA' }, fakeClient(), {
      apiKey: '',
    });
    const gammaCards = result.cards.filter((c) => c.company?.name === 'Gamma Media');
    expect(gammaCards.map((c) => c.card.cardType).sort()).toEqual(['company', 'vice']);
    // Promotion must not smuggle figures onto the signal facet.
    expect(gammaCards.find((c) => c.card.cardType === 'vice')!.metrics).toEqual([]);
    // The company card is scored even though discovery never said "company".
    expect(gammaCards.find((c) => c.card.cardType === 'company')!.card.tier).not.toBeNull();
  });

  it('mints one entity card per company, never one per role', async () => {
    // Discovery legitimately reports several roles for one business. Emitting a
    // card each printed the same four figures under three headings and padded a
    // 17-card deck to 47 on live data.
    const result = await runDeckResearch({ prompt: 'test market', region: 'CA' }, fakeClient(), {
      apiKey: '',
    });
    for (const name of ['Alpha Inc', 'Beta LLC', 'Gamma Media']) {
      const entityCards = result.cards.filter(
        (c) => c.company?.name === name && c.metrics.length > 0,
      );
      expect(entityCards).toHaveLength(1);
    }
  });

  it('does not mint a signal card that has no signal', async () => {
    // Alpha has neither a sourced controversy nor a culture note, so it must not
    // get an empty Vice or Culture card. On a live run every one of the ten
    // companies was tagged culture or vice and every such card came back blank.
    const result = await runDeckResearch({ prompt: 'test market', region: 'CA' }, fakeClient(), {
      apiKey: '',
    });
    const alpha = result.cards.filter((c) => c.company?.name === 'Alpha Inc');
    expect(alpha.map((c) => c.card.cardType)).toEqual(['company']);
    // And no signal card anywhere in the deck is empty.
    for (const c of result.cards) {
      if (c.card.cardType === 'vice') expect(c.viceClaims.length).toBeGreaterThan(0);
      if (c.card.cardType === 'culture') expect((c.card.summary ?? '').length).toBeGreaterThan(0);
    }
  });

  it('never lends a company figure to a signal card', async () => {
    const result = await runDeckResearch({ prompt: 'test market', region: 'CA' }, fakeClient(), {
      apiKey: '',
    });

    // Beta LLC is legitimately both a company and a vice facet. The company
    // card owns the numbers; the vice card owns the sourced claim. If both
    // carried metrics, one figure would appear twice under two provenance
    // stories — which is how a wrong number becomes credible.
    const betaCompany = result.cards.find(
      (c) => c.card.cardType === 'company' && c.company?.name === 'Beta LLC',
    )!;
    const betaVice = result.cards.find((c) => c.card.cardType === 'vice')!;
    expect(betaCompany.metrics.length).toBeGreaterThan(0);
    expect(betaVice.metrics).toEqual([]);
    expect(betaVice.viceClaims.length).toBeGreaterThan(0);
  });
});

describe('GeminiRepository (fake client + in-memory store)', () => {
  function memStore(): ResearchStore {
    let s: RepoSnapshot | null = null;
    return { read: () => s, write: (snap) => (s = snap) };
  }

  it('persists a researched deck and serves its cards + lazy dashboard tabs', async () => {
    const store = memStore();
    const repo = new GeminiRepository({ apiKey: 'x', client: fakeClient(), store });

    const { market, deck } = await repo.createResearchedDeck({ prompt: 'test', region: 'CA' });
    expect((await repo.listMarkets())[0]!.id).toBe(market.id);

    const cards = await repo.listCards(deck.id);
    expect(cards.length).toBeGreaterThan(0);

    const company = cards.find((c) => c.company)!.company!;
    const overview = await repo.getDashboardTab(company.id, 'overview');
    // metrics tab is built locally from stored figures (no fabricated series).
    const metrics = await repo.getDashboardTab(company.id, 'metrics');
    expect(overview?.tab).toBe('overview');
    expect(metrics?.tab).toBe('metrics');

    // A fresh repo backed by the same store rehydrates the deck (persistence).
    const repo2 = new GeminiRepository({ apiKey: 'x', client: fakeClient(), store });
    expect((await repo2.listMarkets()).length).toBe(1);
  });

  it('fact-checks a claim with a grounded verdict + citations', async () => {
    const repo = new GeminiRepository({ apiKey: 'x', client: fakeClient(), store: memStore() });
    const result = await repo.factCheck({
      claim: 'Alpha Inc market cap is $120B',
      companyName: 'Alpha Inc',
    });
    expect(result.verdict).toBe('supported');
    expect(result.rationale).toContain('filings');
    expect(result.citations.length).toBeGreaterThan(0);
  });

  it('generates a deck report from stored evidence and persists it in the library', async () => {
    const store = memStore();
    const repo = new GeminiRepository({ apiKey: 'x', client: fakeClient(), store });
    const { deck } = await repo.createResearchedDeck({ prompt: 'test', region: 'CA' });
    const report = await repo.generateReport({ kind: 'deck', subjectId: deck.id });
    expect(report.title).toContain('Market Report');
    expect(report.citations.length).toBeGreaterThan(0);
    expect(await repo.listReports()).toHaveLength(1);
    expect((await repo.getReport(report.id))?.id).toBe(report.id);
    // Survives a restart (persisted through the store).
    const repo2 = new GeminiRepository({ apiKey: 'x', client: fakeClient(), store });
    expect(await repo2.listReports()).toHaveLength(1);
  });
});
