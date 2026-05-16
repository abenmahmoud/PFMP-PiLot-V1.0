-- P2.7 - Document Intelligence PFMP.
-- Additive alignment for DOCX/PDF source files and reviewed field mapping.

alter table public.document_templates
  drop constraint if exists document_templates_source_kind_check;

alter table public.document_templates
  add constraint document_templates_source_kind_check
  check (
    source_kind in (
      'manual',
      'docx_import',
      'pdf_fillable',
      'pdf_flat',
      'pdf_scan',
      'ai_generated',
      'system'
    )
  );

alter table public.document_templates
  add column if not exists source_storage_path text;

alter table public.document_templates
  add column if not exists source_mime_type text;

alter table public.document_templates
  add column if not exists source_size_bytes bigint;

alter table public.document_templates
  add column if not exists analysis_status text not null default 'not_analyzed'
  check (analysis_status in ('not_analyzed', 'analyzed', 'needs_review', 'validated', 'failed'));

alter table public.document_templates
  add column if not exists analysis_notes text;

alter table public.document_templates
  add column if not exists field_count integer not null default 0;

alter table public.document_templates
  add column if not exists requires_human_review boolean not null default true;

create table if not exists public.document_template_fields (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references public.establishments(id) on delete cascade,
  template_id uuid not null references public.document_templates(id) on delete cascade,
  field_key text not null,
  label text not null,
  role text not null default 'school'
    check (role in ('student', 'parent', 'school', 'company', 'tutor', 'period', 'placement', 'signature', 'free')),
  value_path text,
  required boolean not null default false,
  source text not null default 'ai'
    check (source in ('ai', 'heuristic', 'manual', 'system')),
  page_number integer,
  x numeric,
  y numeric,
  width numeric,
  height numeric,
  confidence numeric(4,3),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'accepted', 'rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, field_key)
);

create index if not exists idx_document_template_fields_establishment
  on public.document_template_fields(establishment_id);

create index if not exists idx_document_template_fields_template
  on public.document_template_fields(template_id);

create index if not exists idx_document_template_fields_review
  on public.document_template_fields(template_id, review_status);

alter table public.document_template_fields enable row level security;

drop policy if exists document_template_fields_select on public.document_template_fields;
create policy document_template_fields_select
  on public.document_template_fields
  for select
  using (
    public.is_superadmin()
    or establishment_id is null
    or establishment_id = public.current_establishment_id()
  );

drop policy if exists document_template_fields_mutate on public.document_template_fields;
create policy document_template_fields_mutate
  on public.document_template_fields
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
