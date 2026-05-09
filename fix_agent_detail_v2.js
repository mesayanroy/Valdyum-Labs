const fs = require('fs');
const file = 'c:/Users/SAYAN/Valdyum-Labs-1/client/app/agents/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Background to Dark Grey
content = content.replace(/#120b07/g, '#1a1a1c');

// Fix Live Feed fallback in runAgent
const eventDispatch = `      // Trigger local feed update
      window.dispatchEvent(new CustomEvent('agent_run_success', {
        detail: {
          requestId: data.request_id || Math.random().toString(36).substring(7),
          agentId,
          latencyMs: data.latency_ms || 450,
        },
      }));`;

// I'll add a state for local events
if (!content.includes('const [localEvents, setLocalEvents]')) {
    content = content.replace('const { events: allEvents, isConnected } = useMarketplaceFeed({ maxEvents: 20 });', 
        `const { events: allEvents, isConnected } = useMarketplaceFeed({ maxEvents: 20 });
  const [localEvents, setLocalEvents] = useState<any[]>([]);`);
    
    content = content.replace('const agentEvents = allEvents.filter(e => e.agentId === agentId);', 
        'const agentEvents = [...localEvents, ...allEvents.filter(e => e.agentId === agentId)];');
}

// Update runAgent success to add to localEvents
const successBlock = `setOutput(String(data.output || ''));
      setLastBilledSol(Number(data.billed_sol || 0));
      setRuntimeInfo(data.runtime || null);`;

const newSuccessBlock = `setOutput(String(data.output || ''));
      setLastBilledSol(Number(data.billed_sol || 0));
      setRuntimeInfo(data.runtime || null);

      // Add to local feed instantly
      setLocalEvents(prev => [{
        id: data.request_id || Math.random().toString(36).substring(7),
        agentId,
        agentName: agent.name,
        eventType: 'execution',
        timestamp: new Date().toISOString(),
        payload: {
          input: input.slice(0, 50),
          output: String(data.output || '').slice(0, 50),
          latency: data.latency_ms || 450
        }
      }, ...prev].slice(0, 10));`;

content = content.replace(successBlock, newSuccessBlock);

fs.writeFileSync(file, content);
