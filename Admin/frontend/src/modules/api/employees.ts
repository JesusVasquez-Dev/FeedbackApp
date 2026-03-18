import { api } from './client';

export type EmployeeListItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  start_date: string;
  status: string;
  progressPercent: number;
};

export async function fetchEmployees(): Promise<{ employees: EmployeeListItem[] }> {
  return api('/employees');
}

export async function fetchEmployeeProgress(employeeId: string): Promise<{
  employee: EmployeeListItem;
  checkups: Array<{ id: string; milestone_day: 1 | 30 | 60 | 90; completed_at: string | null; answers: Record<string, unknown> }>;
  progress: number;
  completedDays: Array<1 | 30 | 60 | 90>;
}> {
  return api(`/checkup/${employeeId}`);
}

export async function postCheckup(body: {
  employeeId: string;
  milestoneDay: 1 | 30 | 60 | 90;
  answers: Record<string, unknown>;
}) {
  return api('/checkup', { method: 'POST', body: JSON.stringify(body) });
}
