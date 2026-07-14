const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetMap = `          domain: c.domain,
          index: boardIndex,
          tier,`;

const replacementMap = `          domain: c.domain,
          logoUrl: c.logo_url || \`https://logo.clearbit.com/\${c.domain}?size=256\`,
          index: boardIndex,
          tier,`;

code = code.replace(targetMap, replacementMap);

fs.writeFileSync('server.ts', code);
