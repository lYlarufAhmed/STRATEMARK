const fs = require('fs');

const code = fs.readFileSync('server.ts', 'utf8');
const parseFuncCode = code.substring(code.indexOf('function cleanAndParseJSON'), code.indexOf('function resolveModelName'));
const jsCode = parseFuncCode.replace(': string', '').replace(': any', '').replace('err: any', 'err').replace('secondErr: any', 'secondErr');

const safeLog = () => {};
eval(jsCode);

const testStr = '{\n  "test": "this has a control char \x03 in it"\n}';
try {
  console.log("Testing parse:", cleanAndParseJSON(testStr));
} catch (e) {
  console.error("Test failed", e);
}
