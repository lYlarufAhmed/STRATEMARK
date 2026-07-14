const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const prompt = `
You are an expert Wall Street research firm and business school professor.
I want you to build a Monopoly-themed market analysis board for the niche: "test".

The Monopoly board has 40 spaces. You must generate:
1. Exactly 22 Companies operating in this niche, ordered from lowest market share/valuation (brown properties) to the dominant monopolies (dark-blue properties, Boardwalk style).
Each company must have a realistic name, a correct index on the board (see list below), a color group, valuation, market share, and deep-dive research content.

Board Index Mapping for the 22 Companies:
- Brown properties:
  - Space 1: Mediterranean Avenue equivalent (lowest value)
  - Space 3: Baltic Avenue equivalent
- Light Blue properties:
  - Space 6: Oriental Avenue equivalent
  - Space 8: Vermont Avenue equivalent
  - Space 9: Connecticut Avenue equivalent
- Magenta properties:
  - Space 11: St. Charles Place equivalent
  - Space 13: States Avenue equivalent
  - Space 14: Virginia Avenue equivalent
- Orange properties:
  - Space 16: St. James Place equivalent
  - Space 18: Tennessee Avenue equivalent
  - Space 19: New York Avenue equivalent
- Red properties:
  - Space 21: Kentucky Avenue equivalent
  - Space 23: Indiana Avenue equivalent
  - Space 24: Illinois Avenue equivalent
- Yellow properties:
  - Space 26: Atlantic Avenue equivalent
  - Space 27: Ventnor Avenue equivalent
  - Space 29: Marvin Gardens equivalent
- Green properties:
  - Space 31: Pacific Avenue equivalent
  - Space 32: North Carolina Avenue equivalent
  - Space 34: Pennsylvania Avenue equivalent
- Dark Blue properties:
  - Space 37: Park Place equivalent
  - Space 39: Boardwalk equivalent (the absolute market leader/monopoly)

2. Exactly 4 Platform/Infrastructure players (representing the 4 Railroads) at indices:
  - Space 5 (Platform 1)
  - Space 15 (Platform 2)
  - Space 25 (Platform 3)
  - Space 35 (Platform 4)

3. Exactly 2 Utility suppliers (representing Electric/Water) at indices:
  - Space 12 (Utility 1)
  - Space 28 (Utility 2)

4. Exactly 3 Chance events and 3 Community Chest events representing market occurrences (funding rounds, regulation audits, leaks, technology breakthroughs).

For EVERY company, generate deeply researched details in 4 key categories:
- Team: headcount, key executives (CEO and CTO with biographies), structure description, hiring trends, culture.
- Numbers: revenue, funding raised, burn rate, profitability, key assets, realistic purchasing costs (e.g., $60 to $400 matching Monopoly), rents (an array of 6 elements: [base, 1_stake, 2_stakes, 3_stakes, 4_stakes, max_acquisition_cost]), and stake investment cost (e.g., $50 to $200).
- Mission: mission statement, core philosophy, ethical dilemmas.
- Story: origin history, key pivots, major hurdles/challenges.

You MUST respond strictly with a valid JSON object matching the following TypeScript schema:
{
  "id": string (unique ID like "niche-name"),
  "niche": string,
  "companies": Array<{
    "name": string,
    "index": number,
    "colorGroup": "brown" | "light-blue" | "magenta" | "orange" | "red" | "yellow" | "green" | "dark-blue",
    "marketShare": string,
    "valuation": string,
    "purchaseCost": number,
    "rentPrices": number[], // 6 numbers
    "stakeCost": number,
    "team": {
      "headcount": string,
      "keyExecutives": Array<{ "name": string, "role": string, "bio": string }>,
      "structureDescription": string,
      "hiringTrends": string,
      "culture": string
    },
    "numbers": {
      "annualRevenue": string,
      "fundingRaised": string,
      "burnRate": string,
      "profitability": string,
      "keyAssets": string
    },
    "mission": {
      "statement": string,
      "corePhilosophy": string,
      "ethicalDilemmas": string
    },
    "story": {
      "origin": string,
      "pivots": string,
      "challenges": string
    }
  }>,
  "platforms": Array<{
    "name": string,
    "index": number,
    "role": string,
    "description": string,
    "purchaseCost": number, // e.g. 200
    "rentPrices": number[] // e.g. [25, 50, 100, 200]
  }>,
  "utilities": Array<{
    "name": string,
    "index": number,
    "role": string,
    "description": string,
    "purchaseCost": number // e.g. 150
  }>,
  "chanceEvents": Array<{
    "title": string,
    "description": string,
    "effect": { "type": "cash" | "marketShare" | "move" | "repairs", "value": number, "target": "current" | "all" }
  }>,
  "chestEvents": Array<{
    "title": string,
    "description": string,
    "effect": { "type": "cash" | "marketShare" | "move" | "repairs", "value": number, "target": "current" | "all" }
  }>
}

Ensure the companies correspond perfectly to the 22 indices specified above. No duplicate indices. Ensure names and data are realistic, professional, and immersive. Do not truncate. Return ONLY the raw JSON object.
`;

async function main() {
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    },
  });
  fs.writeFileSync('output.json', response.text);
  console.log('done');
}
main().catch(console.error);
