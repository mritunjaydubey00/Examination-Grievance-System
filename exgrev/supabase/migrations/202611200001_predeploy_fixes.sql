begin;

alter table public.grievances
  add column if not exists title text,
  add column if not exists category text,
  add column if not exists sub_category text,
  add column if not exists other_text text,
  add column if not exists resolution_attachments jsonb not null default '[]'::jsonb,
  add column if not exists admission_year smallint generated always as (
    case
      when student_user_id ~ '^[A-Za-z0-9]{4}[0-9]{2}'
        then 2000 + substring(student_user_id from 5 for 2)::integer
      else null
    end
  ) stored;

update public.grievances
set title = coalesce(nullif(trim(title), ''), subject),
    category = coalesce(nullif(trim(category), ''), 'Grievance'),
    sub_category = coalesce(nullif(trim(sub_category), ''), 'General')
where nullif(trim(title), '') is null
   or nullif(trim(category), '') is null
   or nullif(trim(sub_category), '') is null;

alter table public.grievances
  alter column title set not null,
  alter column category set not null,
  alter column sub_category set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.grievances'::regclass
      and conname = 'grievances_title_nonblank'
  ) then
    alter table public.grievances
      add constraint grievances_title_nonblank
      check (char_length(trim(title)) > 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.grievances'::regclass
      and conname = 'grievances_description_nonblank'
  ) then
    alter table public.grievances
      add constraint grievances_description_nonblank
      check (char_length(trim(description)) > 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.grievances'::regclass
      and conname = 'grievances_category_nonblank'
  ) then
    alter table public.grievances
      add constraint grievances_category_nonblank
      check (char_length(trim(category)) > 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.grievances'::regclass
      and conname = 'grievances_sub_category_nonblank'
  ) then
    alter table public.grievances
      add constraint grievances_sub_category_nonblank
      check (char_length(trim(sub_category)) > 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.grievances'::regclass
      and conname = 'grievances_other_text_required'
  ) then
    alter table public.grievances
      add constraint grievances_other_text_required
      check (
        (category <> 'Any other issue' and sub_category <> 'Any other issue')
        or char_length(trim(coalesce(other_text, ''))) > 0
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.grievances'::regclass
      and conname = 'grievances_other_text_length'
  ) then
    alter table public.grievances
      add constraint grievances_other_text_length
      check (char_length(coalesce(other_text, '')) <= 500);
  end if;
end
$$;

create index if not exists grievances_admission_year_idx
  on public.grievances(admission_year);
create index if not exists grievances_category_subcategory_idx
  on public.grievances(category, sub_category);
create index if not exists grievances_created_at_idx
  on public.grievances(created_at desc);

create table if not exists public.grievance_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_by text not null references public.users(account_identifier),
  created_at timestamptz not null default now(),
  status text not null default 'active'
    check (status in ('active', 'forwarded', 'closed')),
  master_grievance_id uuid not null references public.grievances(id)
);

create table if not exists public.grievance_group_members (
  group_id uuid not null references public.grievance_groups(id) on delete cascade,
  grievance_id uuid not null references public.grievances(id) on delete cascade,
  is_active boolean not null default true,
  added_at timestamptz not null default now(),
  primary key (group_id, grievance_id)
);

create unique index if not exists grievance_group_one_active_membership_idx
  on public.grievance_group_members(grievance_id)
  where is_active;
create index if not exists grievance_group_members_group_idx
  on public.grievance_group_members(group_id, is_active);

alter table public.grievance_groups enable row level security;
alter table public.grievance_group_members enable row level security;
revoke all on public.grievance_groups, public.grievance_group_members
  from anon, authenticated;
grant select on public.grievance_groups, public.grievance_group_members
  to authenticated;

drop policy if exists "exam cell reads grievance groups"
  on public.grievance_groups;
create policy "exam cell reads grievance groups"
  on public.grievance_groups for select to authenticated
  using (public.exgrev_role() = 'examination cell');

drop policy if exists "exam cell reads grievance group members"
  on public.grievance_group_members;
create policy "exam cell reads grievance group members"
  on public.grievance_group_members for select to authenticated
  using (public.exgrev_role() = 'examination cell');

create or replace function public.create_grievance_group(
  target_name text,
  target_master_grievance_id uuid,
  target_grievance_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id text := public.exgrev_user_id();
  new_group_id uuid;
  unique_count integer;
  grievance_count integer;
  master_code text;
  member_grievance public.grievances%rowtype;
  recipients text[];
begin
  if public.exgrev_role() is distinct from 'examination cell'
    or current_user_id is null then
    raise exception 'Only the Examination Cell can create grievance groups';
  end if;
  if nullif(trim(target_name), '') is null
    or char_length(trim(target_name)) > 120 then
    raise exception 'Enter a group name of no more than 120 characters';
  end if;
  if target_grievance_ids is null
    or cardinality(target_grievance_ids) < 2
    or target_master_grievance_id is null
    or not (target_master_grievance_id = any(target_grievance_ids)) then
    raise exception 'Choose at least two grievances and select one as the master';
  end if;

  select count(distinct grievance_id), count(*)
  into unique_count, grievance_count
  from unnest(target_grievance_ids) as selected(grievance_id);
  if unique_count <> grievance_count then
    raise exception 'A grievance can only appear once in a group';
  end if;

  if exists (
    select 1
    from unnest(target_grievance_ids) as selected(grievance_id)
    left join public.grievances as grievance
      on grievance.id = selected.grievance_id
    where grievance.id is null
      or grievance.status = 'Resolved'
      or grievance.resolution_pending
  ) then
    raise exception 'Groups can contain only open grievances';
  end if;
  if exists (
    select 1
    from unnest(target_grievance_ids) as selected(grievance_id)
    join public.grievances as grievance
      on grievance.id = selected.grievance_id
    join public.grievances as master
      on master.id = target_master_grievance_id
    where grievance.category is distinct from master.category
       or grievance.sub_category is distinct from master.sub_category
  ) then
    raise exception 'All grouped grievances must have the same category and sub-category';
  end if;

  if exists (
    select 1
    from public.grievance_group_members as member
    join public.grievance_groups as grievance_group
      on grievance_group.id = member.group_id
    where member.grievance_id = any(target_grievance_ids)
      and member.is_active
      and grievance_group.status = 'active'
  ) then
    raise exception 'A grievance can belong to only one active group';
  end if;

  insert into public.grievance_groups (
    name,
    created_by,
    master_grievance_id
  )
  values (trim(target_name), current_user_id, target_master_grievance_id)
  returning id into new_group_id;

  insert into public.grievance_group_members (group_id, grievance_id)
  select new_group_id, selected.grievance_id
  from unnest(target_grievance_ids) as selected(grievance_id);

  select grievance_code
  into master_code
  from public.grievances
  where id = target_master_grievance_id;

  for member_grievance in
    select *
    from public.grievances
    where id = any(target_grievance_ids)
  loop
    select coalesce(array_agg(distinct participant.user_id), '{}'::text[])
    into recipients
    from (
      select member_grievance.student_user_id as user_id
      union
      select member_grievance.assigned_faculty_user_id
      union
      select user_row.account_identifier
      from public.users as user_row
      where lower(trim(user_row."Ex Factor")) in ('examination cell', 'exam cell')
    ) as participant
    where participant.user_id is not null
      and participant.user_id <> current_user_id;

    perform public.record_grievance_event(
      member_grievance.id,
      current_user_id,
      'remark_added',
      jsonb_build_object(
        'remark',
        'Grouped as similar to master grievance #'
          || coalesce(master_code, target_master_grievance_id::text)
          || ' (' || trim(target_name) || ').'
      ),
      recipients
    );
  end loop;

  return new_group_id;
end
$$;

revoke all on function public.create_grievance_group(text, uuid, uuid[])
  from public, anon;
grant execute on function public.create_grievance_group(text, uuid, uuid[])
  to authenticated;

create or replace function public.forward_grievance_group_solution(
  target_group_id uuid,
  target_member_grievance_ids uuid[],
  target_attachments jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, auth, storage
as $$
declare
  current_user_id text := public.exgrev_user_id();
  target_group public.grievance_groups%rowtype;
  master_grievance public.grievances%rowtype;
  member_grievance public.grievances%rowtype;
  target_attachments_for_member jsonb;
  attachment jsonb;
  attachment_path text;
  recipients text[];
  forwarded_at timestamptz := now();
  forwarded_count integer := 0;
  selected_count integer;
  distinct_count integer;
  new_event_id uuid;
begin
  if public.exgrev_role() is distinct from 'examination cell'
    or current_user_id is null then
    raise exception 'Only the Examination Cell can forward a grouped solution';
  end if;
  if target_attachments is null
    or jsonb_typeof(target_attachments) <> 'object' then
    raise exception 'Grouped solution attachments must be an object';
  end if;
  if target_member_grievance_ids is null
    or cardinality(target_member_grievance_ids) < 1 then
    raise exception 'Select at least one grievance to receive the solution';
  end if;

  select count(distinct grievance_id), count(*)
  into distinct_count, selected_count
  from unnest(target_member_grievance_ids) as selected(grievance_id);
  if selected_count <> distinct_count then
    raise exception 'A grievance can only be selected once';
  end if;

  select *
  into target_group
  from public.grievance_groups
  where id = target_group_id
  for update;
  if not found or target_group.status <> 'active' then
    raise exception 'This group has already been forwarded or closed';
  end if;

  select *
  into master_grievance
  from public.grievances
  where id = target_group.master_grievance_id
  for update;
  if not found
    or master_grievance.status <> 'Resolved'
    or nullif(trim(master_grievance.resolution_remark), '') is null then
    raise exception 'The master grievance must have a proposed resolution before forwarding';
  end if;

  if exists (
    select 1
    from unnest(target_member_grievance_ids) as selected(grievance_id)
    left join public.grievance_group_members as member
      on member.group_id = target_group_id
      and member.grievance_id = selected.grievance_id
      and member.is_active
    where member.grievance_id is null
      or selected.grievance_id = target_group.master_grievance_id
  ) then
    raise exception 'One or more selected grievances are not active members of this group';
  end if;

  perform 1
  from public.grievances as grievance
  where grievance.id = any(target_member_grievance_ids)
  order by grievance.id
  for update;

  if exists (
    select 1
    from public.grievances as grievance
    where grievance.id = any(target_member_grievance_ids)
      and (grievance.status = 'Resolved' or grievance.resolution_pending)
  ) then
    raise exception 'One or more selected grievances are already resolved or awaiting a response';
  end if;

  for member_grievance in
    select grievance.*
    from public.grievances as grievance
    where grievance.id = any(target_member_grievance_ids)
    order by grievance.id
  loop
    target_attachments_for_member :=
      coalesce(target_attachments -> member_grievance.id::text, '[]'::jsonb);
    if jsonb_typeof(target_attachments_for_member) <> 'array' then
      raise exception 'Attachments for a grouped grievance must be an array';
    end if;

    for attachment in
      select value
      from jsonb_array_elements(target_attachments_for_member) as item(value)
    loop
      attachment_path := attachment ->> 'path';
      if jsonb_typeof(attachment) <> 'object'
        or attachment_path is null
        or left(
          attachment_path,
          length(member_grievance.id::text || '/' || current_user_id || '/')
        ) <> member_grievance.id::text || '/' || current_user_id || '/'
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
        raise exception 'A grouped solution attachment is invalid or unavailable';
      end if;
    end loop;

    update public.grievances
    set status = 'Resolved',
        resolution_remark = master_grievance.resolution_remark,
        resolution_attachments = target_attachments_for_member,
        resolution_pending = true,
        resolution_proposed_by = current_user_id,
        resolution_proposed_at = forwarded_at,
        window_expires_at = forwarded_at + interval '48 hours',
        student_confirmed_at = null,
        auto_resolved_at = null,
        updated_at = forwarded_at
    where id = member_grievance.id;

    select coalesce(array_agg(distinct participant.user_id), '{}'::text[])
    into recipients
    from (
      select member_grievance.student_user_id as user_id
      union
      select member_grievance.assigned_faculty_user_id
      union
      select user_row.account_identifier
      from public.users as user_row
      where lower(trim(user_row."Ex Factor")) in ('examination cell', 'exam cell')
    ) as participant
    where participant.user_id is not null
      and participant.user_id <> current_user_id;

    new_event_id := public.record_grievance_event(
      member_grievance.id,
      current_user_id,
      'resolved_awaiting_response',
      jsonb_build_object(
        'remark', master_grievance.resolution_remark,
        'attachments', target_attachments_for_member,
        'group_id', target_group.id,
        'group_source_code', master_grievance.grievance_code,
        'group_forwarded_at', forwarded_at
      ),
      recipients
    );

    insert into public.in_app_notifications (
      recipient_user_id,
      grievance_id,
      event_id,
      notification_type,
      title,
      content
    )
    values
      (
        member_grievance.student_user_id,
        member_grievance.id,
        new_event_id,
        'grouped_solution',
        'A grouped solution is ready',
        'The Examination Cell forwarded the solution from grievance #'
          || coalesce(master_grievance.grievance_code, master_grievance.id::text)
          || '. Review it within 48 hours.'
      );

    if member_grievance.assigned_faculty_user_id is not null then
      insert into public.in_app_notifications (
        recipient_user_id,
        grievance_id,
        event_id,
        notification_type,
        title,
        content
      )
      values (
        member_grievance.assigned_faculty_user_id,
        member_grievance.id,
        new_event_id,
        'grouped_solution',
        'A grouped solution was forwarded',
        'The Examination Cell forwarded a solution to grievance #'
          || coalesce(member_grievance.grievance_code, member_grievance.id::text)
          || '.'
      );
    end if;

    forwarded_count := forwarded_count + 1;
  end loop;

  update public.grievance_groups
  set status = 'forwarded'
  where id = target_group.id;

  return forwarded_count;
end
$$;

revoke all on function public.forward_grievance_group_solution(uuid, uuid[], jsonb)
  from public, anon;
grant execute on function public.forward_grievance_group_solution(uuid, uuid[], jsonb)
  to authenticated;

create or replace function public.examination_cell_resolve_with_attachments(
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
  current_user_id text := public.exgrev_user_id();
  target_grievance public.grievances%rowtype;
  updated_grievance public.grievances%rowtype;
  recipients text[];
  attachment jsonb;
  attachment_path text;
begin
  if public.exgrev_role() is distinct from 'examination cell'
    or current_user_id is null then
    raise exception 'Only the Examination Cell can propose a resolution';
  end if;
  if action_remark is null
    or char_length(trim(action_remark)) < 1
    or char_length(trim(action_remark)) > 5000 then
    raise exception 'Enter a resolution of no more than 5,000 characters';
  end if;
  if target_attachments is null
    or jsonb_typeof(target_attachments) <> 'array' then
    raise exception 'Resolution attachments must be a JSON array';
  end if;

  select *
  into target_grievance
  from public.grievances
  where id = target_grievance_id
  for update;
  if not found then
    raise exception 'Grievance not found';
  end if;
  if target_grievance.status = 'Resolved'
    or target_grievance.resolution_pending then
    raise exception 'This grievance is already resolved or awaiting student response';
  end if;

  for attachment in
    select value
    from jsonb_array_elements(target_attachments) as item(value)
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
      raise exception 'A resolution attachment is invalid or unavailable';
    end if;
  end loop;

  update public.grievances
  set status = 'Resolved',
      resolution_remark = trim(action_remark),
      resolution_attachments = target_attachments,
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
      'attachments', target_attachments,
      'window_expires_at', updated_grievance.window_expires_at
    ),
    recipients
  );
  return updated_grievance;
end
$$;

revoke all on function public.examination_cell_resolve_with_attachments(uuid, text, jsonb)
  from public, anon;
grant execute on function public.examination_cell_resolve_with_attachments(uuid, text, jsonb)
  to authenticated;

create or replace function public.suggest_similar_grievances(
  target_grievance_id uuid
)
returns table (
  id uuid,
  grievance_code text,
  title text,
  student_user_id text,
  department text,
  status text,
  category text,
  sub_category text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select candidate.id,
         candidate.grievance_code,
         coalesce(candidate.title, candidate.subject),
         candidate.student_user_id,
         student."Department",
         candidate.status,
         candidate.category,
         candidate.sub_category
  from public.grievances as target
  join public.grievances as candidate
    on candidate.id <> target.id
   and candidate.category = target.category
   and candidate.sub_category = target.sub_category
  left join public.users as student
    on student."User ID" = candidate.student_user_id
  where public.exgrev_role() = 'examination cell'
    and target.id = target_grievance_id
    and target.status <> 'Resolved'
    and not target.resolution_pending
    and candidate.status <> 'Resolved'
    and not candidate.resolution_pending
    and exists (
      select 1
      from regexp_split_to_table(
        lower(coalesce(target.title, target.subject)),
        '[^[:alnum:]]+'
      ) as target_word(value)
      join regexp_split_to_table(
        lower(coalesce(candidate.title, candidate.subject)),
        '[^[:alnum:]]+'
      ) as candidate_word(value)
        on candidate_word.value = target_word.value
      where char_length(target_word.value) >= 3
    )
    and not exists (
      select 1
      from public.grievance_group_members as member
      join public.grievance_groups as grievance_group
        on grievance_group.id = member.group_id
      where member.grievance_id = candidate.id
        and member.is_active
        and grievance_group.status = 'active'
    )
  order by candidate.created_at desc
  limit 20
$$;

revoke all on function public.suggest_similar_grievances(uuid)
  from public, anon;
grant execute on function public.suggest_similar_grievances(uuid)
  to authenticated;

create or replace function public.remove_continued_grievance_from_group()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.event_type = 'student_continued' then
    update public.grievance_group_members as member
    set is_active = false
    from public.grievance_groups as grievance_group
    where member.group_id = grievance_group.id
      and member.grievance_id = new.grievance_id
      and member.is_active
      and grievance_group.status in ('active', 'forwarded');

    update public.grievance_groups
    set status = 'closed'
    where master_grievance_id = new.grievance_id
      and status = 'active';

    update public.grievance_group_members as member
    set is_active = false
    from public.grievance_groups as grievance_group
    where member.group_id = grievance_group.id
      and grievance_group.master_grievance_id = new.grievance_id
      and grievance_group.status = 'closed'
      and member.is_active;
  end if;
  return new;
end
$$;

drop trigger if exists grievance_events_remove_continued_group_member
  on public.grievance_events;
create trigger grievance_events_remove_continued_group_member
  after insert on public.grievance_events
  for each row execute function public.remove_continued_grievance_from_group();

create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id text not null references public.users(account_identifier)
    on delete cascade,
  grievance_id uuid references public.grievances(id) on delete cascade,
  event_id uuid references public.grievance_events(id) on delete cascade,
  notification_type text not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists in_app_notifications_recipient_created_idx
  on public.in_app_notifications(recipient_user_id, created_at desc);

alter table public.in_app_notifications enable row level security;
revoke all on public.in_app_notifications from anon, authenticated;
grant select, update on public.in_app_notifications to authenticated;
revoke insert, delete on public.in_app_notifications from anon, authenticated;

drop policy if exists "users read own in-app notifications"
  on public.in_app_notifications;
create policy "users read own in-app notifications"
  on public.in_app_notifications for select to authenticated
  using (recipient_user_id = public.exgrev_user_id());

drop policy if exists "users mark own notifications read"
  on public.in_app_notifications;
create policy "users mark own notifications read"
  on public.in_app_notifications for update to authenticated
  using (recipient_user_id = public.exgrev_user_id())
  with check (recipient_user_id = public.exgrev_user_id());

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 200),
  content text not null check (char_length(trim(content)) > 0),
  attachment_url text,
  attachment_name text,
  created_by text not null references public.users(account_identifier),
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  expires_at timestamptz
);

create table if not exists public.guidelines (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 200),
  content text not null check (char_length(trim(content)) > 0),
  attachment_url text,
  attachment_name text,
  created_by text not null references public.users(account_identifier),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

alter table public.notices
  add column if not exists attachment_name text;
alter table public.guidelines
  add column if not exists attachment_name text;

create index if not exists notices_active_created_idx
  on public.notices(is_active, created_at desc);
create index if not exists guidelines_active_created_idx
  on public.guidelines(is_active, created_at desc);

alter table public.notices enable row level security;
alter table public.guidelines enable row level security;
grant select, insert, update, delete on public.notices, public.guidelines
  to authenticated;

drop policy if exists "authenticated users read notices" on public.notices;
create policy "authenticated users read notices"
  on public.notices for select to authenticated
  using (
    public.exgrev_role() = 'examination cell'
    or (
      is_active
      and (expires_at is null or expires_at > now())
    )
  );
drop policy if exists "exam cell manages notices" on public.notices;
create policy "exam cell manages notices"
  on public.notices for all to authenticated
  using (public.exgrev_role() = 'examination cell')
  with check (public.exgrev_role() = 'examination cell');

drop policy if exists "authenticated users read guidelines" on public.guidelines;
create policy "authenticated users read guidelines"
  on public.guidelines for select to authenticated
  using (
    public.exgrev_role() = 'examination cell'
    or is_active
  );
drop policy if exists "exam cell manages guidelines" on public.guidelines;
create policy "exam cell manages guidelines"
  on public.guidelines for all to authenticated
  using (public.exgrev_role() = 'examination cell')
  with check (public.exgrev_role() = 'examination cell');

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'notices',
    'notices',
    false,
    10485760,
    array['application/pdf', 'image/png', 'image/jpeg']
  ),
  (
    'guidelines',
    'guidelines',
    false,
    10485760,
    array['application/pdf', 'image/png', 'image/jpeg']
  )
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated users read portal content attachments"
  on storage.objects;
create policy "authenticated users read portal content attachments"
  on storage.objects for select to authenticated
  using (
    (
      bucket_id = 'notices'
      and (
        public.exgrev_role() = 'examination cell'
        or exists (
          select 1
          from public.notices as notice
          where notice.attachment_url = storage.objects.name
            and notice.is_active
            and (notice.expires_at is null or notice.expires_at > now())
        )
      )
    )
    or (
      bucket_id = 'guidelines'
      and (
        public.exgrev_role() = 'examination cell'
        or exists (
          select 1
          from public.guidelines as guideline
          where guideline.attachment_url = storage.objects.name
            and guideline.is_active
        )
      )
    )
  );

drop policy if exists "exam cell uploads portal content attachments"
  on storage.objects;
create policy "exam cell uploads portal content attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('notices', 'guidelines')
    and public.exgrev_role() = 'examination cell'
  );

drop policy if exists "exam cell deletes portal content attachments"
  on storage.objects;
create policy "exam cell deletes portal content attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('notices', 'guidelines')
    and public.exgrev_role() = 'examination cell'
  );

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
  where lower(trim(user_row."Ex Factor")) in ('examination cell', 'exam cell');

  perform public.record_grievance_event(
    new.id,
    current_user_id,
    'submitted',
    jsonb_build_object(
      'status', new.status,
      'title', new.title,
      'category', new.category,
      'sub_category', new.sub_category,
      'other_text', new.other_text
    ),
    recipients
  );
  return new;
end
$$;

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
      case
        when nullif(event_details ->> 'group_source_code', '') is not null then
          'Resolved via grouped solution from grievance #'
          || (event_details ->> 'group_source_code')
          || ', forwarded by Exam Cell on '
          || to_char(
            (event_details ->> 'group_forwarded_at')::timestamptz,
            'YYYY-MM-DD HH24:MI TZ'
          )
          || '.'
        else
          'Exam Cell marked the grievance resolved. The student has 48 hours to respond.'
      end
    when 'student_accepted_resolution' then 'Student accepted the resolution.'
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
  if target_event_type in ('resolution_proposed', 'student_continued')
    and nullif(event_details ->> 'remark', '') is not null then
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
end
$$;

revoke all on function public.record_grievance_event(uuid, text, text, jsonb, text[])
  from public, anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.in_app_notifications;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.notices;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.guidelines;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end
$$;

notify pgrst, 'reload schema';

commit;
