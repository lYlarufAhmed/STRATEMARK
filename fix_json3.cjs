const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `  // Let's replace any newline that isn't preceded by a comma, bracket, or brace (roughly)
  clean = clean.replace(/(?<![,{\\[:]\\s*)\\n(?!\\s*["}\\]])/g, ' '); // replace internal newlines with space`;

const newStr = `  // Let's escape all newlines to \\n first, then we can parse it, or we can just replace all newlines with a space.
  // Replacing ALL newlines with a space is safest since it's just text data anyway.
  clean = clean.replace(/\\n/g, ' ');`;

code = code.replace(targetStr, newStr);
fs.writeFileSync('server.ts', code);
