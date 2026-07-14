const fs = require('fs');
let code = fs.readFileSync('src/components/ResearchPortal.tsx', 'utf8');

const target = `                        <img 
                          src={player.avatarUrl} 
                          alt={player.name}`;

const replacement = `                        <img 
                          src={player.avatarUrl || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(player.name)}&background=F1EBE4&color=4F4739\`} 
                          alt={player.name}`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/ResearchPortal.tsx', code);
