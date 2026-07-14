const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetBoardRoute = code.substring(
  code.indexOf("app.post('/api/generate-board', async (req, res) => {"),
  code.indexOf("app.post('/api/generate-company-profile'")
);

const newBoardRoute = `app.post('/api/generate-board', async (req, res) => {
  const { niche, aiConfig } = req.body;

  if (!niche || typeof niche !== 'string' || niche.trim().length === 0) {
    return res.status(400).json({ error: 'Niche market description is required.' });
  }

  const ai = getAI();
  if (!ai) {
    safeLog('Gemini API is not configured. Returning procedural fallback board.');
    const fallbackData = generateFallbackBoard(niche);
    return res.json(fallbackData);
  }

  try {
    const requestedModelName = aiConfig?.modelName || 'gemini-3.5-flash';
    const finalModelName = resolveModelName(requestedModelName);
    
    console.log(\`Generating market analysis board for niche: "\${niche}" using model \${finalModelName}\`);

    const prompt = \`You are the core intelligence engine for STRATEMARK, a professional competitive market intelligence platform. Your job is to analyze any market niche provided by the user and return a mathematically sound, completely accurate, and un-hallucinated dataset of exactly 20 companies structured for a Monopoly-style board game.

### CORE OPERATIONAL DIRECTIVES

1. DYNAMIC MARKET AGNOSTICISM
- You must work for ANY industrial sector or market niche input by the user (e.g., "Frontier AI Labs", "Solid State EV Batteries", "\${niche}"). 
- Never rely on static, hardcoded lists or historical pre-trained assumptions. Every single request must trigger fresh real-time web research.

2. TWO-STEP GROUNDING LOOP (MANDATORY)
- Step 1 (Discovery): Issue target search queries to identify the landscape. Search for "Top companies in \${niche} market share 2025 2026" or "\${niche} industry report". Compile a list of 25-30 candidate companies to account for data filtering later.
- Step 2 (Deep-Dive Verification): For each discovered company, run a targeted verification query: "[Company Name] revenue valuation CEO founders 2025 2026". Extract only verified facts found in the search snippets.

3. STRICT TRUTH & FALLBACK RULES
- If specific financial data (Valuation/Revenue) cannot be verified in search results for a smaller company, compute a logical scale-appropriate estimate based on industry averages, but set \\\`data_verified: false\\\`.
- PERSONNEL: You are STRICTLY FORBIDDEN from generating fictional executive names or backgrounds. Look up the actual public executives via search. If the real executive names cannot be found via search, populate the fields with "Public Relations Team" or "Executive Board" rather than inventing a fictional person.

4. REAL-WORLD VISUAL ASSET PIPELINE
- LOGOS: Do not attempt to generate or describe logos. Construct a deterministic URL string based on the company's verified domain name utilizing a clean public lookup syntax: \\\`https://logo.clearbit.com/[verified_domain]\\\`
- PORTRAITS: Find the real name of the primary executive. Return an open web URL link to their verified public headshot (e.g., from official corporate press kit pages or Wikimedia Commons found via search snippets). Do not use AI portrait generation text descriptions.

### OUTPUT JSON SCHEMA
You must output a single, clean JSON object containing an array of exactly 20 unique companies, 4 platforms, and 4 events.

{
  "market_niche": "\${niche}",
  "companies": [
    {
      "board_index": 1, // Integer (1 to 20)
      "company_name": "String",
      "domain": "company.com",
      "logo_url": "https://logo.clearbit.com/company.com",
      "financials": {
        "valuation_numeric_usd": 80000000000, // Number in USD, e.g. 80 billion
        "annual_revenue_arr_usd": 12000000000, // Number in USD
        "market_share_percentage": 15.5, // Float
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

Return ONLY the raw JSON object, without any markdown formatting or surrounding text. DO NOT wrap it in \\\`\\\`\\\`json.\`;

    const config = getModelConfig(finalModelName, aiConfig?.thinkingEffort, false);
    // REMOVED config.responseMimeType = 'application/json'; so that Google Search grounding actually fires on Gemini 3.5 Flash!

    let response;
    try {
      response = await ai.models.generateContent({
        model: finalModelName,
        contents: prompt,
        config,
      });
    } catch (apiError: any) {
      safeLog(\`Primary model \${finalModelName} failed for generate-board, trying fallback gemini-3.5-flash\`, apiError);
      if (finalModelName !== 'gemini-3.5-flash') {
        const fallbackConfig = getModelConfig('gemini-3.5-flash', aiConfig?.thinkingEffort, false);
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: fallbackConfig,
        });
      } else {
        throw apiError;
      }
    }

    if (!response.text) {
      throw new Error("Empty response from Gemini API.");
    }

    const rawJsonText = response.text;
    console.log("Raw output length:", rawJsonText.length);
    const parsedRawData = cleanAndParseJSON(rawJsonText);
    
    // Convert to frontend BoardData format
    const boardData = {
      id: \`custom-\${Date.now()}\`,
      niche: parsedRawData.market_niche || niche,
      companies: [] as any[],
      platforms: parsedRawData.platforms || [],
      events: parsedRawData.events || []
    };

    if (parsedRawData.companies && Array.isArray(parsedRawData.companies)) {
      // Deduplicate by domain/name
      const uniqueMap = new Map();
      parsedRawData.companies.forEach((item: any) => {
        const key = (item.domain || item.company_name || '').toLowerCase().trim();
        if (key && !uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      });
      const uniqueCompanies = Array.from(uniqueMap.values()) as any[];

      // Sort mathematically by true market share percentage
      uniqueCompanies.sort((a, b) => {
        const shareA = parseFloat(a.financials?.market_share_percentage) || 0;
        const shareB = parseFloat(b.financials?.market_share_percentage) || 0;
        return shareA - shareB;
      });

      // Map to frontend shape and assign tier/index
      boardData.companies = uniqueCompanies.slice(0, 20).map((c: any, index: number) => {
        const boardIndex = index + 1;
        let tier = "Emerging";
        if (boardIndex >= 16) tier = "Dominant";
        else if (boardIndex >= 11) tier = "Established";
        else if (boardIndex >= 6) tier = "Growth";

        const formatter = new Intl.NumberFormat('en-US', { notation: 'compact', style: 'currency', currency: 'USD' });
        const valStr = c.financials?.valuation_numeric_usd ? formatter.format(c.financials.valuation_numeric_usd) : "N/A";
        const revStr = c.financials?.annual_revenue_arr_usd ? formatter.format(c.financials.annual_revenue_arr_usd) : "N/A";

        return {
          name: c.company_name || "Unknown Company",
          domain: c.domain,
          index: boardIndex,
          tier,
          marketShare: \`\${c.financials?.market_share_percentage || 0}%\`,
          marketShareNumeric: c.financials?.market_share_percentage || 0,
          valuation: valStr,
          numbers: {
            annualRevenue: revStr,
            fundingRaised: "See details",
            burnRate: "See details",
            profitability: "See details",
            keyAssets: "See details"
          },
          team: {
            headcount: "Unknown",
            structureDescription: "",
            hiringTrends: "",
            culture: "",
            keyPlayers: (c.key_players || []).map((kp: any) => ({
              name: kp.name,
              role: kp.role,
              avatarUrl: kp.headshot_url,
              bio: kp.background
            }))
          }
        };
      });
    }

    return res.json(boardData);
  } catch (error: any) {
    console.error('Board generation failed:', error);
    const fallbackData = generateFallbackBoard(niche);
    return res.json(fallbackData);
  }
}

`;

code = code.replace(targetBoardRoute, newBoardRoute);
fs.writeFileSync('server.ts', code);
