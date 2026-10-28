begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'grievance-thread-attachments',
  'grievance-thread-attachments',
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
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_access_grievance_thread_attachment(
  target_path text,
  require_uploader boolean
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when target_path is null
      or split_part(target_path, '/', 1) = ''
      or split_part(target_path, '/', 2) = ''
      or split_part(target_path, '/', 3) = ''
      or split_part(target_path, '/', 4) <> ''
    then false
    else exists (
      select 1
      from public.grievances as grievance
      where grievance.id::text = split_part(target_path, '/', 1)
        and public.can_access_grievance(grievance.id)
        and (
          not require_uploader
          or split_part(target_path, '/', 2) = public.exgrev_user_id()
        )
    )
  end
$$;

revoke all on function public.can_access_grievance_thread_attachment(text, boolean)
  from public, anon;
grant execute on function public.can_access_grievance_thread_attachment(text, boolean)
  to authenticated;

drop policy if exists "thread participants read attachments" on storage.objects;
create policy "thread participants read attachments"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'grievance-thread-attachments'
    and public.can_access_grievance_thread_attachment(name, false)
  );

drop policy if exists "thread participants upload attachments" on storage.objects;
create policy "thread participants upload attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'grievance-thread-attachments'
    and public.can_access_grievance_thread_attachment(name, true)
  );

drop policy if exists "thread participants delete own attachments" on storage.objects;
create policy "thread participants delete own attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'grievance-thread-attachments'
    and public.can_access_grievance_thread_attachment(name, true)
  );

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
  current_user_id text;
  caller_role text;
  recipients text[];
  attachment jsonb;
  attachment_path text;
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
  if target_attachments is null or jsonb_typeof(target_attachments) <> 'array' then
    raise exception 'Remark attachments must be a JSON array';
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
    jsonb_build_object(
      'remark', trim(action_remark),
      'attachments', target_attachments
    ),
    recipients
  );

  return updated_grievance;
end;
$$;

revoke all on function public.add_grievance_remark_with_attachments(uuid, text, jsonb)
  from public, anon;
grant execute on function public.add_grievance_remark_with_attachments(uuid, text, jsonb)
  to authenticated;

commit;
