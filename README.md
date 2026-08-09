# Market Intel Deck Builder

> 🏆 **Built with Gemini** — the entire intelligence engine runs on the Gemini API with Google
> Search grounding, on a free Google AI Studio key.

**Open-source, local-first market research.** Describe any market in plain language and get a
deck of game-card-styled competitive-intelligence cards — real companies with real logos,
sourced metrics, maturity tiers, drill-down dashboards, fact-checking, and AI-composed
reports. Bring a **free Google AI Studio key** and it just works: every fact comes from
**Gemini grounded on Google Search**, never from model memory.

> **No fabricated data, ever.** Every figure is tagged `verified` / `estimated` / `unknown`
> with a citation; unverifiable figures display as *Unknown* rather than being invented, and
> unsourced risk claims are dropped. This invariant is enforced in code and covered by tests.

## Features

- **Prompt → Deck** — one grounded research pipeline (`interpret → discover → enrich → score → barriers`) turns "non-alcoholic spirits brands" into a full deck of sourced cards.
- **6 card types** — Company, Infrastructure, Distribution, Culture, Vice (every claim cited), Barrier to Entry.
- **Maturity tiers (CMS)** — a pure, auditable scoring engine (weighted signals, Unknown-weight renormalization) with an LLM review that may nudge ±1 and must log its reason.
- **8-tab company dashboards** — Overview, Live Intel, Team & Org Chart, Live Landing Page, Metrics, Mission & Governance, History, Products & Roadmap. Tabs research lazily and cache.
- **Dig deeper** — every metric, section, and company has a grounded drill-down that opens a cited research sheet in place.
- **Fact-check** — one click verifies any figure or claim against live Google Search: verdict (supported / contradicted / unverified) + rationale + sources.
- **Reports** — compose executive-ready, cited reports from a deck's or company's researched evidence; kept organized in a Reports library; export as Markdown.
- **Auto-refresh** — per-deck cadence (daily / 2× daily / weekly). Decks refresh on launch when the interval has elapsed and periodically while the app is open — one at a time, free-tier friendly.
- **Real logos, free** — unavatar → Google favicon → DuckDuckGo → monogram fallback chain. No paid API.

## Quickstart (web)

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

Open **Settings**, paste a free key from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
(use **Test key** to verify), then hit **New deck**. Without a key the app runs in demo mode
with clearly-labeled sample data. Your key is stored only in your browser (web) or the OS
keychain (desktop) and sent only to Google.

## Desktop (Electron)

```bash
pnpm --filter @mi/desktop dev    # run locally
pnpm --filter @mi/desktop dist   # package installers (dmg / nsis / AppImage)
```

The Electron main process owns everything native: the Gemini key via `safeStorage`
(OS keychain), research state persisted to `userData`, and the full research engine — the
sandboxed renderer talks to it only through a typed `contextBridge` API.

## Architecture

```
packages/contracts   Types, Zod schemas, tier bands, CMS scoring, the MarketIntelRepository
                     interface, and the Electron IPC contract — the single source of truth.
packages/research    The grounded engine: Gemini client (ground → structure two-call pattern),
                     deck pipeline, lazy dashboard research, deep-dive, fact-check, reports.
packages/mocks       Demo repository + fixtures (schema-validated) for keyless exploration.
apps/web             React + Vite renderer. Talks only to the repository interface.
apps/desktop         Electron main + preload. Hosts the live engine with OS-keychain keys.
```

One seam runs through everything: **`MarketIntelRepository`**. The demo repo, the live
Gemini repo, and the Electron IPC bridge all implement it, so the same UI runs everywhere
and backends swap without touching feature code.

### Grounding discipline

Grounding and JSON-schema output are mutually exclusive on Gemini Flash, so every research
step is two calls: a **grounded** call gathers facts + citations from Google Search, then a
cheap **structuring** call converts that text to strict JSON validated by Zod. Citations are
threaded through so the UI can show sources everywhere.

## Testing

```bash
pnpm check                        # typecheck + lint + unit/contract tests
pnpm --filter @mi/web test:e2e    # Playwright E2E + axe accessibility
```

The pipeline is tested end-to-end through a fake LLM (orchestration, citation threading,
scoring, vice-claim sourcing, persistence, fact-check, reports), and the anti-fabrication
invariants have been audited against live runs.

## License

[MIT](./LICENSE)
