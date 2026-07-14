const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(`    safeLog('Gemini API is not configured. Returning procedural fallback board.');
    const fallbackData = generateFallbackBoard(niche);
    return res.json(fallbackData);`, `    return res.status(401).json({ error: 'Gemini API key is required but not configured.' });`);

code = code.replace(`    safeLog('Gemini API is not configured. Returning procedural company profile.');
    const fallbackData = generateFallbackCompanyProfile(companyName, niche);
    return res.json(fallbackData);`, `    return res.status(401).json({ error: 'Gemini API key is required but not configured.' });`);

fs.writeFileSync('server.ts', code);
