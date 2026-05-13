alter table public.students
  add column if not exists referent_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_students_referent_id
  on public.students(referent_id);

comment on column public.students.referent_id is
  'Primary PFMP referent profile for quick assignment workflows. Detailed history remains in teacher_assignments and placements.';
