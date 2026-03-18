-- Time Tracker (stored in feedbackApp schema)
create table if not exists "feedbackApp"."TimeProjects" (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null,
  name text not null,
  hourly_rate numeric,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_projects_unique_company_name unique (company_id, name)
);

create index if not exists idx_time_projects_company on "feedbackApp"."TimeProjects"(company_id);

create table if not exists "feedbackApp"."TimeProjectRequests" (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null,
  requested_by uuid not null,
  name text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_by uuid,
  reviewed_at timestamptz
);

create index if not exists idx_time_project_requests_company on "feedbackApp"."TimeProjectRequests"(company_id);
create index if not exists idx_time_project_requests_status on "feedbackApp"."TimeProjectRequests"(status);
create index if not exists idx_time_project_requests_requested_by on "feedbackApp"."TimeProjectRequests"(requested_by);

create table if not exists "feedbackApp"."TimeEntries" (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null,
  user_id uuid not null,
  project_id uuid references "feedbackApp"."TimeProjects"(id) on delete set null,
  description text,
  billable boolean not null default false,
  start_time timestamptz not null,
  end_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_entries_end_after_start check (end_time is null or end_time >= start_time)
);

-- Duration columns (migration-safe for existing DBs)
alter table "feedbackApp"."TimeEntries" add column if not exists duration_seconds integer;
alter table "feedbackApp"."TimeEntries" add column if not exists duration_minutes numeric;
alter table "feedbackApp"."TimeEntries" add column if not exists duration_hours numeric;
alter table "feedbackApp"."TimeEntries" add column if not exists duration_text text;

create or replace function "feedbackApp".set_time_entry_durations()
returns trigger
language plpgsql
as $$
declare
  secs integer;
  hh integer;
  mm integer;
  ss integer;
begin
  if new.end_time is null then
    new.duration_seconds := null;
    new.duration_minutes := null;
    new.duration_hours := null;
    new.duration_text := null;
  else
    secs := greatest(0, floor(extract(epoch from (new.end_time - new.start_time)))::int);
    hh := secs / 3600;
    mm := (secs % 3600) / 60;
    ss := secs % 60;
    new.duration_seconds := secs;
    new.duration_minutes := secs / 60.0;
    new.duration_hours := secs / 3600.0;
    new.duration_text := to_char(make_interval(secs => secs), 'HH24:MI:SS');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_time_entry_durations on "feedbackApp"."TimeEntries";
create trigger trg_set_time_entry_durations
before insert or update of start_time, end_time
on "feedbackApp"."TimeEntries"
for each row
execute function "feedbackApp".set_time_entry_durations();

update "feedbackApp"."TimeEntries"
set
  duration_seconds = case
    when end_time is null then null
    else greatest(0, floor(extract(epoch from (end_time - start_time)))::int)
  end,
  duration_minutes = case
    when end_time is null then null
    else greatest(0, extract(epoch from (end_time - start_time)) / 60.0)
  end,
  duration_hours = case
    when end_time is null then null
    else greatest(0, extract(epoch from (end_time - start_time)) / 3600.0)
  end,
  duration_text = case
    when end_time is null then null
    else to_char(
      make_interval(secs => greatest(0, floor(extract(epoch from (end_time - start_time)))::int)),
      'HH24:MI:SS'
    )
  end;

create index if not exists idx_time_entries_user on "feedbackApp"."TimeEntries"(user_id);
create index if not exists idx_time_entries_company on "feedbackApp"."TimeEntries"(company_id);
create index if not exists idx_time_entries_project on "feedbackApp"."TimeEntries"(project_id);
create index if not exists idx_time_entries_open on "feedbackApp"."TimeEntries"(user_id) where end_time is null;

alter table "feedbackApp"."TimeProjects" enable row level security;
alter table "feedbackApp"."TimeProjectRequests" enable row level security;
alter table "feedbackApp"."TimeEntries" enable row level security;

-- Helper: manager/admin role check via ProfileRoles + Roles
-- (Role values are stored in Roles.Role)

-- TimeProjects policies
drop policy if exists "TimeProjects company read" on "feedbackApp"."TimeProjects";
create policy "TimeProjects company read" on "feedbackApp"."TimeProjects"
  for select
  using (
    exists (
      select 1
      from "feedbackApp"."profiles" p
      where p.user_id = auth.uid()
        and p."CompanyID" = "feedbackApp"."TimeProjects".company_id
    )
  );

drop policy if exists "TimeProjects manager write" on "feedbackApp"."TimeProjects";
create policy "TimeProjects manager write" on "feedbackApp"."TimeProjects"
  for all
  using (
    exists (
      select 1
      from "feedbackApp"."profiles" p
      join "feedbackApp"."ProfileRoles" pr on pr."idProfile" = p.user_id
      join "feedbackApp"."Roles" r on r.id = pr."idRol"
      where p.user_id = auth.uid()
        and p."CompanyID" = "feedbackApp"."TimeProjects".company_id
        and lower(trim(r."Role")) in ('manager','admin','super admin')
    )
  )
  with check (
    exists (
      select 1
      from "feedbackApp"."profiles" p
      join "feedbackApp"."ProfileRoles" pr on pr."idProfile" = p.user_id
      join "feedbackApp"."Roles" r on r.id = pr."idRol"
      where p.user_id = auth.uid()
        and p."CompanyID" = "feedbackApp"."TimeProjects".company_id
        and lower(trim(r."Role")) in ('manager','admin','super admin')
    )
  );

-- TimeProjectRequests policies
drop policy if exists "TimeProjectRequests requester read" on "feedbackApp"."TimeProjectRequests";
create policy "TimeProjectRequests requester read" on "feedbackApp"."TimeProjectRequests"
  for select
  using (requested_by = auth.uid());

drop policy if exists "TimeProjectRequests requester insert" on "feedbackApp"."TimeProjectRequests";
create policy "TimeProjectRequests requester insert" on "feedbackApp"."TimeProjectRequests"
  for insert
  with check (
    requested_by = auth.uid()
    and exists (
      select 1
      from "feedbackApp"."profiles" p
      where p.user_id = auth.uid()
        and p."CompanyID" = "feedbackApp"."TimeProjectRequests".company_id
    )
  );

drop policy if exists "TimeProjectRequests manager read" on "feedbackApp"."TimeProjectRequests";
create policy "TimeProjectRequests manager read" on "feedbackApp"."TimeProjectRequests"
  for select
  using (
    exists (
      select 1
      from "feedbackApp"."profiles" p
      join "feedbackApp"."ProfileRoles" pr on pr."idProfile" = p.user_id
      join "feedbackApp"."Roles" r on r.id = pr."idRol"
      where p.user_id = auth.uid()
        and p."CompanyID" = "feedbackApp"."TimeProjectRequests".company_id
        and lower(trim(r."Role")) in ('manager','admin','super admin')
    )
  );

drop policy if exists "TimeProjectRequests manager update" on "feedbackApp"."TimeProjectRequests";
create policy "TimeProjectRequests manager update" on "feedbackApp"."TimeProjectRequests"
  for update
  using (
    exists (
      select 1
      from "feedbackApp"."profiles" p
      join "feedbackApp"."ProfileRoles" pr on pr."idProfile" = p.user_id
      join "feedbackApp"."Roles" r on r.id = pr."idRol"
      where p.user_id = auth.uid()
        and p."CompanyID" = "feedbackApp"."TimeProjectRequests".company_id
        and lower(trim(r."Role")) in ('manager','admin','super admin')
    )
  )
  with check (
    exists (
      select 1
      from "feedbackApp"."profiles" p
      join "feedbackApp"."ProfileRoles" pr on pr."idProfile" = p.user_id
      join "feedbackApp"."Roles" r on r.id = pr."idRol"
      where p.user_id = auth.uid()
        and p."CompanyID" = "feedbackApp"."TimeProjectRequests".company_id
        and lower(trim(r."Role")) in ('manager','admin','super admin')
    )
  );

-- TimeEntries policies
drop policy if exists "TimeEntries user read" on "feedbackApp"."TimeEntries";
create policy "TimeEntries user read" on "feedbackApp"."TimeEntries"
  for select
  using (user_id = auth.uid());

drop policy if exists "TimeEntries user write" on "feedbackApp"."TimeEntries";
create policy "TimeEntries user write" on "feedbackApp"."TimeEntries"
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from "feedbackApp"."profiles" p
      where p.user_id = auth.uid()
        and p."CompanyID" = "feedbackApp"."TimeEntries".company_id
    )
  );

drop policy if exists "TimeEntries user update" on "feedbackApp"."TimeEntries";
create policy "TimeEntries user update" on "feedbackApp"."TimeEntries"
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "TimeEntries manager read" on "feedbackApp"."TimeEntries";
create policy "TimeEntries manager read" on "feedbackApp"."TimeEntries"
  for select
  using (
    exists (
      select 1
      from "feedbackApp"."profiles" p
      join "feedbackApp"."ProfileRoles" pr on pr."idProfile" = p.user_id
      join "feedbackApp"."Roles" r on r.id = pr."idRol"
      where p.user_id = auth.uid()
        and p."CompanyID" = "feedbackApp"."TimeEntries".company_id
        and lower(trim(r."Role")) in ('manager','admin','super admin')
    )
  );