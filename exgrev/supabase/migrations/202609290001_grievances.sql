-- Run in Supabase SQL Editor after confirming public.users uses these exact columns.
create extension if not exists pgcrypto;

create table if not exists public.grievances (
  id uuid primary key default gen_random_uuid(),
  grievance_number bigint generated always as identity unique,
  student_user_id text not null references public.users ("User ID"),
  created_at timestamptz not null default now(),
  subject text not null check (length(trim(subject)) between 1 and 200),
  description text not null check (length(trim(description)) between 1 and 10000),
  problem_category text not null,
  problem_type text not null,
  supporting_documents jsonb not null default '[]'::jsonb,
  status text not null default 'New' check (status in ('New', 'In Progress', 'Resolved', 'Over Due')),
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_faculty_user_id text references public.users ("User ID"),
  assigned_faculty text not null default 'ExGrev Unforward',
  resolution_remark text,
  updated_at timestamptz not null default now()
);

create table if not exists public.grievance_events (
  id uuid primary key default gen_random_uuid(),
  grievance_id uuid not null references public.grievances(id) on delete cascade,
  actor_user_id text not null references public.users ("User ID"),
  event_type text not null check (event_type in ('submitted', 'forwarded', 'reassigned', 'status_changed', 'resolved', 'remark_added')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists grievances_student_created_idx on public.grievances(student_user_id, created_at desc);
create index if not exists grievances_assignee_status_idx on public.grievances(assigned_faculty_user_id, status);
create index if not exists grievance_events_case_created_idx on public.grievance_events(grievance_id, created_at);

create or replace function public.exgrev_role()
returns text language sql stable as $$
  select lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'role', ''))
$$;
create or replace function public.exgrev_user_id()
returns text language sql stable as $$
  select auth.jwt() -> 'user_metadata' ->> 'user_id'
$$;

alter table public.grievances enable row level security;
alter table public.grievance_events enable row level security;
grant select, insert, update on public.grievances to authenticated;
grant select, insert on public.grievance_events to authenticated;

drop policy if exists "students read own grievances" on public.grievances;
create policy "students read own grievances" on public.grievances for select to authenticated
 using (student_user_id = public.exgrev_user_id());
drop policy if exists "staff read all grievances" on public.grievances;
create policy "staff read all grievances" on public.grievances for select to authenticated
 using (public.exgrev_role() in ('examination cell', 'teaching staff'));
drop policy if exists "students submit own grievances" on public.grievances;
create policy "students submit own grievances" on public.grievances for insert to authenticated
 with check (student_user_id = public.exgrev_user_id() and public.exgrev_role() = 'student');
drop policy if exists "examination cell updates grievances" on public.grievances;
create policy "examination cell updates grievances" on public.grievances for update to authenticated
 using (public.exgrev_role() = 'examination cell') with check (public.exgrev_role() = 'examination cell');
drop policy if exists "assigned faculty updates own grievances" on public.grievances;
create policy "assigned faculty updates own grievances" on public.grievances for update to authenticated
 using (public.exgrev_role() = 'teaching staff' and assigned_faculty_user_id = public.exgrev_user_id())
 with check (public.exgrev_role() = 'teaching staff' and assigned_faculty_user_id = public.exgrev_user_id());
drop policy if exists "students read own grievance events" on public.grievance_events;
create policy "students read own grievance events" on public.grievance_events for select to authenticated
 using (exists (select 1 from public.grievances g where g.id = grievance_id and g.student_user_id = public.exgrev_user_id()));
drop policy if exists "staff read grievance events" on public.grievance_events;
create policy "staff read grievance events" on public.grievance_events for select to authenticated
 using (public.exgrev_role() in ('examination cell', 'teaching staff'));
drop policy if exists "staff add grievance events" on public.grievance_events;
create policy "staff add grievance events" on public.grievance_events for insert to authenticated
 with check (public.exgrev_role() in ('examination cell', 'teaching staff') and actor_user_id = public.exgrev_user_id()
   and exists (select 1 from public.grievances g where g.id = grievance_id
     and (public.exgrev_role() = 'examination cell' or g.assigned_faculty_user_id = public.exgrev_user_id())));
drop policy if exists "students log own submissions" on public.grievance_events;
create policy "students log own submissions" on public.grievance_events for insert to authenticated
 with check (public.exgrev_role() = 'student' and actor_user_id = public.exgrev_user_id() and event_type = 'submitted'
   and exists (select 1 from public.grievances g where g.id = grievance_id and g.student_user_id = public.exgrev_user_id()));

-- Staff name lookup is needed for the forwarding search. Keep the exposed columns limited in the UI query.
alter table public.users enable row level security;
drop policy if exists "signed-in staff can find assignable users" on public.users;
create policy "signed-in staff can find assignable users" on public.users for select to authenticated
 using (public.exgrev_role() = 'examination cell' and "Ex Factor" in ('Teaching staff', 'Examination Cell'));
drop policy if exists "staff can read student identities" on public.users;
create policy "staff can read student identities" on public.users for select to authenticated
 using (public.exgrev_role() in ('examination cell', 'teaching staff'));
grant select on public.users to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('grievance-documents', 'grievance-documents', false, 10485760,
  array['application/pdf','image/png','image/jpeg','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = 10485760;
drop policy if exists "student uploads own grievance files" on storage.objects;
create policy "student uploads own grievance files" on storage.objects for insert to authenticated
 with check (bucket_id = 'grievance-documents' and (storage.foldername(name))[1] = public.exgrev_user_id() and public.exgrev_role() = 'student');
drop policy if exists "grievance participants read files" on storage.objects;
create policy "grievance participants read files" on storage.objects for select to authenticated
 using (bucket_id = 'grievance-documents' and (public.exgrev_role() in ('examination cell','teaching staff') or (storage.foldername(name))[1] = public.exgrev_user_id()));

-- Enable database change notifications for the live dashboards.
do $$ begin
  alter publication supabase_realtime add table public.grievances;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.grievance_events;
exception when duplicate_object then null;
end $$;
