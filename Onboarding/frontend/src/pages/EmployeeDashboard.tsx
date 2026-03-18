import React, { useEffect, useMemo, useState } from 'react';
import Card from '../modules/ui/Card';
import Timeline from '../modules/ui/Timeline';
import ProgressBar from '../modules/ui/ProgressBar';
import Checklist from '../modules/ui/Checklist';
import { useAuth } from '../modules/auth/AuthContext';
import { fetchEmployeeProgress, postCheckup } from '../modules/api/employees';
import SelectList from '../modules/ui/SelectList';
import TextAreaField from '../modules/ui/TextAreaField';

const MILESTONE_QUESTIONS: Record<1 | 30 | 60 | 90, { id: string; label: string }[]> = {
  1: [
    { id: 'tools', label: 'I have my laptop and required tools' },
    { id: 'accounts', label: 'I can access email, Slack, ticketing, repos' },
  ],
  30: [
    { id: 'culture', label: 'I understand team rituals and culture' },
    { id: 'goals', label: 'I have clear 30-day goals' },
  ],
  60: [
    { id: 'impact', label: 'I delivered at least one meaningful contribution' },
    { id: 'feedback', label: 'I received constructive feedback' },
  ],
  90: [
    { id: 'ownership', label: 'I own a scoped area with autonomy' },
    { id: 'alignment', label: 'I am aligned with expectations and OKRs' },
  ],
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);
  const [completedDays, setCompletedDays] = useState<Array<1 | 30 | 60 | 90>>([]);
  const [selectedDay, setSelectedDay] = useState<1 | 30 | 60 | 90>(1);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');

  const items = useMemo(() => [
    { day: 1 as const, title: 'Setup & Access', completed: completedDays.includes(1) },
    { day: 30 as const, title: 'Culture & Rhythm', completed: completedDays.includes(30) },
    { day: 60 as const, title: 'Impact & Feedback', completed: completedDays.includes(60) },
    { day: 90 as const, title: 'Ownership & Alignment', completed: completedDays.includes(90) },
  ], [completedDays]);

  useEffect(() => {
    if (!user) return;
    // Using user.id as employeeId for demo; in real world you'd map auth user to employee row
    fetchEmployeeProgress(user.id).then((res) => {
      setProgress(res.progress);
      setCompletedDays(res.completedDays);
    }).catch(() => {});
  }, [user]);

  function toggle(id: string, checked: boolean) {
    setAnswers((prev) => ({ ...prev, [id]: checked }));
  }

  async function submit() {
    if (!user) return;
    const payload = {
      employeeId: user.id,
      milestoneDay: selectedDay,
      answers: answers,
      notes,
    } as const;
    await postCheckup(payload);
    const res = await fetchEmployeeProgress(user.id);
    setProgress(res.progress);
    setCompletedDays(res.completedDays);
  }

  return (
    <div className="container-app py-8 space-y-6">
      <Card title="Welcome">
        <p className="text-sm text-gray-700">Welcome to your onboarding dashboard. Complete milestone check-ups at Day 1, 30, 60, and 90.</p>
      </Card>

      <Card title="Progress">
        <div className="flex items-center gap-4">
          <ProgressBar value={progress} />
          <span className="text-sm font-medium text-gray-700 w-12 text-right">{progress}%</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Milestones">
          <Timeline items={items} />
        </Card>
        <div className="lg:col-span-2">
          <Card title={`Milestone Day ${selectedDay}`} actions={
            <div className="min-w-[160px]">
              <SelectList
                label="Day"
                hideLabel
                id="milestone-day"
                value={String(selectedDay)}
                onChange={(v) => setSelectedDay(Number(v) as any)}
                options={[
                  { value: '1', label: 'Day 1' },
                  { value: '30', label: 'Day 30' },
                  { value: '60', label: 'Day 60' },
                  { value: '90', label: 'Day 90' },
                ]}
              />
            </div>
          }>
            <Checklist
              items={MILESTONE_QUESTIONS[selectedDay].map((q) => ({ id: q.id, label: q.label, checked: !!answers[q.id] }))}
              onChange={toggle}
            />
            <div className="mt-4">
              <TextAreaField
                label="Notes"
                id="milestone-notes"
                rows={4}
                value={notes}
                onChange={setNotes}
                placeholder="Add any notes or blockers here"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button className="btn btn-cta" onClick={submit}>Submit Check-up</button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
