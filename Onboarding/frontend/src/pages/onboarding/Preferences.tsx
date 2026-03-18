import React, { useEffect, useState } from 'react';
import Card from '../../modules/ui/Card';
import { Link, useNavigate } from 'react-router-dom';
import SelectList from '../../modules/ui/SelectList';
import CheckboxField from '../../modules/ui/CheckboxField';
import TextAreaField from '../../modules/ui/TextAreaField';
import { useAuth } from '../../modules/auth/AuthContext';
import { getPreferences, updatePreferences } from '../../modules/api/me';
import { listTeams, type Team } from '../../modules/api/teams';

export default function Preferences() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [teamId, setTeamId] = useState<number | null>(null);
  const [teamOptions, setTeamOptions] = useState<{ value: string; label: string }[]>([{ value: '', label: 'Select a team' }]);
  const [hardware, setHardware] = useState('');
  // Communication preferences
  const [feedbackStyle, setFeedbackStyle] = useState<string>('Direct and specific');
  const [channels, setChannels] = useState<string[]>([]);
  // (Removed) Schedule & availability fields
  const [productivity, setProductivity] = useState<string>('Morning');
  // Motivation & learning
  const [motivations, setMotivations] = useState<string[]>([]);
  const [learningPref, setLearningPref] = useState<string>('');

  const [errors, setErrors] = useState<{ team?: string; hardware?: string }>({});

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { preferences } = await getPreferences(user.id);
        if (preferences) {
          setTeamId(Number.isFinite(Number(preferences.team_id)) ? Number(preferences.team_id) : null);
          setHardware(preferences.hardware || '');
          setFeedbackStyle(preferences.feedback || 'Direct and specific');
          setChannels(preferences.channels || []);
          // removed start/end time usage
          setProductivity(preferences.productivity || 'Morning');
          setMotivations(preferences.motivations || []);
          setLearningPref(preferences.learning_pref || '');
        }
      } catch {}
    })();
  }, [user?.id]);

  // Load teams for dropdown
  useEffect(() => {
    (async () => {
      try {
        const items: Team[] = await listTeams();
        setTeamOptions([{ value: '', label: 'Select a team' }, ...items.map(t => ({ value: String(t.id), label: t.name }))]);
      } catch {
        // keep default option on failure
      }
    })();
  }, []);

  async function next(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!teamId) nextErrors.team = 'Team is required.';
    if (!hardware) nextErrors.hardware = 'Hardware is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (!user?.id) return;
    await updatePreferences(user.id, {
      team_id: teamId,
      hardware,
      feedback: feedbackStyle,
      channels,
      // removed start/end time from payload
      productivity,
      motivations,
      learning_pref: learningPref,
    });
    try { localStorage.setItem('onboarding_current_path', '/onboarding/survey'); } catch {}
    nav('/onboarding/survey');
  }

  return (
    <Card title="Work Style & Preferences">
      <form className="space-y-6" onSubmit={next}>
        <p className="text-sm text-gray-600">Help us understand how you work best so we can create the perfect environment for your success.</p>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Setup</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectList
              label="Team"
              value={teamId != null ? String(teamId) : ''}
              onChange={(v) => { setTeamId(v ? Number(v) : null); if (errors.team) setErrors({ ...errors, team: undefined }); }}
              placeholder="Select a team"
              error={errors.team}
              options={teamOptions}
            />
            <SelectList
              label="Hardware preference"
              value={hardware}
              onChange={(v) => { setHardware(v); if (errors.hardware) setErrors({ ...errors, hardware: undefined }); }}
              error={errors.hardware}
              options={[
                { value: 'MacBook', label: 'MacBook' },
                { value: 'Windows Laptop', label: 'Windows Laptop' },
                { value: 'Linux Laptop', label: 'Linux Laptop' },
              ]}
            />
          </div>
        </div>

        {/* Communication Preferences */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Communication Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['Direct and specific', 'Collaborative discussion', 'Gentle and supportive'].map((opt) => (
              <label key={opt} className={`card border ${feedbackStyle === opt ? 'border-violet-500 ring-1 ring-violet-500' : 'border-gray-200'} p-3 flex items-start gap-3 cursor-pointer`}>
                <input type="radio" className="sr-only" checked={feedbackStyle === opt} onChange={() => setFeedbackStyle(opt)} />
                <span className={`h-4 w-4 rounded-full border ${feedbackStyle === opt ? 'border-violet-600 bg-violet-600' : 'border-gray-300'}`}></span>
                <span className="text-sm text-gray-800">{opt}</span>
              </label>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-600 mb-2">Preferred communication channels (select all that apply):</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {['Microsoft Teams', 'Email', 'Video calls (Microsoft Teams, Zoom)', 'WhatsApp (often for informal or team-specific chats)'].map((label) => (
                <CheckboxField
                  key={label}
                  id={`ch-${label}`}
                  label={label}
                  checked={channels.includes(label)}
                  onChange={(v) => setChannels((prev) => v ? Array.from(new Set([...prev, label])) : prev.filter((x) => x !== label))}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Productivity */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">When are you most productive?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['Morning', 'Afternoon', 'Evening'].map((opt) => (
              <label key={opt} className={`card border ${productivity === opt ? 'border-violet-500 ring-1 ring-violet-500' : 'border-gray-200'} p-3 flex items-start gap-3 cursor-pointer`}>
                <input type="radio" className="sr-only" checked={productivity === opt} onChange={() => setProductivity(opt)} />
                <span className={`h-4 w-4 rounded-full border ${productivity === opt ? 'border-violet-600 bg-violet-600' : 'border-gray-300'}`}></span>
                <span className="text-sm text-gray-800">{opt} focus</span>
              </label>
            ))}
          </div>
        </div>

        {/* Work Environment & Motivation */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Work Environment & Motivation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {['Learning new technologies', 'Making a meaningful impact', 'Collaborating with great people', 'Solving complex problems', 'Recognition for achievements', 'Having autonomy in my work'].map((label) => (
              <CheckboxField
                key={label}
                id={`mot-${label}`}
                label={label}
                checked={motivations.includes(label)}
                onChange={(v) => setMotivations((prev) => v ? Array.from(new Set([...prev, label])) : prev.filter((x) => x !== label))}
              />
            ))}
          </div>
          <div className="mt-4">
            <TextAreaField label="How do you prefer to learn new things?" value={learningPref} onChange={setLearningPref} rows={4} placeholder="Tell us how you like to learn (docs, pairing, videos, workshops, etc.)" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link to="/onboarding/profile" className="btn btn-outline">Back</Link>
          <button className="btn btn-cta" type="submit">Continue</button>
        </div>
      </form>
    </Card>
  );
}
