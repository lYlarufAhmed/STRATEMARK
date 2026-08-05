import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

const inMemoryDb = new Map<string, any>();

vi.mock('@google-cloud/firestore', () => {
  class MockFirestore {
    doc(docPath: string) {
      return {
        get: async () => ({
          exists: inMemoryDb.has(docPath),
          data: () => inMemoryDb.get(docPath),
        }),
        set: async (data: any, options?: any) => {
          if (options?.merge && inMemoryDb.has(docPath)) {
            inMemoryDb.set(docPath, { ...inMemoryDb.get(docPath), ...data });
          } else {
            inMemoryDb.set(docPath, data);
          }
        },
        update: async (data: any) => {
          const current = inMemoryDb.get(docPath) || {};
          inMemoryDb.set(docPath, { ...current, ...data });
        },
        delete: async () => {
          inMemoryDb.delete(docPath);
        },
      };
    }
    collection(colPath: string) {
      const getDocs = () => {
        const matching: Array<{ id: string; ref: any; data: () => any }> = [];
        for (const [path, data] of inMemoryDb.entries()) {
          const parent = path.substring(0, path.lastIndexOf('/'));
          const id = path.substring(path.lastIndexOf('/') + 1);
          if (parent === colPath) {
            matching.push({
              id,
              ref: this.doc(path),
              data: () => data,
            });
          }
        }
        return matching;
      };

      const queryObj: any = {
        where: () => queryObj,
        orderBy: () => queryObj,
        limit: () => queryObj,
        get: async () => {
          const docs = getDocs();
          return { empty: docs.length === 0, docs };
        },
      };

      return {
        ...queryObj,
        doc: (docId: string) => this.doc(`${colPath}/${docId}`),
      };
    }
  }

  return {
    Firestore: MockFirestore,
  };
});

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn().mockReturnValue([{}]),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn().mockReturnValue({
    verifyIdToken: vi.fn().mockImplementation(async (token: string) => {
      if (token === 'invalid_token') {
        throw new Error('Invalid token');
      }
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
          if (payload.uid) return { uid: payload.uid, email: payload.email };
        }
      } catch {}
      return { uid: token, email: `${token}@stratemark.ai` };
    }),
  }),
}));

vi.mock('@mi/research', () => ({
  createGeminiClient: vi.fn().mockReturnValue({}),
  runDeckResearch: vi.fn().mockImplementation(async (input, _client, options) => {
    if (options?.onEvent) {
      options.onEvent({
        type: 'card',
        card: { company: { id: 'comp_disc_1', name: 'Discovered Corp', edgarCik: '000999888' } },
      });
    }
    return {
      market: {
        id: 'mkt_1',
        name: 'Competitive Intel',
        scopeDefinition: { include: [], exclude: [], geography: input.region ?? 'Global' },
        refreshCadence: 'weekly',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      deck: {
        id: 'deck_1',
        marketId: 'mkt_1',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastRefreshedAt: null,
      },
      cards: [
        {
          card: {
            id: 'card_1',
            deckId: 'deck_1',
            cardType: 'company',
            title: 'Card 1',
            summary: 'Summary 1',
            confidence: 'sourced-primary',
            citations: [],
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          company: {
            id: 'comp_1',
            name: 'Target Corp',
            rootDomain: 'target.com',
            ticker: 'TGT',
            logoUrl: null,
            brandTheme: {
              primary: '#000',
              secondary: '#fff',
              accent: '#f00',
              text: '#000',
              background: '#fff',
              fontFamily: null,
              source: 'default',
            },
            discoveredAt: '2026-01-01T00:00:00.000Z',
          },
          metrics: [
            {
              id: 'metric_1',
              companyId: 'comp_1',
              metricName: 'ARR',
              value: '$10M',
              period: '2025',
              confidence: 'sourced-primary',
              citations: [],
            },
          ],
          viceClaims: [
            {
              id: 'vc_1',
              cardId: 'card_1',
              claimText: 'High concentration risk',
              sourceUrl: 'https://example.com',
              sourceTitle: 'Filing',
              capturedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      ],
    };
  }),
}));

vi.mock('./scrapers/index.js', () => ({
  scrapeAllSources: vi.fn().mockResolvedValue([]),
  scrapeCompany: vi.fn().mockResolvedValue([]),
}));

vi.mock('./classify/index.js', () => ({
  classifyChanges: vi.fn().mockResolvedValue([]),
}));

import { app } from './index.js';
import {
  getUserMarket,
  getUserDeck,
  getUserCard,
  getUserCompany,
  getUserMetric,
  getUserViceClaim,
} from './lib/firestore.js';

function makeToken(uid: string, email = `${uid}@stratemark.ai`): string {
  const payload = Buffer.from(JSON.stringify({ uid, email })).toString('base64url');
  return `header.${payload}.signature`;
}

describe('Sentinel API Authentication & Persistence', () => {
  beforeEach(() => {
    inMemoryDb.clear();
    process.env.GEMINI_API_KEY = 'mock-gemini-key';
  });

  describe('Authorization token enforcement', () => {
    it('returns 401 on /api/companies when Authorization header is missing', async () => {
      const res = await request(app).get('/api/companies');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('returns 401 on /api/alerts when Authorization header is missing', async () => {
      const res = await request(app).get('/api/alerts');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('returns 401 on /api/research/deck when Authorization header is missing', async () => {
      const res = await request(app).post('/api/research/deck').send({ prompt: 'test' });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('returns 401 on /api/checkout when Authorization header is missing', async () => {
      const res = await request(app).post('/api/checkout').send({ tier: 'pro' });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('returns 401 on /api/portal when Authorization header is missing', async () => {
      const res = await request(app).post('/api/portal').send({});
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('returns 401 on /api/scrape when Authorization header is missing', async () => {
      const res = await request(app).post('/api/scrape').send({});
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });
  });

  describe('Companies Endpoint & User Isolation', () => {
    it('creates and fetches companies using verified uid from Bearer token', async () => {
      const token = makeToken('usr_sentinel_1');

      const createRes = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Acme Corp', edgarCik: '0000012345' });

      expect(createRes.status).toBe(200);
      expect(createRes.body.company.userId).toBe('usr_sentinel_1');
      expect(createRes.body.company.name).toBe('Acme Corp');

      const getRes = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.companies).toHaveLength(1);
      expect(getRes.body.companies[0].name).toBe('Acme Corp');
    });

    it('ignores caller-supplied userId in body and forces verified uid', async () => {
      const token = makeToken('verified_usr_100');

      const createRes = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 'spoofed_user_999', name: 'Spoof Test' });

      expect(createRes.status).toBe(200);
      expect(createRes.body.company.userId).toBe('verified_usr_100');
    });
  });

  describe('POST /api/research/deck Persistence', () => {
    it('persists market, deck, cards, companies, metrics, viceClaims to user isolated paths', async () => {
      const userId = 'usr_research_101';
      const token = makeToken(userId);

      const res = await request(app)
        .post('/api/research/deck')
        .set('Authorization', `Bearer ${token}`)
        .send({ prompt: 'Market research on AI startups', region: 'North America' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const savedMarket = await getUserMarket(userId, 'mkt_1');
      expect(savedMarket).toBeDefined();
      expect(savedMarket?.name).toBe('Competitive Intel');

      const savedDeck = await getUserDeck(userId, 'deck_1');
      expect(savedDeck).toBeDefined();
      expect(savedDeck?.marketId).toBe('mkt_1');

      const savedCard = await getUserCard(userId, 'card_1');
      expect(savedCard).toBeDefined();
      expect(savedCard?.title).toBe('Card 1');

      const savedCompany = await getUserCompany(userId, 'comp_1');
      expect(savedCompany).toBeDefined();
      expect(savedCompany?.name).toBe('Target Corp');

      const savedMetric = await getUserMetric(userId, 'metric_1');
      expect(savedMetric).toBeDefined();
      expect(savedMetric?.value).toBe('$10M');

      const savedVice = await getUserViceClaim(userId, 'vc_1');
      expect(savedVice).toBeDefined();
      expect(savedVice?.claimText).toBe('High concentration risk');
    });
  });
});
