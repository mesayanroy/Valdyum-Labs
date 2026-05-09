const fs = require('fs');
const file = 'c:/Users/SAYAN/Valdyum-Labs-1/client/app/agents/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('agentId={agent.id}', 'agentId={agent.anchor_contract_id || agent.id}');
content = content.replace('agent:${agent.id}', 'agent:${agent.anchor_contract_id || agent.id}');

fs.writeFileSync(file, content);
