import React, { useEffect, useState } from 'react';
import Card from '../../modules/ui/Card';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/AuthContext';
import { listTeam, type TeamMember } from '../../modules/api/me';

function initialsFrom(full?: string | null, first?: string | null, last?: string | null) {
  const name = (full && full.trim()) || `${first || ''} ${last || ''}`.trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const a = (parts[0] || '').charAt(0).toUpperCase();
  const b = (parts[1] || '').charAt(0).toUpperCase();
  return (a + b) || 'TM';
}

export default function Team() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      try {
        const rows = await listTeam(user.id, 6, user.email || undefined);
        if (!cancelled) setMembers(rows);
      } catch {
        if (!cancelled) setMembers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Meet Your Amazing Team</h2>
        <p className="text-sm text-gray-600">Get to know the friendly people you’ll work with. Click on any card to learn more.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && (
          <div className="text-sm text-gray-500">Loading team…</div>
        )}
        {!loading && members.length === 0 && (
          <div className="text-sm text-gray-500">No teammates to display yet.</div>
        )}
        {members.map((m) => {
          const name = (m.full_name && m.full_name.trim()) || `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Teammate';
          const title = m.job_title || '';
          const tags = [m.location, m.timezone].filter(Boolean) as string[];
          const key = (m.user_id || m.email || String(m.id || '')) as string;
          return (
            <div key={key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-400 to-indigo-500 text-white grid place-items-center font-semibold">
                  {initialsFrom(m.full_name, m.first_name, m.last_name)}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{name}</div>
                  <div className="text-sm text-gray-600">{title}</div>
                </div>
              </div>
              {m.bio && <p className="text-sm text-gray-700 mt-3">{m.bio}</p>}
              {tags.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  {tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50">{t}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <Link to="/onboarding/profile" className="btn btn-outline">Back</Link>
        <button
          className="btn btn-cta"
          onClick={() => {
            try { localStorage.setItem('onboarding_current_path', '/onboarding/preferences'); } catch {}
            nav('/onboarding/preferences');
          }}
        >
          Set My Preferences
        </button>
      </div>
    </div>
  );
}
