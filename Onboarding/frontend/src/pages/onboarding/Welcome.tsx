import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/AuthContext';
import { getProfile } from '../../modules/api/me';

export default function Welcome() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState<string>('there');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (user?.id) {
          const { profile } = await getProfile(user.id);
          const full = profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
          if (!cancelled && full) setDisplayName(full.split(' ')[0]);
          else if (!cancelled && user?.email) setDisplayName(user.email.split('@')[0]);
        }
      } catch {
        // fallback to default 'there'
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);
  const features = [
    {
      title: 'Meet Your Team',
      desc: 'Get to know your colleagues and how you’ll collaborate.',
    },
    {
      title: 'Set Preferences',
      desc: 'Customize your work style and communication preferences.',
    },
    {
      title: 'Define Goals',
      desc: 'Set objectives and track your progress over 90 days.',
    },
  ];

  return (
    <div className="text-center">
      <img
        src="/branding/logo.png"
        alt="Staffing Global"
        className="mx-auto mb-8 h-40 w-56 rounded-2xl shadow-lg object-contain bg-white"
      />
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-3">Welcome to Staffing Global, {displayName}!</h1>
      <p className="mx-auto max-w-2xl text-gray-600 mb-8">
        We’re excited to have you join the team. This onboarding journey will help you get familiar with our culture,
        tools, and teammates.
      </p>

      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm hover:shadow-md transition-shadow">
            <div className="mb-4 h-10 w-10 rounded-xl bg-gradient-to-br from-primary-400 to-indigo-500" />
            <div className="font-medium text-gray-900">{f.title}</div>
            <div className="mt-1 text-sm text-gray-600">{f.desc}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          className="btn btn-cta px-6"
          onClick={() => {
            try { localStorage.setItem('onboarding_current_path', '/onboarding/profile'); } catch {}
            nav('/onboarding/profile');
          }}
        >
          Start Your Journey
        </button>
        <div className="text-xs text-gray-500">Estimated time: 10–15 minutes</div>
      </div>
    </div>
  );
}
