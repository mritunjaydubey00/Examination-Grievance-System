begin;

create or replace function public.exgrev_student_user_id()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select user_row."User ID"
  from public.users as user_row
  where lower(trim(user_row.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    and lower(trim(coalesce(user_row."Ex Factor", ''))) = 'student'
    and nullif(trim(user_row."User ID"), '') is not null
  limit 1
$$;

revoke all on function public.exgrev_student_user_id() from public, anon;
grant execute on function public.exgrev_student_user_id() to authenticated;

create or replace function public.exgrev_role()
returns text
language sql
stable
as $$
  select case
    when public.exgrev_student_user_id() is not null then 'student'
    when lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')))
      in ('examination cell', 'exam cell', 'admin', 'exam cell admin')
    then 'examination cell'
    when lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')))
      in ('teaching staff', 'teaching', 'faculty')
    then 'teaching staff'
    else ''
  end
$$;

create or replace function public.exgrev_user_id()
returns text
language sql
stable
as $$
  select coalesce(
    public.exgrev_student_user_id(),
    nullif(auth.jwt() -> 'app_metadata' ->> 'user_id', ''),
    case
      when lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')))
        in ('teaching staff', 'examination cell')
      then lower(trim(auth.jwt() ->> 'email'))
    end
  )
$$;

drop policy if exists "students submit own grievances" on public.grievances;
create policy "students submit own grievances"
  on public.grievances for insert to authenticated
  with check (
    student_user_id = public.exgrev_student_user_id()
    and public.exgrev_role() = 'student'
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

drop policy if exists "student uploads own grievance files" on storage.objects;
create policy "student uploads own grievance files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'grievance-documents'
    and (storage.foldername(name))[1] = public.exgrev_student_user_id()
    and public.exgrev_role() = 'student'
  );

commit;
