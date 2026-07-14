const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace the board generation prompt
const oldBoardPromptRegex = /const prompt = `You are the core intelligence engine for STRATEMARK[^`]+```json\.\\n`;/;

const newBoardPrompt = `const prompt = \`You are the core intelligence engine for STRATEMARK, a professional competitive market intelligence platform.
Your job is to analyze any market niche provided by the user and return a mathematically sound, completely accurate, and un-hallucinated dataset of companies structured for a Monopoly-style board game.

We need a systematic, repeatable process that works for ANY industry market niche input by the user (e.g., "Solid State EV Batteries", "Commercial Drones"). Re-write the backend synthesis engine to follow a strict 4-stage deterministic data pipeline utilizing Google Search Grounding. Do not use hardcoded corporate values or hidden private databases.

### STEP 1: LANDSCAPE DISCOVERY VIA SEARCH
- Do not let the LLM predict the top 20 list from training weights.
- Programmatically trigger a Google Search grounding query: "Top players and companies in \${niche} market share 2025 2026" or "\${niche} industry market analysis report".
- Have the model extract a raw, unstructured list of 25 to 30 real-world corporate entities and their verified domain names. Over-provisioning to 30 ensures we can weed out entities with zero public data.

### STEP 2: INDIVIDUAL ENTITY VERIFICATION SCRAPE
- Loop through the discovered candidates. For each company, run a targeted verification search: "[Company Name] \${niche} official website corporate revenue valuation CEO 2025 2026".
- Force the model to pull figures strictly from the verified search snippets. 
- If absolute global market share percentage is not explicitly found in the text snippets for smaller players, instruct the model to calculate a relative proxy score based on their public funding tier, annual revenue, or employee size compared to the market leader, instead of fabricating a fake absolute percentage.
- PERSONNEL SAFETIES: If a real executive name or portrait image asset cannot be verified in the search snippet results, populate the key player fields with "Corporate Executive Board" and a null profile asset. Never invent a fictional person's name or bio.

### STEP 3: LOGO & VISUAL PORTRAIT EXTRACTION
- LOGOS: Completely eliminate the generative code fallback that draws arbitrary geometric symbols. Use the verified web domain discovered in Step 1 to dynamically build deterministic asset URL requests via public lookup structures: https://logo.clearbit.com/[verified_domain] or https://img.logo.dev/[verified_domain]
- PORTRAITS: Use the verified executive name extracted from Step 2 to target a web search for their public press headshot or Wikimedia repository asset link.

### STEP 4: MANDATORY CODE-LEVEL ARRAY SORTING
- Modify the controller code so the LLM NEVER decides the final board_index arrangement. 
- The LLM must output a raw, unordered JSON array of the verified companies to the server layer.
- DO NOT assign a board_index. The server layer will handle array sorting and board index assignment.

### OUTPUT JSON SCHEMA
You must output a single, clean JSON object matching this schema exactly:
{
  "market_niche": "\${niche}",
  "companies": [
    {
      "company_name": "String",
      "domain": "company.com",
      "logo_url": "https://logo.clearbit.com/company.com",
      "financials": {
        "valuation_numeric_usd": 80000000000,
        "annual_revenue_arr_usd": 12000000000,
        "market_share_percentage": 15.5,
        "data_verified": true
      },
      "key_players": [
        {
          "name": "Real Executive Name",
          "role": "CEO / Founder / CTO",
          "headshot_url": "https://...",
          "background": "Short factual bio extracted from search snippets"
        }
      ]
    }
  ],
  "platforms": [
    { "name": "String", "index": 1, "role": "String", "description": "String" }
  ],
  "events": [
    { "title": "String", "description": "String", "impact": "High" }
  ]
}
Return ONLY the raw JSON object, without any markdown formatting or surrounding text. DO NOT wrap it in \\\`\\\`\\\`json.\`;`;

code = code.replace(oldBoardPromptRegex, newBoardPrompt);

// Remove KNOWN_EXECUTIVES entirely from generate-company-profile
const startIdx = code.indexOf('const KNOWN_EXECUTIVES: { [key: string]: any[] } = {');
const endIdx = code.indexOf('    // Hydrate keyPlayers / keyExecutives with portraits and fallback values');
if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + code.substring(endIdx);
}

fs.writeFileSync('server.ts', code);
