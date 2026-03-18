export type EmployeeStatus = 'invited' | 'active' | 'inactive';

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  start_date: string; // ISO date string
  status: EmployeeStatus;
}

export type MilestoneDay = 1 | 30 | 60 | 90;

export interface Checkup {
  id: string;
  employee_id: string;
  milestone_day: MilestoneDay;
  answers: Record<string, unknown>;
  completed_at: string | null; // ISO date
}

export interface PostCheckupRequest {
  employeeId: string;
  milestoneDay: MilestoneDay;
  answers: Record<string, unknown>;
}

export interface EmployeeProgress {
  employee: Employee;
  progressPercent: number; // 0-100
  milestonesCompleted: MilestoneDay[];
}
