import React, { useEffect, useState } from 'react';
import Card from '../../modules/ui/Card';
import { Link, useNavigate } from 'react-router-dom';
import TextField from '../../modules/ui/TextField';
import DatePicker from '../../modules/ui/DatePicker';
import SelectList from '../../modules/ui/SelectList';
import TextAreaField from '../../modules/ui/TextAreaField';
import CheckboxField from '../../modules/ui/CheckboxField';
import { useAuth } from '../../modules/auth/AuthContext';
import { getProfile, updateProfile } from '../../modules/api/me';
import { listDepartments, type Department } from '../../modules/api/departments';

export default function Profile() {
  const nav = useNavigate();
  const { user } = useAuth();
  // Basic Information
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [deptOptions, setDeptOptions] = useState<{ value: string; label: string }[]>([{ value: '', label: 'Select...' }]);
  const [startDate, setStartDate] = useState<string>('');
  // Location & Contact
  const [location, setLocation] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('UTC-05:00');
  // Bio
  const [bio, setBio] = useState<string>('');
  // Personal touches
  const [funFact, setFunFact] = useState<string>('');
  const [emoji, setEmoji] = useState<string>('');
  // Interests
  const ALL_INTERESTS = ['Technology & Coding', 'Travel & Adventure', 'Music & Arts', 'Sports & Fitness', 'Reading & Learning'] as const;
  const [interests, setInterests] = useState<string[]>([]);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
    department?: string;
    startDate?: string;
  }>({});

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { profile } = await getProfile(user.id, user.email || undefined);
        if (profile) {
          // Prefer explicit first/last; otherwise derive from full_name
          let f = profile.first_name || '';
          let l = profile.last_name || '';
          if ((!f || !l) && profile.full_name) {
            const parts = String(profile.full_name).trim().split(/\s+/);
            f = f || (parts[0] || '');
            l = l || (parts.slice(1).join(' ') || '');
          }
          setFirstName(f);
          setLastName(l);
          setJobTitle(profile.job_title || profile.role || '');
          if (typeof profile.department_id === 'number') setDepartmentId(profile.department_id);
          setStartDate(profile.start_date || '');
          setLocation(profile.location || '');
          setTimezone(profile.timezone || 'UTC-05:00');
          setBio(profile.bio || '');
          setFunFact(profile.fun_fact || '');
          setEmoji(profile.emoji || '');
          setInterests(profile.interests || []);
        }
      } catch {}
    })();
  }, [user?.id]);

  // Load departments (top-level)
  useEffect(() => {
    (async () => {
      try {
        const items: Department[] = await listDepartments();
        setDeptOptions([{ value: '', label: 'Select...' }, ...items.map((d) => ({ value: String(d.id), label: d.name }))]);
      } catch (e) {
        // silently ignore; keep default options
      }
    })();
  }, []);

  function capitalizeWords(s: string) {
    return s
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  async function next(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    const firstTrim = firstName.trim();
    const lastTrim = lastName.trim();
    const jobTrim = jobTitle.trim();
    const deptTrim = (departmentId ?? '').toString();
    if (!firstTrim) nextErrors.firstName = 'First name is required.';
    if (!lastTrim) nextErrors.lastName = 'Last name is required.';
    if (!jobTrim) nextErrors.jobTitle = 'Job title is required.';
    if (!deptTrim) nextErrors.department = 'Department is required.';
    if (!startDate) nextErrors.startDate = 'Start date is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const firstCap = capitalizeWords(firstTrim);
    const lastCap = capitalizeWords(lastTrim);
    const fullName = `${firstCap} ${lastCap}`.trim();
    if (!user?.id) return;
    await updateProfile(user.id, {
      full_name: fullName,
      first_name: firstCap,
      last_name: lastCap,
      job_title: jobTrim,
      department_id: departmentId,
      start_date: startDate || null,
      location,
      timezone,
      bio,
      fun_fact: funFact,
      emoji,
      interests,
      email: user.email || null,
    }).catch((e) => { console.warn('Profile save failed', e); throw e; });
    try { localStorage.setItem('onboarding_current_path', '/onboarding/team'); } catch {}
    nav('/onboarding/team');
  }

  return (
    <Card title="Profile">
      <form className="space-y-6" onSubmit={next}>
        {/* Basic Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="First Name" value={firstName} onChange={(v) => { setFirstName(v); if (errors.firstName) setErrors({ ...errors, firstName: undefined }); }} error={errors.firstName} />
            <TextField label="Last Name" value={lastName} onChange={(v) => { setLastName(v); if (errors.lastName) setErrors({ ...errors, lastName: undefined }); }} error={errors.lastName} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="md:col-span-2">
              <TextField id="job-title" label="Job Title" value={jobTitle} onChange={(v) => { setJobTitle(v); if (errors.jobTitle) setErrors({ ...errors, jobTitle: undefined }); }} error={errors.jobTitle} />
            </div>
            <SelectList
              label="Department"
              id="department"
              value={departmentId != null ? String(departmentId) : ''}
              onChange={(v) => { setDepartmentId(v ? Number(v) : null); if (errors.department) setErrors({ ...errors, department: undefined }); }}
              options={deptOptions}
            />
            <DatePicker label="Start date" value={startDate} onChange={(v) => { setStartDate(v); if (errors.startDate) setErrors({ ...errors, startDate: undefined }); }} error={errors.startDate} />
          </div>
        </div>

        {/* Location & Contact */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Location & Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Location" value={location} onChange={setLocation} placeholder="City, Country" />
            <SelectList
              label="Timezone"
              id="timezone"
              value={timezone}
              onChange={setTimezone}
              options={[
                { value: 'UTC-08:00', label: 'UTC-08:00 (PST)' },
                { value: 'UTC-05:00', label: 'UTC-05:00 (CT/CO)' },
                { value: 'UTC-04:00', label: 'UTC-04:00 (ET)' },
                { value: 'UTC+00:00', label: 'UTC+00:00 (GMT)' },
                { value: 'UTC+01:00', label: 'UTC+01:00' },
                { value: 'UTC+05:30', label: 'UTC+05:30 (IST)' },
              ]}
            />
          </div>
        </div>

        {/* Professional Bio */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Professional Bio</h3>
          <TextAreaField label="Bio" value={bio} onChange={setBio} rows={4} placeholder="A short introduction about your background and interests" />
        </div>

        {/* Personal Touches */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Personal Touches</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Fun Fact About You" value={funFact} onChange={setFunFact} placeholder="I can solve a Rubik's cube..." />
            <TextField label="Favorite Emoji" value={emoji} onChange={setEmoji} placeholder="e.g. ✨" />
          </div>
        </div>

        {/* Interests */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Interests & Hobbies</h3>
          <div className="grid grid-cols-1 gap-2">
            {ALL_INTERESTS.map((label) => (
              <CheckboxField
                key={label}
                id={`interest-${label}`}
                label={label}
                checked={interests.includes(label)}
                onChange={(v) => setInterests((prev) => v ? Array.from(new Set([...prev, label])) : prev.filter((x) => x !== label))}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link to="/onboarding/welcome" className="btn btn-outline">Back</Link>
          <button className="btn btn-cta" type="submit">Continue</button>
        </div>
      </form>
    </Card>
  );
}
