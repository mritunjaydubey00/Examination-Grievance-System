begin;

create or replace function public.prepare_late_entry_request()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id text;
  v_user public.users%rowtype;
  v_schedule public.late_entry_exam_schedules%rowtype;
  v_profile jsonb;
begin
  if public.exgrev_role() <> 'student' then
    raise exception using errcode = '42501', message = 'Only students can submit late-entry requests';
  end if;

  v_user_id := public.exgrev_user_id();
  select * into v_user
  from public.users
  where account_identifier = v_user_id
    and lower(trim("Ex Factor")) = 'student';
  if not found or nullif(trim(v_user."Full Name"), '') is null
    or nullif(trim(v_user."Department"), '') is null then
    raise exception using errcode = '42501', message = 'Your student profile is incomplete; contact the Examination Cell';
  end if;

  select * into v_schedule
  from public.late_entry_exam_schedules
  where id = new.schedule_id
    and is_published
    and lower(trim(department)) = lower(trim(v_user."Department"))
    and (
      nullif(trim(branch), '') is null
      or lower(trim(branch)) = lower(trim(coalesce(v_user."Branch", '')))
    );
  if not found then
    raise exception using errcode = '42501', message = 'The selected exam schedule is not available for your department and branch';
  end if;

  v_profile := to_jsonb(v_user);
  new.student_user_id := v_user_id;
  new.student_name := v_user."Full Name";
  new.student_email := v_user.email;
  new.student_roll_number := v_user."User ID";
  new.student_registration_number := coalesce(
    v_profile ->> 'Enrollment Number',
    v_profile ->> 'Registration Number',
    v_profile ->> 'Registration/Enrollment Number'
  );
  new.student_phone := v_user."Phone Number";
  new.department := v_user."Department";
  new.branch := v_user."Branch";
  new.exam_type := v_schedule.exam_type;
  new.examination_name := v_schedule.exam_type;
  new.course_name := v_schedule.course_name;
  new.course_code := v_schedule.course_code;
  new.course := v_schedule.course_name;
  new.subject := v_schedule.course_name;
  new.examination_date := v_schedule.exam_date;
  new.scheduled_start_time := v_schedule.start_time::text;
  new.status := 'pending';
  new.requested_at := now();
  new.reviewed_by_user_id := null;
  new.reviewed_by_name := null;
  new.reviewed_at := null;
  new.decision_reason := null;
  new.approved_by_user_id := null;
  new.approval_signature := null;
  new.approval_signature_metadata := '{}'::jsonb;
  new.entry_confirmed_at := null;
  new.entry_confirmed_by_user_id := null;
  new.entry_confirmed_by_name := null;
  return new;
end;
$$;

commit;
