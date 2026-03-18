import React, { useEffect, useState } from 'react';
import Card from '../../modules/ui/Card';
import { Link, useNavigate } from 'react-router-dom';
import SelectList from '../../modules/ui/SelectList';
import TextAreaField from '../../modules/ui/TextAreaField';
import CheckboxField from '../../modules/ui/CheckboxField';
import { useAuth } from '../../modules/auth/AuthContext';
import { getSurvey, updateSurvey } from '../../modules/api/me';

export default function Survey() {
  const nav = useNavigate();
  const { user } = useAuth();
  // Initialize empty and populate strictly from the logged-in user's survey record
  const [experienceLevel, setExperienceLevel] = useState('');
  const [needs, setNeeds] = useState('');
  const [errors, setErrors] = useState<{ experienceLevel?: string }>({});
  // Wellness additions
  const [excitement, setExcitement] = useState<number>(3);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [coping, setCoping] = useState<string>('');
  const [support, setSupport] = useState<string[]>([]);

  // Load existing survey from Supabase if present
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { survey } = await getSurvey(user.id);
        if (survey) {
          setExperienceLevel(survey.experience || '');
          setNeeds(survey.needs || '');
          setExcitement(typeof survey.excitement === 'number' ? survey.excitement : 3);
          setConcerns(Array.isArray(survey.concerns) ? survey.concerns : []);
          setCoping(survey.coping || '');
          setSupport(Array.isArray(survey.support) ? survey.support : []);
        }
      } catch {}
    })();
  }, [user?.id]);

  function next(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!experienceLevel) nextErrors.experienceLevel = 'Experience level is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    // Persist to Supabase as well
    if (user?.id) {
      updateSurvey(user.id, {
        experience: experienceLevel as any,
        needs,
        excitement,
        concerns,
        coping,
        support,
      }).catch(() => {});
    }
    try { localStorage.setItem('onboarding_current_path', '/onboarding/finish'); } catch {}
    nav('/onboarding/finish');
  }

  return (
    <Card title="Initial Wellness Survey">
      <form className="space-y-6" onSubmit={next}>
        <p className="text-sm text-gray-600">Help us understand your current state so we can support you better. This creates your baseline for future check-ins.</p>
        <SelectList
          label="Experience level"
          value={experienceLevel}
          onChange={(v) => { setExperienceLevel(v); if (errors.experienceLevel) setErrors({}); }}
          placeholder="Select one"
          error={errors.experienceLevel}
          options={[
            { value: 'Junior', label: 'Junior' },
            { value: 'Mid-level', label: 'Mid-level' },
            { value: 'Senior', label: 'Senior' },
          ]}
        />
        {/* Excitement scale */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">How excited are you about starting this new role?</h3>
          <div className="flex items-center justify-between gap-2">
            {[1,2,3,4,5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setExcitement(n)}
                className={`h-10 w-10 rounded-full border text-sm font-medium ${excitement===n ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}
                aria-pressed={excitement===n}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Not confident</span>
            <span>Very confident</span>
          </div>
        </div>

        {/* Concerns */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">What are your biggest concerns or worries about starting?</h3>
          <p className="text-xs text-gray-600 mb-2">Select all that apply</p>
          <div className="grid grid-cols-1 gap-2">
            {['Learning the technical stack','Fitting in with the team','Meeting performance expectations','Managing workload and priorities','Effective communication','Remote work challenges'].map((label) => (
              <CheckboxField
                key={label}
                id={`concern-${label}`}
                label={label}
                checked={concerns.includes(label)}
                onChange={(v) => setConcerns((prev) => v ? Array.from(new Set([...prev, label])) : prev.filter((x) => x !== label))}
              />
            ))}
          </div>
        </div>

        {/* Coping */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">How do you typically handle stress or challenges?</h3>
          <p className="text-xs text-gray-600 mb-2">This helps us understand your coping mechanisms</p>
          <TextAreaField label="Your approach" value={coping} onChange={setCoping} rows={4} placeholder="Share what works for you (e.g., break tasks down, pair programming, short walks, etc.)" />
        </div>

        {/* Support */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">What support would be most helpful during your first month?</h3>
          <p className="text-xs text-gray-600 mb-2">Select your top preferences</p>
          <div className="grid grid-cols-1 gap-2">
            {['Regular check-ins with manager','Buddy/mentor system','Comprehensive documentation','Structured training sessions','Social activities and team bonding','Flexible schedule while learning'].map((label) => (
              <CheckboxField
                key={label}
                id={`support-${label}`}
                label={label}
                checked={support.includes(label)}
                onChange={(v) => setSupport((prev) => v ? Array.from(new Set([...prev, label])) : prev.filter((x) => x !== label))}
              />
            ))}
          </div>
        </div>
        <TextAreaField
          label="Anything you need to be successful?"
          value={needs}
          onChange={setNeeds}
          rows={4}
          placeholder="e.g., access, tooling, intros"
        />
        <div className="flex items-center justify-between">
          <Link to="/onboarding/preferences" className="btn btn-outline">Back</Link>
          <button className="btn btn-cta" type="submit">Complete Onboarding</button>
        </div>
      </form>
    </Card>
  );
}
