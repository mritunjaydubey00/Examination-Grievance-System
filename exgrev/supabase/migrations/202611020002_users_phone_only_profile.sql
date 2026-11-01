begin;

revoke update on public.users from public, anon, authenticated;
revoke update ("Full Name", "Department", "Branch")
  on public.users from public, anon, authenticated;
grant update ("Phone Number") on public.users to authenticated;

commit;
