begin;

update public.late_entry_qr_sessions
set is_active = false,
    revoked_at = coalesce(revoked_at, now())
where is_active and not is_redeemed;

create unique index if not exists late_entry_qr_one_active_session_per_request
  on public.late_entry_qr_sessions (request_id)
  where is_active and not is_redeemed;

drop policy if exists "staff can read qr sessions for assigned request review"
  on public.late_entry_qr_sessions;
drop policy if exists "students can create their own qr session"
  on public.late_entry_qr_sessions;
drop policy if exists "exam cell can update qr sessions"
  on public.late_entry_qr_sessions;
drop policy if exists "students read own qr sessions"
  on public.late_entry_qr_sessions;
revoke all on public.late_entry_qr_sessions
  from anon, authenticated;

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
  update public.late_entry_qr_sessions
  set is_active = false,
      revoked_at = v_now
  where request_id = p_request_id
    and is_active
    and not is_redeemed;

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

create or replace function public.get_late_entry_qr_token(
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_session public.late_entry_qr_sessions%rowtype;
  v_request public.late_entry_requests%rowtype;
  v_now timestamptz;
  v_step bigint;
  v_signature text;
begin
  if public.exgrev_role() <> 'student' then
    raise exception using errcode = '42501', message = 'Only the request owner can refresh the entry pass';
  end if;

  select * into v_session
  from public.late_entry_qr_sessions
  where id = p_session_id
    and student_user_id = public.exgrev_user_id()
    and is_active
    and not is_redeemed;
  if not found then
    raise exception using errcode = 'P0002', message = 'QR session is no longer active';
  end if;

  select * into v_request
  from public.late_entry_requests
  where id = v_session.request_id
    and student_user_id = public.exgrev_user_id();
  if not found or v_request.status <> 'approved'
    or v_request.entry_confirmed_at is not null then
    raise exception using errcode = '42501', message = 'The approved request is no longer available';
  end if;

  v_now := clock_timestamp();
  if v_now >= v_session.expires_at then
    raise exception using errcode = '22023', message = 'QR session has expired';
  end if;

  v_step := floor(extract(epoch from v_now))::bigint;
  v_signature := encode(
    public.hmac(
      convert_to(
        v_session.request_id::text || ':' || v_session.id::text || ':' || v_step::text,
        'UTF8'
      ),
      decode(v_session.session_key, 'hex'),
      'sha256'
    ),
    'hex'
  );

  return jsonb_build_object(
    'payload',
      'EXGREV-LATE-ENTRY:' || v_session.request_id::text || ':' ||
      v_session.id::text || ':' || v_step::text || ':' || v_signature,
    'server_now', v_now,
    'expires_at', v_session.expires_at
  );
end;
$$;

create or replace function public.verify_late_entry_qr(
  p_payload text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_parts text[];
  v_request_id uuid;
  v_session_id uuid;
  v_step bigint;
  v_signature text;
  v_session public.late_entry_qr_sessions%rowtype;
  v_request public.late_entry_requests%rowtype;
  v_user_id text;
  v_now timestamptz;
  v_expected text;
  v_faculty public.users%rowtype;
begin
  if public.exgrev_role() <> 'teaching staff' then
    raise exception using errcode = '42501', message = 'Only authenticated teaching staff can verify an entry pass';
  end if;

  v_parts := string_to_array(coalesce(p_payload, ''), ':');
  if array_length(v_parts, 1) <> 5 or v_parts[1] <> 'EXGREV-LATE-ENTRY'
    or v_parts[4] !~ '^[0-9]+$' or v_parts[5] !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'QR code is invalid';
  end if;

  begin
    v_request_id := v_parts[2]::uuid;
    v_session_id := v_parts[3]::uuid;
    v_step := v_parts[4]::bigint;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'QR code is invalid';
  end;

  select * into v_session
  from public.late_entry_qr_sessions
  where id = v_session_id
    and request_id = v_request_id
    and is_active
    and not is_redeemed;
  if not found then
    raise exception using errcode = '22023', message = 'QR session has already been used or revoked';
  end if;

  select * into v_request
  from public.late_entry_requests
  where id = v_request_id;
  if not found or v_request.status <> 'approved' then
    raise exception using errcode = '22023', message = 'Late-entry request is not approved';
  end if;
  if v_request.entry_confirmed_at is not null then
    raise exception using errcode = '22023', message = 'Late-entry request has already been confirmed';
  end if;

  v_now := clock_timestamp();
  if v_now < v_session.issued_at - interval '1 second'
    or v_now >= v_session.expires_at then
    raise exception using errcode = '22023', message = 'QR session has expired or is not yet valid';
  end if;
  if abs(floor(extract(epoch from v_now))::bigint - v_step) > 1 then
    raise exception using errcode = '22023', message = 'QR code has expired';
  end if;

  v_expected := encode(
    public.hmac(
      convert_to(
        v_request_id::text || ':' || v_session_id::text || ':' || v_step::text,
        'UTF8'
      ),
      decode(v_session.session_key, 'hex'),
      'sha256'
    ),
    'hex'
  );
  if v_expected <> v_signature then
    raise exception using errcode = '22023', message = 'QR token signature is invalid';
  end if;

  v_user_id := public.exgrev_user_id();
  select * into v_faculty
  from public.users
  where account_identifier = v_user_id;

  insert into public.late_entry_events (
    request_id, event_type, actor_user_id, actor_name, actor_role, event_data
  ) values (
    v_request_id,
    'qr_validated',
    v_user_id,
    v_faculty."Full Name",
    'teaching staff',
    jsonb_build_object(
      'session_id', v_session_id,
      'department', v_faculty."Department",
      'branch', v_faculty."Branch",
      'verified_at', v_now
    )
  );

  return jsonb_build_object(
    'request_id', v_request.id,
    'session_id', v_session.id,
    'student_name', v_request.student_name,
    'student_roll_number', v_request.student_roll_number,
    'department', v_request.department,
    'branch', v_request.branch,
    'exam_type', v_request.exam_type,
    'course_name', v_request.course_name,
    'course_code', v_request.course_code,
    'exam_date', v_request.examination_date,
    'start_time', v_request.scheduled_start_time,
    'approved_by', v_request.reviewed_by_name,
    'decision_reason', v_request.decision_reason,
    'verified_at', v_now
  );
end;
$$;

revoke all on function public.create_late_entry_qr_session(uuid)
  from public, anon;
revoke all on function public.get_late_entry_qr_token(uuid)
  from public, anon;
revoke all on function public.verify_late_entry_qr(text)
  from public, anon;
grant execute on function public.create_late_entry_qr_session(uuid)
  to authenticated;
grant execute on function public.get_late_entry_qr_token(uuid)
  to authenticated;
grant execute on function public.verify_late_entry_qr(text)
  to authenticated;

commit;
