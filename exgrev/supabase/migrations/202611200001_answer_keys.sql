begin;

create table if not exists public.answer_keys (
  id uuid primary key default gen_random_uuid(),
  subject_code text not null check (length(trim(subject_code)) between 1 and 50),
  subject_name text not null check (length(trim(subject_name)) between 1 and 200),
  admission_year smallint not null check (admission_year between 2000 and 2100),
  branch_code text not null check (length(trim(branch_code)) between 1 and 20),
  branch_name text not null,
  department text,
  semester text not null check (length(trim(semester)) between 1 and 30),
  title text not null check (length(trim(title)) between 1 and 200),
  drive_url text not null,
  is_published boolean not null default false,
  uploaded_by text not null references public.users(account_identifier),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_code, admission_year, branch_code, semester)
);

create index if not exists answer_keys_student_lookup_idx
  on public.answer_keys(admission_year, branch_code, is_published);

alter table public.answer_keys enable row level security;

drop policy if exists "students read matching published answer keys" on public.answer_keys;
create policy "students read matching published answer keys"
  on public.answer_keys for select to authenticated
  using (
    is_published
    and public.exgrev_role() = 'student'
    and exists (
      select 1
      from public.users student
      where student.account_identifier = public.exgrev_user_id()
        and student."Ex Factor" = 'Student'
        and length(coalesce(student."User ID", student.account_identifier)) >= 6
        and substr(coalesce(student."User ID", student.account_identifier), 5, 2) ~ '^[0-9]{2}$'
        and answer_keys.branch_code =
          upper(substr(coalesce(student."User ID", student.account_identifier), 3, 2))
        and answer_keys.admission_year =
          2000 + greatest(0, least(99, (substr(
            coalesce(student."User ID", student.account_identifier), 5, 2
          ))::int))
    )
  );

drop policy if exists "staff read all answer keys" on public.answer_keys;
create policy "staff read all answer keys"
  on public.answer_keys for select to authenticated
  using (public.exgrev_role() in ('examination cell', 'teaching staff'));

drop policy if exists "staff insert answer keys" on public.answer_keys;
create policy "staff insert answer keys"
  on public.answer_keys for insert to authenticated
  with check (
    public.exgrev_role() in ('examination cell', 'teaching staff')
    and uploaded_by = public.exgrev_user_id()
  );

drop policy if exists "examination cell update answer keys" on public.answer_keys;
create policy "examination cell update answer keys"
  on public.answer_keys for update to authenticated
  using (public.exgrev_role() = 'examination cell')
  with check (public.exgrev_role() = 'examination cell');

drop policy if exists "teachers update own answer keys" on public.answer_keys;
create policy "teachers update own answer keys"
  on public.answer_keys for update to authenticated
  using (
    public.exgrev_role() = 'teaching staff'
    and uploaded_by = public.exgrev_user_id()
  )
  with check (
    public.exgrev_role() = 'teaching staff'
    and uploaded_by = public.exgrev_user_id()
  );

grant select on public.answer_keys to authenticated;
grant insert, update on public.answer_keys to authenticated;

commit;
