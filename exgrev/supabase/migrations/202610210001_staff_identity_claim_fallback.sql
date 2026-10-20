create or replace function public.exgrev_user_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'user_id', ''),
    case
      when lower(trim(coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '')))
        in ('teaching staff', 'examination cell')
      then lower(trim(auth.jwt() ->> 'email'))
    end
  )
$$;
