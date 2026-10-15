drop policy if exists "signed-in staff can find assignable users" on public.users;

create policy "signed-in staff can find assignable users"
on public.users
for select
to authenticated
using (
  public.exgrev_role() = 'examination cell'
  and lower(trim("Ex Factor")) in ('teaching staff', 'examination cell')
);
