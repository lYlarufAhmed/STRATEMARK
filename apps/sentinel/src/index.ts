import express from 'express';
import { runDeckResearch, createGeminiClient } from '@mi/research';
import { config } from './config.js';
import { scrapeAllSources, scrapeCompany } from './scrapers/index.js';
import { classifyChanges } from './classify/index.js';
import { enforceAlertsProvenance } from './provenance.js';
import {
  collections,
  getCompaniesForUser,
  saveAlert,
  markAlertDelivered,
  getUser,
  createUser,
  getAlertsForUser,
  setUserMarket,
  setUserDeck,
  setUserCard,
  setUserCompany,
  setUserMetric,
  setUserViceClaim,
  createCompany,
} from './lib/firestore.js';
import { sendBatchAlerts } from './lib/email.js';
import { createCheckoutSession, createPortalSession, getStripe, PLANS, type PlanTier } from './lib/stripe.js';
import { authenticateToken, type AuthRequest } from './middleware/auth.js';
import type { TrackedCompany, User } from './types.js';

const app: express.Express = express();
app.use(express.json());

export function parseAuthHeader(req: express.Request): { userId: string | null; error?: string } {
  const authHeader = req.headers.authorization;
  if (!authHeader) return { userId: null };
  if (!authHeader.startsWith('Bearer ') && authHeader !== 'Bearer') {
    return { userId: null, error: 'Invalid authorization header format' };
  }
  const token = authHeader.replace(/^Bearer\s*/, '').trim();
  if (!token) {
    return { userId: null, error: 'Empty token in authorization header' };
  }
  return { userId: token };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sentinel', timestamp: new Date().toISOString() });
});

// ── Auth: simple token-based login (email lookup) ───────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  const snap = await collections.users.where('email', '==', email).get();
  if (snap.empty) {
    const userId = `user-${Date.now()}`;
    const user: User = {
      id: userId,
      email,
      subscriptionTier: 'pro',
      subscriptionStatus: 'trialing',
      stripeCustomerId: null,
      createdAt: new Date().toISOString(),
    };
    await createUser(user);
    return res.json({ user });
  }
  res.json({ user: snap.docs[0].data() });
});

// ── Stripe Checkout ─────────────────────────────────────────────────────────
app.post('/api/checkout', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { tier } = req.body ?? {};
  if (!tier) return res.status(400).json({ error: 'tier required' });
  if (!PLANS[tier as PlanTier]) return res.status(400).json({ error: 'invalid tier' });

  let user = await getUser(userId);
  if (!user) {
    const userEmail = req.user?.email || `${userId}@user.stratemark.ai`;
    user = {
      id: userId,
      email: userEmail,
      subscriptionTier: 'pro',
      subscriptionStatus: 'trialing',
      stripeCustomerId: null,
      createdAt: new Date().toISOString(),
    };
    await createUser(user);
  }

  const url = await createCheckoutSession(tier as PlanTier, user.email, userId);
  res.json({ url });
});

app.post('/api/portal', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const user = await getUser(userId);
  if (!user?.stripeCustomerId) return res.status(400).json({ error: 'no subscription' });

  const url = await createPortalSession(user.stripeCustomerId);
  res.json({ url });
});

// ── Companies ───────────────────────────────────────────────────────────────
app.post('/api/companies', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { name, edgarCik } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name required' });

  const company: TrackedCompany = {
    id: `company-${Date.now()}`,
    userId,
    name,
    edgarCik: edgarCik ?? null,
    newsSources: [],
    rssFeeds: [],
    createdAt: new Date().toISOString(),
  };
  await createCompany(company);
  res.json({ company });
});

app.get('/api/companies', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const companies = await getCompaniesForUser(userId);
  res.json({ companies });
});

// ── Alerts ──────────────────────────────────────────────────────────────────
app.get('/api/alerts', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const alerts = await getAlertsForUser(userId);
  res.json({ alerts });
});

// ── Scrape Trigger ──────────────────────────────────────────────────────────
app.post('/api/scrape', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    let totalAlerts = 0;

    // Process companies for the authenticated user
    const userCompanies = await getCompaniesForUser(userId);
    if (userCompanies.length > 0) {
      const rawChanges = await scrapeAllSources(userCompanies);
      const classified = await classifyChanges(rawChanges);
      const alerts = enforceAlertsProvenance(classified, userId);

      const newAlerts = alerts.filter((a) => a.confidence !== 'unknown');
      for (const alert of newAlerts) {
        await saveAlert(alert);
      }

      if (newAlerts.length > 0) {
        const user = await getUser(userId);
        if (user?.email) {
          const sent = await sendBatchAlerts(newAlerts, user.email);
          for (const alert of newAlerts) {
            if (sent > 0) await markAlertDelivered(alert.id, userId);
          }
          totalAlerts += sent;
        }
      }
    }

    // Process other active subscribers
    const usersSnap = await collections.users
      .where('subscriptionStatus', 'in', ['active', 'trialing'])
      .get();

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data() as User;
      if (user.id === userId) continue;

      const companies = await getCompaniesForUser(user.id);
      if (companies.length === 0) continue;

      const rawChanges = await scrapeAllSources(companies);
      const classified = await classifyChanges(rawChanges);
      const alerts = enforceAlertsProvenance(classified, user.id);

      const newAlerts = alerts.filter((a) => a.confidence !== 'unknown');
      for (const alert of newAlerts) {
        await saveAlert(alert);
      }

      if (newAlerts.length > 0) {
        const sent = await sendBatchAlerts(newAlerts, user.email);
        for (const alert of newAlerts) {
          if (sent > 0) await markAlertDelivered(alert.id, user.id);
        }
        totalAlerts += sent;
      }
    }

    res.json({ ok: true, alertsSent: totalAlerts });
  } catch (err) {
    console.error('Scrape failed:', err);
    res.status(500).json({ ok: false, error: 'Scrape failed' });
  }
});

// ── Deck Research & Scrape Pipeline ─────────────────────────────────────────
app.post('/api/research/deck', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { prompt, region = null, targetCompanies } = req.body ?? {};
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured' });
  }

  try {
    const client = createGeminiClient({ apiKey });
    const discoveredCompanies = new Map<string, { id: string; name: string; edgarCik?: string | null }>();

    const options = {
      apiKey,
      ...(targetCompanies ? { targetCompanies: Number(targetCompanies) } : {}),
      onEvent: (event: unknown) => {
        const evt = event as { type?: string; card?: { company?: { id?: string; name?: string; edgarCik?: string | null } } };
        if (evt.type === 'card' && evt.card?.company) {
          const comp = evt.card.company;
          if (comp.id && !discoveredCompanies.has(comp.id)) {
            discoveredCompanies.set(comp.id, {
              id: comp.id,
              name: comp.name || '',
              edgarCik: comp.edgarCik ?? null,
            });
          }
        }
      },
    };

    const result = await runDeckResearch({ prompt, region }, client, options);

    // Persist all research data (market, deck, cards, companies, metrics, viceClaims) to user's isolated path (users/{userId}/...)
    if (result.market) {
      await setUserMarket(userId, result.market);
    }
    if (result.deck) {
      await setUserDeck(userId, result.deck);
    }
    if (result.cards) {
      const savedCompanies = new Set<string>();
      for (const cardWithCompany of result.cards) {
        if (cardWithCompany.card) {
          await setUserCard(userId, cardWithCompany.card);
        }
        if (cardWithCompany.company && cardWithCompany.company.id) {
          if (!savedCompanies.has(cardWithCompany.company.id)) {
            savedCompanies.add(cardWithCompany.company.id);
            await setUserCompany(userId, cardWithCompany.company);
          }
        }
        if (Array.isArray(cardWithCompany.metrics)) {
          for (const metric of cardWithCompany.metrics) {
            if (metric) {
              await setUserMetric(userId, metric);
            }
          }
        }
        if (Array.isArray(cardWithCompany.viceClaims)) {
          for (const vc of cardWithCompany.viceClaims) {
            if (vc) {
              await setUserViceClaim(userId, vc);
            }
          }
        }
      }
    }

    // Ensure all companies in result.cards are included in discoveredCompanies for scraping
    for (const cardWithCompany of result.cards) {
      if (cardWithCompany.company && cardWithCompany.company.id) {
        if (!discoveredCompanies.has(cardWithCompany.company.id)) {
          discoveredCompanies.set(cardWithCompany.company.id, {
            id: cardWithCompany.company.id,
            name: cardWithCompany.company.name,
            edgarCik: (cardWithCompany.company as unknown as { edgarCik?: string | null }).edgarCik ?? null,
          });
        }
      }
    }

    // Trigger scrapeCompany() on every company discovered and save classified alerts to users/{userId}/alerts/...
    const scrapedResults = await Promise.all(
      Array.from(discoveredCompanies.values()).map(async (company) => {
        const changes = await scrapeCompany(company);
        if (changes.length > 0) {
          const classified = await classifyChanges(changes);
          const alerts = enforceAlertsProvenance(classified, userId);
          const newAlerts = alerts.filter((a) => a.confidence !== 'unknown');
          for (const alert of newAlerts) {
            await saveAlert(alert);
          }
        }
        return { company, changes };
      }),
    );

    res.json({
      ok: true,
      result,
      scrapedCompanies: scrapedResults,
    });
  } catch (err) {
    console.error('Deck research failed:', err);
    res.status(500).json({ error: 'Deck research failed', details: err instanceof Error ? err.message : String(err) });
  }
});

// ── Stripe Webhook ──────────────────────────────────────────────────────────
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ error: 'missing signature' });

  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
  } catch {
    return res.status(400).json({ error: 'invalid signature' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, tier } = session.metadata ?? {};
    if (userId && tier) {
      await collections.users.doc(userId).update({
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        stripeCustomerId: session.customer as string,
      });
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const snap = await collections.users.where('stripeCustomerId', '==', sub.customer).get();
    for (const doc of snap.docs) {
      await doc.ref.update({ subscriptionStatus: 'canceled' });
    }
  }

  res.json({ received: true });
});

export { app };

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  const port = parseInt(process.env.PORT ?? '8080', 10);
  app.listen(port, () => {
    console.log(`Sentinel running on port ${port}`);
  });
}
