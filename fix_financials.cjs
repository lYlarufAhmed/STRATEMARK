const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetSortTop = `        const shareA = parseFloat(a.financials?.market_share_percentage) || 0;`;
const newSortTop = `        const shareA = parseFloat(a.financials?.market_share_percentage || a.market_share_percentage || a.marketShareNumeric || a.marketShare) || 0;`;

code = code.replace(/parseFloat\(a\.financials\?\.market_share_percentage\)/g, "parseFloat(a.financials?.market_share_percentage || a.market_share_percentage || a.marketShareNumeric || a.marketShare)");
code = code.replace(/parseFloat\(b\.financials\?\.market_share_percentage\)/g, "parseFloat(b.financials?.market_share_percentage || b.market_share_percentage || b.marketShareNumeric || b.marketShare)");

const targetValStr = `const valStr = c.financials?.valuation_numeric_usd ? formatter.format(c.financials.valuation_numeric_usd) : "N/A";`;
const newValStr = `const valNum = c.financials?.valuation_numeric_usd || c.valuation_numeric_usd || c.valuationNumericUsd || c.valuation;
        const valStr = valNum ? (typeof valNum === 'number' ? formatter.format(valNum) : valNum) : "N/A";`;

const targetRevStr = `const revStr = c.financials?.annual_revenue_arr_usd ? formatter.format(c.financials.annual_revenue_arr_usd) : "N/A";`;
const newRevStr = `const revNum = c.financials?.annual_revenue_arr_usd || c.annual_revenue_arr_usd || c.annualRevenueArrUsd || c.annualRevenue;
        const revStr = revNum ? (typeof revNum === 'number' ? formatter.format(revNum) : revNum) : "N/A";`;

code = code.replace(targetValStr, newValStr);
code = code.replace(targetRevStr, newRevStr);

const targetMarketShareStr = `marketShare: \`\${c.financials?.market_share_percentage || 0}%\`,
          marketShareNumeric: c.financials?.market_share_percentage || 0,`;
const newMarketShareStr = `marketShare: \`\${c.financials?.market_share_percentage || c.market_share_percentage || c.marketShareNumeric || c.marketShare || 0}%\`.replace('%%', '%'),
          marketShareNumeric: parseFloat(c.financials?.market_share_percentage || c.market_share_percentage || c.marketShareNumeric || c.marketShare) || 0,`;

code = code.replace(targetMarketShareStr, newMarketShareStr);

fs.writeFileSync('server.ts', code);
