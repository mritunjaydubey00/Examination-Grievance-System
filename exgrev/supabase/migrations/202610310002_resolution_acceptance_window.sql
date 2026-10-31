begin;

create extension if not exists pg_cron with schema pg_catalog;

alter table public.grievances
  add column if not exists window_expires_at timestamptz,
  add column if not exists auto_resolved_at timestamptz;

alter table public.grievance_events
  alter column actor_user_id drop not null,
  add column if not exists actor_role text,
  add column if not exists message text;

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
        'student_confirmed_resolution',
        'resolved_awaiting_response',
        'student_accepted_resolution',
        'student_continued',
        'auto_resolved'
      )
    ),
  drop constraint if exists grievance_events_actor_role_check,
  add constraint grievance_events_actor_role_check
    check (actor_role in ('student', 'faculty', 'exam_cell', 'system'));

update public.grievance_events as event
set actor_role = coalesce(
      (
        select case lower(trim(user_row."Ex Factor"))
          when 'student' then 'student'
          when 'teaching staff' then 'faculty'
          when 'teaching' then 'faculty'
          when 'faculty' then 'faculty'
          when 'examination cell' then 'exam_cell'
          when 'exam cell' then 'exam_cell'
          when 'admin' then 'exam_cell'
          else 'system'
        end
        from public.users as user_row
        where user_row.account_identifier = event.actor_user_id
           or user_row."User ID" = event.actor_user_id
        limit 1
      ),
      'system'
    ),
    message = coalesce(
      nullif(event.details ->> 'remark', ''),
      nullif(event.details ->> 'note', ''),
      case event.event_type
        when 'submitted' then 'Grievance submitted.'
        when 'forwarded' then 'Grievance forwarded to faculty.'
        when 'reassigned' then 'Grievance assignment updated.'
        when 'status_changed' then
          'Status changed to ' || coalesce(event.details ->> 'status', 'updated')
        when 'resolved' then 'Grievance marked resolved.'
        when 'resolution_proposed' then 'Resolution proposed.'
        when 'student_confirmed_resolution' then 'Student confirmed the resolution.'
        else replace(event.event_type, '_', ' ') || '.'
      end
    )
where event.actor_role is null or event.message is null;

alter table public.grievance_events
  alter column actor_role set default 'system',
  alter column actor_role set not null,
  alter column message set default '',
  alter column message set not null;

create index if not exists grievances_expired_window_idx
  on public.grievances(window_expires_at)
  where resolution_pending and status = 'Resolved';

-- Give already-pending legacy proposals the same bounded response window.
update public.grievances
set status = 'Resolved',
    window_expires_at = coalesce(resolution_proposed_at, now()) + interval '48 hours',
    auto_resolved_at = case
      when coalesce(resolution_proposed_at, now()) + interval '48 hours' <= now()
      then now()
      else null
    end,
    resolution_pending = case
      when coalesce(resolution_proposed_at, now()) + interval '48 hours' <= now()
      then false
      else true
    end,
    updated_at = now()
where resolution_pending;

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
  event_actor_role text;
  event_message text;
  event_details jsonb := coalesce(target_details, '{}'::jsonb);
begin
  if target_actor_user_id is null then
    actor_name := 'System';
    event_actor_role := 'system';
  else
    select
      coalesce(user_row."Full Name", user_row.account_identifier, user_row."User ID"),
      case lower(trim(user_row."Ex Factor"))
        when 'student' then 'student'
        when 'teaching staff' then 'faculty'
        when 'teaching' then 'faculty'
        when 'faculty' then 'faculty'
        when 'examination cell' then 'exam_cell'
        when 'exam cell' then 'exam_cell'
        when 'admin' then 'exam_cell'
        when 'exam cell admin' then 'exam_cell'
        else null
      end
    into actor_name, event_actor_role
    from public.users as user_row
    where user_row.account_identifier = target_actor_user_id
       or user_row."User ID" = target_actor_user_id
       or lower(user_row.email) = lower(target_actor_user_id)
    limit 1;

    if event_actor_role is null
      and target_actor_user_id = public.exgrev_user_id() then
      event_actor_role := case public.exgrev_role()
        when 'student' then 'student'
        when 'teaching staff' then 'faculty'
        when 'examination cell' then 'exam_cell'
        else 'system'
      end;
    end if;
    event_actor_role := coalesce(event_actor_role, 'system');
    actor_name := coalesce(actor_name, target_actor_user_id);
  end if;

  event_message := case target_event_type
    when 'submitted' then 'Grievance submitted.'
    when 'forwarded' then
      'Grievance forwarded to ' || coalesce(event_details ->> 'to_name', 'faculty') || '.'
    when 'reassigned' then
      'Grievance reassigned to ' || coalesce(event_details ->> 'to_name', 'faculty') || '.'
    when 'status_changed' then
      'Status changed from ' || coalesce(event_details ->> 'old_status', 'unknown')
      || ' to ' || coalesce(event_details ->> 'new_status', 'updated') || '.'
    when 'resolved_awaiting_response' then
      'Exam Cell marked the grievance resolved. The student has 48 hours to respond.'
    when 'student_accepted_resolution' then
      'Student accepted the resolution.'
    when 'student_continued' then
      'Student continued the grievance during the resolution response window.'
    when 'auto_resolved' then
      'Automatically closed after the 48-hour response window expired.'
    when 'resolution_proposed' then 'Resolution proposed.'
    when 'student_confirmed_resolution' then 'Student confirmed the resolution.'
    when 'remark_added' then coalesce(event_details ->> 'remark', 'A remark was added.')
    else coalesce(
      nullif(event_details ->> 'message', ''),
      nullif(event_details ->> 'remark', ''),
      replace(target_event_type, '_', ' ') || '.'
    )
  end;
  if target_event_type in (
    'resolution_proposed',
    'student_continued'
  ) and nullif(event_details ->> 'remark', '') is not null then
    event_message := event_message || E'\n' || (event_details ->> 'remark');
  end if;

  insert into public.grievance_events (
    grievance_id,
    actor_user_id,
    actor_display_name,
    actor_role,
    message,
    recipients_recorded,
    event_type,
    details
  )
  values (
    target_grievance_id,
    target_actor_user_id,
    actor_name,
    event_actor_role,
    event_message,
    true,
    target_event_type,
    event_details
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
    and user_row.account_identifier <> coalesce(target_actor_user_id, '')
  on conflict (event_id, recipient_user_id) do nothing;

  return new_event_id;
end;
$$;

revoke all on function public.record_grievance_event(uuid, text, text, jsonb, text[])
  from public, anon, authenticated;

do $$
declare
  expired_grievance public.grievances%rowtype;
  recipients text[];
begin
  for expired_grievance in
    select *
    from public.grievances as grievance
    where grievance.auto_resolved_at is not null
      and not exists (
        select 1
        from public.grievance_events as event
        where event.grievance_id = grievance.id
          and event.event_type = 'auto_resolved'
      )
  loop
    select coalesce(array_agg(distinct participant.user_id), '{}'::text[])
    into recipients
    from (
      select expired_grievance.student_user_id as user_id
      union
      select expired_grievance.assigned_faculty_user_id
      union
      select user_row.account_identifier
      from public.users as user_row
      where lower(trim(user_row."Ex Factor")) in ('examination cell', 'exam cell')
    ) as participant
    where participant.user_id is not null;

    perform public.record_grievance_event(
      expired_grievance.id,
      null,
      'auto_resolved',
      jsonb_build_object(
        'window_expires_at', expired_grievance.window_expires_at
      ),
      recipients
    );
  end loop;
end;
$$;

create or replace function public.record_grievance_status_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id text;
  recipients text[];
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  current_user_id := public.exgrev_user_id();

  select coalesce(array_agg(distinct participant.user_id), '{}'::text[])
  into recipients
  from (
    select new.student_user_id as user_id
    union
    select new.assigned_faculty_user_id
    union
    select user_row.account_identifier
    from public.users as user_row
    where lower(trim(user_row."Ex Factor")) in ('examination cell', 'exam cell')
  ) as participant
  where participant.user_id is not null;

  perform public.record_grievance_event(
    new.id,
    current_user_id,
    'status_changed',
    jsonb_build_object('old_status', old.status, 'new_status', new.status),
    recipients
  );
  return new;
end;
$$;

drop trigger if exists grievances_record_status_change on public.grievances;
create trigger grievances_record_status_change
  after update of status on public.grievances
  for each row execute function public.record_grievance_status_change();

create or replace function public.prevent_grievance_event_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Grievance thread entries are append-only';
end;
$$;

drop trigger if exists grievance_events_prevent_mutation on public.grievance_events;
create trigger grievance_events_prevent_mutation
  before update or delete on public.grievance_events
  for each row execute function public.prevent_grievance_event_mutation();

revoke insert, update, delete on public.grievance_events from anon, authenticated;
grant select on public.grievance_events to authenticated;
revoke update on public.grievances from anon, authenticated;

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
  current_user_id text := public.exgrev_user_id();
  caller_role text := public.exgrev_role();
  recipients text[];
  event_kind text := 'remark_added';
begin
  if current_user_id is null
    or caller_role is null
    or caller_role not in ('student', 'teaching staff', 'examination cell') then
    raise exception 'You are not authorized to add a grievance remark';
  end if;
  if action_remark is null or length(trim(action_remark)) = 0 then
    raise exception 'Enter a remark before continuing';
  end if;

  select * into target_grievance
  from public.grievances
  where id = target_grievance_id
  for update;
  if not found then
    raise exception 'Grievance not found';
  end if;
  if caller_role = 'student'
    and target_grievance.student_user_id <> current_user_id then
    raise exception 'Grievance not found';
  elsif caller_role = 'teaching staff'
    and target_grievance.assigned_faculty_user_id <> current_user_id then
    raise exception 'Assigned grievance not found';
  end if;

  if target_grievance.resolution_pending then
    if caller_role <> 'student' then
      raise exception 'The student has the 48-hour resolution response window';
    end if;
    if target_grievance.window_expires_at is null
      or target_grievance.window_expires_at <= now() then
      raise exception 'The 48-hour response window has ended';
    end if;
    event_kind := 'student_continued';
    update public.grievances
    set status = 'In Progress',
        resolution_pending = false,
        window_expires_at = null,
        student_confirmed_at = null,
        auto_resolved_at = null,
        updated_at = now()
    where id = target_grievance_id
    returning * into updated_grievance;
  elsif target_grievance.status = 'Resolved' then
    raise exception 'This grievance is closed';
  elsif caller_role <> 'student' then
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
    where lower(trim(user_row."Ex Factor")) in ('examination cell', 'exam cell')
  ) as participant
  where participant.user_id is not null
    and participant.user_id <> current_user_id;

  perform public.record_grievance_event(
    target_grievance_id,
    current_user_id,
    event_kind,
    jsonb_build_object('remark', trim(action_remark)),
    recipients
  );
  return updated_grievance;
end;
$$;

create or replace function public.add_grievance_remark_with_attachments(
  target_grievance_id uuid,
  action_remark text,
  target_attachments jsonb
)
returns public.grievances
language plpgsql
security definer
set search_path = pg_catalog, public, auth, storage
as $$
declare
  target_grievance public.grievances%rowtype;
  updated_grievance public.grievances%rowtype;
  current_user_id text := public.exgrev_user_id();
  caller_role text := public.exgrev_role();
  event_kind text := 'remark_added';
  recipients text[];
  attachment jsonb;
  attachment_path text;
begin
  if current_user_id is null
    or caller_role is null
    or caller_role not in ('student', 'teaching staff', 'examination cell') then
    raise exception 'You are not authorized to add a grievance remark';
  end if;
  if action_remark is null or length(trim(action_remark)) = 0 then
    raise exception 'Enter a remark before continuing';
  end if;
  if target_attachments is null or jsonb_typeof(target_attachments) <> 'array' then
    raise exception 'Remark attachments must be a JSON array';
  end if;

  select * into target_grievance
  from public.grievances
  where id = target_grievance_id
  for update;
  if not found then
    raise exception 'Grievance not found';
  end if;
  if caller_role = 'student'
    and target_grievance.student_user_id <> current_user_id then
    raise exception 'Grievance not found';
  elsif caller_role = 'teaching staff'
    and target_grievance.assigned_faculty_user_id <> current_user_id then
    raise exception 'Assigned grievance not found';
  end if;

  if target_grievance.resolution_pending then
    if caller_role <> 'student' then
      raise exception 'The student has the 48-hour resolution response window';
    end if;
    if target_grievance.window_expires_at is null
      or target_grievance.window_expires_at <= now() then
      raise exception 'The 48-hour response window has ended';
    end if;
    event_kind := 'student_continued';
  elsif target_grievance.status = 'Resolved' then
    raise exception 'This grievance is closed';
  end if;

  for attachment in
    select value from jsonb_array_elements(target_attachments) as item(value)
  loop
    attachment_path := attachment ->> 'path';
    if jsonb_typeof(attachment) <> 'object'
      or attachment_path is null
      or left(
        attachment_path,
        length(target_grievance_id::text || '/' || current_user_id || '/')
      ) <> target_grievance_id::text || '/' || current_user_id || '/'
      or coalesce(attachment ->> 'name', '') = ''
      or length(attachment ->> 'name') > 255
      or coalesce(attachment ->> 'type', '') not in (
        'application/pdf',
        'image/png',
        'image/jpeg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
      or not exists (
        select 1
        from storage.objects as stored_file
        where stored_file.bucket_id = 'grievance-thread-attachments'
          and stored_file.name = attachment_path
      ) then
      raise exception 'A remark attachment is invalid or unavailable';
    end if;
  end loop;

  if event_kind = 'student_continued' then
    update public.grievances
    set status = 'In Progress',
        resolution_pending = false,
        window_expires_at = null,
        student_confirmed_at = null,
        auto_resolved_at = null,
        updated_at = now()
    where id = target_grievance_id
    returning * into updated_grievance;
  elsif caller_role <> 'student' then
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
    where lower(trim(user_row."Ex Factor")) in ('examination cell', 'exam cell')
  ) as participant
  where participant.user_id is not null
    and participant.user_id <> current_user_id;

  perform public.record_grievance_event(
    target_grievance_id,
    current_user_id,
    event_kind,
    jsonb_build_object(
      'remark', trim(action_remark),
      'attachments', target_attachments
    ),
    recipients
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
  current_user_id text := public.exgrev_user_id();
  recipients text[];
begin
  if requested_action = 'remark' then
    return public.add_grievance_remark(target_grievance_id, action_remark);
  end if;
  if public.exgrev_role() is distinct from 'examination cell'
    or current_user_id is null then
    raise exception 'Only the Examination Cell can mark a grievance resolved';
  end if;
  if requested_action <> 'resolve'
    or action_remark is null
    or length(trim(action_remark)) = 0 then
    raise exception 'Enter a resolution remark before continuing';
  end if;

  select * into target_grievance
  from public.grievances
  where id = target_grievance_id
  for update;
  if not found then
    raise exception 'Grievance not found';
  end if;
  if target_grievance.status = 'Resolved' or target_grievance.resolution_pending then
    raise exception 'This grievance is already resolved or awaiting student response';
  end if;

  update public.grievances
  set status = 'Resolved',
      resolution_remark = trim(action_remark),
      resolution_pending = true,
      resolution_proposed_by = current_user_id,
      resolution_proposed_at = now(),
      window_expires_at = now() + interval '48 hours',
      student_confirmed_at = null,
      auto_resolved_at = null,
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
    where lower(trim(user_row."Ex Factor")) in ('examination cell', 'exam cell')
  ) as participant
  where participant.user_id is not null
    and participant.user_id <> current_user_id;

  perform public.record_grievance_event(
    target_grievance_id,
    current_user_id,
    'resolved_awaiting_response',
    jsonb_build_object(
      'remark', trim(action_remark),
      'window_expires_at', updated_grievance.window_expires_at
    ),
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
  current_user_id text := public.exgrev_user_id();
  recipients text[];
begin
  if public.exgrev_role() is distinct from 'student'
    or current_user_id is null then
    raise exception 'Only the student who submitted this grievance can accept its resolution';
  end if;

  select * into target_grievance
  from public.grievances
  where id = target_grievance_id
  for update;
  if not found or target_grievance.student_user_id <> current_user_id then
    raise exception 'Grievance not found';
  end if;
  if not target_grievance.resolution_pending
    or target_grievance.status <> 'Resolved' then
    raise exception 'This grievance is not awaiting your response';
  end if;
  if target_grievance.window_expires_at is null
    or target_grievance.window_expires_at <= now() then
    raise exception 'The 48-hour response window has ended';
  end if;

  update public.grievances
  set resolution_pending = false,
      student_confirmed_at = now(),
      auto_resolved_at = null,
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
    where lower(trim(user_row."Ex Factor")) in ('examination cell', 'exam cell')
  ) as participant
  where participant.user_id is not null
    and participant.user_id <> current_user_id;

  perform public.record_grievance_event(
    target_grievance_id,
    current_user_id,
    'student_accepted_resolution',
    jsonb_build_object('remark', target_grievance.resolution_remark),
    recipients
  );
end;
$$;

create or replace function public.auto_resolve_expired_grievances()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  expired_grievance public.grievances%rowtype;
  recipients text[];
  closed_count integer := 0;
begin
  for expired_grievance in
    select *
    from public.grievances
    where status = 'Resolved'
      and resolution_pending
      and window_expires_at <= now()
    order by window_expires_at
    for update skip locked
  loop
    select coalesce(array_agg(distinct participant.user_id), '{}'::text[])
    into recipients
    from (
      select expired_grievance.student_user_id as user_id
      union
      select expired_grievance.assigned_faculty_user_id
      union
      select user_row.account_identifier
      from public.users as user_row
      where lower(trim(user_row."Ex Factor")) in ('examination cell', 'exam cell')
    ) as participant
    where participant.user_id is not null;

    update public.grievances
    set resolution_pending = false,
        auto_resolved_at = now(),
        updated_at = now()
    where id = expired_grievance.id;

    perform public.record_grievance_event(
      expired_grievance.id,
      null,
      'auto_resolved',
      jsonb_build_object(
        'window_expires_at', expired_grievance.window_expires_at
      ),
      recipients
    );
    closed_count := closed_count + 1;
  end loop;
  return closed_count;
end;
$$;

revoke all on function public.auto_resolve_expired_grievances()
  from public, anon, authenticated;
revoke all on function public.confirm_grievance_resolution(uuid)
  from public, anon;
revoke all on function public.examination_cell_grievance_action(uuid, text, text)
  from public, anon;
revoke all on function public.add_grievance_remark(uuid, text)
  from public, anon;
revoke all on function public.add_grievance_remark_with_attachments(uuid, text, jsonb)
  from public, anon;
grant execute on function public.confirm_grievance_resolution(uuid)
  to authenticated;
grant execute on function public.examination_cell_grievance_action(uuid, text, text)
  to authenticated;
grant execute on function public.add_grievance_remark(uuid, text)
  to authenticated;
grant execute on function public.add_grievance_remark_with_attachments(uuid, text, jsonb)
  to authenticated;

do $$
declare
  scheduled_job_id bigint;
begin
  select jobid into scheduled_job_id
  from cron.job
  where jobname = 'exgrev-auto-resolve-expired-grievances';
  if scheduled_job_id is not null then
    perform cron.unschedule(scheduled_job_id);
  end if;
  perform cron.schedule(
    'exgrev-auto-resolve-expired-grievances',
    '* * * * *',
    'select public.auto_resolve_expired_grievances();'
  );
end;
$$;

commit;
