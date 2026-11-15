begin;

create table public.late_entry_exam_schedules (
  id uuid primary key default gen_random_uuid(),
  department text not null,
  branch text,
  exam_type text not null,
  course_name text not null,
  course_code text not null,
  exam_date date not null,
  start_time time without time zone not null,
  is_published boolean not null default true,
  created_by_user_id text not null,
  created_at timestamptz not null default now()
);

create unique index late_entry_exam_schedules_unique_schedule
  on public.late_entry_exam_schedules (
    lower(trim(department)),
    lower(trim(coalesce(branch, ''))),
    lower(trim(course_code)),
    exam_date,
    start_time,
    lower(trim(exam_type))
  );

alter table public.late_entry_requests
  add column schedule_id uuid references public.late_entry_exam_schedules(id),
  add column student_phone text,
  add column exam_type text,
  add column course_name text,
  add column course_code text;

alter table public.late_entry_exam_schedules enable row level security;

drop policy if exists "students view their own late-entry requests"
  on public.late_entry_requests;
drop policy if exists "students create late-entry requests"
  on public.late_entry_requests;
drop policy if exists "examination cell manages late-entry requests"
  on public.late_entry_requests;
create policy "participants view late-entry requests"
  on public.late_entry_requests
  for select to authenticated
  using (
    student_user_id = public.exgrev_user_id()
    or public.exgrev_role() = 'examination cell'
  );
create policy "students submit late-entry requests"
  on public.late_entry_requests
  for insert to authenticated
  with check (public.exgrev_role() = 'student');

drop policy if exists "authenticated users view published late-entry schedules"
  on public.late_entry_exam_schedules;
create policy "authenticated users view published late-entry schedules"
  on public.late_entry_exam_schedules
  for select to authenticated
  using (
    is_published
    and public.exgrev_role() in ('student', 'examination cell', 'teaching staff')
  );
create policy "examination cell manages late-entry schedules"
  on public.late_entry_exam_schedules
  for all to authenticated
  using (public.exgrev_role() = 'examination cell')
  with check (public.exgrev_role() = 'examination cell');

create or replace function public.prepare_late_entry_exam_schedule()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if public.exgrev_role() <> 'examination cell' then
    raise exception using errcode = '42501', message = 'Only the Examination Cell can publish exam schedules';
  end if;
  new.created_by_user_id := public.exgrev_user_id();
  return new;
end;
$$;

drop trigger if exists late_entry_schedule_creator on public.late_entry_exam_schedules;
create trigger late_entry_schedule_creator
  before insert on public.late_entry_exam_schedules
  for each row execute function public.prepare_late_entry_exam_schedule();

create or replace function public.prepare_late_entry_request()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id text;
  v_user public.users%rowtype;
  v_schedule public.late_entry_exam_schedules%rowtype;
  v_profile jsonb;
begin
  if public.exgrev_role() <> 'student' then
    raise exception using errcode = '42501', message = 'Only students can submit late-entry requests';
  end if;

  v_user_id := public.exgrev_user_id();
  select * into v_user
  from public.users
  where account_identifier = v_user_id
    and lower(trim("Ex Factor")) = 'student';
  if not found or nullif(trim(v_user."Full Name"), '') is null
    or nullif(trim(v_user."Department"), '') is null then
    raise exception using errcode = '42501', message = 'Your student profile is incomplete; contact the Examination Cell';
  end if;

  select * into v_schedule
  from public.late_entry_exam_schedules
  where id = new.schedule_id
    and is_published
    and lower(trim(department)) = lower(trim(v_user."Department"))
    and (
      nullif(trim(branch), '') is null
      or lower(trim(branch)) = lower(trim(coalesce(v_user."Branch", '')))
    );
  if not found then
    raise exception using errcode = '42501', message = 'The selected exam schedule is not available for your department and branch';
  end if;

  v_profile := to_jsonb(v_user);
  new.student_user_id := v_user_id;
  new.student_name := v_user."Full Name";
  new.student_email := v_user.email;
  new.student_roll_number := v_user."User ID";
  new.student_registration_number := coalesce(
    v_profile ->> 'Enrollment Number',
    v_profile ->> 'Registration Number',
    v_profile ->> 'Registration/Enrollment Number'
  );
  new.student_phone := v_user."Phone Number";
  new.department := v_user."Department";
  new.branch := v_user."Branch";
  new.exam_type := v_schedule.exam_type;
  new.examination_name := v_schedule.exam_type;
  new.course_name := v_schedule.course_name;
  new.course_code := v_schedule.course_code;
  new.course := v_schedule.course_name;
  new.subject := v_schedule.course_name;
  new.examination_date := v_schedule.exam_date;
  new.scheduled_start_time := v_schedule.start_time::text;
  new.status := 'pending';
  new.requested_at := now();
  new.reviewed_by_user_id := null;
  new.reviewed_by_name := null;
  new.reviewed_at := null;
  new.decision_reason := null;
  new.approved_by_user_id := null;
  new.approval_signature := null;
  new.approval_signature_metadata := '{}'::jsonb;
  new.entry_confirmed_at := null;
  new.entry_confirmed_by_user_id := null;
  new.entry_confirmed_by_name := null;
  return new;
end;
$$;

drop trigger if exists late_entry_request_profile_snapshot
  on public.late_entry_requests;
create trigger late_entry_request_profile_snapshot
  before insert on public.late_entry_requests
  for each row execute function public.prepare_late_entry_request();

create or replace function public.record_late_entry_submission()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.late_entry_events (
    request_id,
    event_type,
    actor_user_id,
    actor_name,
    actor_role,
    event_data
  ) values (
    new.id,
    'submitted',
    new.student_user_id,
    new.student_name,
    'student',
    jsonb_build_object(
      'department', new.department,
      'branch', new.branch,
      'exam_type', new.exam_type,
      'course_name', new.course_name,
      'course_code', new.course_code,
      'exam_date', new.examination_date,
      'start_time', new.scheduled_start_time
    )
  );
  return new;
end;
$$;

drop trigger if exists late_entry_request_submitted on public.late_entry_requests;
create trigger late_entry_request_submitted
  after insert on public.late_entry_requests
  for each row execute function public.record_late_entry_submission();

create or replace function public.decide_late_entry_request(
  p_request_id uuid,
  p_decision text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_request public.late_entry_requests%rowtype;
  v_actor text;
  v_name text;
begin
  if public.exgrev_role() <> 'examination cell' then
    raise exception using errcode = '42501', message = 'Only the Examination Cell can decide late-entry requests';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception using errcode = '22023', message = 'Decision must be approved or rejected';
  end if;
  if p_decision = 'rejected' and nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception using errcode = '22023', message = 'A rejection reason is required';
  end if;

  v_actor := public.exgrev_user_id();
  select "Full Name" into v_name
  from public.users
  where account_identifier = v_actor;

  select * into v_request
  from public.late_entry_requests
  where id = p_request_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Late-entry request was not found';
  end if;
  if v_request.status <> 'pending' then
    raise exception using errcode = '40001', message = 'This request has already been decided';
  end if;

  update public.late_entry_requests
  set status = p_decision::public.late_entry_status,
      reviewed_by_user_id = v_actor,
      reviewed_by_name = v_name,
      reviewed_at = now(),
      approved_by_user_id = case when p_decision = 'approved' then v_actor else null end,
      decision_reason = nullif(trim(coalesce(p_reason, '')), ''),
      updated_at = now()
  where id = p_request_id
  returning * into v_request;

  insert into public.late_entry_events (
    request_id, event_type, actor_user_id, actor_name, actor_role, event_data
  ) values (
    v_request.id,
    p_decision,
    v_actor,
    v_name,
    'examination cell',
    jsonb_build_object('reason', v_request.decision_reason)
  );

  return to_jsonb(v_request);
end;
$$;

create or replace function public.prevent_late_entry_event_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception using errcode = '42501', message = 'Late-entry audit events are append-only';
end;
$$;

drop trigger if exists late_entry_events_append_only on public.late_entry_events;
create trigger late_entry_events_append_only
  before update or delete on public.late_entry_events
  for each row execute function public.prevent_late_entry_event_mutation();

drop policy if exists "participants can read late-entry events" on public.late_entry_events;
drop policy if exists "trusted workflows can add late-entry events" on public.late_entry_events;
create policy "request participants read late-entry events"
  on public.late_entry_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.late_entry_requests as request
      where request.id = late_entry_events.request_id
        and (
          request.student_user_id = public.exgrev_user_id()
          or public.exgrev_role() = 'examination cell'
        )
    )
  );

revoke insert, update, delete on public.late_entry_events from anon, authenticated;
revoke update on public.late_entry_requests from anon, authenticated;
grant select, insert on public.late_entry_requests to authenticated;
grant select on public.late_entry_events to authenticated;
grant select, insert, update on public.late_entry_exam_schedules to authenticated;

revoke all on function public.decide_late_entry_request(uuid, text, text)
  from public, anon;
grant execute on function public.decide_late_entry_request(uuid, text, text)
  to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'late-entry-documents',
  'late-entry-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "students upload own late-entry documents" on storage.objects;
create policy "students upload own late-entry documents"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'late-entry-documents'
    and (storage.foldername(name))[1] = public.exgrev_user_id()
    and public.exgrev_role() = 'student'
  );

drop policy if exists "request participants read late-entry documents" on storage.objects;
create policy "request participants read late-entry documents"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'late-entry-documents'
    and (
      (storage.foldername(name))[1] = public.exgrev_user_id()
      or public.exgrev_role() = 'examination cell'
    )
  );

commit;
