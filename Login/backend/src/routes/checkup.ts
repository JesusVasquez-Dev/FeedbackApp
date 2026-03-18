import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../supabase.js';

export const checkupRouter = Router();
const SCHEMA = process.env.SUPABASE_SCHEMA || 'feedbackApp';

async function insertWithFallback(table: string, payload: Record<string, any>) {
  let q = await supabase.schema(SCHEMA).from(table).insert(payload).select().single();
  if (q.error?.message?.includes('permission') || q.error?.message?.includes('relation') || q.error) {
    const alt = await supabase.schema('public').from(table).insert(payload).select().single();
    return alt;
  }
  return q;
}

async function selectWithFallback(table: string) {
  let q = await supabase.schema(SCHEMA).from(table).select('*');
  if (q.error?.message?.includes('permission') || q.error?.message?.includes('relation') || q.error) {
    const alt = await supabase.schema('public').from(table).select('*');
    return alt;
  }
  return q;
}

async function selectEqWithFallback(table: string, column: string, value: any) {
  let q = await supabase.schema(SCHEMA).from(table).select('*').eq(column, value);
  if (q.error?.message?.includes('permission') || q.error?.message?.includes('relation') || q.error) {
    const alt = await supabase.schema('public').from(table).select('*').eq(column, value);
    return alt;
  }
  return q;
}

async function selectSingleEqWithFallback(table: string, column: string, value: any, columns: string = '*') {
  let q = await supabase.schema(SCHEMA).from(table).select(columns).eq(column, value).maybeSingle();
  if (q.error?.message?.includes('permission') || q.error?.message?.includes('relation') || q.error) {
    const alt = await supabase.schema('public').from(table).select(columns).eq(column, value).maybeSingle();
    return alt;
  }
  return q;
}

const postSchema = z.object({
  employeeId: z.string().min(1),
  milestoneDay: z.union([z.literal(1), z.literal(30), z.literal(60), z.literal(90)]),
  answers: z.record(z.any()),
  notes: z.string().optional(),
});

checkupRouter.post('/', async (req: Request, res: Response) => {
  const parse = postSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }
  const { employeeId, milestoneDay, answers, notes } = parse.data;

  const { data, error } = await insertWithFallback('checkups', { user_id: employeeId, milestone_day: milestoneDay, answers, notes });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, data });
});

checkupRouter.get('/:employeeId', async (req: Request, res: Response) => {
  const employeeId = req.params.employeeId;
  const { data: employee, error: empErr } = await selectSingleEqWithFallback('profiles', 'user_id', employeeId, 'user_id, full_name, job_title, start_date');
  if (empErr) return res.status(500).json({ error: empErr.message });

  const list = await selectEqWithFallback('checkups', 'user_id', employeeId);
  // handle potential error
  if (list.error) return res.status(500).json({ error: String(list.error.message || list.error) });
  let checkups = (list.data as any[] | null) || [];
  // order client-side if fallback removed order
  checkups = checkups.sort((a, b) => (a.milestone_day ?? 0) - (b.milestone_day ?? 0));

  // Prefer canonical progress from the view
  const { data: progressRow, error: progErr } = await selectSingleEqWithFallback(
    'employee_progress',
    'user_id',
    employeeId,
    'progress_percentage, completed_days'
  );
  if (progErr) return res.status(500).json({ error: String(progErr.message || progErr) });

  const completedDays = (progressRow as any)?.completed_days as (1 | 30 | 60 | 90)[]
    || checkups.map((c: any) => c.milestone_day as 1 | 30 | 60 | 90);
  const progress = ((progressRow as any)?.progress_percentage as number)
    ?? Math.round(((completedDays || []).length / 4) * 100);
  res.json({ employee, checkups, progress, completedDays });
});
