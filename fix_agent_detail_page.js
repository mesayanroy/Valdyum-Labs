const fs = require('fs');
const file = 'c:/Users/SAYAN/Valdyum-Labs-1/client/app/agents/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Background
content = content.replace('#120b07', '#1a1a1c');

// Live Feed trigger
const oldSuccess = `      setOutput(String(data.output || ''));
      setLastBilledSol(Number(data.billed_sol || 0));
      setRuntimeInfo(data.runtime || null);`;
const newSuccess = `      setOutput(String(data.output || ''));
      setLastBilledSol(Number(data.billed_sol || 0));
      setRuntimeInfo(data.runtime || null);

      // Trigger local feed update
      window.dispatchEvent(new CustomEvent('agent_run_success', {
        detail: {
          requestId: data.request_id || Math.random().toString(36).substring(7),
          agentId,
          latencyMs: data.latency_ms || 450,
        },
      }));`;

content = content.replace(oldSuccess, newSuccess);

fs.writeFileSync(file, content);
