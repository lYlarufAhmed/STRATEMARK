const fs = require('fs');
let code = fs.readFileSync('src/components/ResearchPortal.tsx', 'utf8');

const target2 = `                    <img 
                      src={selectedPlayer.avatarUrl} 
                      alt={selectedPlayer.name}`;

const replacement2 = `                    <img 
                      src={selectedPlayer.avatarUrl || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(selectedPlayer.name)}&background=F1EBE4&color=4F4739\`} 
                      alt={selectedPlayer.name}`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/components/ResearchPortal.tsx', code);
