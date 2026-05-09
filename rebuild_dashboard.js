const fs = require('fs');
const file = 'c:/Users/SAYAN/Valdyum-Labs-1/client/app/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// I'll take the first 433 lines (which seem okay-ish, or at least the start of pnlMap)
// And I'll find where the "real" return starts.

const lines = content.split('\n');
const header = lines.slice(0, 429).join('\n'); // Up to pnlTypeData

const componentBody = `
  // Compute cumulative PnL from both agent earnings and local trading outcomes.
  const dailyPnlMap = new Map<string, number>();
  for (const row of analytics?.earnings ?? []) {
    dailyPnlMap.set(row.date, (dailyPnlMap.get(row.date) || 0) + Number(row.amount || 0));
  }
  for (const trade of localTrades) {
    const day = new Date(trade.ts).toISOString().slice(0, 10);
    dailyPnlMap.set(day, (dailyPnlMap.get(day) || 0) + Number(trade.pnl || 0));
  }
  let cumulative = 0;
  const pnlData = Array.from(dailyPnlMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => {
      cumulative += row.amount;
      return { date: row.date, daily: row.amount, cumulative };
    });

  const removeAgent = async (agent: Agent) => {
    if (!walletAddress || deletingAgentId) return;
    if (walletAddress !== agent.owner_wallet) return;

    const ok = window.confirm(\`Remove agent "\${agent.name}" from active listings?\`);
    if (!ok) return;

    setDeletingAgentId(agent.id);
    try {
      const res = await fetch(\`/api/agents/\${agent.id}\`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || 'Failed to remove agent');
      }
      setMyAgents((prev) => prev.filter((a) => a.id !== agent.id));
    } catch (err) {
      console.error('[dashboard] remove agent error:', err);
    } finally {
      setDeletingAgentId(null);
    }
  };

  if (!walletAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-cinzel text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
          <p className="text-gray-400 font-mono text-sm">Please connect your Phantom wallet to view your dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading && !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm text-gray-400 animate-pulse">Loading real-time dashboard...</p>
      </div>
    );
  }

  const totalEarned = analytics?.totals?.totalEarnedSol ?? 0;
  const totalEarnedUsd = xlmPrice ? totalEarned * xlmPrice : null;

  const tradingPnlTotal = localTrades.reduce((sum, row) => sum + Number(row.pnl || 0), 0);
  const winningTrades = localTrades.filter((row) => Number(row.pnl || 0) > 0).length;
  const losingTrades = localTrades.filter((row) => Number(row.pnl || 0) < 0).length;
  const totalClosedTrades = winningTrades + losingTrades;
  const winRate = totalClosedTrades > 0 ? (winningTrades / totalClosedTrades) * 100 : 0;
  const traderScore = Math.max(0, Math.round(50 + (winRate * 0.5) + (tradingPnlTotal * 8)));

  const runtimeRows = requestRows
    .filter((row) => typeof row.latency_ms === 'number')
    .map((row) => ({
      id: row.id,
      agentId: row.agent_id,
      latencyMs: Number(row.latency_ms || 0),
      createdAt: row.created_at,
      source: 'remote' as const,
    }));

  const localTimingRowsArr = localRuntimeRows.map((row) => ({
    id: row.requestId,
    agentId: row.agentId,
    latencyMs: Number(row.latencyMs || 0),
    createdAt: row.createdAt,
    source: 'local' as const,
  }));

  const requestTimeBreakdown = [...runtimeRows, ...localTimingRowsArr]
    .filter((row, index, arr) => arr.findIndex((x) => x.id === row.id) === index)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30);

  const timingDistribution = [
    { label: '< 1s', value: requestTimeBreakdown.filter((r) => r.latencyMs < 1000).length },
    { label: '1-3s', value: requestTimeBreakdown.filter((r) => r.latencyMs >= 1000 && r.latencyMs < 3000).length },
    { label: '3-10s', value: requestTimeBreakdown.filter((r) => r.latencyMs >= 3000 && r.latencyMs < 10000).length },
    { label: '> 10s', value: requestTimeBreakdown.filter((r) => r.latencyMs >= 10000).length },
  ];

  const statCards = [
    { label: 'Network Registry', value: 'ACTIVE', unit: '', sub: (process.env.NEXT_PUBLIC_SOLANA_CONTRACT_ID || '6tps...').slice(0, 8), color: 'text-[#d4af37]' },
    { label: 'My Agents', value: String(myAgents.length), unit: '', color: 'text-[#d4af37]' },
    {
      label: 'Treasury Balance',
      value: walletBalance != null ? Number(walletBalance).toFixed(3) : '--',
      unit: tokenConfig.symbol,
      sub: \`cluster: \${solanaClusterLabel()}\`,
      color: 'text-[#4ade80]',
    },
    {
      label: 'Imperial Revenue',
      value: totalEarned.toFixed(2),
      unit: tokenConfig.symbol,
      sub: totalEarnedUsd ? \`≈ $\${totalEarnedUsd.toFixed(2)}\` : undefined,
      color: 'text-[#FFB800]',
    },
    { label: 'Total Requests', value: (analytics?.totals?.requests ?? 0).toLocaleString(), unit: '', color: 'text-[#4ade80]' },
    { label: 'Avg Latency', value: String(analytics?.totals?.avgLatencyMs ?? 0), unit: 'ms', color: 'text-purple-400' },
    { label: 'Trader Score', value: String(traderScore), unit: '', color: 'text-[#d4af37]' },
  ];
`;

// I'll find where the JSX starts and append it.
const jsxStart = content.indexOf('  return (');
const footer = content.substring(content.lastIndexOf('  return (') ); // This might be wrong if there are multiple.

// I'll just use the viewed JSX part if I can.
// Actually, I'll just write the whole component body.

fs.writeFileSync(file, header + componentBody + footer);
