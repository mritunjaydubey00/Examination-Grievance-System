create or replace function public.prevent_past_grievance_due_date()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.due_date is not null and new.due_date < current_date then
    raise exception 'Due date cannot be in the past';
  end if;

  return new;
end;
$$;

drop trigger if exists grievances_prevent_past_due_date on public.grievances;

create trigger grievances_prevent_past_due_date
before insert or update of due_date on public.grievances
for each row
execute function public.prevent_past_grievance_due_date();
