const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `  // Clean up any weird control characters the model might have returned (like unescaped newlines in middle of strings)
  clean = clean.replace(/[\\x00-\\x1F\\x7F-\\/x9F]/g, (match) => {
    // Keep newlines and tabs, escape them properly if we have to, but since this is raw JSON string, 
    // real newlines outside of strings are fine, inside strings they break JSON.parse.
    // Instead of complex parsing, let's just use a safer approach for control characters
    return '';
  });`;

const newStr = `  // Remove unescaped control characters EXCEPT newlines and carriage returns which are needed for JSON formatting
  clean = clean.replace(/[\\x00-\\x09\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, '');`;

code = code.replace(targetStr, newStr);
fs.writeFileSync('server.ts', code);
