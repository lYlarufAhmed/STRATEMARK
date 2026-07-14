const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetSort = `      // Sort mathematically by true market share percentage
      uniqueCompanies.sort((a, b) => {
        const shareA = parseFloat(a.financials?.market_share_percentage) || 0;
        const shareB = parseFloat(b.financials?.market_share_percentage) || 0;
        return shareA - shareB;
      });

      // Map to frontend shape and assign tier/index
      boardData.companies = uniqueCompanies.slice(0, 20).map((c: any, index: number) => {`;

const newSort = `      // 1. Sort descending to get the top 20 by market share
      uniqueCompanies.sort((a, b) => {
        const shareA = parseFloat(a.financials?.market_share_percentage) || 0;
        const shareB = parseFloat(b.financials?.market_share_percentage) || 0;
        return shareB - shareA; // Descending
      });

      // 2. Take the top 20, then sort ascending for the Monopoly board layout (smallest to largest)
      const top20Companies = uniqueCompanies.slice(0, 20).sort((a, b) => {
        const shareA = parseFloat(a.financials?.market_share_percentage) || 0;
        const shareB = parseFloat(b.financials?.market_share_percentage) || 0;
        return shareA - shareB; // Ascending
      });

      // Map to frontend shape and assign tier/index
      boardData.companies = top20Companies.map((c: any, index: number) => {`;

code = code.replace(targetSort, newSort);

fs.writeFileSync('server.ts', code);
