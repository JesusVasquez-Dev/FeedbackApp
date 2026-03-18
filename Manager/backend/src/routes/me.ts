import { Router, Request, Response } from 'express';
import { supabase } from '../supabase.js';

export const meRouter = Router();
const SCHEMA = process.env.SUPABASE_SCHEMA || 'feedbackApp';

// (removed upsert helper) Only update existing rows now.

// Helper: select single row from the given table by column=value with schema fallback
async function selectSingleWithFallback(table: string, column: string, value: any) {
  let q = await supabase.schema(SCHEMA).from(table).select('*').eq(column, value).maybeSingle();
  if (q.error?.message?.includes('permission') || q.error?.message?.includes('relation') || q.error) {
    const alt = await supabase.schema('public').from(table).select('*').eq(column, value).maybeSingle();
    return alt;
  }
  return q;
}

async function selectSingleIlikeWithFallback(table: string, column: string, value: string) {
  let q = await supabase.schema(SCHEMA).from(table).select('*').ilike(column, value).maybeSingle();
  if (q.error?.message?.includes('permission') || q.error?.message?.includes('relation') || q.error) {
    const alt = await supabase.schema('public').from(table).select('*').ilike(column, value).maybeSingle();
    return alt;
  }
  return q;
}

// Helper: update rows where column=value with schema fallback
async function updateWhereWithFallback(table: string, whereCol: string, whereVal: any, payload: Record<string, any>) {
  let q = await supabase.schema(SCHEMA).from(table).update(payload).eq(whereCol, whereVal).select().maybeSingle();
  if (q.error?.message?.includes('permission') || q.error?.message?.includes('relation') || q.error) {
    const alt = await supabase.schema('public').from(table).update(payload).eq(whereCol, whereVal).select().maybeSingle();
    return alt;
  }
  return q;
}

// PROFILE
meRouter.get('/:userId/profile', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const email = (req.query.email as string | undefined)?.trim();

  try {
    console.log('[me] GET /:userId/profile', { userId, email });
    // Prefer email lookup if provided
    if (email) {
      const byEmail = await selectSingleIlikeWithFallback('profiles', 'email', email);
      if (byEmail.error) {
        console.warn('[me] profile by email error', byEmail.error.message);
        throw byEmail.error;
      }
      if (byEmail.data) {
        console.log('[me] profile FOUND by email');
        return res.json({ profile: byEmail.data });
      } else {
        console.log('[me] profile NOT found by email, falling back to user_id');
      }
      // else fall through to user_id lookup
    }

    const byUser = await selectSingleWithFallback('profiles', 'user_id', userId);
    if (byUser.error) {
      console.warn('[me] profile by user_id error', byUser.error.message);
      throw byUser.error;
    }
    console.log('[me] profile by user_id', { found: !!byUser.data });
    return res.json({ profile: byUser.data || null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch profile' });
  }
});

// TEAMS (read-only list for dropdown)
meRouter.get('/teams', async (_req: Request, res: Response) => {
  try {
    let q = await supabase.schema(SCHEMA).from('teams').select('id, name').order('name', { ascending: true });
    if (q.error) {
      const alt = await supabase.schema('public').from('teams').select('id, name').order('name', { ascending: true });
      if (alt.error) return res.status(500).json({ error: alt.error.message });
      return res.json({ teams: alt.data || [] });
    }
    return res.json({ teams: q.data || [] });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed to load teams' });
  }
});

meRouter.put('/:userId/profile', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const payload = req.body || {};
  console.log('[me] PUT /:userId/profile', { userId, keys: Object.keys(payload) });
  try {
    // If email provided, try to merge into the email row (update-in-place), and set user_id
    const email: string | undefined = typeof payload.email === 'string' ? payload.email.trim() : undefined;
    if (email) {
      const found = await selectSingleIlikeWithFallback('profiles', 'email', email);
      if (found.error) throw found.error;
      if (found.data) {
        const merged = { ...payload, user_id: userId };
        const upd = await updateWhereWithFallback('profiles', 'email', email, merged);
        if (upd.error) throw upd.error;
        console.log('[me] profile updated by email merge');
        return res.json({ profile: upd.data });
      }
    }
    // Update by user_id only (no insert)
    const existing = await selectSingleWithFallback('profiles', 'user_id', userId);
    if (existing.error) throw existing.error;
    if (!existing.data) return res.status(404).json({ error: 'profile not found' });
    const upd2 = await updateWhereWithFallback('profiles', 'user_id', userId, payload);
    if (upd2.error) throw upd2.error;
    console.log('[me] profile updated by user_id');
    return res.json({ profile: upd2.data });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed to save profile' });
  }
});

// PREFERENCES
meRouter.get('/:userId/preferences', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { data, error } = await selectSingleWithFallback('preferences', 'user_id', userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ preferences: data || null });
});

meRouter.put('/:userId/preferences', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const payload = req.body || {};
  const existing = await selectSingleWithFallback('preferences', 'user_id', userId);
  if (existing.error) return res.status(500).json({ error: existing.error.message });
  if (!existing.data) return res.status(404).json({ error: 'preferences not found' });
  const upd = await updateWhereWithFallback('preferences', 'user_id', userId, payload);
  if (upd.error) return res.status(500).json({ error: upd.error.message });
  res.json({ preferences: upd.data });
});

// SURVEY
meRouter.get('/:userId/survey', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { data, error } = await selectSingleWithFallback('surveys', 'user_id', userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ survey: data || null });
});

// ONBOARDING STATUS - consider completed if all three sections exist
meRouter.get('/:userId/status', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const [p, pref, s] = await Promise.all([
      selectSingleWithFallback('profiles', 'user_id', userId),
      selectSingleWithFallback('preferences', 'user_id', userId),
      selectSingleWithFallback('surveys', 'user_id', userId),
    ]);
    // Primary source of truth: profiles."CompletionPercent"
    const completionPercent = typeof (p.data as any)?.CompletionPercent === 'number' ? (p.data as any).CompletionPercent : null;
    let completed: boolean;
    if (completionPercent != null) {
      completed = completionPercent >= 100;
    } else {
      // Fallback legacy rule: all three exist
      const profileOk = !!p.data;
      const preferencesOk = !!pref.data;
      const surveyOk = !!s.data;
      completed = profileOk && preferencesOk && surveyOk;
    }
    return res.json({ completed, completionPercent: completionPercent ?? null, sections: { profile: !!p.data, preferences: !!pref.data, survey: !!s.data } });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed to compute status' });
  }
});

// Utility: directly get profile by email (no userId needed) for debugging/verification
meRouter.get('/by-email/profile', async (req: Request, res: Response) => {
  const email = (req.query.email as string | undefined)?.trim();
  if (!email) return res.status(400).json({ error: 'email is required' });
  try {
    const byEmail = await selectSingleIlikeWithFallback('profiles', 'email', email);
    if (byEmail.error) return res.status(500).json({ error: byEmail.error.message });
    return res.json({ profile: byEmail.data || null });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed by-email' });
  }
});

meRouter.put('/:userId/survey', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const payload = req.body || {};
  const existing = await selectSingleWithFallback('surveys', 'user_id', userId);
  if (existing.error) return res.status(500).json({ error: existing.error.message });
  if (!existing.data) return res.status(404).json({ error: 'survey not found' });
  const upd = await updateWhereWithFallback('surveys', 'user_id', userId, payload);
  if (upd.error) return res.status(500).json({ error: upd.error.message });
  res.json({ survey: upd.data });
});

// DEPARTMENTS (read-only)
meRouter.get('/departments', async (_req: Request, res: Response) => {
  try {
    let q = await supabase.schema(SCHEMA).from('departments').select('id, name').order('name', { ascending: true });
    if (q.error) {
      const alt = await supabase.schema('public').from('departments').select('id, name').order('name', { ascending: true });
      if (alt.error) return res.status(500).json({ error: alt.error.message });
      return res.json({ departments: alt.data || [] });
    }
    return res.json({ departments: q.data || [] });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed to load departments' });
  }
});

// TEAM: list up to N colleagues excluding the requester (no inserts)
meRouter.get('/:userId/team', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 12); // cap to 12
  try {
    let q = await supabase
      .schema(SCHEMA)
      .from('profiles')
      .select('user_id, full_name, first_name, last_name, job_title, location, timezone, bio')
      .neq('user_id', userId)
      .limit(64);
    if (q.error) {
      const alt = await supabase
        .schema('public')
        .from('profiles')
        .select('user_id, full_name, first_name, last_name, job_title, location, timezone, bio')
        .neq('user_id', userId)
        .limit(64);
      if (alt.error) return res.status(500).json({ error: alt.error.message });
      q = alt as any;
    }
    const rows = Array.isArray(q.data) ? q.data : [];
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    return res.json({ team: rows.slice(0, limit) });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed to load team' });
  }
});
