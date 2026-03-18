import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { checkupRouter } from './routes/checkup.js';
import { employeesRouter } from './routes/employees.js';
import { meRouter } from './routes/me.js';
import { supabase } from './supabase.js';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
// Match the Login frontend which serves on http://localhost:5173
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Deep health: verify DB access to feedbackApp schema
app.get('/healthz', async (_req, res) => {
  try {
    const { error, count } = await supabase
      .schema('feedbackApp')
      .from('profiles')
      .select('user_id', { count: 'exact', head: true });
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.json({ ok: true, count });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'healthz failed' });
  }
});

app.use('/checkup', checkupRouter);
app.use('/employees', employeesRouter);
app.use('/me', meRouter);

app.listen(PORT, () => {
  const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const masked = hasService ? `${process.env.SUPABASE_SERVICE_ROLE_KEY!.slice(0,4)}…${process.env.SUPABASE_SERVICE_ROLE_KEY!.slice(-4)}` : 'none';
  console.log(`[backend] listening on http://localhost:${PORT}`);
  console.log(`[backend] SUPABASE_URL=${process.env.SUPABASE_URL}`);
  console.log(`[backend] SERVICE_ROLE_KEY=${hasService ? masked : 'none (using anon key)'}`);
});
