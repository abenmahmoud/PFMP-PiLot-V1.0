-- P2.6 - Class-level convention template assignments.
-- Additive migration: keeps existing document templates and documents intact.

alter table public.document_templates
  add column if not exists source_filename text;

alter table public.document_templates
  add column if not exists source_kind text not null default 'manual'
  check (source_kind in ('manual', 'docx_import', 'ai_generated', 'system'));

alter table public.document_templates
  add column if not exists ai_mapping jsonb not null default '{}'::jsonb;

alter table public.document_templates
  add column if not exists is_default boolean not null default false;

create table if not exists public.class_document_template_assignments (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  template_id uuid not null references public.document_templates(id) on delete restrict,
  type text not null default 'convention',
  active boolean not null default true,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_class_doc_tpl_assignments_establishment
  on public.class_document_template_assignments(establishment_id);

create index if not exists idx_class_doc_tpl_assignments_class
  on public.class_document_template_assignments(class_id)
  where active = true;

create unique index if not exists uq_active_class_doc_tpl_assignment
  on public.class_document_template_assignments(class_id, type)
  where active = true;

alter table public.class_document_template_assignments enable row level security;

drop policy if exists class_doc_tpl_assignments_select on public.class_document_template_assignments;
create policy class_doc_tpl_assignments_select
  on public.class_document_template_assignments
  for select
  using (
    public.is_superadmin()
    or establishment_id = public.current_establishment_id()
  );

drop policy if exists class_doc_tpl_assignments_mutate on public.class_document_template_assignments;
create policy class_doc_tpl_assignments_mutate
  on public.class_document_template_assignments
  for all
  using (
    public.is_superadmin()
    or (
      establishment_id = public.current_establishment_id()
      and public.is_establishment_admin()
    )
  )
  with check (
    public.is_superadmin()
    or (
      establishment_id = public.current_establishment_id()
      and public.is_establishment_admin()
    )
  );
