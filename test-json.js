const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// evaluate the function
const parseFuncCode = code.substring(code.indexOf('function cleanAndParseJSON(jsonText: string): any {'), code.indexOf('function resolveModelName('));
const jsCode = parseFuncCode.replace(': string', '').replace(': any', '').replace('err: any', 'err').replace('secondErr: any', 'secondErr').replace('function safeLog(message: string, error?: any) {\n  // Silent fallback logger to avoid triggering automated log parser errors\n}', 'function safeLog(){}');

const safeLog = () => {};
eval(jsCode);

const testStr = '{\n  "test": "this has a control char \x03 in it"\n}';
try {
  console.log("Testing:", cleanAndParseJSON(testStr));
} catch (e) {
  console.error("Test failed", e);
}
