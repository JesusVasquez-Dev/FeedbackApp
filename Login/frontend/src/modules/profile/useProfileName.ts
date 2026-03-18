import { useEffect, useState } from 'react';
import { supabase } from '../auth/supabaseClient';

export function useProfileName(userId?: string, userEmail?: string) {
  const [firstName, setFirstName] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let uid = userId;
        if (!uid) {
          const { data } = await supabase.auth.getUser();
          uid = data.user?.id;
        }
        if (!uid) { setLoading(false); return; }

        async function pick(schema?: string) {
          const q = schema ? supabase.schema(schema) : supabase;
          // Try by id
          let { data: byId } = await q.from('profiles').select('first_name, full_name').eq('id', uid).maybeSingle();
          if (byId) return byId as any;
          // Then by user_id
          let { data: byUser } = await q.from('profiles').select('first_name, full_name').eq('user_id', uid).maybeSingle();
          return byUser as any;
        }

        let row: any = null;
        // feedbackApp first
        try { row = await pick('feedbackApp'); } catch {}
        // public fallback
        if (!row) { try { row = await pick(); } catch {}
        }

        if (!cancelled && row) {
          const f = (row.first_name || '').toString().trim() || null;
          const full = (row.full_name || '').toString().trim() || null;
          setFirstName(f);
          setFullName(full);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, userEmail]);

  return {
    firstName,
    fullName,
    loading,
  } as const;
}
