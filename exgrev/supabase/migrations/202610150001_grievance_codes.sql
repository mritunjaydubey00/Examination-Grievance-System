alter table public.grievances
  add column if not exists grievance_code text;

do $$
declare
  grievance_row record;
  candidate text;
  random_bytes bytea;
begin
  if (
    select count(*)
    from public.grievances
    where status <> 'Resolved'
  ) >= 67600 then
    raise exception 'Cannot assign grievance codes: unresolved grievance count exceeds code capacity';
  end if;

  for grievance_row in
    select id, status
    from public.grievances
    where grievance_code is null
    order by created_at, id
  loop
    loop
      random_bytes := public.gen_random_bytes(2);
      candidate :=
        substring('ABCDEFGHIJKLMNOPQRSTUVWXYZ' from get_byte(random_bytes, 0) % 26 + 1 for 1) ||
        substring('ABCDEFGHIJKLMNOPQRSTUVWXYZ' from get_byte(random_bytes, 1) % 26 + 1 for 1) ||
        substring('0123456789' from get_byte(public.gen_random_bytes(1), 0) % 10 + 1 for 1) ||
        substring('0123456789' from get_byte(public.gen_random_bytes(1), 0) % 10 + 1 for 1);
      exit when grievance_row.status = 'Resolved'
        or not exists (
          select 1
          from public.grievances existing
          where existing.grievance_code = candidate
            and existing.status <> 'Resolved'
        );
    end loop;

    update public.grievances
    set grievance_code = candidate
    where id = grievance_row.id;
  end loop;
end $$;

alter table public.grievances
  alter column grievance_code set not null;

alter table public.grievances
  add constraint grievances_grievance_code_format
  check (grievance_code ~ '^[A-Z]{2}[0-9]{2}$');

create unique index grievances_active_code_unique
  on public.grievances (grievance_code)
  where status <> 'Resolved';

create or replace function public.assign_grievance_code()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  random_bytes bytea;
  candidate text;
  start_index integer;
  candidate_index integer;
  attempt integer := 0;
begin
  if tg_op = 'UPDATE' then
    if new.grievance_code is distinct from old.grievance_code then
      raise exception 'Grievance codes cannot be changed';
    end if;
    return new;
  end if;

  perform pg_advisory_xact_lock(734091287);

  if (
    select count(*)
    from public.grievances
    where status <> 'Resolved'
  ) >= 67600 then
    raise exception 'No grievance codes are available until an unresolved grievance is resolved';
  end if;

  random_bytes := public.gen_random_bytes(2);
  start_index := (get_byte(random_bytes, 0) * 256 + get_byte(random_bytes, 1)) % 67600;

  while attempt < 67600 loop
    candidate_index := (start_index + attempt) % 67600;
    candidate :=
      substring('ABCDEFGHIJKLMNOPQRSTUVWXYZ' from (candidate_index / 100) / 26 + 1 for 1) ||
      substring('ABCDEFGHIJKLMNOPQRSTUVWXYZ' from (candidate_index / 100) % 26 + 1 for 1) ||
      substring('0123456789' from (candidate_index % 100) / 10 + 1 for 1) ||
      substring('0123456789' from candidate_index % 10 + 1 for 1);

    if not exists (
      select 1
      from public.grievances existing
      where existing.grievance_code = candidate
        and existing.status <> 'Resolved'
    ) then
      new.grievance_code := candidate;
      return new;
    end if;
    attempt := attempt + 1;
  end loop;

  raise exception 'Unable to allocate a grievance code';
end $$;

create trigger grievances_assign_code
before insert or update of grievance_code on public.grievances
for each row execute function public.assign_grievance_code();
