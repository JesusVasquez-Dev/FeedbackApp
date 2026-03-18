import { Router, Request, Response } from 'express';
import { supabase } from '../supabase.js';

export const employeesRouter = Router();

employeesRouter.get('/', async (_req: Request, res: Response) => {
  // Pull employees from profiles and progress from the view
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('user_id, full_name, job_title, start_date, department_id, location, timezone')
    .order('start_date', { ascending: false });
  if (pErr) return res.status(500).json({ error: pErr.message });

  const ids = (profiles || []).map((p) => p.user_id);
  const { data: progressRows, error: prErr } = await supabase
    .from('employee_progress')
    .select('user_id, progress_percentage, completed_days')
    .in('user_id', ids);
  if (prErr) return res.status(500).json({ error: prErr.message });

  const progressMap = new Map<string, { pct: number; days: number[] }>();
  (progressRows || []).forEach((r: any) => progressMap.set(r.user_id, { pct: r.progress_percentage, days: r.completed_days || [] }));

  const result = (profiles || []).map((p: any) => ({
    id: p.user_id,
    full_name: p.full_name,
    job_title: p.job_title,
    start_date: p.start_date,
    department_id: p.department_id,
    location: p.location,
    timezone: p.timezone,
    progressPercent: progressMap.get(p.user_id)?.pct ?? 0,
    completedDays: progressMap.get(p.user_id)?.days ?? [],
  }));

  res.json({ employees: result });
});
