begin;

alter table public.grievances
  add column if not exists title text,
  add column if not exists category text,
  add column if not exists sub_category text,
  add column if not exists other_text text,
  add column if not exists admission_year integer,
  add column if not exists student_study_year text,
  add column if not exists resolution_pending boolean not null default false,
  add column if not exists resolution_remark text,
  add column if not exists window_expires_at timestamptz,
  add column if not exists resolution_proposed_at timestamptz,
  add column if not exists student_confirmed_at timestamptz,
  add column if not exists auto_resolved_at timestamptz;

update public.grievances
set title = coalesce(nullif(trim(title), ''), nullif(trim(subject), ''), 'Untitled grievance'),
    category = coalesce(nullif(trim(category), ''), 'Grievance'),
    sub_category = coalesce(nullif(trim(sub_category), ''), 'General');

alter table public.grievances
  alter column title set not null,
  alter column category set not null,
  alter column sub_category set not null,
  alter column subject set not null,
  alter column description set not null;

alter table public.grievances
  drop constraint if exists grievances_title_check,
  add constraint grievances_title_check
    check (char_length(trim(title)) between 5 and 200),
  drop constraint if exists grievances_description_check,
  add constraint grievances_description_check
    check (char_length(trim(description)) between 20 and 10000),
  drop constraint if exists grievances_category_check,
  add constraint grievances_category_check
    check (category in (
      'Enquiry','Grievance','Result/Marks','Exam Schedule','Revaluation',
      'Admit Card','Attendance','Fee/Form','Any Other'
    )),
  drop constraint if exists grievances_other_text_check,
  add constraint grievances_other_text_check
    check (category <> 'Any Other' and sub_category <> 'Any Other' or char_length(trim(other_text)) >= 3);

alter table public.users
  add column if not exists admission_year integer generated always as (
    case
      when char_length(coalesce("User ID", '')) >= 6
       and substring(coalesce("User ID", '') from 5 for 2) ~ '^[0-9]{2}$'
      then 2000 + (substring("User ID" from 5 for 2)::integer)
      else null
    end
  ) stored;

create index if not exists users_admission_year_idx
  on public.users(admission_year);
create index if not exists grievances_category_subcategory_idx
  on public.grievances(category, sub_category);
create index if not exists grievances_admission_year_idx
  on public.grievances(admission_year, created_at desc);
create index if not exists grievances_department_status_idx
  on public.grievances(status, created_at desc);

create table if not exists public.grievance_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 200),
  created_by text not null,
  created_at timestamptz not null default now(),
  status text not null default 'active'
    check (status in ('active','forwarded','cancelled')),
  master_grievance_id uuid references public.grievances(id) on delete restrict,
  forwarded_at timestamptz
);

create table if not exists public.grievance_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.grievance_groups(id) on delete cascade,
  grievance_id uuid not null references public.grievances(id) on delete cascade,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removal_reason text,
  unique(group_id, grievance_id)
);

create index if not exists grievance_group_members_grievance_idx
  on public.grievance_group_members(grievance_id)
  where removed_at is null;

create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id text not null,
  title text not null,
  message text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists in_app_notifications_recipient_idx
  on public.in_app_notifications(recipient_user_id, created_at desc);

alter table public.grievance_groups enable row level security;
alter table public.grievance_group_members enable row level security;
alter table public.in_app_notifications enable row level security;

grant select on public.grievance_groups to authenticated;
grant select on public.grievance_group_members to authenticated;
grant select on public.in_app_notifications to authenticated;
grant update(read_at) on public.in_app_notifications to authenticated;

drop policy if exists "exam cell manages groups" on public.grievance_groups;
create policy "exam cell manages groups" on public.grievance_groups
  for all to authenticated
  using (public.exgrev_role() = 'examination cell')
  with check (public.exgrev_role() = 'examination cell');

drop policy if exists "participants read groups" on public.grievance_groups;
create policy "participants read groups" on public.grievance_groups
  for select to authenticated
  using (
    public.exgrev_role() = 'examination cell'
    or exists (
      select 1
      from public.grievance_group_members member
      join public.grievances grievance on grievance.id = member.grievance_id
      where member.group_id = grievance_groups.id
        and member.removed_at is null
        and grievance.student_user_id = public.exgrev_user_id()
    )
  );

drop policy if exists "exam cell manages group members" on public.grievance_group_members;
create policy "exam cell manages group members" on public.grievance_group_members
  for all to authenticated
  using (public.exgrev_role() = 'examination cell')
  with check (public.exgrev_role() = 'examination cell');

drop policy if exists "students read own group membership" on public.grievance_group_members;
create policy "students read own group membership" on public.grievance_group_members
  for select to authenticated
  using (
    exists (
      select 1 from public.grievances grievance
      where grievance.id = grievance_group_members.grievance_id
        and grievance.student_user_id = public.exgrev_user_id()
    )
  );

drop policy if exists "users read own in app notifications" on public.in_app_notifications;
create policy "users read own in app notifications" on public.in_app_notifications
  for select to authenticated
  using (recipient_user_id = public.exgrev_user_id());

drop policy if exists "users update own in app notifications" on public.in_app_notifications;
create policy "users update own in app notifications" on public.in_app_notifications
  for update to authenticated
  using (recipient_user_id = public.exgrev_user_id())
  with check (recipient_user_id = public.exgrev_user_id());

create or replace function public.create_grievance_group(
  p_name text,
  p_master_grievance_id uuid,
  p_member_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_group_id uuid;
  member_id uuid;
  member_count integer;
begin
  if public.exgrev_role() <> 'examination cell' then
    raise exception 'Only Examination Cell users can create grievance groups';
  end if;
  if char_length(trim(coalesce(p_name,''))) < 2 then
    raise exception 'A group name is required';
  end if;
  if p_master_grievance_id is null or p_member_ids is null or array_length(p_member_ids, 1) is null then
    raise exception 'Select a master and at least one member grievance';
  end if;
  if not p_master_grievance_id = any(p_member_ids) then
    raise exception 'The master grievance must be included in the group';
  end if;

  for member_id in select distinct unnest(p_member_ids)
  loop
    if not exists (select 1 from public.grievances where id = member_id) then
      raise exception 'One selected grievance does not exist';
    end if;
    if exists (
      select 1
      from public.grievance_group_members member
      join public.grievance_groups group_row on group_row.id = member.group_id
      where member.grievance_id = member_id
        and member.removed_at is null
        and group_row.status = 'active'
    ) then
      raise exception 'One selected grievance is already in an active group';
    end if;
  end loop;

  insert into public.grievance_groups(name, created_by, master_grievance_id)
  values (trim(p_name), public.exgrev_user_id(), p_master_grievance_id)
  returning id into new_group_id;

  insert into public.grievance_group_members(group_id, grievance_id)
  select new_group_id, member_id
  from (select distinct unnest(p_member_ids) as member_id) selected;

  perform public.record_grievance_event(
    member_id,
    public.exgrev_user_id(),
    'grouped',
    jsonb_build_object('group_id', new_group_id, 'name', trim(p_name)),
    '{}'::text[]
  )
  from (select distinct unnest(p_member_ids) as member_id) selected;

  return new_group_id;
end;
$$;

create or replace function public.forward_grievance_group_solution(
  p_group_id uuid,
  p_member_ids uuid[],
  p_solution_text text,
  p_attachments jsonb default '[]'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  group_row public.grievance_groups%rowtype;
  master_row public.grievances%rowtype;
  member_row public.grievances%rowtype;
  member_id uuid;
  forwarded_count integer := 0;
  faculty_id text;
  recipient_ids text[];
begin
  if public.exgrev_role() <> 'examination cell' then
    raise exception 'Only Examination Cell users can forward a grouped solution';
  end if;
  if char_length(trim(coalesce(p_solution_text,''))) < 1 then
    raise exception 'The grouped solution text is required';
  end if;

  select * into group_row
  from public.grievance_groups
  where id = p_group_id
  for update;
  if not found then raise exception 'Group not found'; end if;
  if group_row.status <> 'active' then
    raise exception 'This group has already been forwarded or cancelled';
  end if;

  select * into master_row
  from public.grievances
  where id = group_row.master_grievance_id
  for update;
  if not found or master_row.status <> 'Resolved' then
    raise exception 'Resolve the master grievance before forwarding';
  end if;

  if p_member_ids is null or array_length(p_member_ids, 1) is null then
    raise exception 'Select at least one group member';
  end if;

  for member_id in select distinct unnest(p_member_ids)
  loop
    if not exists (
      select 1
      from public.grievance_group_members
      where group_id = p_group_id
        and grievance_id = member_id
        and removed_at is null
    ) then
      raise exception 'One selected grievance is not an active member of this group';
    end if;
    if member_id = group_row.master_grievance_id then
      continue;
    end if;

    select * into member_row
    from public.grievances
    where id = member_id
    for update;

    update public.grievances
    set status = 'Resolved',
        resolution_pending = true,
        resolution_remark = trim(p_solution_text),
        resolution_proposed_at = now(),
        window_expires_at = now() + interval '48 hours',
        auto_resolved_at = null,
        updated_at = now()
    where id = member_id;

    recipient_ids := array_remove(array[
      member_row.student_user_id,
      member_row.assigned_faculty_user_id
    ], null);

    perform public.record_grievance_event(
      member_id,
      public.exgrev_user_id(),
      'resolved',
      jsonb_build_object(
        'message',
        'Resolved via grouped solution from grievance #' || master_row.grievance_number
          || ', forwarded by Exam Cell on ' || to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF'),
        'remark', trim(p_solution_text),
        'attachments', coalesce(p_attachments, '[]'::jsonb),
        'master_grievance_id', master_row.id,
        'master_grievance_code', master_row.grievance_code
      ),
      recipient_ids
    );

    insert into public.in_app_notifications(
      recipient_user_id, title, message, link
    )
    values (
      member_row.student_user_id,
      'Grouped solution resolved your grievance',
      'A common solution was forwarded from grievance #' || master_row.grievance_number,
      '/grievance/' || member_id::text
    );

    if member_row.assigned_faculty_user_id is not null then
      insert into public.in_app_notifications(
        recipient_user_id, title, message, link
      )
      values (
        member_row.assigned_faculty_user_id,
        'Grouped solution forwarded',
        'The common resolution was forwarded to grievance #' || member_row.grievance_number,
        '/grievance/' || member_id::text
      );
    end if;

    forwarded_count := forwarded_count + 1;
  end loop;

  update public.grievance_groups
  set status = 'forwarded',
      forwarded_at = now()
  where id = p_group_id;

  return forwarded_count;
end;
$$;

revoke all on function public.create_grievance_group(text, uuid, uuid[]) from public, anon;
grant execute on function public.create_grievance_group(text, uuid, uuid[]) to authenticated;
revoke all on function public.forward_grievance_group_solution(uuid, uuid[], text, jsonb) from public, anon;
grant execute on function public.forward_grievance_group_solution(uuid, uuid[], text, jsonb) to authenticated;

create or replace function public.remove_grievance_from_active_group(
  p_grievance_id uuid,
  p_reason text default 'Student continued the grievance'
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  removed_count integer;
begin
  update public.grievance_group_members member
  set removed_at = now(),
      removal_reason = p_reason
  from public.grievance_groups group_row
  where member.group_id = group_row.id
    and member.grievance_id = p_grievance_id
    and member.removed_at is null
    and group_row.status = 'active';
  get diagnostics removed_count = row_count;
  return removed_count > 0;
end;
$$;

revoke all on function public.remove_grievance_from_active_group(uuid, text) from public, anon;
grant execute on function public.remove_grievance_from_active_group(uuid, text) to authenticated;

create or replace function public.remove_group_member_after_student_continuation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if old.resolution_pending
     and not coalesce(new.resolution_pending, false)
     and new.status = 'In Progress'
  then
    update public.grievance_group_members member
    set removed_at = now(),
        removal_reason = 'Student continued the grievance'
    from public.grievance_groups group_row
    where member.group_id = group_row.id
      and member.grievance_id = new.id
      and member.removed_at is null
      and group_row.status = 'active';

    perform public.record_grievance_event(
      new.id,
      new.student_user_id,
      'group_removed',
      jsonb_build_object(
        'message',
        'Student continued this grievance, so it was removed from the similar grievance group.'
      ),
      '{}'::text[]
    );
  end if;
  return new;
end;
$$;

drop trigger if exists remove_group_member_after_continuation on public.grievances;
create trigger remove_group_member_after_continuation
  after update of resolution_pending, status on public.grievances
  for each row
  execute function public.remove_group_member_after_student_continuation();

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  content text not null check (char_length(trim(content)) > 0),
  attachment_url text,
  created_by text,
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  expires_at timestamptz
);

create table if not exists public.guidelines (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  content text not null check (char_length(trim(content)) > 0),
  attachment_url text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create index if not exists notices_active_created_idx
  on public.notices(is_active, created_at desc);
create index if not exists guidelines_active_created_idx
  on public.guidelines(is_active, created_at desc);

alter table public.notices enable row level security;
alter table public.guidelines enable row level security;

drop policy if exists "signed in users read notices" on public.notices;
create policy "signed in users read notices" on public.notices
  for select to authenticated
  using (auth.uid() is not null);

drop policy if exists "exam cell manages notices" on public.notices;
create policy "exam cell manages notices" on public.notices
  for all to authenticated
  using (public.exgrev_role() = 'examination cell')
  with check (public.exgrev_role() = 'examination cell');

drop policy if exists "signed in users read guidelines" on public.guidelines;
create policy "signed in users read guidelines" on public.guidelines
  for select to authenticated
  using (auth.uid() is not null);

drop policy if exists "exam cell manages guidelines" on public.guidelines;
create policy "exam cell manages guidelines" on public.guidelines
  for all to authenticated
  using (public.exgrev_role() = 'examination cell')
  with check (public.exgrev_role() = 'examination cell');

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('notices','notices',false,10485760,array['application/pdf','image/png','image/jpeg']),
  ('guidelines','guidelines',false,10485760,array['application/pdf','image/png','image/jpeg'])
on conflict(id) do update
set public=false,
    file_size_limit=10485760,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "signed in read notice attachments" on storage.objects;
create policy "signed in read notice attachments" on storage.objects
  for select to authenticated
  using (bucket_id='notices');

drop policy if exists "exam cell manage notice attachments" on storage.objects;
create policy "exam cell manage notice attachments" on storage.objects
  for all to authenticated
  using (bucket_id='notices' and public.exgrev_role()='examination cell')
  with check (bucket_id='notices' and public.exgrev_role()='examination cell');

drop policy if exists "signed in read guideline attachments" on storage.objects;
create policy "signed in read guideline attachments" on storage.objects
  for select to authenticated
  using (bucket_id='guidelines');

drop policy if exists "exam cell manage guideline attachments" on storage.objects;
create policy "exam cell manage guideline attachments" on storage.objects
  for all to authenticated
  using (bucket_id='guidelines' and public.exgrev_role()='examination cell')
  with check (bucket_id='guidelines' and public.exgrev_role()='examination cell');

alter table public.grievance_events
  drop constraint if exists grievance_events_event_type_check,
  add constraint grievance_events_event_type_check
    check (event_type in (
      'submitted','forwarded','reassigned','status_changed','resolved','remark_added',
      'resolution_proposed','student_confirmed_resolution','resolved_awaiting_response',
      'student_accepted_resolution','student_continued','auto_resolved',
      'grouped','group_forwarded','group_removed'
    ));

revoke insert, update, delete on public.in_app_notifications from anon, authenticated;
grant select, update(read_at) on public.in_app_notifications to authenticated;

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
  current_user_id := public.exgrev_student_user_id();
  if current_user_id is null or current_user_id is distinct from new.student_user_id then
    raise exception 'Students may only submit grievances for their own account';
  end if;

  select coalesce(array_agg(user_row.account_identifier), '{}'::text[])
  into recipients
  from public.users as user_row
  where lower(trim(coalesce(user_row."Ex Factor", ''))) in (
    'examination cell','exam cell','admin','exam cell admin'
  );

  perform public.record_grievance_event(
    new.id,
    current_user_id,
    'submitted',
    jsonb_build_object(
      'status', new.status,
      'title', coalesce(new.title, new.subject),
      'category', coalesce(new.category, new.problem_category),
      'sub_category', coalesce(new.sub_category, new.problem_type),
      'other_text', new.other_text
    ),
    recipients
  );
  return new;
end;
$$;

commit;
