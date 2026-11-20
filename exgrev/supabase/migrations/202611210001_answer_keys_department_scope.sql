begin;

drop policy if exists "staff read all answer keys" on public.answer_keys;
drop policy if exists "staff read answer keys in own department" on public.answer_keys;
create policy "staff read answer keys in own department"
  on public.answer_keys for select to authenticated
  using (
    public.exgrev_role() = 'examination cell'
    or (
      public.exgrev_role() = 'teaching staff'
      and exists (
        select 1
        from public.users as teacher
        where teacher.account_identifier = public.exgrev_user_id()
          and lower(trim(coalesce(teacher."Ex Factor", '')))
            in ('teaching staff', 'teaching', 'faculty')
          and nullif(trim(teacher."Department"), '') is not null
          and lower(trim(teacher."Department")) =
            lower(trim(answer_keys.department))
      )
    )
  );

drop policy if exists "staff insert answer keys" on public.answer_keys;
drop policy if exists "staff insert answer keys in own department" on public.answer_keys;
create policy "staff insert answer keys in own department"
  on public.answer_keys for insert to authenticated
  with check (
    uploaded_by = public.exgrev_user_id()
    and (
      public.exgrev_role() = 'examination cell'
      or (
        public.exgrev_role() = 'teaching staff'
        and exists (
          select 1
          from public.users as teacher
          where teacher.account_identifier = public.exgrev_user_id()
            and lower(trim(coalesce(teacher."Ex Factor", '')))
              in ('teaching staff', 'teaching', 'faculty')
            and nullif(trim(teacher."Department"), '') is not null
            and lower(trim(teacher."Department")) =
              lower(trim(answer_keys.department))
        )
      )
    )
  );

drop policy if exists "teachers update own answer keys" on public.answer_keys;
drop policy if exists "teachers update own answer keys in own department" on public.answer_keys;
create policy "teachers update own answer keys in own department"
  on public.answer_keys for update to authenticated
  using (
    public.exgrev_role() = 'teaching staff'
    and uploaded_by = public.exgrev_user_id()
    and exists (
      select 1
      from public.users as teacher
      where teacher.account_identifier = public.exgrev_user_id()
        and lower(trim(coalesce(teacher."Ex Factor", '')))
          in ('teaching staff', 'teaching', 'faculty')
        and nullif(trim(teacher."Department"), '') is not null
        and lower(trim(teacher."Department")) =
          lower(trim(answer_keys.department))
    )
  )
  with check (
    public.exgrev_role() = 'teaching staff'
    and uploaded_by = public.exgrev_user_id()
    and exists (
      select 1
      from public.users as teacher
      where teacher.account_identifier = public.exgrev_user_id()
        and lower(trim(coalesce(teacher."Ex Factor", '')))
          in ('teaching staff', 'teaching', 'faculty')
        and nullif(trim(teacher."Department"), '') is not null
        and lower(trim(teacher."Department")) =
          lower(trim(answer_keys.department))
    )
  );

commit;
