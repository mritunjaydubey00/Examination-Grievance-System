begin;

create or replace function public.examination_cell_grievance_action(
  target_grievance_id uuid,
  requested_action text,
  action_remark text
)
returns public.grievances
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  target_grievance public.grievances%rowtype;
  updated_grievance public.grievances%rowtype;
  current_user_id text;
  recipients text[];
begin
  if requested_action = 'remark' then
    return public.add_grievance_remark(target_grievance_id, action_remark);
  end if;

  if requested_action <> 'resolve' then
    raise exception 'Unsupported Examination Cell grievance action';
  end if;
  if public.exgrev_role() is distinct from 'examination cell'
    or public.exgrev_user_id() is null then
    raise exception 'Only the Examination Cell can propose a resolution';
  end if;
  if action_remark is null or length(trim(action_remark)) = 0 then
    raise exception 'Enter a resolution remark before continuing';
  end if;

  current_user_id := public.exgrev_user_id();

  select *
  into target_grievance
  from public.grievances
  where id = target_grievance_id
  for update;

  if not found then
    raise exception 'Grievance not found';
  end if;
  if target_grievance.status = 'Resolved' then
    raise exception 'This grievance is already resolved';
  end if;
  if target_grievance.resolution_pending then
    raise exception 'This grievance is awaiting student confirmation';
  end if;

  update public.grievances
  set status = 'In Progress',
      resolution_remark = trim(action_remark),
      resolution_pending = true,
      resolution_proposed_by = current_user_id,
      resolution_proposed_at = now(),
      student_confirmed_at = null,
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
    where lower(trim(user_row."Ex Factor")) = 'examination cell'
  ) as participant
  where participant.user_id is not null
    and participant.user_id <> current_user_id;

  perform public.record_grievance_event(
    target_grievance_id,
    current_user_id,
    'resolution_proposed',
    jsonb_build_object('remark', trim(action_remark)),
    recipients
  );

  return updated_grievance;
end;
$$;

revoke all on function public.examination_cell_grievance_action(uuid, text, text)
  from public, anon;
grant execute on function public.examination_cell_grievance_action(uuid, text, text)
  to authenticated;

commit;
