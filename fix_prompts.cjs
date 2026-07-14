const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldPrompt1 = `4. REAL-WORLD VISUAL ASSET PIPELINE
- LOGOS: Do not attempt to generate or describe logos. Construct a deterministic URL string based on the company's verified domain name utilizing a clean public lookup syntax: \\\`https://logo.clearbit.com/[verified_domain]\\\`
- PORTRAITS: Find the real name of the primary executive. Return an open web URL link to their verified public headshot (e.g., from official corporate press kit pages or Wikimedia Commons found via search snippets). Do not use AI portrait generation text descriptions.`;

const newPrompt1 = `4. REAL-WORLD VISUAL ASSET PIPELINE
- LOGOS: Do not attempt to generate or describe logos. Construct a deterministic URL string based on the company's verified domain name utilizing a clean public lookup syntax: \\\`https://logo.clearbit.com/[verified_domain]\\\`
- PORTRAITS: Find the real name of the primary executive. You MUST use the googleSearch tool to find a direct URL link to a high-quality verified public headshot image (.jpg or .png) of the executive from official corporate press kit pages, LinkedIn, or Wikimedia Commons. Set this direct image URL as the headshot_url. If a direct image URL cannot be found, use "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png".`;

code = code.replace(oldPrompt1, newPrompt1);


const oldPrompt2 = `Guidelines:
1. STRICT TRUTH & NON-HALLUCINATION: You are STRICTLY FORBIDDEN from generating fictional executive names or backgrounds. Look up the actual public executives via web search. If real executive names cannot be found, populate the fields with "Executive Board", "Public Relations Team", or "Founding Team" rather than inventing a fictional person.
2. If "\${companyName}" is a real-world company, you MUST search for and retrieve its actual real-world executives and key players as of today. Use their real-world names, actual current roles, and accurate professional backgrounds.
3. For each key player, write highly specific, detailed, and accurate descriptions for their real achievements, career backgrounds, actual daily routines, and business/design philosophies.
4. Search for and retrieve precise real-world numbers (annual revenue, funding raised, burn rate, profitability, and key assets) and write a highly detailed origin story, pivots, and challenges.
5. You MUST generate between 2 and 5 key players depending on search results. Do not include private emails or phone numbers.`;

const newPrompt2 = `Guidelines:
1. STRICT TRUTH & NON-HALLUCINATION: You are STRICTLY FORBIDDEN from generating fictional executive names or backgrounds. Look up the actual public executives via web search using the googleSearch tool. If real executive names cannot be found, populate the fields with "Executive Board", "Public Relations Team", or "Founding Team" rather than inventing a fictional person.
2. If "\${companyName}" is a real-world company, you MUST use the googleSearch tool to search for and retrieve its actual real-world executives and key players as of today. Use their real-world names, actual current roles, and accurate professional backgrounds.
3. For each key player, write highly specific, detailed, and accurate descriptions for their real achievements, career backgrounds, actual daily routines, and business/design philosophies. Use the googleSearch tool to find a direct URL link to a high-quality verified public headshot image (.jpg or .png) of the executive and set it as avatarUrl. If a direct image URL cannot be found, use "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png".
4. Use the googleSearch tool to search for and retrieve precise real-world numbers (annual revenue, funding raised, burn rate, profitability, and key assets) and write a highly detailed origin story, pivots, and challenges.
5. You MUST generate between 2 and 5 key players depending on search results. Do not include private emails or phone numbers.`;

code = code.replace(oldPrompt2, newPrompt2);
fs.writeFileSync('server.ts', code);
