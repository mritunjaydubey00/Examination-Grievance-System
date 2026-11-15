begin;

create or replace function public.enforce_one_late_entry_qr_per_utc_day()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_day_start timestamptz;
begin
  if new.student_user_id is distinct from public.exgrev_user_id()
    or public.exgrev_role() <> 'student' then
    raise exception using
      errcode = '42501',
      message = 'Only the request owner can generate the entry pass';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('late-entry-qr-daily-limit'),
    hashtext(new.student_user_id)
  );

  v_now := clock_timestamp();
  v_day_start := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';

  if exists (
    select 1
    from public.late_entry_qr_sessions as session
    join public.late_entry_requests as request
      on request.id = session.request_id
    where request.student_user_id = new.student_user_id
      and session.issued_at >= v_day_start
      and session.issued_at < v_day_start + interval '1 day'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'You have already requested a QR pass today (UTC). Try again after midnight UTC.';
  end if;

  return new;
end;
$$;

drop trigger if exists late_entry_qr_daily_limit
  on public.late_entry_qr_sessions;
create trigger late_entry_qr_daily_limit
  before insert on public.late_entry_qr_sessions
  for each row execute function public.enforce_one_late_entry_qr_per_utc_day();

revoke all on function public.enforce_one_late_entry_qr_per_utc_day()
  from public, anon, authenticated;

create or replace function public.has_late_entry_qr_today()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id text;
  v_now timestamptz;
  v_day_start timestamptz;
begin
  if public.exgrev_role() <> 'student' then
    raise exception using
      errcode = '42501',
      message = 'Only students can check their daily entry-pass limit';
  end if;

  v_user_id := public.exgrev_user_id();
  v_now := clock_timestamp();
  v_day_start := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';

  return exists (
    select 1
    from public.late_entry_qr_sessions as session
    join public.late_entry_requests as request
      on request.id = session.request_id
    where request.student_user_id = v_user_id
      and session.issued_at >= v_day_start
      and session.issued_at < v_day_start + interval '1 day'
  );
end;
$$;

revoke all on function public.has_late_entry_qr_today()
  from public, anon;
grant execute on function public.has_late_entry_qr_today()
  to authenticated;

commit;
