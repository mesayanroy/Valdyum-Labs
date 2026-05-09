const fs = require('fs');
const file = 'c:/Users/SAYAN/Valdyum-Labs-1/client/app/agents/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Dark Grey background
content = content.replace(/bg-\[.*?\],#0a0a0c\]/g, 'bg-[#1a1a1c]');
content = content.replace(/bg-\[#0a0a0c\]/g, 'bg-[#1a1a1c]');

// Fallback for MEV Bot UUID
content = content.replace(
    'agentId={agent.anchor_contract_id || agent.id}', 
    "agentId={agent.id === 'ac933e1b-7e93-4538-9199-d026e57ca7d7' ? '8nD1jMsRYEc8qCauqbKbWaoVmF8wsf13baDzQcfaJLUv' : (agent.anchor_contract_id || agent.id)}"
);

fs.writeFileSync(file, content);
