const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace("  }\n}\n\napp.post('/api/generate-company-profile", "  }\n});\n\napp.post('/api/generate-company-profile");

fs.writeFileSync('server.ts', code);
