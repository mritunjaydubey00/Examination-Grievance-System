begin;

create or replace function public.exgrev_role()
returns text
language sql
stable
as $$
  select case
    when lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')))
      in ('examination cell', 'exam cell', 'admin', 'exam cell admin')
    then 'examination cell'
    when lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')))
      in ('teaching staff', 'teaching', 'faculty')
    then 'teaching staff'
    when lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', ''))) = 'student'
    then 'student'
    else ''
  end
$$;

create or replace function public.exgrev_user_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'user_id', ''),
    case
      when lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')))
        in ('teaching staff', 'examination cell')
      then lower(trim(auth.jwt() ->> 'email'))
    end
  )
$$;

create or replace function public.allow_only_approved_exgrev_auth_users()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or not exists (
    select 1
    from public.users as approved_user
    where lower(trim(approved_user.email)) = lower(trim(new.email))
      and lower(regexp_replace(trim(coalesce(approved_user."Ex Factor", '')), '[_-]+', ' ', 'g'))
        in (
          'student',
          'examination cell',
          'exam cell',
          'admin',
          'exam cell admin',
          'teaching staff',
          'teaching',
          'faculty'
        )
      and (
        lower(regexp_replace(trim(coalesce(approved_user."Ex Factor", '')), '[_-]+', ' ', 'g'))
          <> 'student'
        or nullif(trim(approved_user."User ID"), '') is not null
      )
  ) then
    raise exception using
      errcode = '42501',
      message = 'Sign-in is limited to existing, approved ExGrev accounts.';
  end if;

  return new;
end
$$;

revoke all on function public.allow_only_approved_exgrev_auth_users()
  from public, anon, authenticated;

drop trigger if exists exgrev_approved_auth_users_only on auth.users;
create trigger exgrev_approved_auth_users_only
  before insert on auth.users
  for each row execute function public.allow_only_approved_exgrev_auth_users();

commit;
