const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetBoard = `    // Enforce 100% accurate financial stats on post-processed real-world companies
    if (boardData && boardData.companies) {
      boardData.companies = boardData.companies.map((c: any) => {
        const stats = getKnownCompanyStats(c.name);
        if (stats) {
          c.valuation = stats.valuation;
          c.marketShare = stats.marketShare;
          if (!c.numbers) c.numbers = {};
          c.numbers.annualRevenue = stats.annualRevenue;
          c.numbers.fundingRaised = stats.fundingRaised;
          c.numbers.burnRate = stats.burnRate;
          c.numbers.profitability = stats.profitability;
          c.numbers.keyAssets = stats.keyAssets;
        }
        return c;
      });
    }`;

const targetProfile = `    // Enforce 100% accurate financial stats on post-processed real-world companies
    const knownStats = getKnownCompanyStats(companyName);
    if (knownStats && profileData && profileData.numbers) {
      profileData.numbers.annualRevenue = knownStats.annualRevenue;
      profileData.numbers.fundingRaised = knownStats.fundingRaised;
      profileData.numbers.burnRate = knownStats.burnRate;
      profileData.numbers.profitability = knownStats.profitability;
      profileData.numbers.keyAssets = knownStats.keyAssets;
    }`;

code = code.replace(targetBoard, '');
code = code.replace(targetProfile, '');

fs.writeFileSync('server.ts', code);
