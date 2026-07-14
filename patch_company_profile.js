const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `    keyPlayers: Array<{
      name: string; // The official real-world executive or key player name (e.g. Sam Altman, Satya Nadella, Sundar Pichai)
      role: string; // Their current official role
      bio: string; // Catchy short professional bio`;

const replacement = `    keyPlayers: Array<{
      name: string; // The official real-world executive or key player name (e.g. Sam Altman, Satya Nadella, Sundar Pichai)
      role: string; // Their current official role
      avatarUrl: string; // MUST be a real verified open web image URL to their public headshot from search snippets
      bio: string; // Catchy short professional bio`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
