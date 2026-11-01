begin;

drop policy if exists "users read own profile" on public.users;
create policy "users read own profile"
  on public.users for select to authenticated
  using (account_identifier = public.exgrev_user_id());

drop policy if exists "users update own profile" on public.users;
create policy "users update own profile"
  on public.users for update to authenticated
  using (account_identifier = public.exgrev_user_id())
  with check (account_identifier = public.exgrev_user_id());

revoke update on public.users from public, anon, authenticated;
grant update ("Full Name", "Department", "Branch", "Phone Number")
  on public.users to authenticated;

commit;
