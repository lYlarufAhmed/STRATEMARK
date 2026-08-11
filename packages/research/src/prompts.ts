/**
 * Prompt templates. The grounding discipline lives here: grounded steps must
 * rely ONLY on the attached Google-Search results, cite sources, and never
 * assert a figure from training data. Structuring steps convert that grounded
 * text into JSON and must mark anything unsupported as Unknown/Estimated.
 */
import { CARD_TYPE_LABELS, TIER_LABELS, type CardType } from '@mi/contracts';
import type { CompanyCandidate, MarketPlan } from './types';
import type { Citation } from './types';

/**
 * Roles discovery may assign to a company. Barrier and Insight are market-level
 * findings produced by their own grounded pass, so offering them here only
 * invites discovery to mint a topic as if it were a business.
 */
const DISCOVERABLE_ROLES: readonly CardType[] = [
  'company',
  'infrastructure',
  'distribution',
  'culture',
  'vice',
];

export const GROUNDED_SYSTEM =
  'You are a meticulous market-intelligence researcher. Use ONLY the Google Search results available to you via grounding — never state a company, figure, or claim from prior knowledge without a supporting search result. If the search results do not support something, say so explicitly rather than guessing. Prefer recent, primary sources (filings, company statements, reputable reporting). Always work from what the searches actually return.';

/**
 * The research-conversation contract. Chat is where trust erodes fastest —
 * a model chatting freely will drift into training-data recall, which is the
 * one thing this product promises never to do.
 */
export const CHAT_SYSTEM =
  "You are the research copilot inside a competitive-intelligence deck. Answer using ONLY two sources: (1) the DECK DATA provided in the prompt — this deck's prior grounded research, whose confidence tags (verified / estimated / unknown) you must respect and repeat honestly — and (2) fresh Google Search results retrieved for this question. NEVER answer from prior or training knowledge: if neither the deck data nor the search results support a claim, say plainly that it is not established. Be direct and analytical, compare entities when asked, keep answers tight (a few short paragraphs or a list), and attribute figures to their source. You are talking to a sharp analyst — no filler, no hedging beyond what the evidence requires.";

export const STRUCTURE_SYSTEM =
  'You convert researched notes into strict JSON. Output ONLY JSON — no prose, no code fences. Never invent values: if the notes do not support a field, use null and confidence "unknown". Use confidence "verified" only when a cited source states the figure directly, "estimated" when derived via a stated method, otherwise "unknown".';

export function interpretMarketPrompt(prompt: string, region: string | null): string {
  return [
    `A user wants to build a competitive-intelligence deck for this market:`,
    `"${prompt}"`,
    region ? `Region/geography scope: ${region}` : `No explicit region given.`,
    ``,
    `Search to understand this market, then describe it precisely: its canonical name, the specific vertical, the geographic scope, and 4-6 concrete search angles that would surface the real companies, infrastructure providers, distribution channels, and structural barriers in it. Ground everything in what you find.`,
  ].join('\n');
}

export function structureMarketPrompt(groundedText: string): string {
  return [
    `From these research notes, produce the market definition as JSON with keys: marketName, vertical, geography (or null), notes (or null), searchThemes (array of 4-6 short strings).`,
    ``,
    `NOTES:`,
    groundedText,
  ].join('\n');
}

export function discoverPrompt(plan: MarketPlan, target: number): string {
  return [
    `Market: ${plan.marketName} — ${plan.vertical}${plan.geography ? ` in ${plan.geography}` : ''}.`,
    `Search angles: ${plan.searchThemes.join('; ')}.`,
    ``,
    // Barrier and Insight are market-level and researched in their own pass, so
    // they are deliberately absent from the roles offered here.
    `Using Google Search, identify the REAL companies in this market. Find roughly ${target} operating companies spanning maturity from tiny startups to dominant incumbents, and make sure the set includes the infrastructure/tooling providers the market depends on and the distribution/channel players it sells through. Note any documented controversy or notable community signal attached to a company you already list. For each entity give its name, website root domain, a one-line descriptor, and the role(s) it plays: ${DISCOVERABLE_ROLES.map((r) => CARD_TYPE_LABELS[r]).join(', ')}. Only include entities you can actually find in search results.`,
    ``,
    `STRICT: include only actual operating companies/organizations. Government agencies, regulators, trade associations, events, and abstract concepts or debates are NOT companies — omit them entirely (do not force them into any category).`,
  ].join('\n');
}

export function fallbackDiscoverPrompt(plan: MarketPlan, theme: string, needed: number): string {
  return [
    `Market: ${plan.marketName} — ${plan.vertical}${plan.geography ? ` in ${plan.geography}` : ''}.`,
    `Fallback search angle: ${theme}.`,
    `Using Google Search, find at least ${needed} additional REAL operating companies in this market, including smaller, regional, adjacent, infrastructure, and distribution businesses that a broad search may miss.`,
    `Return names, root domains, descriptors, and roles. Do not include agencies, regulators, trade bodies, events, or concepts. Only include entities supported by the search results.`,
  ].join('\n');
}

export function structureDiscoveryPrompt(groundedText: string): string {
  return [
    `From these research notes, output JSON: { "companies": [ { "name", "domain" (root domain or null), "descriptor", "cardTypes" } ] }.`,
    `Deduplicate. Keep only real entities named in the notes.`,
    ``,
    // Without criteria the model labels everything "company" — measured on a live
    // run: 10 of 10, including four pure infrastructure businesses, which left
    // four of the seven card types invisible. The facets describe a company's
    // ROLE in this market, so define each one and make clear they stack.
    `"cardTypes" holds EXACTLY ONE primary role, plus any signals the notes actually report.`,
    ``,
    `Pick the one role that best describes how this entity relates to the market:`,
    `  · company        — operates IN the market: sells its core product or service to the market's customers`,
    `  · infrastructure — supplies TO the market: the foundational compute, silicon, hardware, or low-level developer tooling`,
    `  · distribution   — reaches or aggregates the market: model hubs, cloud marketplaces, API platforms, resellers, integrators, app stores (e.g. Hugging Face, AWS Bedrock, GCP Vertex AI, Azure AI Market, Replicate)`,
    ``,
    `Choose by the entity's centre of gravity. A chip maker is "infrastructure". A platform that hosts, aggregates, or distributes models/APIs to end users or enterprises is "distribution". If an entity acts as a primary channel or marketplace, label it "distribution" rather than generic "company".`,
    ``,
    `Then add either or both of these ONLY when the notes report it — never to round out the set:`,
    `  · culture — a notable community, ethos, or giving signal`,
    `  · vice    — a documented controversy, lawsuit, regulatory action, or integrity problem`,
    ``,
    `Examples: a chip supplier → ["infrastructure"]. A lab facing a copyright suit → ["company","vice"]. A model marketplace known for its community → ["distribution","culture"].`,
    ``,
    `NOTES:`,
    groundedText,
  ].join('\n');
}

export function enrichPrompt(candidate: CompanyCandidate, plan: MarketPlan): string {
  return [
    `Research the company "${candidate.name}"${candidate.domain ? ` (${candidate.domain})` : ''} in the context of the market: ${plan.marketName}.`,
    ``,
    `Using Google Search, find, with sources:`,
    `- a one-line description of what it does`,
    `- HQ location (city, region/country)`,
    `- official website`,
    `- market share (as a % of the market, if reported)`,
    `- valuation (if private) OR market cap (if public) — whichever applies`,
    `- ARR / annual revenue`,
    `- number of users/customers`,
    `- number of employees`,
    candidate.cardTypes.includes('vice')
      ? `- any lawsuits, controversy, or integrity concerns (each MUST have a source)`
      : ``,
    candidate.cardTypes.includes('culture')
      ? `- notable positive community/culture signals (giving, non-profit ties)`
      : ``,
    `- the brand's primary colors (hex) from its website if visible`,
    ``,
    `Report each figure with its source. If a figure isn't disclosed, note whether it can be reasonably estimated (and how) or is simply unknown. Do not fabricate numbers.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function structureEnrichPrompt(
  candidate: CompanyCandidate,
  groundedText: string,
  citations: Citation[],
): string {
  const sources = citations.map((c, i) => `[${i}] ${c.title} — ${c.url}`).join('\n') || '(none)';
  return [
    `Convert the research notes on "${candidate.name}" into JSON with this shape:`,
    `{ "oneLiner", "hqLocation"|null, "website"|null, "brand": {"primary","secondary","accent"}|null,`,
    `  "metrics": { "market_share"?, "valuation"?, "market_cap"?, "arr"?, "users"?, "employees"? } where each is`,
    `     { "value": number|null (raw number — dollars for money, count for users/employees, percent for share), "confidence": "verified"|"estimated"|"unknown", "sourceIndex": number|null (index into SOURCES), "method": string|null, "sourceDate": ISO date|string|null, "alternatives": [same fields except alternatives] },`,
    `  "viceClaims": [ { "text", "sourceIndex": number|null } ], "cultureNote": string|null }`,
    ``,
    `Rules: use "verified" only if a SOURCE states the figure; "estimated" with a "method" note if derived; else "unknown" with value null. Preserve materially conflicting sourced ARR, valuation, market-cap, user, employee, or share figures in "alternatives" with their own sourceIndex and sourceDate; do not average them. Every viceClaim MUST have a sourceIndex. Provide only valuation OR market_cap, not both.`,
    ``,
    `SOURCES:`,
    sources,
    ``,
    `NOTES:`,
    groundedText,
  ].join('\n');
}

/**
 * Review every company's tier in ONE pass, as a cohort.
 *
 * The rules engine has already assigned a base tier from hard signals. This pass
 * may only nudge by one step, and now does so with the whole market visible —
 * so the tiers read as a coherent ranking rather than ten unrelated opinions.
 */
export function tierReviewBatchPrompt(
  marketName: string,
  rows: { name: string; baseTier: number; evidence: string }[],
): string {
  return [
    `You are grading maturity tiers for companies in the "${marketName}" market on a 1-8 ladder, where 1 is a pre-product sandbox and 8 is a category-defining titan.`,
    `A deterministic rules engine already assigned each company a BASE TIER from its hard metrics. Your job is a sanity check across the whole cohort: for each company decide whether to nudge its tier by -1, 0, or +1. You may NOT move a company further than one step.`,
    `Judge them RELATIVE TO EACH OTHER — the point is a ranking that a analyst would defend, so a company should not sit above a clearly stronger peer.`,
    `Only nudge where the evidence plainly justifies it (e.g. share collapsing despite scale, or an obvious leader under-ranked because a figure was unknown). Default to 0.`,
    `Return JSON: { "reviews": [ { "name": string (copy it EXACTLY as given), "nudge": -1|0|1, "reason": string|null (one sentence) } ] }. Include every company exactly once.`,
    ``,
    `COHORT:`,
    ...rows.map(
      (r) =>
        `- ${r.name} | base tier ${r.baseTier} (${TIER_LABELS[r.baseTier as 1]}) | ${r.evidence || 'no metrics found'}`,
    ),
  ].join('\n');
}

export function tierReviewPrompt(name: string, baseTier: number, evidence: string): string {
  return [
    `A rules-based system scored "${name}" at maturity tier ${baseTier} (${TIER_LABELS[baseTier as 1]}) out of 8, where 1 is a pre-product sandbox and 8 is a category-defining titan.`,
    `Given the evidence below, decide whether to nudge the tier by -1, 0, or +1 (you may NOT move it further). Output JSON: { "nudge": -1|0|1, "reason": string|null }. Only nudge if the evidence clearly justifies it (e.g. share declining despite size), and give a one-sentence reason.`,
    ``,
    `EVIDENCE:`,
    evidence,
  ].join('\n');
}
