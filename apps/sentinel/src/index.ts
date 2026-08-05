import express from 'express';
import { runDeckResearch, createGeminiClient } from '@mi/research';
import { config } from './config.js';
import { scrapeAllSources, scrapeCompany } from './scrapers/index.js';
import { classifyChanges } from './classify/index.js';
import { enforceAlertsProvenance } from './provenance.js';
import { collections, getCompaniesForUser, saveAlert, markAlertDelivered, getUser } from './lib/firestore.js';
import { sendBatchAlerts } from './lib/email.js';
import { createCheckoutSession, createPortalSession, getStripe, PLANS, type PlanTier } from './lib/stripe.js';
import type { User } from './types.js';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sentinel', timestamp: new Date().toISOString() });
});

// ── Auth: simple token-based (email lookup for demo) ────────────────────────
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
    await collections.users.doc(userId).set(user);
    return res.json({ user });
  }
  res.json({ user: snap.docs[0].data() });
});

// ── Stripe Checkout ─────────────────────────────────────────────────────────
app.post('/api/checkout', async (req, res) => {
  const { userId, tier } = req.body;
  if (!userId || !tier) return res.status(400).json({ error: 'userId and tier required' });
  if (!PLANS[tier as PlanTier]) return res.status(400).json({ error: 'invalid tier' });

  const user = await getUser(userId);
  if (!user) return res.status(404).json({ error: 'user not found' });

  const url = await createCheckoutSession(tier as PlanTier, user.email, userId);
  res.json({ url });
});

app.post('/api/portal', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const user = await getUser(userId);
  if (!user?.stripeCustomerId) return res.status(400).json({ error: 'no subscription' });

  const url = await createPortalSession(user.stripeCustomerId);
  res.json({ url });
});

// ── Companies ───────────────────────────────────────────────────────────────
app.post('/api/companies', async (req, res) => {
  const { userId, name, edgarCik } = req.body;
  if (!userId || !name) return res.status(400).json({ error: 'userId and name required' });

  const company = {
    id: `company-${Date.now()}`,
    userId,
    name,
    edgarCik: edgarCik ?? null,
    newsSources: [],
    rssFeeds: [],
    createdAt: new Date().toISOString(),
  };
  await collections.companies.doc(company.id).set(company);
  res.json({ company });
});

app.get('/api/companies', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const companies = await getCompaniesForUser(userId as string);
  res.json({ companies });
});

// ── Alerts ──────────────────────────────────────────────────────────────────
app.get('/api/alerts', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const snap = await collections.alerts
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  res.json({ alerts: snap.docs.map((d) => d.data()) });
});

// ── Scrape Trigger ──────────────────────────────────────────────────────────
app.post('/api/scrape', async (_req, res) => {
  try {
    const usersSnap = await collections.users
      .where('subscriptionStatus', 'in', ['active', 'trialing'])
      .get();

    let totalAlerts = 0;

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data() as User;
      const companies = await getCompaniesForUser(user.id);
      if (companies.length === 0) continue;

      const rawChanges = await scrapeAllSources(companies);
      const classified = await classifyChanges(rawChanges);
      const alerts = enforceAlertsProvenance(classified, user.id);

      const newAlerts = alerts.filter((a) => a.confidence !== 'unknown');
      for (const alert of newAlerts) await saveAlert(alert);

      if (newAlerts.length > 0) {
        const sent = await sendBatchAlerts(newAlerts, user.email);
        for (const alert of newAlerts) {
          if (sent > 0) await markAlertDelivered(alert.id);
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
app.post('/api/research/deck', async (req, res) => {
  const { prompt, region = null, userId, targetCompanies } = req.body;
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

    // Ensure all companies in result.cards are included
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

    // Automatically trigger scrapeCompany() on every company discovered by runDeckResearch()
    const scrapedResults = await Promise.all(
      Array.from(discoveredCompanies.values()).map(async (company) => {
        const changes = await scrapeCompany(company);
        if (userId && changes.length > 0) {
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

const port = parseInt(process.env.PORT ?? '8080', 10);
app.listen(port, () => {
  console.log(`Sentinel running on port ${port}`);
});
