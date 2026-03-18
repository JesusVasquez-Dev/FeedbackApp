import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Card from '../modules/ui/Card';
import ProgressBar from '../modules/ui/ProgressBar';
import { fetchEmployeeProgress } from '../modules/api/employees';

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    fetchEmployeeProgress(id).then(setState).catch(() => {});
  }, [id]);

  if (!state) return <div className="container-app py-8">Loading...</div>;

  return (
    <div className="container-app py-8 space-y-6">
      <Card title="Employee">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Name</div>
            <div className="font-medium">{state.employee?.name || '—'}</div>
          </div>
          <div>
            <div className="text-gray-500">Email</div>
            <div className="font-medium">{state.employee?.email}</div>
          </div>
          <div>
            <div className="text-gray-500">Role</div>
            <div className="font-medium">{state.employee?.role}</div>
          </div>
          <div>
            <div className="text-gray-500">Start</div>
            <div className="font-medium">{new Date(state.employee?.start_date).toLocaleDateString()}</div>
          </div>
        </div>
      </Card>
      <Card title="Progress">
        <div className="flex items-center gap-4">
          <ProgressBar value={state.progress} />
          <span className="text-sm font-medium text-gray-700 w-12 text-right">{state.progress}%</span>
        </div>
      </Card>
      <Card title="Check-ups">
        <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
          {state.checkups?.map((c: any) => (
            <li key={c.id}>Day {c.milestone_day} — {c.completed_at ? new Date(c.completed_at).toLocaleString() : 'Pending'}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
