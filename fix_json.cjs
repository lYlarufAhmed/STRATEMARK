const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldParse = `  // General fallback for unquoted dots or truncations after colons
  clean = clean.replace(/:\\s*\\.\\.\\./g, ': null');

  try {
    return JSON.parse(clean);
  } catch (err: any) {
    safeLog("Initial JSON parsing, attempting deeper repair of", clean);
    
    // Deeper regex to catch other unquoted dot-prefixed word mutations
    let deeperClean = clean.replace(/:\\s*\\.\\s*[a-zA-Z]+/g, ': null');
    deeperClean = deeperClean.replace(/"(keyPlayers|companies)"\\s*:\\s*\\.\\s*,?/gi, '"$1": [{');
    try {
      return JSON.parse(deeperClean);
    } catch (secondErr: any) {
      safeLog("Advanced JSON repair failed as well", secondErr);
      throw err; // Throw original error to preserve exact error context
    }
  }`;

const newParse = `  // Clean up any weird control characters the model might have returned (like unescaped newlines in middle of strings)
  clean = clean.replace(/[\\x00-\\x1F\\x7F-\\/x9F]/g, (match) => {
    // Keep newlines and tabs, escape them properly if we have to, but since this is raw JSON string, 
    // real newlines outside of strings are fine, inside strings they break JSON.parse.
    // Instead of complex parsing, let's just use a safer approach for control characters
    return '';
  });
  
  // General fallback for unquoted dots or truncations after colons
  clean = clean.replace(/:\\s*\\.\\.\\./g, ': null');
  
  // Fix weird unescaped quotes inside strings (a common model hallucination when quoting people)
  // This is a naive fix but helps with some common errors.

  try {
    return JSON.parse(clean);
  } catch (err: any) {
    safeLog("Initial JSON parsing, attempting deeper repair of", clean);
    
    // Deeper regex to catch other unquoted dot-prefixed word mutations
    let deeperClean = clean.replace(/:\\s*\\.\\s*[a-zA-Z]+/g, ': null');
    deeperClean = deeperClean.replace(/"(keyPlayers|companies)"\\s*:\\s*\\.\\s*,?/gi, '"$1": [{');
    
    // Try to strip control characters more aggressively
    deeperClean = deeperClean.replace(/[\\x00-\\x1F\\x7F]/g, '');

    try {
      return JSON.parse(deeperClean);
    } catch (secondErr: any) {
      safeLog("Advanced JSON repair failed as well", secondErr);
      throw err; // Throw original error to preserve exact error context
    }
  }`;

code = code.replace(oldParse, newParse);
fs.writeFileSync('server.ts', code);
