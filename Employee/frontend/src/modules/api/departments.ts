import { supabase } from '../auth/supabaseClient';
import { api } from './client';

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || 'feedbackApp';

export type Department = { id: number; name: string };

export async function listDepartments(): Promise<Department[]> {
  const q = await supabase
    .schema(SCHEMA)
    .from('departments')
    .select('id, name')
    .order('name', { ascending: true });
  if (q.error) {
    // Fallback to backend service (service-role) to avoid RLS issues
    const res = await api<{ departments: Department[] }>(`/me/departments`);
    return res.departments || [];
  }
  return (q.data || []) as Department[];
}
