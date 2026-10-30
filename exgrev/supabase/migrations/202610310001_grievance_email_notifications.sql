begin;

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

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
  where lower(regexp_replace(trim(coalesce(user_row."Ex Factor", '')), '[_-]+', ' ', 'g'))
    in ('examination cell', 'exam cell', 'admin', 'exam cell admin');

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

create table if not exists public.grievance_email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.grievance_events(id) on delete cascade,
  recipient_user_id text not null references public.users(account_identifier) on update cascade,
  recipient_email text not null check (length(trim(recipient_email)) between 3 and 254),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, recipient_user_id)
);

create index if not exists grievance_email_outbox_pending_idx
  on public.grievance_email_outbox(available_at, created_at)
  where status in ('pending', 'processing');

alter table public.grievance_email_outbox enable row level security;
revoke all on public.grievance_email_outbox from public, anon, authenticated;
grant select, insert, update on public.grievance_email_outbox to service_role;

create or replace function public.enqueue_grievance_event_email()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.grievance_email_outbox (
    event_id,
    recipient_user_id,
    recipient_email
  )
  select
    new.event_id,
    user_row.account_identifier,
    lower(trim(user_row.email))
  from public.users as user_row
  where user_row.account_identifier = new.recipient_user_id
    and nullif(trim(user_row.email), '') is not null
  on conflict (event_id, recipient_user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.enqueue_grievance_event_email()
  from public, anon, authenticated;

drop trigger if exists grievance_event_recipient_email_outbox
  on public.grievance_event_recipients;
create trigger grievance_event_recipient_email_outbox
  after insert on public.grievance_event_recipients
  for each row execute function public.enqueue_grievance_event_email();

create or replace function public.claim_grievance_email_notifications(
  requested_batch_size integer default 25
)
returns table (
  notification_id uuid,
  recipient_email text,
  attempt_count integer,
  event_type text,
  actor_display_name text,
  grievance_code text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.grievance_email_outbox as outbox
  set status = 'failed',
      locked_at = null,
      last_error = coalesce(outbox.last_error, 'Delivery worker timed out after the final attempt.'),
      updated_at = now()
  where outbox.status = 'processing'
    and outbox.attempt_count >= 5
    and outbox.locked_at < now() - interval '10 minutes';

  return query
  with candidates as (
    select outbox.id
    from public.grievance_email_outbox as outbox
    where outbox.attempt_count < 5
      and (
        (outbox.status = 'pending' and outbox.available_at <= now())
        or (
          outbox.status = 'processing'
          and outbox.locked_at < now() - interval '10 minutes'
        )
      )
    order by outbox.available_at, outbox.created_at
    limit least(greatest(coalesce(requested_batch_size, 25), 1), 50)
    for update skip locked
  ),
  claimed as (
    update public.grievance_email_outbox as outbox
    set status = 'processing',
        attempt_count = outbox.attempt_count + 1,
        locked_at = now(),
        updated_at = now()
    from candidates
    where outbox.id = candidates.id
    returning
      outbox.id,
      outbox.event_id,
      outbox.recipient_email,
      outbox.attempt_count
  )
  select
    claimed.id,
    claimed.recipient_email,
    claimed.attempt_count,
    event.event_type,
    event.actor_display_name,
    grievance.grievance_code
  from claimed
  join public.grievance_events as event on event.id = claimed.event_id
  join public.grievances as grievance on grievance.id = event.grievance_id;
end;
$$;

revoke all on function public.claim_grievance_email_notifications(integer)
  from public, anon, authenticated;
grant execute on function public.claim_grievance_email_notifications(integer)
  to service_role;

create or replace function public.complete_grievance_email_notification(
  target_notification_id uuid,
  delivery_succeeded boolean,
  target_provider_message_id text default null,
  target_error text default null,
  should_retry boolean default false
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.grievance_email_outbox as outbox
  set status = case
        when delivery_succeeded then 'sent'
        when should_retry and outbox.attempt_count < 5 then 'pending'
        else 'failed'
      end,
      available_at = case
        when delivery_succeeded or not should_retry or outbox.attempt_count >= 5
          then outbox.available_at
        else now() + make_interval(mins => case outbox.attempt_count
          when 1 then 1
          when 2 then 5
          when 3 then 15
          else 60
        end)
      end,
      locked_at = null,
      sent_at = case when delivery_succeeded then now() else null end,
      provider_message_id = case
        when delivery_succeeded then left(target_provider_message_id, 255)
        else outbox.provider_message_id
      end,
      last_error = case
        when delivery_succeeded then null
        else left(coalesce(nullif(trim(target_error), ''), 'Email delivery failed.'), 1000)
      end,
      updated_at = now()
  where outbox.id = target_notification_id
    and outbox.status = 'processing';

  if not found then
    raise exception 'Notification is not currently claimed by a worker';
  end if;
end;
$$;

revoke all on function public.complete_grievance_email_notification(
  uuid, boolean, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.complete_grievance_email_notification(
  uuid, boolean, text, text, boolean
) to service_role;

create or replace function public.dispatch_grievance_email_notifications()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, vault, net
as $$
declare
  project_url text;
  publishable_key text;
  webhook_secret text;
begin
  select secret.decrypted_secret
  into project_url
  from vault.decrypted_secrets as secret
  where secret.name = 'grievance_email_function_url';

  select secret.decrypted_secret
  into publishable_key
  from vault.decrypted_secrets as secret
  where secret.name = 'grievance_email_publishable_key';

  select secret.decrypted_secret
  into webhook_secret
  from vault.decrypted_secrets as secret
  where secret.name = 'grievance_email_webhook_secret';

  if nullif(trim(project_url), '') is null
    or nullif(trim(publishable_key), '') is null
    or nullif(trim(webhook_secret), '') is null then
    return;
  end if;

  perform net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/grievance-email-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', publishable_key,
      'x-notification-secret', webhook_secret
    ),
    body := jsonb_build_object('source', 'scheduled-outbox-worker')
  );
end;
$$;

revoke all on function public.dispatch_grievance_email_notifications()
  from public, anon, authenticated;

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid
    from cron.job
    where jobname = 'grievance-email-notifications'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'grievance-email-notifications',
    '* * * * *',
    'select public.dispatch_grievance_email_notifications();'
  );
end;
$$;

commit;
