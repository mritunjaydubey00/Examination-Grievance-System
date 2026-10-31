begin;

create table if not exists public.portal_content (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('notice', 'guideline')),
  title text not null check (length(btrim(title)) between 3 and 180),
  body text not null check (length(btrim(body)) between 1 and 10000),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_content_published_type_created_idx
  on public.portal_content (content_type, created_at desc)
  where is_published = true;

create or replace function public.update_portal_content_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists portal_content_updated_at on public.portal_content;
create trigger portal_content_updated_at
  before update on public.portal_content
  for each row execute function public.update_portal_content_updated_at();

alter table public.portal_content enable row level security;

grant select, delete on public.portal_content to authenticated;
grant insert (content_type, title, body, is_published)
  on public.portal_content to authenticated;
grant update (title, body, is_published)
  on public.portal_content to authenticated;

drop policy if exists "portal users read published content" on public.portal_content;
create policy "portal users read published content"
  on public.portal_content for select to authenticated
  using (
    public.exgrev_role() in ('student', 'teaching staff', 'examination cell')
    and (is_published or public.exgrev_role() = 'examination cell')
  );

drop policy if exists "examination cell creates portal content" on public.portal_content;
create policy "examination cell creates portal content"
  on public.portal_content for insert to authenticated
  with check (public.exgrev_role() = 'examination cell');

drop policy if exists "examination cell updates portal content" on public.portal_content;
create policy "examination cell updates portal content"
  on public.portal_content for update to authenticated
  using (public.exgrev_role() = 'examination cell')
  with check (public.exgrev_role() = 'examination cell');

drop policy if exists "examination cell deletes portal content" on public.portal_content;
create policy "examination cell deletes portal content"
  on public.portal_content for delete to authenticated
  using (public.exgrev_role() = 'examination cell');

do $$ begin
  alter publication supabase_realtime add table public.portal_content;
exception when duplicate_object then null;
end $$;

commit;
