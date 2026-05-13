-- P1.9 - Align existing PFMP periods and placements for operational workflows.
-- Tables already exist from 0001_init.sql. This migration is additive and safe
-- for production tenants.

alter type period_status add value if not exists 'draft';
alter type period_status add value if not exists 'published';
alter type period_status add value if not exists 'cancelled';

alter type stage_status add value if not exists 'draft';
alter type stage_status add value if not exists 'confirmed';
alter type stage_status add value if not exists 'cancelled';

alter table public.pfmp_periods
  add column if not exists class_id uuid references public.classes(id) on delete set null;

alter table public.pfmp_periods
  add column if not exists type text not null default 'pfmp_1';

alter table public.pfmp_periods
  add column if not exists notes text;

alter table public.pfmp_periods
  add column if not exists archived_at timestamptz;

alter table public.placements
  add column if not exists notes text;

alter table public.placements
  add column if not exists archived_at timestamptz;

create index if not exists idx_pfmp_periods_establishment
  on public.pfmp_periods(establishment_id);

create index if not exists idx_pfmp_periods_class
  on public.pfmp_periods(class_id);

create index if not exists idx_pfmp_periods_archived
  on public.pfmp_periods(archived_at)
  where archived_at is not null;

create index if not exists idx_placements_establishment
  on public.placements(establishment_id);

create index if not exists idx_placements_period
  on public.placements(period_id);

create index if not exists idx_placements_student
  on public.placements(student_id);

create index if not exists idx_placements_company
  on public.placements(company_id);

create index if not exists idx_placements_archived
  on public.placements(archived_at)
  where archived_at is not null;

comment on column public.pfmp_periods.class_id is
  'Primary class for this PFMP period. Kept in sync with pfmp_period_classes for backward compatibility.';

comment on column public.pfmp_periods.type is
  'PFMP period type: pfmp_1, pfmp_2, pfmp_3, stage_decouverte, autre.';

comment on column public.placements.archived_at is
  'Soft-delete timestamp. NULL = active, NOT NULL = archived.';
