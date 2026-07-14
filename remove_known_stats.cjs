const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetLogo = `  // Static lookup to bypass Gemini API completely for well-known brands
  const knownStats = getKnownCompanyStats(companyName);
  if (knownStats) {
    let matchedLogoUrl = '';
    if (!matchedLogoUrl && knownStats.simpleIconSlug) {
      matchedLogoUrl = \`https://cdn.jsdelivr.net/npm/simple-icons@v10/icons/\${knownStats.simpleIconSlug}.svg\`;
    }
    if (!matchedLogoUrl && knownStats.domain) {
      matchedLogoUrl = \`https://logo.clearbit.com/\${knownStats.domain}?size=256\`;
    }
    const matchedCoverUrl = \`https://images.unsplash.com/featured/800x400/?\${encodeURIComponent(knownStats.coverQuery || companyName)}\`;
    const media = { logoUrl: matchedLogoUrl, coverUrl: matchedCoverUrl, url: matchedLogoUrl };
    brandMediaCache.set(cacheKey, media);
    return res.json(media);
  }`;

code = code.replace(targetLogo, '');

// also in generateFallbackCompanyProfile
const targetFallbackProfile = `    const knownStats = getKnownCompanyStats(name);
    if (knownStats) {
      marketShare = knownStats.marketShare;
      valuation = knownStats.valuation;
      revenue = knownStats.annualRevenue;
      funding = knownStats.fundingRaised;
      burn = knownStats.burnRate;
      profitability = knownStats.profitability;
      finalKeyAssets = knownStats.keyAssets;
    }`;

code = code.replace(targetFallbackProfile, '');

fs.writeFileSync('server.ts', code);
