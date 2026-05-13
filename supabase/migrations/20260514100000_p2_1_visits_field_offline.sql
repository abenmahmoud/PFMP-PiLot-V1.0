-- P2.1 - Field visits, offline reports and visit evaluations.
-- This migration is additive: the legacy visits table already exists and is
-- still used by older routes. Do not recreate it.

alter type visit_status add value if not exists 'planned';
alter type visit_status add value if not exists 'in_progress';
alter type visit_status add value if not exists 'completed';
alter type visit_status add value if not exists 'cancelled';
alter type visit_status add value if not exists 'no_show';

alter table public.visits
  add column if not exists placement_id uuid references public.placements(id) on delete cascade;

alter table public.visits
  add column if not exists referent_id uuid references public.profiles(id) on delete set null;

alter table public.visits
  add column if not exists type text not null default 'mi_parcours'
  check (type in ('mi_parcours', 'fin_stage', 'urgence', 'autre'));

alter table public.visits
  add column if not exists scheduled_at timestamptz;

alter table public.visits
  add column if not exists done_at timestamptz;

alter table public.visits
  add column if not exists duration_minutes integer;

alter table public.visits
  add column if not exists location_lat numeric(10, 7);

alter table public.visits
  add column if not exists location_lng numeric(10, 7);

alter table public.visits
  add column if not exists summary text;

alter table public.visits
  add column if not exists full_report text;

alter table public.visits
  add column if not exists voice_transcript text;

alter table public.visits
  add column if not exists student_satisfaction integer
  check (student_satisfaction is null or student_satisfaction between 1 and 5);

alter table public.visits
  add column if not exists tutor_satisfaction integer
  check (tutor_satisfaction is null or tutor_satisfaction between 1 and 5);

alter table public.visits
  add column if not exists flagged_for_review boolean not null default false;

alter table public.visits
  add column if not exists flag_reason text;

alter table public.visits
  add column if not exists photos jsonb not null default '[]'::jsonb;

alter table public.visits
  add column if not exists archived_at timestamptz;

create table if not exists public.visit_evaluations (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  competence_code text not null,
  competence_label text not null,
  level text not null check (level in ('non_evalue', 'A', 'B', 'C', 'NE')),
  notes text,
  evaluated_by_role text not null check (evaluated_by_role in ('referent', 'tutor', 'student')),
  created_at timestamptz not null default now()
);

create index if not exists idx_visits_placement on public.visits(placement_id);
create index if not exists idx_visits_referent on public.visits(referent_id);
create index if not exists idx_visits_scheduled on public.visits(scheduled_at);
create index if not exists idx_visits_archived on public.visits(archived_at)
  where archived_at is not null;

create index if not exists idx_visit_evaluations_visit
  on public.visit_evaluations(visit_id);

create index if not exists idx_visit_evaluations_competence
  on public.visit_evaluations(competence_code);

alter table public.visit_evaluations enable row level security;

drop policy if exists visit_evaluations_select on public.visit_evaluations;
create policy visit_evaluations_select on public.visit_evaluations for select
  using (
    exists (
      select 1
      from public.visits v
      where v.id = visit_evaluations.visit_id
        and (
          is_superadmin()
          or (
            v.establishment_id = current_establishment_id()
            and (can_read_all_students() or is_referent_of(v.student_id))
          )
        )
    )
  );

drop policy if exists visit_evaluations_insert on public.visit_evaluations;
create policy visit_evaluations_insert on public.visit_evaluations for insert
  with check (
    exists (
      select 1
      from public.visits v
      where v.id = visit_evaluations.visit_id
        and v.establishment_id = current_establishment_id()
        and (
          is_establishment_admin()
          or is_referent_of(v.student_id)
        )
    )
  );

drop policy if exists visit_evaluations_update on public.visit_evaluations;
create policy visit_evaluations_update on public.visit_evaluations for update
  using (
    exists (
      select 1
      from public.visits v
      where v.id = visit_evaluations.visit_id
        and v.establishment_id = current_establishment_id()
        and (
          is_establishment_admin()
          or is_referent_of(v.student_id)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.visits v
      where v.id = visit_evaluations.visit_id
        and v.establishment_id = current_establishment_id()
    )
  );

insert into storage.buckets (id, name, public)
values ('visit-photos', 'visit-photos', false)
on conflict (id) do nothing;

comment on column public.visits.placement_id is
  'P2.1 field visit link to a PFMP placement. Kept nullable for legacy visits.';

comment on column public.visits.referent_id is
  'Profile id of the referent responsible for the field visit.';

comment on column public.visits.photos is
  'Array of visit photo metadata: { url, lat, lng, taken_at, offline_id }.';
