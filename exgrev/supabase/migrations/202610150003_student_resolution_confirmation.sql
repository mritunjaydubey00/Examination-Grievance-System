begin;

alter table public.grievances
  add column if not exists resolution_pending boolean not null default false,
  add column if not exists resolution_proposed_by text,
  add column if not exists resolution_proposed_at timestamptz,
  add column if not exists student_confirmed_at timestamptz;

alter table public.grievance_events
  drop constraint if exists grievance_events_event_type_check,
  add constraint grievance_events_event_type_check
    check (
      event_type in (
        'submitted',
        'forwarded',
        'reassigned',
        'status_changed',
        'resolved',
        'remark_added',
        'resolution_proposed',
        'student_confirmed_resolution'
      )
    );

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
  new_event_type text;
begin
  if public.exgrev_role() <> 'examination cell' then
    raise exception 'Only the Examination Cell can add remarks or propose a resolution';
  end if;

  if requested_action not in ('remark', 'resolve')
    or action_remark is null
    or length(trim(action_remark)) = 0 then
    raise exception 'Enter a remark before continuing';
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

  if requested_action = 'remark' then
    update public.grievances
    set status = 'In Progress',
        updated_at = now()
    where id = target_grievance_id
    returning * into updated_grievance;
    new_event_type := 'remark_added';
  else
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
    new_event_type := 'resolution_proposed';
  end if;

  insert into public.grievance_events (
    grievance_id,
    actor_user_id,
    event_type,
    details
  )
  values (
    target_grievance_id,
    current_user_id,
    new_event_type,
    jsonb_build_object('remark', trim(action_remark))
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
begin
  if public.exgrev_role() <> 'student' then
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

  insert into public.grievance_events (
    grievance_id,
    actor_user_id,
    event_type,
    details
  )
  values (
    target_grievance_id,
    current_user_id,
    'student_confirmed_resolution',
    jsonb_build_object('remark', target_grievance.resolution_remark)
  );
end;
$$;

revoke all on function public.confirm_grievance_resolution(uuid) from public;
revoke all on function public.examination_cell_grievance_action(uuid, text, text) from public;
grant execute on function public.confirm_grievance_resolution(uuid) to authenticated;
grant execute on function public.examination_cell_grievance_action(uuid, text, text) to authenticated;

commit;
