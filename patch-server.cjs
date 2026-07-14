const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf-8');

const newEndpoint = `
app.post('/api/generate-company-profile', async (req, res) => {
  const { companyName, niche, aiConfig } = req.body;
  if (!companyName) {
    return res.status(400).json({ error: 'Company name is required.' });
  }

  const ai = getAI();
  if (!ai) {
    return res.status(503).json({ error: 'Gemini API not configured.' });
  }

  try {
    const requestedModelName = aiConfig?.modelName || 'gemini-3.5-flash';
    const modelName = resolveModelName(requestedModelName);
    console.log(\`Generating deep dive for company: "\${companyName}" in "\${niche}" using model \${modelName}\`);

    const prompt = \`
You are an expert Wall Street research firm.
Generate a deeply researched, real-world detail deep-dive (if it maps to a real company) or highly realistic projections for the company "\${companyName}" operating in the "\${niche}" niche.

Provide information in 4 key categories:
- Team: headcount, key executives (CEO and CTO with biographies), structure description, hiring trends, culture.
- Numbers: annual revenue, funding raised, burn rate, profitability, key assets.
- Mission: mission statement, core philosophy, ethical dilemmas.
- Story: origin history, key pivots, major hurdles/challenges.

You MUST respond strictly with a valid JSON object matching the requested schema. Ensure names and data are realistic, professional, and immersive. Use Search grounding if needed.
\`;

    const config = getModelConfig(modelName, aiConfig?.thinkingEffort);
    config.responseMimeType = 'application/json';
    config.responseSchema = {
      type: Type.OBJECT,
      properties: {
        team: {
          type: Type.OBJECT,
          properties: {
            headcount: { type: Type.STRING },
            keyExecutives: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  bio: { type: Type.STRING }
                }
              }
            },
            structureDescription: { type: Type.STRING },
            hiringTrends: { type: Type.STRING },
            culture: { type: Type.STRING }
          }
        },
        numbers: {
          type: Type.OBJECT,
          properties: {
            annualRevenue: { type: Type.STRING },
            fundingRaised: { type: Type.STRING },
            burnRate: { type: Type.STRING },
            profitability: { type: Type.STRING },
            keyAssets: { type: Type.STRING }
          }
        },
        mission: {
          type: Type.OBJECT,
          properties: {
            statement: { type: Type.STRING },
            corePhilosophy: { type: Type.STRING },
            ethicalDilemmas: { type: Type.STRING }
          }
        },
        story: {
          type: Type.OBJECT,
          properties: {
            origin: { type: Type.STRING },
            pivots: { type: Type.STRING },
            challenges: { type: Type.STRING }
          }
        }
      }
    };

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config,
    });

    const jsonText = response.text ? response.text.trim() : '';
    if (!jsonText) {
      throw new Error("Empty response from Gemini API.");
    }
    const profileData = JSON.parse(jsonText);
    return res.json(profileData);
  } catch (error: any) {
    console.error('Error generating company profile:', error);
    const cleanMsg = cleanGeminiError(error);
    return res.status(500).json({ error: \`Failed to generate company profile: \${cleanMsg}\` });
  }
});
`;

const insertIndex = content.indexOf('app.post(\'/api/deep-research');
const updatedContent = content.slice(0, insertIndex) + newEndpoint + '\n' + content.slice(insertIndex);
fs.writeFileSync('server.ts', updatedContent);
