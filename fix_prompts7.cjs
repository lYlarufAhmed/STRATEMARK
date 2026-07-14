const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStrBoardSchema = `"financials": {
        "valuation_numeric_usd": 80000000000,`;

const newStrBoardSchema = `"hq_location": {
        "city": "String",
        "state": "String",
        "country": "String"
      },
      "financials": {
        "valuation_numeric_usd": 80000000000,`;

code = code.replace(targetStrBoardSchema, newStrBoardSchema);

fs.writeFileSync('server.ts', code);
