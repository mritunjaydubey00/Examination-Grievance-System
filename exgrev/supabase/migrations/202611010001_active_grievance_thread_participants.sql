begin;

create or replace function public.is_grievance_thread_participant(
  target_grievance_id uuid,
  target_user_id text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.grievances as grievance
    where grievance.id = target_grievance_id
      and (
        grievance.student_user_id = target_user_id
        or grievance.assigned_faculty_user_id = target_user_id
      )
  )
  or exists (
    select 1
    from public.grievance_events as event
    join public.users as actor
      on actor.account_identifier = event.actor_user_id
      or actor."User ID" = event.actor_user_id
    where event.grievance_id = target_grievance_id
      and actor.account_identifier = target_user_id
      and event.actor_role in ('exam_cell', 'faculty')
  )
  or exists (
    select 1
    from public.grievance_events as event
    join public.grievance_event_recipients as recipient
      on recipient.event_id = event.id
    where event.grievance_id = target_grievance_id
      and event.event_type in ('forwarded', 'reassigned')
      and recipient.recipient_user_id = target_user_id
  );
$$;

revoke all on function public.is_grievance_thread_participant(uuid, text)
  from public, anon, authenticated;

create or replace function public.add_active_grievance_event_recipients()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_account_id text;
begin
  if new.event_type = 'submitted' then
    return new;
  end if;

  select user_row.account_identifier
  into actor_account_id
  from public.users as user_row
  where user_row.account_identifier = new.actor_user_id
     or user_row."User ID" = new.actor_user_id
  limit 1;

  insert into public.grievance_event_recipients (
    event_id,
    recipient_user_id,
    recipient_display_name
  )
  select
    new.id,
    participant.account_identifier,
    coalesce(participant."Full Name", participant.account_identifier)
  from public.users as participant
  where public.is_grievance_thread_participant(
      new.grievance_id,
      participant.account_identifier
    )
    and participant.account_identifier <> coalesce(actor_account_id, new.actor_user_id, '')
  on conflict (event_id, recipient_user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.add_active_grievance_event_recipients()
  from public, anon, authenticated;

drop trigger if exists grievance_events_add_active_recipients
  on public.grievance_events;
create trigger grievance_events_add_active_recipients
  after insert on public.grievance_events
  for each row execute function public.add_active_grievance_event_recipients();

create or replace function public.filter_inactive_grievance_event_recipients()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  event_grievance_id uuid;
  event_type text;
begin
  select event.grievance_id, event.event_type
  into event_grievance_id, event_type
  from public.grievance_events as event
  where event.id = new.event_id;

  if event_type = 'submitted'
    or public.is_grievance_thread_participant(
      event_grievance_id,
      new.recipient_user_id
    ) then
    return new;
  end if;

  return null;
end;
$$;

revoke all on function public.filter_inactive_grievance_event_recipients()
  from public, anon, authenticated;

drop trigger if exists grievance_event_recipients_filter_inactive
  on public.grievance_event_recipients;
create trigger grievance_event_recipients_filter_inactive
  before insert on public.grievance_event_recipients
  for each row execute function public.filter_inactive_grievance_event_recipients();

commit;
