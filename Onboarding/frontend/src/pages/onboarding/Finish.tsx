import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { saveOnboarding } from '../../modules/onboarding/state';
import Avatar from '../../modules/ui/Avatar';
import { useAuth } from '../../modules/auth/AuthContext';
import { getPreferences, getProfile, updateProfile } from '../../modules/api/me';
import { listTeams, type Team } from '../../modules/api/teams';
import { listTeam } from '../../modules/api/me';

export default function Finish() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState<string>('there');
  const [role, setRole] = useState<string>('New Hire');
  const [startDate, setStartDate] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('—');
  const [hardware, setHardware] = useState<string>('—');
  const [teamCount, setTeamCount] = useState<number>(0);

  const kpis = [
    { label: 'Onboarding Progress', value: '100%', color: 'text-primary-600', ring: 'ring-primary-100' },
    { label: 'Team Members Met', value: String(teamCount || '—'), color: 'text-indigo-600', ring: 'ring-indigo-100' },
    { label: 'Your Preferences', value: 'Saved', color: 'text-emerald-600', ring: 'ring-emerald-100' },
  ];

  const nextSteps = [
    { title: 'Today · Setup Complete!', desc: 'Access provided to all tools and systems.', tone: 'success' },
    { title: 'Monday · Welcome Coffee with Sarah', desc: '9:30 AM PST · Calendar invite sent', tone: 'primary' },
    { title: 'Tuesday · Team Introduction Meeting', desc: '2:00 PM PST · Meet everyone officially', tone: 'neutral' },
    { title: 'Week 1 · First Check-in Survey', desc: 'Let us know how your first week went.', tone: 'neutral' },
  ];

  async function goToMilestones() {
    // Just mark completed locally and go to Employee dashboard
    try {
      setSaving(true);
      if (user?.id) {
        try {
          await updateProfile(user.id, { CompletionPercent: 100 });
        } catch {}
      }
    } finally {
      setSaving(false);
      saveOnboarding({ completed: true });
      nav('/employee');
    }
  }

  // Load saved data for the logged-in user (profile + preferences)
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const [{ profile }, { preferences }] = await Promise.all([
          getProfile(user.id, user.email || undefined),
          getPreferences(user.id),
        ]);
        if (profile) {
          const full = profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
          setName(full || 'there');
          setRole(profile.job_title || profile.role || 'New Hire');
          setStartDate(profile.start_date || '');
        }
        if (preferences) {
          setHardware(preferences.hardware || '—');
          const tid = typeof preferences.team_id === 'number' ? preferences.team_id : null;
          if (tid != null) {
            try {
              const teams: Team[] = await listTeams();
              const found = teams.find(t => t.id === tid);
              if (found) setTeamName(found.name);
            } catch {}
          }
        }
        // Load team members (same logic as Team page) and count them
        try {
          const members = await listTeam(user.id, 6, user.email || undefined);
          setTeamCount(members.length);
        } catch {}
      } catch {
        // keep defaults if fetch fails
      }
    })();
  }, [user?.id]);

  return (
    <div className="space-y-6">
      {/* Profile brief */}
      <div className="text-center">
        <div className="mx-auto mb-6 h-28 w-28 rounded-full bg-gradient-to-br from-emerald-300 via-primary-400 to-indigo-500 p-[2px]">
          <div className="h-full w-full rounded-full bg-white grid place-items-center">
            <Avatar name={name} size="lg" online />
          </div>
        </div>
        <h2 className="text-2xl font-extrabold text-emerald-600">Setup Complete, {name.split(' ')[0]}!</h2>
        <p className="mt-2 text-sm text-gray-600 max-w-2xl mx-auto">
        Great job completing your initial setup! 🎉 Your onboarding journey will continue with milestone check-ins over the next 90 days to ensure you’re thriving. Starting this week, you’ll receive quick 1-minute surveys directly in your work inbox every week. We count on you to fill them out—your feedback helps us get to know you better and support your growth!
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="badge">{role}</span>
          {startDate && <span className="badge">Start: {startDate}</span>}
          <span className="badge">Team: {teamName}</span>
          <span className="badge">Hardware: {hardware}</span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto">
        {kpis.map((k) => (
          <div key={k.label} className={`rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm ring-1 ${k.ring}`}>
            <div className={`text-xl font-extrabold ${k.color}`}>{k.value}</div>
            <div className="text-xs text-gray-600 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Next steps list */}
      <div className="card-soft p-4">
        <div className="text-sm font-semibold text-gray-800 mb-3">Your Next Steps</div>
        <div className="space-y-2">
          {nextSteps.map((s) => (
            <div key={s.title} className={`flex items-start gap-3 rounded-lg border p-3 ${s.tone === 'success' ? 'bg-emerald-50 border-emerald-200' : s.tone === 'primary' ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-200'}`}>
              <div className={`h-2.5 w-2.5 rounded-full mt-1 ${s.tone === 'success' ? 'bg-emerald-500' : s.tone === 'primary' ? 'bg-primary-500' : 'bg-gray-300'}`} />
              <div>
                <div className="text-sm font-medium text-gray-900">{s.title}</div>
                <div className="text-xs text-gray-600">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* (Removed quick action cards) */}

      {/* Journey panel */}
      <div className="panel-gradient">
        <div className="font-semibold">Your 90-Day Onboarding Journey</div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {['Initial Setup', 'Day 7 Check-in', '30-Day Review', '90-Day Success'].map((t) => (
            <div key={t} className="rounded-xl bg-white/10 px-3 py-4 text-center backdrop-blur-sm">
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Primary CTAs */}
      <div className="flex items-center justify-center gap-3">
        <button className="btn btn-cta" onClick={goToMilestones} disabled={saving}>
          {saving ? 'Saving...' : 'Launch Work Companion'}
        </button>
        <Link to="/onboarding/survey" className="btn btn-outline">Back</Link>
      </div>

      {/* Support block */}
      <div className="card-soft p-5 text-center">
        <div className="text-sm font-semibold text-gray-800">Need Help Getting Started?</div>
        <div className="text-xs text-gray-600 mt-1">Our support team is here to help you succeed. Don’t hesitate to reach out!</div>
        <div className="mt-3 flex items-center justify-center gap-2 text-xs">
          <a className="badge" href="#">help@techcorp.com</a>
          <a className="badge" href="#">Live Chat</a>
          <a className="badge" href="#">Help Center</a>
        </div>
      </div>
    </div>
  );
}
