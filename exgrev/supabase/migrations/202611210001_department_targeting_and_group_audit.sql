-- Generated department/branch seed source: src/department.js
-- Regenerate seed SQL with: node scripts/generate-department-seed.js

create table if not exists public.departments (
  id text primary key,
  code text not null unique,
  name text not null unique,
  is_active boolean not null default true
);

create table if not exists public.branches (
  id text primary key,
  department_id text not null references public.departments(id) on update cascade,
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  unique (department_id, name)
);

insert into public.departments (id, code, name, is_active)
values
  ('CIV', 'CIV', 'School of Civil Engineering', true),
  ('MECH', 'MECH', 'School of Mechanical Engineering', true),
  ('ELE', 'ELE', 'School of Electrical Engineering', true),
  ('CSE', 'CSE', 'Department of Computer Science & Engineering', true),
  ('IT', 'IT', 'School of Information Technology', true),
  ('ECE', 'ECE', 'School of Electronics & Communication Engineering', true),
  ('AI', 'AI', 'Centre for Artificial Intelligence', true),
  ('IOT', 'IOT', 'Department of Internet of Things(EE)', true),
  ('CST', 'CST', 'Centre for Computer Science and Technology', true),
  ('EMC', 'EMC', 'School of Engineering Mathematics & Computing', true),
  ('CHE', 'CHE', 'School of Chemical Engineering', true)
on conflict (id) do update set code = excluded.code, name = excluded.name, is_active = excluded.is_active;

insert into public.branches (id, department_id, code, name, is_active)
values
  ('CIV', 'CIV', 'CIV', 'Civil Engineering', true),
  ('MECH', 'MECH', 'MECH', 'Mechanical Engineering', true),
  ('ELE', 'ELE', 'ELE', 'Electrical Engineering', true),
  ('CSE', 'CSE', 'CSE', 'Computer Science & Engineering', true),
  ('CSD', 'CSE', 'CSD', 'Computer Science & Design', true),
  ('IT', 'IT', 'IT', 'Information Technology', true),
  ('ELEX', 'ECE', 'ELEX', 'Electronics Engineering', true),
  ('EXT', 'ECE', 'EXT', 'Electronics & Telecommunications Engineering', true),
  ('ITAIR', 'AI', 'ITAIR', 'Information Technology (Artificial Intelligence and Robotics)', true),
  ('AIML', 'AI', 'AIML', 'Artificial Intelligence & Machine Learning', true),
  ('AIDS', 'AI', 'AIDS', 'Artificial Intelligence & Data Science', true),
  ('AI', 'AI', 'AI', 'Artificial Intelligence', true),
  ('ECE', 'IOT', 'ECE', 'Electrical and Computer Engineering', true),
  ('IOT', 'IOT', 'IOT', ' Internet of Things (IoT)', true),
  ('CSBS', 'CST', 'CSBS', 'Computer Science and Business Systems', true),
  ('CST', 'CST', 'CST', 'Computer Science and Technology', true),
  ('MATHCOMP', 'EMC', 'MATHCOMP', 'Mathematics & Computing', true),
  ('CHE', 'CHE', 'CHE', 'Chemical Engineering', true)
on conflict (id) do update set department_id = excluded.department_id, code = excluded.code, name = excluded.name, is_active = excluded.is_active;

alter table public.users
  add column if not exists department_code text,
  add column if not exists branch_code text;
alter table public.grievances
  add column if not exists department_code text,
  add column if not exists branch_code text;
alter table public.notices
  add column if not exists target_years int[],
  add column if not exists target_departments text[],
  add column if not exists target_branches text[];
alter table public.guidelines
  add column if not exists target_departments text[],
  add column if not exists target_branches text[];

update public.users as u
set department_code = d.code
from public.departments as d
where u.department_code is null
  and lower(btrim(u."Department")) = lower(d.name);

update public.users as u
set branch_code = b.code
from public.branches as b
where u.branch_code is null
  and lower(btrim(u."Branch")) = lower(b.name);

update public.grievances as g
set department_code = u.department_code,
    branch_code = u.branch_code
from public.users as u
where g.student_user_id = u.account_identifier
  and (g.department_code is null or g.branch_code is null);

update public.notices
set target_years = '{}'::int[],
    target_departments = '{}'::text[],
    target_branches = '{}'::text[]
where target_years is null
   or target_departments is null
   or target_branches is null;

create index if not exists users_department_code_idx on public.users(department_code);
create index if not exists users_branch_code_idx on public.users(branch_code);
create index if not exists grievances_department_code_idx on public.grievances(department_code);
create index if not exists grievances_branch_code_idx on public.grievances(branch_code);
create index if not exists notices_target_audience_idx
  on public.notices using gin(target_years, target_departments, target_branches);

-- Same August academic-year boundary and four-year cap as src/lib/enrollment.js.
create or replace function public.student_study_year(enrollment_no text)
returns integer
language sql
immutable
parallel safe
as $$
  with parsed as (
    select case
      when enrollment_no ~ '^[A-Za-z0-9]{4}[0-9]{2}'
      then 2000 + substring(enrollment_no from 5 for 2)::int
    end as admission_year
  )
  select case
    when admission_year is null then null
    else least(
      greatest(
        extract(year from current_date)::int
          - case when extract(month from current_date)::int < 8 then 1 else 0 end
          - admission_year + 1,
        0
      ),
      5
    )
  end
  from parsed;
$$;

create or replace function public.student_department_code(enrollment_no text)
returns text
language sql
stable
parallel safe
as $$
  select case
    when upper(substring(coalesce(enrollment_no, '') from 3 for 2)) = 'CB' then 'CSE'
    else null
  end;
$$;

alter table public.grievance_groups
  add column if not exists solution_text text,
  add column if not exists forwarded_at timestamptz,
  add column if not exists forwarded_by text,
  add column if not exists is_active boolean not null default true;
alter table public.grievance_group_members
  add column if not exists added_by text,
  add column if not exists removed_at timestamptz,
  add column if not exists solution_forwarded_at timestamptz;

update public.grievance_group_members
set added_by = coalesce(added_by, g.created_by)
from public.grievance_groups as g
where grievance_group_members.group_id = g.id
  and grievance_group_members.added_by is null;

create table if not exists public.grievance_group_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.grievance_groups(id) on delete cascade,
  grievance_id uuid references public.grievances(id) on delete set null,
  action text not null,
  actor_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop index if exists public.grievance_group_one_active_membership_idx;
create unique index if not exists grievance_group_one_active_membership_idx
  on public.grievance_group_members(grievance_id)
  where removed_at is null;
create index if not exists grievance_group_events_group_idx
  on public.grievance_group_events(group_id, created_at desc);
create index if not exists grievance_group_events_grievance_idx
  on public.grievance_group_events(grievance_id);

alter table public.grievance_group_events enable row level security;
revoke all on public.grievance_group_events from anon, authenticated;

drop policy if exists "exam cell reads grievance group events"
  on public.grievance_group_events;
create policy "exam cell reads grievance group events"
  on public.grievance_group_events for select to authenticated
  using (public.exgrev_role() = 'examination cell');

drop policy if exists "authenticated users read notices"
  on public.notices;
create policy "authenticated users read targeted notices"
  on public.notices for select to authenticated
  using (
    public.exgrev_role() = 'examination cell'
    or (
      public.exgrev_role() = 'student'
      and
      is_active
      and (expires_at is null or expires_at > now())
      and (
        coalesce(cardinality(target_years), 0) = 0
        or exists (
          select 1
          from public.users as viewer
          where viewer.account_identifier = public.exgrev_user_id()
            and public.student_study_year(
              coalesce(viewer."User ID", viewer.account_identifier)
            ) = any(target_years)
        )
      )
      and (
        coalesce(cardinality(target_departments), 0) = 0
        or exists (
          select 1
          from public.users as viewer
          where viewer.account_identifier = public.exgrev_user_id()
            and (
              viewer.department_code = any(target_departments)
              or public.student_department_code(
                coalesce(viewer."User ID", viewer.account_identifier)
              ) = any(target_departments)
            )
        )
      )
      and (
        coalesce(cardinality(target_branches), 0) = 0
        or exists (
          select 1
          from public.users as viewer
          where viewer.account_identifier = public.exgrev_user_id()
            and viewer.branch_code = any(target_branches)
        )
      )
    )
    or (
      public.exgrev_role() = 'teaching staff'
      and is_active
      and (expires_at is null or expires_at > now())
      and (
        coalesce(cardinality(target_departments), 0) = 0
        or exists (
          select 1
          from public.users as viewer
          where viewer.account_identifier = public.exgrev_user_id()
            and (
              viewer.department_code = any(target_departments)
              or public.student_department_code(
                coalesce(viewer."User ID", viewer.account_identifier)
              ) = any(target_departments)
            )
        )
      )
    )
  );

-- Faculty see department/all-department notices; faculty year targeting does not apply.
drop policy if exists "exam cell manages notices"
  on public.notices;
create policy "exam cell manages notices"
  on public.notices for all to authenticated
  using (public.exgrev_role() = 'examination cell')
  with check (public.exgrev_role() = 'examination cell');

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
            and (
              coalesce(cardinality(notice.target_departments), 0) = 0
              or exists (
                select 1 from public.users as viewer
                where viewer.account_identifier = public.exgrev_user_id()
                  and (
                    viewer.department_code = any(notice.target_departments)
                    or public.student_department_code(
                      coalesce(viewer."User ID", viewer.account_identifier)
                    ) = any(notice.target_departments)
                  )
              )
            )
            and (
              coalesce(cardinality(notice.target_years), 0) = 0
              or exists (
                select 1 from public.users as viewer
                where viewer.account_identifier = public.exgrev_user_id()
                  and public.student_study_year(
                    coalesce(viewer."User ID", viewer.account_identifier)
                  ) = any(notice.target_years)
              )
            )
            and (
              coalesce(cardinality(notice.target_branches), 0) = 0
              or exists (
                select 1 from public.users as viewer
                where viewer.account_identifier = public.exgrev_user_id()
                  and viewer.branch_code = any(notice.target_branches)
              )
            )
        )
      )
    )
    or (
      bucket_id = 'guidelines'
      and (
        public.exgrev_role() = 'examination cell'
        or exists (
          select 1 from public.guidelines as guideline
          where guideline.attachment_url = storage.objects.name
            and guideline.is_active
        )
      )
    )
  );

create or replace function public.list_grievances_for_exam_cell(
  view_name text default 'all',
  grouped_only boolean default false,
  target_group_id uuid default null,
  target_group_status text default null,
  target_department text default null,
  target_branch text default null,
  target_year integer default null,
  target_category text default null,
  date_from timestamptz default null,
  date_to timestamptz default null,
  search_text text default null,
  result_limit integer default 25,
  result_offset integer default 0
)
returns table (
  id uuid,
  grievance_code text,
  student_user_id text,
  title text,
  subject text,
  status text,
  resolution_pending boolean,
  category text,
  sub_category text,
  created_at timestamptz,
  department_code text,
  branch_code text,
  group_id uuid,
  group_name text,
  is_master boolean,
  group_status text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if public.exgrev_role() is distinct from 'examination cell' then
    raise exception 'Only the Examination Cell can list exam-cell grievances';
  end if;

  return query
  with filtered as (
    select g.*, gm.group_id as active_group_id, gg.name as active_group_name,
           gg.status as active_group_status,
           (gg.master_grievance_id = g.id) as active_is_master
    from public.grievances g
    left join public.grievance_group_members gm
      on gm.grievance_id = g.id and gm.removed_at is null
    left join public.grievance_groups gg
      on gg.id = gm.group_id and gg.is_active
    where (view_name = 'all'
           or (view_name = 'active' and g.status <> 'Resolved')
           or (view_name = 'resolved' and g.status = 'Resolved'))
      and (not grouped_only or gm.group_id is not null)
      and (target_group_id is null or gm.group_id = target_group_id)
      and (target_group_status is null
           or gg.status = target_group_status)
      and (target_department is null or g.department_code = target_department)
      and (target_branch is null or g.branch_code = target_branch)
      and (target_year is null
           or public.student_study_year(g.student_user_id) = target_year)
      and (target_category is null or g.category = target_category)
      and (date_from is null or g.created_at >= date_from)
      and (date_to is null or g.created_at <= date_to)
      and (search_text is null
           or g.title ilike '%' || search_text || '%'
           or g.subject ilike '%' || search_text || '%'
           or g.grievance_code ilike '%' || search_text || '%'
           or g.student_user_id ilike '%' || search_text || '%')
  ),
  counted as (
    select filtered.*, count(*) over () as matching_count
    from filtered
  )
  select counted.id, counted.grievance_code, counted.student_user_id,
         counted.title, counted.subject, counted.status,
         counted.resolution_pending, counted.category, counted.sub_category,
         counted.created_at, counted.department_code, counted.branch_code,
         counted.active_group_id, counted.active_group_name,
         counted.active_is_master, counted.active_group_status,
         counted.matching_count
  from counted
  order by counted.created_at desc
  limit greatest(result_limit, 1)
  offset greatest(result_offset, 0);
end;
$$;

revoke all on function public.list_grievances_for_exam_cell from public, anon;
grant execute on function public.list_grievances_for_exam_cell to authenticated;

create or replace function public.log_group_member_forward()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.resolution_pending and not coalesce(old.resolution_pending, false) then
    update public.grievance_group_members
    set solution_forwarded_at = coalesce(solution_forwarded_at, now())
    where grievance_id = new.id
      and removed_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists group_member_forward_audit on public.grievances;
create trigger group_member_forward_audit
after update of resolution_pending on public.grievances
for each row
execute function public.log_group_member_forward();

create or replace function public.add_grievance_group_member(
  target_group_id uuid,
  target_grievance_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor text := public.exgrev_user_id();
begin
  if public.exgrev_role() is distinct from 'examination cell' then
    raise exception 'Only the Examination Cell can add group members';
  end if;
  if exists (
    select 1 from public.grievance_group_members
    where grievance_id = target_grievance_id and removed_at is null
  ) then
    raise exception 'A grievance can belong to only one active group';
  end if;
  insert into public.grievance_group_members (
    group_id, grievance_id, added_by
  ) values (target_group_id, target_grievance_id, actor)
  on conflict do nothing;
  insert into public.grievance_group_events (
    group_id, grievance_id, action, actor_id, details
  ) values (
    target_group_id, target_grievance_id, 'member_added', actor,
    jsonb_build_object('grievance_id', target_grievance_id)
  );
  perform public.record_grievance_event(
    target_grievance_id, actor, 'remark_added',
    jsonb_build_object('remark', 'This grievance was added to a similar-grievance group.')
  );
end;
$$;

create or replace function public.remove_grievance_group_member(
  target_group_id uuid,
  target_grievance_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor text := public.exgrev_user_id();
  remaining_count integer;
begin
  if public.exgrev_role() is distinct from 'examination cell' then
    raise exception 'Only the Examination Cell can remove group members';
  end if;
  update public.grievance_group_members
  set removed_at = now(),
      is_active = false
  where group_id = target_group_id
    and grievance_id = target_grievance_id
    and removed_at is null;
  insert into public.grievance_group_events (
    group_id, grievance_id, action, actor_id, details
  ) values (
    target_group_id, target_grievance_id, 'member_removed', actor,
    jsonb_build_object('grievance_id', target_grievance_id)
  );
  perform public.record_grievance_event(
    target_grievance_id, actor, 'remark_added',
    jsonb_build_object('remark', 'This grievance was removed from the similar-grievance group.')
  );

  select count(*) into remaining_count
  from public.grievance_group_members
  where group_id = target_group_id and removed_at is null;
  if remaining_count < 2 then
    update public.grievance_groups
    set status = 'closed', is_active = false
    where id = target_group_id;
    insert into public.grievance_group_events (
      group_id, action, actor_id, details
    ) values (
      target_group_id, 'group_auto_dissolved', actor,
      jsonb_build_object('remaining_member_count', remaining_count)
    );
  end if;
end;
$$;

create or replace function public.set_grievance_group_master(
  target_group_id uuid,
  target_grievance_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor text := public.exgrev_user_id();
begin
  if public.exgrev_role() is distinct from 'examination cell' then
    raise exception 'Only the Examination Cell can change the master';
  end if;
  if not exists (
    select 1 from public.grievance_group_members
    where group_id = target_group_id
      and grievance_id = target_grievance_id
      and removed_at is null
  ) then
    raise exception 'The master must be an active member of the group';
  end if;
  update public.grievance_groups
  set master_grievance_id = target_grievance_id
  where id = target_group_id;
  insert into public.grievance_group_events (
    group_id, grievance_id, action, actor_id, details
  ) values (
    target_group_id, target_grievance_id, 'master_changed', actor,
    jsonb_build_object('master_grievance_id', target_grievance_id)
  );
end;
$$;

create or replace function public.rename_grievance_group(
  target_group_id uuid,
  target_name text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor text := public.exgrev_user_id();
begin
  if public.exgrev_role() is distinct from 'examination cell' then
    raise exception 'Only the Examination Cell can rename groups';
  end if;
  if nullif(trim(target_name), '') is null or char_length(trim(target_name)) > 120 then
    raise exception 'Enter a valid group name';
  end if;
  update public.grievance_groups set name = trim(target_name)
  where id = target_group_id;
  insert into public.grievance_group_events (
    group_id, action, actor_id, details
  ) values (
    target_group_id, 'group_renamed', actor,
    jsonb_build_object('name', trim(target_name))
  );
end;
$$;

create or replace function public.dissolve_grievance_group(
  target_group_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor text := public.exgrev_user_id();
begin
  if public.exgrev_role() is distinct from 'examination cell' then
    raise exception 'Only the Examination Cell can dissolve groups';
  end if;
  update public.grievance_group_members
  set removed_at = coalesce(removed_at, now()),
      is_active = false
  where group_id = target_group_id and removed_at is null;
  update public.grievance_groups
  set status = 'closed', is_active = false
  where id = target_group_id;
  insert into public.grievance_group_events (
    group_id, action, actor_id, details
  ) values (
    target_group_id, 'group_dissolved', actor, '{}'::jsonb
  );
end;
$$;

create or replace function public.continue_grouped_grievance(
  target_grievance_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor text := public.exgrev_user_id();
  target_group_id uuid;
  remaining_count integer;
begin
  select gm.group_id into target_group_id
  from public.grievance_group_members gm
  join public.grievances g on g.id = gm.grievance_id
  where gm.grievance_id = target_grievance_id
    and gm.removed_at is null
    and g.student_user_id = actor;
  if target_group_id is null then
    return;
  end if;
  update public.grievance_group_members
  set removed_at = now(),
      is_active = false
  where group_id = target_group_id
    and grievance_id = target_grievance_id
    and removed_at is null;
  insert into public.grievance_group_events (
    group_id, grievance_id, action, actor_id, details
  ) values (
    target_group_id, target_grievance_id, 'student_continued_thread', actor,
    jsonb_build_object('removed_from_group', true)
  );
  perform public.record_grievance_event(
    target_grievance_id, actor, 'remark_added',
    jsonb_build_object('remark', 'The student continued the grievance thread and left the similar-grievance group.')
  );
  select count(*) into remaining_count
  from public.grievance_group_members
  where group_id = target_group_id and removed_at is null;
  if remaining_count < 2 then
    update public.grievance_groups
    set status = 'closed', is_active = false
    where id = target_group_id;
  end if;
end;
$$;

revoke all on function public.add_grievance_group_member(uuid, uuid) from public, anon;
revoke all on function public.remove_grievance_group_member(uuid, uuid) from public, anon;
revoke all on function public.set_grievance_group_master(uuid, uuid) from public, anon;
revoke all on function public.rename_grievance_group(uuid, text) from public, anon;
revoke all on function public.dissolve_grievance_group(uuid) from public, anon;
revoke all on function public.continue_grouped_grievance(uuid) from public, anon;
grant execute on function public.add_grievance_group_member(uuid, uuid) to authenticated;
grant execute on function public.remove_grievance_group_member(uuid, uuid) to authenticated;
grant execute on function public.set_grievance_group_master(uuid, uuid) to authenticated;
grant execute on function public.rename_grievance_group(uuid, text) to authenticated;
grant execute on function public.dissolve_grievance_group(uuid) to authenticated;
grant execute on function public.continue_grouped_grievance(uuid) to authenticated;

create or replace function public.student_group_status(
  target_grievance_id uuid
)
returns table (
  is_grouped boolean,
  common_solution_status text,
  forwarded_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    true,
    case
      when member.solution_forwarded_at is not null then 'Solution forwarded'
      else 'Awaiting common solution'
    end,
    member.solution_forwarded_at
  from public.grievance_group_members as member
  join public.grievances as grievance
    on grievance.id = member.grievance_id
  join public.grievance_groups as grievance_group
    on grievance_group.id = member.group_id
  where member.grievance_id = target_grievance_id
    and member.removed_at is null
    and grievance.student_user_id = public.exgrev_user_id()

  union all

  select false, 'Not part of a group', null::timestamptz
  where not exists (
    select 1
    from public.grievance_group_members as member
    join public.grievances as grievance
      on grievance.id = member.grievance_id
    where member.grievance_id = target_grievance_id
      and member.removed_at is null
      and grievance.student_user_id = public.exgrev_user_id()
  );
$$;

revoke all on function public.student_group_status(uuid) from public, anon;
grant execute on function public.student_group_status(uuid) to authenticated;
