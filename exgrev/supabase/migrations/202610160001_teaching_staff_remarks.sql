begin;

create or replace function public.teaching_staff_add_grievance_remark(
  target_grievance_id uuid,
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
begin
  if public.exgrev_role() <> 'teaching staff' then
    raise exception 'Only teaching staff can add faculty remarks';
  end if;

  if action_remark is null or length(trim(action_remark)) = 0 then
    raise exception 'Enter a remark before continuing';
  end if;

  current_user_id := public.exgrev_user_id();

  select *
  into target_grievance
  from public.grievances
  where id = target_grievance_id
  for update;

  if not found
    or target_grievance.assigned_faculty_user_id <> current_user_id then
    raise exception 'Assigned grievance not found';
  end if;
  if target_grievance.status = 'Resolved' then
    raise exception 'This grievance is already resolved';
  end if;
  if target_grievance.resolution_pending then
    raise exception 'This grievance is awaiting student confirmation';
  end if;

  update public.grievances
  set status = 'In Progress',
      updated_at = now()
  where id = target_grievance_id
  returning * into updated_grievance;

  insert into public.grievance_events (
    grievance_id,
    actor_user_id,
    event_type,
    details
  )
  values (
    target_grievance_id,
    current_user_id,
    'remark_added',
    jsonb_build_object('remark', trim(action_remark))
  );

  return updated_grievance;
end;
$$;

revoke all on function public.teaching_staff_add_grievance_remark(uuid, text) from public;
grant execute on function public.teaching_staff_add_grievance_remark(uuid, text)
  to authenticated;

commit;
