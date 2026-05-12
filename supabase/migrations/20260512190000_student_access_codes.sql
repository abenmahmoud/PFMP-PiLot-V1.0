-- P1.4 - Codes d'acces eleves par classe
-- Les codes en clair ne sont jamais stockes. Seul le hash est persiste.

create table if not exists public.student_access_codes (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  code_hash text not null,
  code_hint text not null,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz null,
  last_used_at timestamptz null,
  created_by uuid null references public.profiles(id) on delete set null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_access_codes_establishment
  on public.student_access_codes(establishment_id);

create index if not exists idx_student_access_codes_student
  on public.student_access_codes(student_id);

create index if not exists idx_student_access_codes_status
  on public.student_access_codes(status);

create unique index if not exists idx_student_access_codes_one_active
  on public.student_access_codes(student_id)
  where status = 'active';

create unique index if not exists idx_student_access_codes_active_hash
  on public.student_access_codes(code_hash)
  where status = 'active';

comment on table public.student_access_codes is
  'Codes personnels eleves pour acces sans email. Le code clair est affiche uniquement a la generation.';

comment on column public.student_access_codes.code_hash is
  'Hash SHA-256 du code eleve. Le code clair ne doit jamais etre stocke.';

comment on column public.student_access_codes.code_hint is
  'Indice non sensible affiche dans l UI, par exemple les 4 derniers caracteres.';

alter table public.student_access_codes enable row level security;

drop policy if exists student_access_codes_select on public.student_access_codes;
create policy student_access_codes_select on public.student_access_codes for select
  using (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and (
        current_role_app() in ('admin', 'ddfpt')
        or exists (
          select 1
          from public.students s
          join public.classes c on c.id = s.class_id
          where s.id = student_access_codes.student_id
            and c.principal_id = auth.uid()
        )
      )
    )
  );

drop policy if exists student_access_codes_insert on public.student_access_codes;
create policy student_access_codes_insert on public.student_access_codes for insert
  with check (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and (
        current_role_app() in ('admin', 'ddfpt')
        or exists (
          select 1
          from public.students s
          join public.classes c on c.id = s.class_id
          where s.id = student_access_codes.student_id
            and c.principal_id = auth.uid()
        )
      )
    )
  );

drop policy if exists student_access_codes_update on public.student_access_codes;
create policy student_access_codes_update on public.student_access_codes for update
  using (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and (
        current_role_app() in ('admin', 'ddfpt')
        or exists (
          select 1
          from public.students s
          join public.classes c on c.id = s.class_id
          where s.id = student_access_codes.student_id
            and c.principal_id = auth.uid()
        )
      )
    )
  )
  with check (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and (
        current_role_app() in ('admin', 'ddfpt')
        or exists (
          select 1
          from public.students s
          join public.classes c on c.id = s.class_id
          where s.id = student_access_codes.student_id
            and c.principal_id = auth.uid()
        )
      )
    )
  );

drop policy if exists student_access_codes_delete on public.student_access_codes;
create policy student_access_codes_delete on public.student_access_codes for delete
  using (is_superadmin());
