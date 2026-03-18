import { supabase } from '../auth/supabaseClient';
import { api } from './client';

export type ProfilePayload = {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  job_title?: string;
  department_id?: number | null;
  start_date?: string | null; // ISO date
  location?: string | null;
  timezone?: string | null;
  bio?: string | null;
  fun_fact?: string | null;
  emoji?: string | null;
  interests?: string[];
  email?: string | null;
};

export type PreferencesPayload = {
  team_id?: number | null;
  hardware?: string | null;
  feedback?: string | null;
  channels?: string[];
  start_time?: string | null; // HH:mm
  end_time?: string | null;   // HH:mm
  productivity?: string | null; // Morning | Afternoon | Evening
  motivations?: string[];
  learning_pref?: string | null;
};

export type SurveyPayload = {
  experience?: 'Junior' | 'Mid-level' | 'Senior' | null;
  needs?: string | null;
  excitement?: number | null;
  concerns?: string[];
  coping?: string | null;
  support?: string[];
};

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || 'feedbackApp';
const REST_URL = ((import.meta as any).env?.VITE_SUPABASE_URL as string).replace(/\/$/, '') + '/rest/v1';
const APIKEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string;

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const access = data.session?.access_token || '';
  return {
    apikey: APIKEY,
    Authorization: `Bearer ${access}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function tableUrl(table: string) {
  // Use Accept-Profile/Content-Profile headers to target schema
  return `${REST_URL}/${table}`;
}

async function restGetOne(url: string) {
  const h = await authHeaders();
  let res = await fetch(url, { headers: { ...h, 'Accept-Profile': SCHEMA } });
  if (res.status === 406 && SCHEMA !== 'public') {
    // Retry against public schema
    res = await fetch(url, { headers: { ...h, 'Accept-Profile': 'public' } });
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (json && json.message) || text || '';
    const err: any = new Error(msg || `GET failed ${res.status}`);
    (err.status = res.status);
    throw err;
  }
  // Always array; return first or null
  return (Array.isArray(json) ? json[0] : json) || null;
}

async function restPatch(url: string, body: any) {
  const h = await authHeaders();
  let res = await fetch(url, {
    method: 'PATCH',
    headers: { ...h, Prefer: 'return=representation', 'Content-Profile': SCHEMA },
    body: JSON.stringify(body),
  });
  if (res.status === 406 && SCHEMA !== 'public') {
    res = await fetch(url, {
      method: 'PATCH',
      headers: { ...h, Prefer: 'return=representation', 'Content-Profile': 'public' },
      body: JSON.stringify(body),
    });
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((json && json.message) || text || `PATCH failed ${res.status}`);
  // representation returns array of affected rows
  return Array.isArray(json) ? json[0] : json;
}

async function restUpsert(url: string, body: any) {
  const h = await authHeaders();
  let res = await fetch(url, {
    method: 'POST',
    headers: { ...h, Prefer: 'return=representation,resolution=merge-duplicates', 'Content-Profile': SCHEMA },
    body: JSON.stringify(body),
  });
  if (res.status === 406 && SCHEMA !== 'public') {
    res = await fetch(url, {
      method: 'POST',
      headers: { ...h, Prefer: 'return=representation,resolution=merge-duplicates', 'Content-Profile': 'public' },
      body: JSON.stringify(body),
    });
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((json && json.message) || text || `UPSERT failed ${res.status}`);
  return Array.isArray(json) ? json[0] : json;
}

export async function getProfile(userId: string, email?: string) {
  if (!userId && !email) return { profile: null as any };
  // Try by email first (case-insensitive)
  if (email) {
    try {
      const url = `${tableUrl('profiles')}?select=*&email=ilike.*${encodeURIComponent(email)}*&limit=1`;
      const byEmail = await restGetOne(url);
      if (byEmail) return { profile: byEmail } as any;
    } catch (e: any) {
      if (e?.status === 406 || e?.status === 403) {
        // Fallback to backend API which uses service role and schema fallback
        const qs = `?email=${encodeURIComponent(email)}`;
        return api<{ profile: any }>(`/me/${userId}/profile${qs}`);
      }
      throw e;
    }
  }
  // fallback by user_id
  try {
    const url2 = `${tableUrl('profiles')}?select=*&user_id=eq.${encodeURIComponent(userId)}&limit=1`;
    const byUser = await restGetOne(url2);
    return { profile: byUser } as any;
  } catch (e: any) {
    if (e?.status === 406 || e?.status === 403) {
      return api<{ profile: any }>(`/me/${userId}/profile`);
    }
    throw e;
  }
}

export async function updateProfile(userId: string, payload: ProfilePayload) {
  const email = (payload.email || '').trim();
  // If email provided, try merge-by-email (PATCH with filter), then return representation
  if (email) {
    try {
      const url = `${tableUrl('profiles')}?email=ilike.*${encodeURIComponent(email)}*`;
      const merged = await restPatch(url, { ...payload, user_id: userId });
      if (merged) return { profile: merged } as any;
    } catch (e: any) {
      if (e?.status === 406 || e?.status === 403) {
        return api<{ profile: any }>(`/me/${userId}/profile`, { method: 'PUT', body: JSON.stringify(payload) });
      }
      throw e;
    }
  }
  // Otherwise upsert by user_id
  try {
    const up = await restUpsert(tableUrl('profiles'), { user_id: userId, ...payload });
    return { profile: up } as any;
  } catch (e: any) {
    if (e?.status === 406 || e?.status === 403) {
      return api<{ profile: any }>(`/me/${userId}/profile`, { method: 'PUT', body: JSON.stringify(payload) });
    }
    throw e;
  }
}

export async function getPreferences(userId: string) {
  try {
    const url = `${tableUrl('preferences')}?select=*&user_id=eq.${encodeURIComponent(userId)}&limit=1`;
    const row = await restGetOne(url);
    return { preferences: row } as any;
  } catch (e: any) {
    if (e?.status === 406 || e?.status === 403) {
      return api<{ preferences: any }>(`/me/${userId}/preferences`);
    }
    throw e;
  }
}
export async function updatePreferences(userId: string, payload: PreferencesPayload) {
  try {
    const up = await restUpsert(tableUrl('preferences'), { user_id: userId, ...payload });
    return { preferences: up } as any;
  } catch (e: any) {
    if (e?.status === 406 || e?.status === 403) {
      return api<{ preferences: any }>(`/me/${userId}/preferences`, { method: 'PUT', body: JSON.stringify(payload) });
    }
    throw e;
  }
}

export async function getSurvey(userId: string) {
  try {
    const url = `${tableUrl('surveys')}?select=*&user_id=eq.${encodeURIComponent(userId)}&limit=1`;
    const row = await restGetOne(url);
    return { survey: row } as any;
  } catch (e: any) {
    if (e?.status === 406 || e?.status === 403) {
      return api<{ survey: any }>(`/me/${userId}/survey`);
    }
    throw e;
  }
}
export async function updateSurvey(userId: string, payload: SurveyPayload) {
  try {
    const up = await restUpsert(tableUrl('surveys'), { user_id: userId, ...payload });
    return { survey: up } as any;
  } catch (e: any) {
    if (e?.status === 406 || e?.status === 403) {
      return api<{ survey: any }>(`/me/${userId}/survey`, { method: 'PUT', body: JSON.stringify(payload) });
    }
    throw e;
  }
}

// Team listing (read-only)
export type TeamMember = {
  user_id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  location?: string | null;
  timezone?: string | null;
  bio?: string | null;
};

export async function listTeam(userId: string, limit = 6): Promise<TeamMember[]> {
  const res = await api<{ team: TeamMember[] }>(`/me/${encodeURIComponent(userId)}/team?limit=${encodeURIComponent(String(limit))}`);
  return res.team || [];
}

// Onboarding status
export type OnboardingStatus = { completed: boolean; completionPercent: number | null; sections: { profile: boolean; preferences: boolean; survey: boolean } };
export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  return api<OnboardingStatus>(`/me/${encodeURIComponent(userId)}/status`);
}
