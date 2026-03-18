-- Employees table
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  role text not null,
  start_date date not null,
  status text not null default 'invited'
);

-- Checkups table
create table if not exists public.checkups (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  milestone_day integer not null check (milestone_day in (1,30,60,90)),
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz
);

-- Helpful indexes
create index if not exists idx_checkups_employee on public.checkups(employee_id);
create index if not exists idx_checkups_milestone on public.checkups(milestone_day);
