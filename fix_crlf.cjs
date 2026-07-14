const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `  // Remove unescaped control characters EXCEPT newlines and carriage returns which are needed for JSON formatting
  clean = clean.replace(/[\\x00-\\x09\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, '');`;

const newStr = `  // First, completely strip any control characters outside of valid whitespace
  clean = clean.replace(/[\\x00-\\x09\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, '');
  
  // Model often returns literal unescaped newlines INSIDE json string values which breaks JSON.parse
  // We need to escape them before parsing. 
  // A simple hacky approach for this specific edge case is to just stringify the whole thing then parse it back, 
  // or we can use a more robust regex to escape newlines inside quotes.
  // Actually, standard JSON format requires newlines inside strings to be escaped as \\n.
  // If the model gave us raw newlines, they are invalid.
  // Let's replace any newline that isn't preceded by a comma, bracket, or brace (roughly)
  clean = clean.replace(/(?<![,{\\[:]\\s*)\\n(?!\\s*["}\\]])/g, ' '); // replace internal newlines with space`;

code = code.replace(targetStr, newStr);
fs.writeFileSync('server.ts', code);
