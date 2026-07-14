const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStrBoard = `### OUTPUT JSON SCHEMA
You must output a single, clean JSON object matching this schema exactly:`;

const newStrBoard = `### OUTPUT JSON SCHEMA
You must output a single, clean JSON object matching this schema exactly. You MUST output between 20 and 30 companies in the array. Never output fewer than 20 companies:`;

code = code.replace(targetStrBoard, newStrBoard);

fs.writeFileSync('server.ts', code);
