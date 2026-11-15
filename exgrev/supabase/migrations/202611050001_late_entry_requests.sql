begin;

create extension if not exists pgcrypto;

create type public.late_entry_status as enum (
  'pending',
  'approved',
  'rejected',
  'entry_confirmed'
);

create table public.late_entry_requests (
  id uuid primary key default gen_random_uuid(),
  student_user_id text not null,
  student_name text not null default '',
  student_email text,
  student_roll_number text,
  student_registration_number text,
  department text,
  branch text,
  course text,
  examination_name text,
  subject text,
  examination_date date,
  scheduled_start_time text,
  reason text not null,
  supporting_documents jsonb not null default '[]'::jsonb,
  status public.late_entry_status not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_by_user_id text,
  reviewed_by_name text,
  reviewed_at timestamptz,
  decision_reason text,
  approved_by_user_id text,
  approval_signature text,
  approval_signature_metadata jsonb not null default '{}'::jsonb,
  qr_session_id uuid,
  entry_confirmed_at timestamptz,
  entry_confirmed_by_user_id text,
  entry_confirmed_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.late_entry_qr_sessions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.late_entry_requests(id) on delete cascade,
  student_user_id text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  token text not null,
  session_key text not null,
  is_active boolean not null default true,
  is_redeemed boolean not null default false,
  redeemed_by_user_id text,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.late_entry_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.late_entry_requests(id) on delete cascade,
  event_type text not null,
  actor_user_id text,
  actor_name text,
  actor_role text,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.late_entry_requests enable row level security;
alter table public.late_entry_qr_sessions enable row level security;
alter table public.late_entry_events enable row level security;

create policy "students view their own late-entry requests"
  on public.late_entry_requests
  for select
  using (
    student_user_id = public.exgrev_user_id()
    or public.exgrev_role() in ('examination cell', 'teaching staff')
  );

create policy "students create late-entry requests"
  on public.late_entry_requests
  for insert
  with check (student_user_id = public.exgrev_user_id());

create policy "examination cell manages late-entry requests"
  on public.late_entry_requests
  for update
  using (public.exgrev_role() = 'examination cell')
  with check (public.exgrev_role() = 'examination cell');

create policy "staff can read qr sessions for assigned request review"
  on public.late_entry_qr_sessions
  for select
  using (
    student_user_id = public.exgrev_user_id()
    or public.exgrev_role() in ('examination cell', 'teaching staff')
  );

create policy "students can create their own qr session"
  on public.late_entry_qr_sessions
  for insert
  with check (student_user_id = public.exgrev_user_id());

create policy "exam cell can update qr sessions"
  on public.late_entry_qr_sessions
  for update
  using (public.exgrev_role() = 'examination cell')
  with check (public.exgrev_role() = 'examination cell');

create policy "participants can read late-entry events"
  on public.late_entry_events
  for select
  using (
    exists (
      select 1
      from public.late_entry_requests as request
      where request.id = late_entry_events.request_id
        and (
          request.student_user_id = public.exgrev_user_id()
          or public.exgrev_role() in ('examination cell', 'teaching staff')
        )
    )
  );

create policy "trusted workflows can add late-entry events"
  on public.late_entry_events
  for insert
  with check (public.exgrev_role() in ('examination cell', 'teaching staff', 'student'));

create or replace function public.update_late_entry_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger late_entry_requests_updated_at
  before update on public.late_entry_requests
  for each row execute function public.update_late_entry_updated_at();

create trigger late_entry_qr_sessions_updated_at
  before update on public.late_entry_qr_sessions
  for each row execute function public.update_late_entry_updated_at();

create or replace function public.record_late_entry_event(
  p_request_id uuid,
  p_event_type text,
  p_actor_user_id text default null,
  p_actor_name text default null,
  p_actor_role text default null,
  p_event_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
begin
  insert into public.late_entry_events(
    request_id,
    event_type,
    actor_user_id,
    actor_name,
    actor_role,
    event_data
  ) values (
    p_request_id,
    p_event_type,
    p_actor_user_id,
    p_actor_name,
    p_actor_role,
    coalesce(p_event_data, '{}'::jsonb)
  ) returning id into v_event_id;

  return v_event_id;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.late_entry_requests to authenticated;
grant select, insert, update on public.late_entry_qr_sessions to authenticated;
grant select, insert on public.late_entry_events to authenticated;

drop trigger if exists late_entry_requests_updated_at on public.late_entry_requests;
drop trigger if exists late_entry_qr_sessions_updated_at on public.late_entry_qr_sessions;

create trigger late_entry_requests_updated_at
  before update on public.late_entry_requests
  for each row execute function public.update_late_entry_updated_at();

create trigger late_entry_qr_sessions_updated_at
  before update on public.late_entry_qr_sessions
  for each row execute function public.update_late_entry_updated_at();

commit;
