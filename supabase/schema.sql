-- =====================================================================
-- PFMP Pilot AI — Supabase schema
--
-- Multi-tenant SaaS dedicated to PFMP / vocational high-school internships.
-- Every business table carries an `establishment_id` and is protected by RLS.
--
-- Apply in Supabase SQL Editor or via `supabase db push` after wiring the CLI.
-- This is the foundation. Indexes and additional triggers can be added as the
-- product evolves.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------
create table if not exists establishments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  uai text,
  slug text not null,
  subdomain text,
  custom_domain text,
  domain_verified boolean not null default false,
  primary_color text,
  status text not null default 'active'
    check (status in ('active', 'trial', 'suspended', 'archived')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists establishments_slug_unique
  on establishments(slug);
create unique index if not exists establishments_subdomain_unique
  on establishments(subdomain) where subdomain is not null;
create unique index if not exists establishments_custom_domain_unique
  on establishments(custom_domain) where custom_domain is not null;

-- ---------------------------------------------------------------------
-- Profiles (linked 1:1 to auth.users)
-- ---------------------------------------------------------------------
create type user_role as enum (
  'superadmin',
  'admin',
  'ddfpt',
  'principal',
  'referent',
  'tuteur',
  'eleve'
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  establishment_id uuid references establishments(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  role user_role not null default 'eleve',
  avatar_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_roles (
  user_id uuid references profiles(id) on delete cascade,
  establishment_id uuid references establishments(id) on delete cascade,
  role user_role not null,
  primary key (user_id, establishment_id, role)
);

-- ---------------------------------------------------------------------
-- Domain entities
-- ---------------------------------------------------------------------
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  name text not null,
  level text not null, -- 'CAP' | 'Bac Pro' | 'BTS' | ...
  formation text not null,
  school_year text not null,
  principal_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  formation text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  name text not null,
  address text,
  city text,
  zip_code text,
  phone text,
  email text,
  sector text,
  reliability text default 'unknown',
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tutors (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  function text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pfmp_periods (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  name text not null,
  school_year text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'preparation', -- preparation | in_progress | completed | archived
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Many-to-many between periods and classes
create table if not exists pfmp_period_classes (
  period_id uuid references pfmp_periods(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  primary key (period_id, class_id)
);

create table if not exists placements (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  period_id uuid not null references pfmp_periods(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  tutor_id uuid references tutors(id) on delete set null,
  start_date date,
  end_date date,
  status text not null default 'no_stage',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  period_id uuid references pfmp_periods(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (teacher_id, student_id, period_id)
);

create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete set null,
  period_id uuid references pfmp_periods(id) on delete set null,
  date date not null,
  contact_type text not null, -- visit | call | video | email
  student_present boolean,
  tutor_met boolean,
  conditions text,
  activities text,
  professional_posture text,
  positives text,
  difficulties text,
  tutor_remark text,
  teacher_remark text,
  alert_level text default 'none',
  next_action text,
  status text not null default 'draft', -- draft | validated | archived
  validated_by uuid references profiles(id),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists visit_reports (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references visits(id) on delete cascade,
  body text not null,
  generated_by_ai boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  type text not null, -- convention | attestation | visit_report | evaluation | other
  student_id uuid references students(id) on delete set null,
  period_id uuid references pfmp_periods(id) on delete set null,
  company_id uuid references companies(id) on delete set null,
  name text not null,
  storage_path text,
  status text not null default 'missing', -- missing | draft | validated | archived
  author_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  type text not null,
  severity text not null, -- none | vigilance | problem | urgent
  message text not null,
  related_entity_type text,
  related_entity_id uuid,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists ai_interactions (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references establishments(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  assistant_type text not null, -- superadmin | establishment | teacher
  input_summary text,
  output_summary text,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references establishments(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists establishment_settings (
  establishment_id uuid primary key references establishments(id) on delete cascade,
  school_year text,
  teacher_load_threshold int default 6,
  ai_enabled boolean default true,
  rgpd_notice text,
  logo_url text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Helper functions for RLS
-- ---------------------------------------------------------------------
create or replace function current_profile()
returns profiles
language sql stable
as $$
  select * from profiles where id = auth.uid();
$$;

create or replace function is_superadmin()
returns boolean
language sql stable
as $$
  select coalesce((select role = 'superadmin' from profiles where id = auth.uid()), false);
$$;

create or replace function current_establishment_id()
returns uuid
language sql stable
as $$
  select establishment_id from profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table establishments enable row level security;
alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table classes enable row level security;
alter table students enable row level security;
alter table teachers enable row level security;
alter table companies enable row level security;
alter table tutors enable row level security;
alter table pfmp_periods enable row level security;
alter table pfmp_period_classes enable row level security;
alter table placements enable row level security;
alter table teacher_assignments enable row level security;
alter table visits enable row level security;
alter table visit_reports enable row level security;
alter table documents enable row level security;
alter table alerts enable row level security;
alter table ai_interactions enable row level security;
alter table audit_logs enable row level security;
alter table establishment_settings enable row level security;

-- Establishments — superadmin sees all, tenants see their own
create policy "establishments_read"
  on establishments for select
  using (is_superadmin() or id = current_establishment_id());

create policy "establishments_super_write"
  on establishments for all
  using (is_superadmin())
  with check (is_superadmin());

-- Profiles — users see profiles in their tenant, superadmin sees all
create policy "profiles_read"
  on profiles for select
  using (is_superadmin() or establishment_id = current_establishment_id() or id = auth.uid());

create policy "profiles_self_update"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Generic helper macro: tenant-scoped CRUD policy
-- (Postgres has no real macro; we emit similar policies per table.)

-- Tenant-scoped tables
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'classes', 'students', 'teachers', 'companies', 'tutors',
    'pfmp_periods', 'placements', 'teacher_assignments',
    'visits', 'documents', 'alerts', 'ai_interactions',
    'audit_logs', 'establishment_settings'
  ])
  loop
    execute format($p$
      create policy "%1$s_tenant_read" on %1$I for select
        using (is_superadmin() or establishment_id = current_establishment_id());
    $p$, t);
    execute format($p$
      create policy "%1$s_tenant_write" on %1$I for all
        using (is_superadmin() or establishment_id = current_establishment_id())
        with check (is_superadmin() or establishment_id = current_establishment_id());
    $p$, t);
  end loop;
end $$;

-- Teacher referent restriction: a referent only sees students assigned to them.
-- The base policy lets the whole tenant read; this overrides for `referent`.
-- For a stricter "referent sees only their students", create a more
-- restrictive view on top of `students` and grant accordingly.

-- pfmp_period_classes inherits tenant via period_id
create policy "pfmp_period_classes_read"
  on pfmp_period_classes for select
  using (
    is_superadmin()
    or exists (
      select 1 from pfmp_periods p
       where p.id = pfmp_period_classes.period_id
         and p.establishment_id = current_establishment_id()
    )
  );

-- visit_reports inherits tenant via visit_id
create policy "visit_reports_read"
  on visit_reports for select
  using (
    is_superadmin()
    or exists (
      select 1 from visits v
       where v.id = visit_reports.visit_id
         and v.establishment_id = current_establishment_id()
    )
  );

-- ---------------------------------------------------------------------
-- Useful indexes
-- ---------------------------------------------------------------------
create index if not exists idx_students_establishment on students(establishment_id);
create index if not exists idx_students_class on students(class_id);
create index if not exists idx_visits_establishment on visits(establishment_id);
create index if not exists idx_visits_student on visits(student_id);
create index if not exists idx_documents_establishment on documents(establishment_id);
create index if not exists idx_alerts_establishment on alerts(establishment_id);
create index if not exists idx_ai_interactions_establishment on ai_interactions(establishment_id);
create index if not exists idx_audit_logs_establishment on audit_logs(establishment_id);
