begin;

alter table public.grievance_events
  add column if not exists actor_display_name text,
  add column if not exists recipients_recorded boolean not null default false;

update public.grievance_events as event
set actor_display_name = coalesce(user_row."Full Name", event.actor_user_id)
from public.users as user_row
where user_row.account_identifier = event.actor_user_id
  and event.actor_display_name is null;

create table if not exists public.grievance_event_recipients (
  event_id uuid not null references public.grievance_events(id) on delete cascade,
  recipient_user_id text not null references public.users(account_identifier) on update cascade,
  recipient_display_name text not null,
  primary key (event_id, recipient_user_id)
);

create index if not exists grievance_event_recipients_user_idx
  on public.grievance_event_recipients(recipient_user_id, event_id);

alter table public.grievance_event_recipients enable row level security;

create or replace function public.can_access_grievance(target_grievance_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.grievances as grievance
    where grievance.id = target_grievance_id
      and (
        (
          public.exgrev_role() = 'student'
          and grievance.student_user_id = public.exgrev_user_id()
        )
        or (
          public.exgrev_role() = 'teaching staff'
          and grievance.assigned_faculty_user_id = public.exgrev_user_id()
        )
        or public.exgrev_role() = 'examination cell'
      )
  )
$$;

revoke all on function public.can_access_grievance(uuid) from public, anon;
grant execute on function public.can_access_grievance(uuid) to authenticated;

drop policy if exists "staff read all grievances" on public.grievances;
drop policy if exists "examination cell reads all grievances" on public.grievances;
create policy "examination cell reads all grievances"
  on public.grievances for select to authenticated
  using (public.exgrev_role() = 'examination cell');
drop policy if exists "assigned teaching staff reads grievances" on public.grievances;
create policy "assigned teaching staff reads grievances"
  on public.grievances for select to authenticated
  using (
    public.exgrev_role() = 'teaching staff'
    and assigned_faculty_user_id = public.exgrev_user_id()
  );

drop policy if exists "staff read grievance events" on public.grievance_events;
drop policy if exists "examination cell reads grievance events" on public.grievance_events;
create policy "examination cell reads grievance events"
  on public.grievance_events for select to authenticated
  using (public.exgrev_role() = 'examination cell');
drop policy if exists "assigned teaching staff reads grievance events" on public.grievance_events;
create policy "assigned teaching staff reads grievance events"
  on public.grievance_events for select to authenticated
  using (
    public.exgrev_role() = 'teaching staff'
    and exists (
      select 1
      from public.grievances as grievance
      where grievance.id = grievance_id
        and grievance.assigned_faculty_user_id = public.exgrev_user_id()
    )
  );

drop policy if exists "staff add grievance events" on public.grievance_events;
drop policy if exists "students log own submissions" on public.grievance_events;
revoke insert on public.grievance_events from anon, authenticated;
grant select on public.grievance_events to authenticated;
revoke all on public.grievance_event_recipients from anon, authenticated;
grant select (event_id, recipient_display_name)
  on public.grievance_event_recipients to authenticated;

drop policy if exists "participants read grievance event recipients"
  on public.grievance_event_recipients;
create policy "participants read grievance event recipients"
  on public.grievance_event_recipients for select to authenticated
  using (
    exists (
      select 1
      from public.grievance_events as event
      where event.id = grievance_event_recipients.event_id
        and public.can_access_grievance(event.grievance_id)
    )
  );

create or replace function public.record_grievance_event(
  target_grievance_id uuid,
  target_actor_user_id text,
  target_event_type text,
  target_details jsonb,
  target_recipient_user_ids text[] default '{}'::text[]
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_event_id uuid;
  actor_name text;
begin
  select coalesce(user_row."Full Name", user_row.account_identifier)
  into actor_name
  from public.users as user_row
  where user_row.account_identifier = target_actor_user_id;

  insert into public.grievance_events (
    grievance_id,
    actor_user_id,
    actor_display_name,
    recipients_recorded,
    event_type,
    details
  )
  values (
    target_grievance_id,
    target_actor_user_id,
    coalesce(actor_name, target_actor_user_id),
    true,
    target_event_type,
    coalesce(target_details, '{}'::jsonb)
  )
  returning id into new_event_id;

  insert into public.grievance_event_recipients (
    event_id,
    recipient_user_id,
    recipient_display_name
  )
  select
    new_event_id,
    user_row.account_identifier,
    coalesce(user_row."Full Name", user_row.account_identifier)
  from public.users as user_row
  where user_row.account_identifier = any(coalesce(target_recipient_user_ids, '{}'::text[]))
    and user_row.account_identifier <> target_actor_user_id
  on conflict (event_id, recipient_user_id) do nothing;

  return new_event_id;
end;
$$;

revoke all on function public.record_grievance_event(uuid, text, text, jsonb, text[])
  from public, anon, authenticated;

create or replace function public.record_grievance_submission()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id text;
  recipients text[];
begin
  current_user_id := public.exgrev_user_id();
  if public.exgrev_role() is distinct from 'student'
    or current_user_id is distinct from new.student_user_id then
    raise exception 'Students may only submit grievances for their own account';
  end if;

  select coalesce(array_agg(user_row.account_identifier), '{}'::text[])
  into recipients
  from public.users as user_row
  where lower(trim(user_row."Ex Factor")) = 'examination cell';

  perform public.record_grievance_event(
    new.id,
    current_user_id,
    'submitted',
    jsonb_build_object('status', new.status),
    recipients
  );
  return new;
end;
$$;

drop trigger if exists grievances_record_submission on public.grievances;
create trigger grievances_record_submission
  after insert on public.grievances
  for each row execute function public.record_grievance_submission();

create or replace function public.add_grievance_remark(
  target_grievance_id uuid,
  action_remark text
)
returns public.grievances
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  target_grievance public.grievances%rowtype;
  updated_grievance public.grievances%rowtype;
  current_user_id text;
  caller_role text;
  recipients text[];
begin
  current_user_id := public.exgrev_user_id();
  caller_role := public.exgrev_role();

  if current_user_id is null
    or caller_role is null
    or caller_role not in ('student', 'teaching staff', 'examination cell') then
    raise exception 'You are not authorized to add a grievance remark';
  end if;
  if action_remark is null or length(trim(action_remark)) = 0 then
    raise exception 'Enter a remark before continuing';
  end if;

  select *
  into target_grievance
  from public.grievances
  where id = target_grievance_id
  for update;

  if not found then
    raise exception 'Grievance not found';
  end if;
  if target_grievance.status = 'Resolved' then
    raise exception 'This grievance is already resolved';
  end if;
  if caller_role = 'student'
    and target_grievance.student_user_id <> current_user_id then
    raise exception 'Grievance not found';
  elsif caller_role = 'teaching staff'
    and target_grievance.assigned_faculty_user_id <> current_user_id then
    raise exception 'Assigned grievance not found';
  end if;
  if caller_role <> 'student' and target_grievance.resolution_pending then
    raise exception 'This grievance is awaiting student confirmation';
  end if;

  if caller_role <> 'student' then
    update public.grievances
    set status = 'In Progress',
        updated_at = now()
    where id = target_grievance_id
    returning * into updated_grievance;
  else
    updated_grievance := target_grievance;
  end if;

  select coalesce(array_agg(distinct participant.user_id), '{}'::text[])
  into recipients
  from (
    select target_grievance.student_user_id as user_id
    union
    select target_grievance.assigned_faculty_user_id
    union
    select user_row.account_identifier
    from public.users as user_row
    where lower(trim(user_row."Ex Factor")) = 'examination cell'
  ) as participant
  where participant.user_id is not null
    and participant.user_id <> current_user_id;

  perform public.record_grievance_event(
    target_grievance_id,
    current_user_id,
    'remark_added',
    jsonb_build_object('remark', trim(action_remark)),
    recipients
  );

  return updated_grievance;
end;
$$;

create or replace function public.assign_grievance(
  target_grievance_id uuid,
  target_faculty_user_id text,
  requested_due_date date,
  requested_priority text,
  action_remark text
)
returns public.grievances
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  target_grievance public.grievances%rowtype;
  updated_grievance public.grievances%rowtype;
  target_faculty public.users%rowtype;
  current_user_id text;
  assignment_event_type text;
begin
  if public.exgrev_role() is distinct from 'examination cell'
    or public.exgrev_user_id() is null then
    raise exception 'Only the Examination Cell can assign grievances';
  end if;
  if target_faculty_user_id is null or length(trim(target_faculty_user_id)) = 0 then
    raise exception 'Select a staff member to assign this grievance';
  end if;
  if requested_priority is null
    or requested_priority not in ('low', 'medium', 'high', 'urgent') then
    raise exception 'Select a valid priority';
  end if;
  if requested_due_date is not null and requested_due_date < current_date then
    raise exception 'Due date cannot be in the past';
  end if;

  current_user_id := public.exgrev_user_id();

  select *
  into target_grievance
  from public.grievances
  where id = target_grievance_id
  for update;

  if not found then
    raise exception 'Grievance not found';
  end if;
  if target_grievance.status = 'Resolved' then
    raise exception 'This grievance is already resolved';
  end if;
  if target_grievance.resolution_pending then
    raise exception 'This grievance is awaiting student confirmation';
  end if;

  select *
  into target_faculty
  from public.users
  where account_identifier = target_faculty_user_id
    and lower(trim("Ex Factor")) in ('teaching staff', 'examination cell');

  if not found then
    raise exception 'Select an eligible teaching staff or Examination Cell account';
  end if;

  assignment_event_type := case
    when target_grievance.assigned_faculty_user_id is null then 'forwarded'
    else 'reassigned'
  end;

  update public.grievances
  set status = 'In Progress',
      assigned_faculty_user_id = target_faculty.account_identifier,
      assigned_faculty = target_faculty."Full Name",
      due_date = requested_due_date,
      priority = requested_priority,
      updated_at = now()
  where id = target_grievance_id
  returning * into updated_grievance;

  perform public.record_grievance_event(
    target_grievance_id,
    current_user_id,
    assignment_event_type,
    jsonb_build_object(
      'from_name', target_grievance.assigned_faculty,
      'to_name', target_faculty."Full Name",
      'due_date', requested_due_date,
      'priority', requested_priority,
      'remark', nullif(trim(coalesce(action_remark, '')), '')
    ),
    array[target_faculty.account_identifier]
  );

  return updated_grievance;
end;
$$;

create or replace function public.examination_cell_grievance_action(
  target_grievance_id uuid,
  requested_action text,
  action_remark text
)
returns public.grievances
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  target_grievance public.grievances%rowtype;
  updated_grievance public.grievances%rowtype;
  current_user_id text;
  recipients text[];
begin
  if requested_action = 'remark' then
    return public.add_grievance_remark(target_grievance_id, action_remark);
  end if;

  if public.exgrev_role() is distinct from 'examination cell'
    or public.exgrev_user_id() is null then
    raise exception 'Only the Examination Cell can propose a resolution';
  end if;
  if requested_action <> 'resolve'
    or action_remark is null
    or length(trim(action_remark)) = 0 then
    raise exception 'Enter a resolution remark before continuing';
  end if;

  current_user_id := public.exgrev_user_id();

  select *
  into target_grievance
  from public.grievances
  where id = target_grievance_id
  for update;

  if not found then
    raise exception 'Grievance not found';
  end if;
  if target_grievance.status = 'Resolved' then
    raise exception 'This grievance is already resolved';
  end if;
  if target_grievance.resolution_pending then
    raise exception 'This grievance is awaiting student confirmation';
  end if;

  update public.grievances
  set status = 'In Progress',
      resolution_remark = trim(action_remark),
      resolution_pending = true,
      resolution_proposed_by = current_user_id,
      resolution_proposed_at = now(),
      student_confirmed_at = null,
      updated_at = now()
  where id = target_grievance_id
  returning * into updated_grievance;

  select coalesce(array_agg(distinct participant.user_id), '{}'::text[])
  into recipients
  from (
    select target_grievance.student_user_id as user_id
    union
    select target_grievance.assigned_faculty_user_id
    union
    select user_row.account_identifier
    from public.users as user_row
    where lower(trim(user_row."Ex Factor")) = 'examination cell'
  ) as participant
  where participant.user_id is not null
    and participant.user_id <> current_user_id;

  perform public.record_grievance_event(
    target_grievance_id,
    current_user_id,
    'resolution_proposed',
    jsonb_build_object('remark', trim(action_remark)),
    recipients
  );

  return updated_grievance;
end;
$$;

create or replace function public.confirm_grievance_resolution(
  target_grievance_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  target_grievance public.grievances%rowtype;
  current_user_id text;
  recipients text[];
begin
  if public.exgrev_role() is distinct from 'student'
    or public.exgrev_user_id() is null then
    raise exception 'Only the student who submitted this grievance can confirm its resolution';
  end if;

  current_user_id := public.exgrev_user_id();

  select *
  into target_grievance
  from public.grievances
  where id = target_grievance_id
  for update;

  if not found or target_grievance.student_user_id <> current_user_id then
    raise exception 'Grievance not found';
  end if;
  if not target_grievance.resolution_pending
    or target_grievance.status <> 'In Progress' then
    raise exception 'This grievance is not awaiting resolution confirmation';
  end if;

  update public.grievances
  set status = 'Resolved',
      resolution_pending = false,
      student_confirmed_at = now(),
      updated_at = now()
  where id = target_grievance_id;

  select coalesce(array_agg(distinct participant.user_id), '{}'::text[])
  into recipients
  from (
    select target_grievance.resolution_proposed_by as user_id
    union
    select target_grievance.assigned_faculty_user_id
    union
    select user_row.account_identifier
    from public.users as user_row
    where lower(trim(user_row."Ex Factor")) = 'examination cell'
  ) as participant
  where participant.user_id is not null
    and participant.user_id <> current_user_id;

  perform public.record_grievance_event(
    target_grievance_id,
    current_user_id,
    'student_confirmed_resolution',
    jsonb_build_object('remark', target_grievance.resolution_remark),
    recipients
  );
end;
$$;

drop function if exists public.teaching_staff_add_grievance_remark(uuid, text);

revoke all on function public.record_grievance_submission() from public, anon, authenticated;
revoke all on function public.add_grievance_remark(uuid, text) from public, anon;
revoke all on function public.assign_grievance(uuid, text, date, text, text) from public, anon;
revoke all on function public.examination_cell_grievance_action(uuid, text, text)
  from public, anon;
revoke all on function public.confirm_grievance_resolution(uuid) from public, anon;
grant execute on function public.add_grievance_remark(uuid, text) to authenticated;
grant execute on function public.assign_grievance(uuid, text, date, text, text)
  to authenticated;
grant execute on function public.examination_cell_grievance_action(uuid, text, text)
  to authenticated;
grant execute on function public.confirm_grievance_resolution(uuid) to authenticated;

commit;
