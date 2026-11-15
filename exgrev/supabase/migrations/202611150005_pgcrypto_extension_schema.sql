begin;

create or replace function public.gen_random_bytes(p_length integer)
returns bytea
language sql
volatile
security definer
set search_path = pg_catalog, extensions
as $$
  select extensions.gen_random_bytes(p_length);
$$;

create or replace function public.hmac(
  p_data bytea,
  p_key bytea,
  p_type text
)
returns bytea
language sql
immutable
security definer
set search_path = pg_catalog, extensions
as $$
  select extensions.hmac(p_data, p_key, p_type);
$$;

revoke all on function public.gen_random_bytes(integer)
  from public, anon, authenticated;
revoke all on function public.hmac(bytea, bytea, text)
  from public, anon, authenticated;

commit;
