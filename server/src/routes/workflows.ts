import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router: Router = Router();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type WorkflowRecord = {
  id: string;
  owner_wallet: string | null;
  name: string;
  description?: string;
  definition: Record<string, unknown>;
  updated_at: string;
};

const workflows: WorkflowRecord[] = [];

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

router.get('/', async (req: Request, res: Response) => {
  const owner = req.query.owner as string | undefined;
  const supabase = getSupabase();

  if (supabase) {
    let query = supabase.from('workflows').select('*').order('updated_at', { ascending: false });
    if (owner) query = query.eq('owner_wallet', owner);
    const { data, error } = await query;
    if (!error) {
      res.json({ workflows: data || [] });
      return;
    }
  }

  const list = owner ? workflows.filter((w) => w.owner_wallet === owner) : workflows;
  res.json({ workflows: list });
});

router.post('/', async (req: Request, res: Response) => {
  const body = req.body || {};
  const record: WorkflowRecord = {
    id: body.id || `wf_${Date.now().toString(36)}`,
    owner_wallet: body.owner_wallet || null,
    name: body.name || 'Untitled Workflow',
    description: body.description || '',
    definition: body.definition || {},
    updated_at: new Date().toISOString(),
  };

  workflows.unshift(record);
  workflows.splice(100);

  const supabase = getSupabase();
  if (supabase) {
    await supabase.from('workflows').upsert({
      id: record.id,
      owner_wallet: record.owner_wallet,
      name: record.name,
      description: record.description,
      definition: record.definition,
      updated_at: record.updated_at,
    }, { onConflict: 'id' }).catch(() => undefined);
  }

  res.json({ workflow: record });
});

router.get('/:id', async (req: Request, res: Response) => {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (!error && data) {
      res.json(data);
      return;
    }
  }

  const record = workflows.find((workflow) => workflow.id === req.params.id);
  if (!record) {
    res.status(404).json({ error: 'Workflow not found' });
    return;
  }
  res.json(record);
});

router.post('/:id/run', async (req: Request, res: Response) => {
  const runId = `run_${Date.now().toString(36)}`;
  res.json({
    runId,
    status: 'queued',
    message: 'Workflow execution queued',
  });
});

export default router;
