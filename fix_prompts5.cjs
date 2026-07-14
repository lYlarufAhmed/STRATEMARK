const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStrProfile = `Guidelines:
1. STRICT TRUTH & NON-HALLUCINATION`;

const newStrProfile = `Guidelines:
1. CORPORATE DIVISIONS: Do not treat internal divisions as standalone corporate entities. If "\${companyName}" is actually an internal division (like "Google DeepMind" or "Meta AI"), you MUST research and return the profile for its ultimate parent company (e.g. "Alphabet" or "Meta"), while mentioning the division in the keyAssets or story.
2. STRICT TRUTH & NON-HALLUCINATION`;

code = code.replace(targetStrProfile, newStrProfile);

fs.writeFileSync('server.ts', code);
