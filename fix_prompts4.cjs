const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `- Have the model extract a raw, unstructured list of 25 to 30 real-world corporate entities and their verified domain names. Over-provisioning to 30 ensures we can weed out entities with zero public data.`;

const newStr = `- Have the model extract a raw, unstructured list of 25 to 30 real-world corporate entities and their verified domain names. Over-provisioning to 30 ensures we can weed out entities with zero public data.
- CORPORATE DIVISIONS: Do not create standalone companies out of parent corporate divisions. Use the ultimate parent company (e.g., use "Alphabet" instead of "Google DeepMind", or "Meta" instead of "Meta AI") if the division is not an independent corporate entity.`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('server.ts', code);
