begin;

do $$
begin
  if exists (
    select 1
    from public.users
    where email is null or trim(email) = ''
  ) then
    raise exception 'Every users row needs an email before staff email identities can be enabled';
  end if;

  if exists (
    select 1
    from public.users
    where lower(trim("Ex Factor")) = 'student'
      and nullif(trim("User ID"), '') is null
  ) then
    raise exception 'Every Student row needs a User ID before applying this migration';
  end if;

  if exists (
    select lower(trim(email))
    from public.users
    group by lower(trim(email))
    having count(*) > 1
  ) then
    raise exception 'Resolve duplicate user email addresses before applying this migration';
  end if;

  if exists (
    select case
      when lower(trim("Ex Factor")) = 'student' then "User ID"
      else lower(trim(email))
    end
    from public.users
    group by case
      when lower(trim("Ex Factor")) = 'student' then "User ID"
      else lower(trim(email))
    end
    having count(*) > 1
  ) then
    raise exception 'A student User ID conflicts with another account email; resolve the conflict before applying this migration';
  end if;
end $$;

alter table public.grievances
  drop constraint if exists grievances_student_user_id_fkey,
  drop constraint if exists grievances_assigned_faculty_user_id_fkey;
alter table public.grievance_events
  drop constraint if exists grievance_events_actor_user_id_fkey;

do $$
declare
  user_id_attnum smallint;
  primary_key_name text;
  dependent_constraints text;
begin
  select attnum into user_id_attnum
  from pg_attribute
  where attrelid = 'public.users'::regclass
    and attname = 'User ID'
    and not attisdropped;

  select string_agg(
    format('%I.%I (%I)', constraint_row.table_schema, constraint_row.table_name, constraint_row.conname),
    ', '
  )
  into dependent_constraints
  from (
    select namespace.nspname as table_schema, relation.relname as table_name, constraint_row.conname
    from pg_constraint as constraint_row
    join pg_class as relation on relation.oid = constraint_row.conrelid
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    cross join lateral unnest(constraint_row.confkey) as referenced_column(attnum)
    where constraint_row.contype = 'f'
      and constraint_row.confrelid = 'public.users'::regclass
      and referenced_column.attnum = user_id_attnum
      and constraint_row.conrelid not in (
        'public.grievances'::regclass,
        'public.grievance_events'::regclass
      )
  ) as constraint_row;

  if dependent_constraints is not null then
    raise exception 'Migrate these additional User ID foreign keys to account_identifier before continuing: %', dependent_constraints;
  end if;

  select conname into primary_key_name
  from pg_constraint
  where conrelid = 'public.users'::regclass
    and contype = 'p'
    and conkey = array[user_id_attnum];

  if primary_key_name is not null then
    execute format('alter table public.users drop constraint %I', primary_key_name);
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.users'::regclass
      and contype = 'p'
  ) then
    raise exception 'The users table has a primary key other than User ID; migrate it to account_identifier before continuing';
  end if;
end $$;

alter table public.users
  alter column "User ID" drop not null,
  alter column email set not null,
  add column account_identifier text;

update public.users
set account_identifier = case
  when lower(trim("Ex Factor")) = 'student' then "User ID"
  else lower(trim(email))
end;

update public.grievances as grievance
set assigned_faculty_user_id = lower(trim(user_row.email))
from public.users as user_row
where grievance.assigned_faculty_user_id = user_row."User ID"
  and coalesce(lower(trim(user_row."Ex Factor")), '') <> 'student';

update public.grievance_events as event
set actor_user_id = lower(trim(user_row.email))
from public.users as user_row
where event.actor_user_id = user_row."User ID"
  and coalesce(lower(trim(user_row."Ex Factor")), '') <> 'student';

update public.users
set "User ID" = null
where coalesce(lower(trim("Ex Factor")), '') <> 'student';

alter table public.users
  alter column account_identifier set not null;

alter table public.users
  add constraint users_pkey primary key (account_identifier);

create unique index users_user_id_unique
  on public.users ("User ID");
create unique index users_email_case_insensitive_unique
  on public.users (lower(trim(email)));

create or replace function public.set_account_identifier()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.account_identifier :=
    coalesce(nullif(new."User ID", ''), lower(trim(new.email)));
  return new;
end $$;

create trigger users_set_account_identifier
before insert or update on public.users
for each row execute function public.set_account_identifier();

alter table public.grievances
  add constraint grievances_student_user_id_fkey
    foreign key (student_user_id) references public.users ("User ID")
    on update cascade,
  add constraint grievances_assigned_faculty_user_id_fkey
    foreign key (assigned_faculty_user_id)
    references public.users (account_identifier)
    on update cascade;

alter table public.grievance_events
  add constraint grievance_events_actor_user_id_fkey
    foreign key (actor_user_id) references public.users (account_identifier)
    on update cascade;

commit;
