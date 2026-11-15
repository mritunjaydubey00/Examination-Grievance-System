begin;

create or replace function public.create_late_entry_qr_session(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id text;
  v_request public.late_entry_requests%rowtype;
  v_session public.late_entry_qr_sessions%rowtype;
  v_now timestamptz;
begin
  if public.exgrev_role() <> 'student' then
    raise exception using errcode = '42501', message = 'Only the request owner can generate the entry pass';
  end if;

  v_user_id := public.exgrev_user_id();
  select * into v_request
  from public.late_entry_requests
  where id = p_request_id and student_user_id = v_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Late-entry request was not found';
  end if;
  if v_request.status <> 'approved' then
    raise exception using errcode = '42501', message = 'The late-entry request is not approved';
  end if;
  if v_request.entry_confirmed_at is not null or v_request.status = 'entry_confirmed' then
    raise exception using errcode = '42501', message = 'This entry pass has already been used';
  end if;

  v_now := clock_timestamp();
  select * into v_session
  from public.late_entry_qr_sessions
  where request_id = p_request_id
  order by created_at desc
  limit 1;

  if found then
    if v_session.is_active and not v_session.is_redeemed
      and v_now < v_session.expires_at then
      return jsonb_build_object(
        'session_id', v_session.id,
        'issued_at', v_session.issued_at,
        'expires_at', v_session.expires_at,
        'server_now', v_now
      );
    end if;
    raise exception using
      errcode = '22023',
      message = 'This approved request has already used its two-minute pass. A new pass cannot be generated';
  end if;

  insert into public.late_entry_qr_sessions (
    request_id,
    student_user_id,
    issued_at,
    expires_at,
    token,
    session_key,
    is_active,
    is_redeemed
  ) values (
    p_request_id,
    v_user_id,
    v_now,
    v_now + interval '120 seconds',
    '',
    encode(public.gen_random_bytes(32), 'hex'),
    true,
    false
  )
  returning * into v_session;

  update public.late_entry_requests
  set qr_session_id = v_session.id,
      updated_at = v_now
  where id = p_request_id;

  insert into public.late_entry_events (
    request_id, event_type, actor_user_id, actor_name, actor_role, event_data
  ) values (
    p_request_id,
    'qr_session_issued',
    v_user_id,
    v_request.student_name,
    'student',
    jsonb_build_object(
      'session_id', v_session.id,
      'issued_at', v_session.issued_at,
      'expires_at', v_session.expires_at
    )
  );

  return jsonb_build_object(
    'session_id', v_session.id,
    'issued_at', v_session.issued_at,
    'expires_at', v_session.expires_at,
    'server_now', v_now
  );
end;
$$;

revoke all on function public.create_late_entry_qr_session(uuid)
  from public, anon;
grant execute on function public.create_late_entry_qr_session(uuid)
  to authenticated;

commit;
