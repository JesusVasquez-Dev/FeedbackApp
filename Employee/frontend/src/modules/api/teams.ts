import { supabase } from '../auth/supabaseClient';
import { api } from './client';

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || 'feedbackApp';

export type Team = { id: number; name: string };

export async function listTeams(): Promise<Team[]> {
  const q = await supabase
    .schema(SCHEMA)
    .from('teams')
    .select('id, name')
    .order('name', { ascending: true });
  if (q.error) {
    const res = await api<{ teams: Team[] }>(`/me/teams`);
    return res.teams || [];
  }
  return (q.data || []) as Team[];
}
