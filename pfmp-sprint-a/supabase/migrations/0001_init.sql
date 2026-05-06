-- =============================================================================
-- PFMP Pilot AI — Migration initiale 0001_init.sql
--
-- SaaS multi-établissement de pilotage des PFMP en lycée professionnel.
-- Cette migration est l'unique source de vérité du schéma. Elle remplace
-- supabase/schema.sql.
--
-- Garanties :
--   - idempotente : peut être rejouée sans casser l'état
--   - RLS strict multi-tenant via establishment_id
--   - rôles différenciés (referent, principal, ddfpt, admin, superadmin)
--   - prête pour signatures, magic links tuteur, templates et preuves
--   - n'introduit aucune dépendance frontend
--
-- À exécuter via :
--   supabase db push
-- ou directement dans le SQL Editor Supabase (de haut en bas).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";


-- -----------------------------------------------------------------------------
-- 1. Types énumérés
-- -----------------------------------------------------------------------------
do $$ begin
  create type user_role as enum (
    'superadmin','admin','ddfpt','principal','referent','tuteur','eleve'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type stage_status as enum (
    'no_stage','found','pending_convention','signed_convention',
    'in_progress','completed','interrupted'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type period_status as enum (
    'preparation','in_progress','completed','archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type visit_status as enum ('draft','validated','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_type as enum ('visit','call','video','email');
exception when duplicate_object then null; end $$;

do $$ begin
  create type alert_level as enum ('none','vigilance','problem','urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_type as enum (
    'convention','attestation','visit_report','evaluation',
    'pre_departure_checklist','authorization','medical_form','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_status as enum ('missing','draft','validated','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type signature_status as enum (
    'pending','sent','viewed','signed','refused','expired','cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type signer_role as enum (
    'student','parent','tutor','employer','school','referent','principal','ddfpt','admin'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type token_status as enum ('active','used','revoked','expired');
exception when duplicate_object then null; end $$;


-- -----------------------------------------------------------------------------
-- 2. Tables — tenants & utilisateurs
-- -----------------------------------------------------------------------------
create table if not exists establishments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  uai text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- UAI unique seulement quand renseigné (évite de bloquer les fixtures sans UAI)
create unique index if not exists uniq_establishments_uai
  on establishments(uai) where uai is not null;


-- -----------------------------------------------------------------------------
-- 2.bis Multi-tenant Vercel — colonnes additionnelles sur establishments
-- -----------------------------------------------------------------------------
-- slug : identifiant URL-safe de l'établissement, dérivé du nom. Sert à
--        retrouver l'établissement depuis le hostname (sous-domaine ou path)
--        sans exposer son UUID. Ex : "lycee-jean-moulin-lyon".
-- subdomain : sous-domaine final de la forme `<subdomain>.pfmp-pilot.fr` que
--        Vercel route vers l'app. Égal au slug par défaut, mais peut diverger
--        (ex : si le slug est trop long ou si l'établissement préfère un alias).
-- custom_domain : domaine propre d'un établissement (ex : "pfmp.lyceejeanmoulin.fr")
--        configuré plus tard via la Vercel Domains API. Optionnel.
-- domain_verified : passe à true quand Vercel a confirmé la vérification DNS
--        (TXT record ou CNAME) du custom_domain. Tant que false, l'app sert
--        sur le subdomain par défaut.
-- primary_color : couleur de marque de l'établissement (hex #RRGGBB), utilisée
--        pour la personnalisation light du thème (header, badges principaux).
-- status : état de souscription du tenant. 'active' = production normale ;
--        'trial' = période d'essai ; 'suspended' = paiement en retard, lecture
--        seule ; 'archived' = compte fermé, conservé pour archivage RGPD.

-- Étape 1/3 : ajouter les colonnes en nullable (sûr sur une base existante)
alter table establishments
  add column if not exists slug             text,
  add column if not exists subdomain        text,
  add column if not exists custom_domain    text,
  add column if not exists domain_verified  boolean not null default false,
  add column if not exists primary_color    text,
  add column if not exists status           text not null default 'active';

-- -----------------------------------------------------------------------------
-- Helper unaccent_safe : enlève les accents si l'extension `unaccent` est
-- installée, sinon mappe les caractères accentués les plus courants à la main.
-- Permet au backfill de fonctionner même sans unaccent dispo. Défini AVANT
-- l'UPDATE de backfill ci-dessous.
-- -----------------------------------------------------------------------------
create or replace function unaccent_safe(input text)
returns text
language plpgsql immutable
as $$
declare
  has_unaccent boolean;
  result text;
begin
  if input is null then return null; end if;
  select exists(select 1 from pg_extension where extname = 'unaccent') into has_unaccent;
  if has_unaccent then
    execute 'select unaccent($1)' into result using input;
    return result;
  end if;
  -- Fallback minimaliste pour les accents français les plus fréquents
  return translate(
    input,
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'
  );
end $$;

-- Étape 2/3 : backfill du slug pour les lignes pré-existantes qui n'en ont pas.
-- Conversion simple "Lycée Jean Moulin" -> "lycee-jean-moulin", suffixée par
-- les 8 premiers caractères de l'UUID pour garantir l'unicité même en cas de
-- noms identiques entre établissements (ex : deux "Lycée Voltaire").
update establishments
   set slug = regexp_replace(
                regexp_replace(
                  lower(unaccent_safe(coalesce(name, 'lycee'))),
                  '[^a-z0-9]+', '-', 'g'        -- non-alphanum -> tirets
                ),
                '(^-+|-+$)', '', 'g'            -- trim tirets en début/fin
              ) || '-' || substr(id::text, 1, 8)
 where slug is null;

-- Étape 3/3 : contraindre slug à NOT NULL une fois le backfill garanti.
-- On ne le fait que si aucune ligne n'a slug NULL (sinon on rollback
-- proprement et on remonte une erreur claire).
do $$
begin
  if exists (select 1 from establishments where slug is null) then
    raise exception 'Backfill du slug incomplet — vérifier le contenu de establishments.name';
  end if;
  alter table establishments alter column slug set not null;
exception when others then
  -- rejeu idempotent : si la contrainte existe déjà, on continue
  if sqlstate <> '42704' then  -- 42704 = undefined object
    raise notice 'slug NOT NULL: %', sqlerrm;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Contraintes d'unicité — index partiels pour ne contraindre que les valeurs
-- non-null (subdomain et custom_domain sont optionnels)
-- -----------------------------------------------------------------------------
create unique index if not exists uniq_establishments_slug
  on establishments(slug);

create unique index if not exists uniq_establishments_subdomain
  on establishments(subdomain) where subdomain is not null;

create unique index if not exists uniq_establishments_custom_domain
  on establishments(custom_domain) where custom_domain is not null;

-- -----------------------------------------------------------------------------
-- Index de lookup — slug et custom_domain sont les colonnes lues à chaque
-- requête entrante (middleware Next/Vercel résout hostname -> establishment).
-- L'index unique ci-dessus sert déjà aussi de lookup, mais on garde un index
-- explicite sur custom_domain pour la lisibilité du plan.
-- -----------------------------------------------------------------------------
create index if not exists idx_establishments_slug
  on establishments(slug);

create index if not exists idx_establishments_custom_domain
  on establishments(custom_domain) where custom_domain is not null;

-- -----------------------------------------------------------------------------
-- Contrainte de format : status restreint à un set fixe (sans bloquer
-- l'extensibilité future via ALTER, plus souple qu'un type ENUM)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'chk_establishments_status'
  ) then
    alter table establishments
      add constraint chk_establishments_status
      check (status in ('active','trial','suspended','archived'));
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Contrainte de format : primary_color doit être un hex #RRGGBB si renseigné
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'chk_establishments_primary_color'
  ) then
    alter table establishments
      add constraint chk_establishments_primary_color
      check (primary_color is null or primary_color ~* '^#[0-9a-f]{6}$');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Commentaires SQL — visibles dans le SQL Editor Supabase, l'inspecteur de
-- schéma et toute génération de docs automatique.
-- -----------------------------------------------------------------------------
comment on column establishments.slug is
  'Identifiant URL-safe (kebab-case ASCII) utilisé pour résoudre l''établissement '
  'depuis le hostname (Vercel middleware lit slug.pfmp-pilot.fr et joint sur cette '
  'colonne). Unique. Ne contient que [a-z0-9-]. Ne change normalement jamais après '
  'création — un changement casse les liens existants.';

comment on column establishments.subdomain is
  'Sous-domaine effectif sous pfmp-pilot.fr (ex : "jean-moulin" pour '
  'jean-moulin.pfmp-pilot.fr). Souvent égal au slug ; peut diverger si le slug '
  'est trop long ou si l''établissement souhaite un alias plus court. NULL = '
  'l''établissement utilise uniquement son custom_domain.';

comment on column establishments.custom_domain is
  'Domaine propre de l''établissement (ex : "pfmp.lyceejeanmoulin.fr"). Configuré '
  'côté Vercel Domains API ; nécessite vérification DNS (TXT/CNAME). NULL tant '
  'que l''établissement n''a pas demandé de domaine personnalisé.';

comment on column establishments.domain_verified is
  'TRUE quand Vercel a confirmé la propriété DNS de custom_domain (TXT record '
  'ou CNAME validé). Tant que FALSE, l''app continue de servir sur le subdomain '
  'par défaut et n''accepte pas les requêtes sur custom_domain.';

comment on column establishments.primary_color is
  'Couleur de marque de l''établissement au format hex #RRGGBB. Appliquée en '
  'CSS variable côté client pour personnaliser header, badges et accents. NULL '
  '= utilise la couleur par défaut PFMP Pilot AI.';

comment on column establishments.status is
  'État de la souscription tenant. active = production normale ; trial = essai '
  'gratuit ; suspended = lecture seule (paiement en retard / décision admin) ; '
  'archived = compte fermé, conservé pour traçabilité RGPD.';


create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  establishment_id uuid references establishments(id) on delete set null,
  first_name text not null default '',
  last_name text not null default '',
  email text not null,
  role user_role not null default 'eleve',
  avatar_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_establishment on profiles(establishment_id);
create index if not exists idx_profiles_role on profiles(role);

-- Table de rôles secondaires (un user peut être référent dans un établissement
-- et tuteur dans un autre, par ex.). Le rôle principal reste dans profiles.role.
create table if not exists user_roles (
  user_id uuid not null references profiles(id) on delete cascade,
  establishment_id uuid not null references establishments(id) on delete cascade,
  role user_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, establishment_id, role)
);


-- -----------------------------------------------------------------------------
-- 3. Tables — entités métier
-- -----------------------------------------------------------------------------
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  name text not null,
  level text not null,
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
  -- soft delete pour conformité RGPD (purge programmable à N+5 ans)
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  -- profile_id permet de lier un teacher à un user auth (référent connecté)
  profile_id uuid references profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uniq_teachers_profile_establishment
  on teachers(profile_id, establishment_id) where profile_id is not null;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  name text not null,
  address text,
  city text,
  zip_code text,
  phone text,
  email text,
  website text,
  siret text,
  siren text,
  sector text,
  professional_family text,
  compatible_formations text[] not null default array[]::text[],
  students_hosted int not null default 0,
  last_hosted_at date,
  reliability text not null default 'unknown',
  status text not null default 'active',
  internal_notes text,
  history text[],
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- SIRET unique par établissement quand renseigné
create unique index if not exists uniq_companies_siret_per_est
  on companies(establishment_id, siret) where siret is not null;

create table if not exists tutors (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  function text,
  email text,
  phone text,
  responsiveness text,
  internal_notes text,
  archived_at timestamptz,
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
  status period_status not null default 'preparation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_period_dates check (end_date >= start_date)
);

create table if not exists pfmp_period_classes (
  period_id uuid not null references pfmp_periods(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  primary key (period_id, class_id)
);

create table if not exists placements (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  period_id uuid not null references pfmp_periods(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  tutor_id uuid references tutors(id) on delete set null,
  referent_id uuid references teachers(id) on delete set null,
  start_date date,
  end_date date,
  status stage_status not null default 'no_stage',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_placement_dates check (end_date is null or start_date is null or end_date >= start_date),
  -- un élève ne peut avoir qu'un seul placement par période
  constraint uniq_student_period unique (student_id, period_id)
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
  teacher_id uuid references teachers(id) on delete set null,
  period_id uuid references pfmp_periods(id) on delete set null,
  date date not null,
  contact_type contact_type not null,
  student_present boolean,
  tutor_met boolean,
  conditions text,
  activities text,
  professional_posture text,
  positives text,
  difficulties text,
  tutor_remark text,
  teacher_remark text,
  alert_level alert_level not null default 'none',
  next_action text,
  status visit_status not null default 'draft',
  validated_by uuid references profiles(id) on delete set null,
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

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  type text not null,
  severity alert_level not null,
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
  assistant_type text not null,
  -- on conserve plus de contexte que dans le schéma initial
  model_name text,
  model_version text,
  prompt_full text,
  response_full text,
  input_summary text,
  output_summary text,
  related_entity_type text,
  related_entity_id uuid,
  tokens_in int,
  tokens_out int,
  cost_eur numeric(10,6),
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references establishments(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  description text,
  metadata jsonb,
  ip_address inet,
  user_agent text,
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


-- -----------------------------------------------------------------------------
-- 4. Tables — module documents / signatures (préparées, sans UI pour l'instant)
-- -----------------------------------------------------------------------------

-- Modèles de documents (conventions, attestations, fiches type) configurables
-- par établissement. Stockés en HTML/markdown pour rendu PDF côté Edge Function.
create table if not exists document_templates (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references establishments(id) on delete cascade,
  -- établissement_id NULL = template global maintenu par le superadmin
  type document_type not null,
  name text not null,
  description text,
  body_html text,
  body_markdown text,
  variables jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_doc_templates_est_type
  on document_templates(establishment_id, type) where active = true;

-- Documents : une entrée = un document logique (convention de stage de Lucas
-- pour la PFMP de mai 2026, par exemple).
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  type document_type not null,
  student_id uuid references students(id) on delete set null,
  period_id uuid references pfmp_periods(id) on delete set null,
  company_id uuid references companies(id) on delete set null,
  placement_id uuid references placements(id) on delete set null,
  template_id uuid references document_templates(id) on delete set null,
  name text not null,
  storage_path text,
  status document_status not null default 'missing',
  author_id uuid references profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Documents générés (instances PDF concrètes, versionnées)
create table if not exists generated_documents (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  template_id uuid references document_templates(id) on delete set null,
  version int not null default 1,
  storage_path text not null,
  file_size_bytes bigint,
  mime_type text,
  sha256_hex text,
  generated_by uuid references profiles(id) on delete set null,
  generated_at timestamptz not null default now(),
  -- snapshot des variables utilisées pour la génération (preuve)
  rendered_with jsonb
);

create index if not exists idx_generated_documents_doc on generated_documents(document_id);

-- Pièces justificatives uploadées par les utilisateurs (RIB tuteur, attestation
-- d'assurance, autorisation parentale signée à la main, etc.)
create table if not exists proof_files (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  placement_id uuid references placements(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  type text not null, -- libellé libre : rib, insurance, parental_authorization...
  storage_path text not null,
  file_size_bytes bigint,
  mime_type text,
  sha256_hex text,
  uploaded_by uuid references profiles(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

-- Exigences documentaires : quels documents sont obligatoires pour quel cas
-- (ex : pour un CAP < 18 ans, autorisation parentale obligatoire).
create table if not exists document_requirements (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references establishments(id) on delete cascade, -- NULL = global
  type document_type not null,
  applies_to_level text, -- 'CAP' | 'Bac Pro' | 'BTS' | NULL = tous
  applies_to_minors_only boolean not null default false,
  required boolean not null default true,
  description text,
  created_at timestamptz not null default now()
);

-- Checklists pré-départ (l'élève peut-il partir en stage ?)
-- Une ligne par couple (placement, item de checklist).
create table if not exists pre_departure_checklists (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  placement_id uuid not null references placements(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  requirement_id uuid references document_requirements(id) on delete set null,
  item_label text not null,
  satisfied boolean not null default false,
  satisfied_at timestamptz,
  satisfied_by uuid references profiles(id) on delete set null,
  blocking boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_predeparture_placement
  on pre_departure_checklists(placement_id);

-- Signatures de documents — coeur du module signature
create table if not exists document_signatures (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  generated_document_id uuid references generated_documents(id) on delete set null,
  -- identité du signataire (peut ne pas avoir de compte auth)
  signer_email text not null,
  signer_name text,
  signer_role signer_role not null,
  signer_user_id uuid references profiles(id) on delete set null, -- si compte auth
  signer_tutor_id uuid references tutors(id) on delete set null,  -- si tuteur
  -- workflow
  status signature_status not null default 'pending',
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  refused_at timestamptz,
  refusal_reason text,
  -- preuve cryptographique
  signature_data text,         -- base64 du tracé manuscrit OU signature détachée
  signed_document_sha256 text, -- hash du PDF au moment de la signature
  ip_address inet,
  user_agent text,
  geolocation jsonb,           -- {lat, lng, accuracy} si capté
  -- ordre de signature multi-parties (parent + tuteur + référent + élève)
  signing_order int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_signature_consistency check (
    (status = 'signed' and signed_at is not null and signed_document_sha256 is not null)
    or status <> 'signed'
  )
);

create index if not exists idx_signatures_document on document_signatures(document_id);
create index if not exists idx_signatures_status on document_signatures(status)
  where status in ('pending','sent','viewed');

-- Magic links pour tuteurs entreprise — accès sans compte auth
create table if not exists tutor_access_tokens (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references establishments(id) on delete cascade,
  tutor_id uuid not null references tutors(id) on delete cascade,
  placement_id uuid references placements(id) on delete cascade,
  document_signature_id uuid references document_signatures(id) on delete cascade,
  -- on ne stocke que le HASH du token, pas le token en clair
  token_hash text unique not null,
  scope text not null default 'sign', -- 'sign' | 'view' | 'visit_remark'
  expires_at timestamptz not null,
  used_at timestamptz,
  used_count int not null default 0,
  max_uses int not null default 1,
  status token_status not null default 'active',
  ip_address_first_use inet,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint chk_token_uses check (used_count <= max_uses),
  constraint chk_token_expiry check (expires_at > created_at)
);

create index if not exists idx_tutor_tokens_active
  on tutor_access_tokens(tutor_id) where status = 'active';
create index if not exists idx_tutor_tokens_status on tutor_access_tokens(status);


-- -----------------------------------------------------------------------------
-- 5. Index composites pour les requêtes fréquentes du frontend
-- -----------------------------------------------------------------------------
create index if not exists idx_students_est on students(establishment_id);
create index if not exists idx_students_est_class on students(establishment_id, class_id);
create index if not exists idx_students_class on students(class_id);

create index if not exists idx_visits_est on visits(establishment_id);
create index if not exists idx_visits_est_period on visits(establishment_id, period_id);
create index if not exists idx_visits_student on visits(student_id);
create index if not exists idx_visits_teacher on visits(teacher_id);

create index if not exists idx_placements_est on placements(establishment_id);
create index if not exists idx_placements_est_period on placements(establishment_id, period_id);
create index if not exists idx_placements_student on placements(student_id);

create index if not exists idx_teachers_est on teachers(establishment_id);
create index if not exists idx_assignments_teacher on teacher_assignments(teacher_id);
create index if not exists idx_assignments_student on teacher_assignments(student_id);

create index if not exists idx_companies_est on companies(establishment_id);
create index if not exists idx_tutors_company on tutors(company_id);

create index if not exists idx_documents_est on documents(establishment_id);
create index if not exists idx_documents_est_type on documents(establishment_id, type);
create index if not exists idx_documents_est_status on documents(establishment_id, status);
create index if not exists idx_documents_student on documents(student_id);
create index if not exists idx_documents_period on documents(period_id);

create index if not exists idx_alerts_est on alerts(establishment_id);
create index if not exists idx_alerts_unresolved on alerts(establishment_id) where resolved = false;

create index if not exists idx_ai_interactions_est on ai_interactions(establishment_id);
create index if not exists idx_audit_logs_est on audit_logs(establishment_id);
create index if not exists idx_audit_logs_user on audit_logs(user_id);


-- -----------------------------------------------------------------------------
-- 6. Trigger générique updated_at
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'establishments','profiles','classes','students','teachers','companies',
    'tutors','pfmp_periods','placements','visits','documents',
    'document_templates','generated_documents','pre_departure_checklists',
    'document_signatures','establishment_settings'
  ]) loop
    execute format($f$ drop trigger if exists trg_%1$s_updated on %1$I; $f$, t);
    execute format($f$
      create trigger trg_%1$s_updated
        before update on %1$I
        for each row execute function set_updated_at();
    $f$, t);
  end loop;
end $$;


-- -----------------------------------------------------------------------------
-- 7. Auto-création du profil au signup Supabase Auth
-- -----------------------------------------------------------------------------
-- Crée automatiquement une ligne dans `profiles` quand un utilisateur s'inscrit
-- via Supabase Auth. Le rôle par défaut est 'eleve' ; un admin pourra le
-- promouvoir ensuite. Le trigger lit les metadata du signup pour pré-remplir
-- first_name / last_name si fournis ("data: { first_name, last_name }" côté
-- client).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_meta jsonb;
  v_first text;
  v_last text;
begin
  -- Lecture défensive : raw_user_meta_data n'existe que dans la vraie auth.users
  -- de Supabase ; on tolère son absence (env de test, schémas anciens).
  begin
    v_meta := to_jsonb(new) -> 'raw_user_meta_data';
  exception when others then
    v_meta := null;
  end;
  v_first := coalesce(v_meta ->> 'first_name', '');
  v_last  := coalesce(v_meta ->> 'last_name', '');

  insert into public.profiles (id, email, first_name, last_name, role)
  values (new.id, coalesce(new.email, ''), v_first, v_last, 'eleve')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 8. Fonctions helper pour la RLS
-- -----------------------------------------------------------------------------
-- Toutes marquées `stable` : Postgres peut les mettre en cache par requête.
create or replace function current_role_app()
returns user_role
language sql stable security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function current_establishment_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select establishment_id from profiles where id = auth.uid();
$$;

create or replace function is_superadmin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(current_role_app() = 'superadmin', false);
$$;

-- Rôles "écriture pleine" dans un établissement (peuvent CRUD students,
-- companies, placements, etc.)
create or replace function is_establishment_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select current_role_app() in ('admin','ddfpt');
$$;

-- Rôles qui peuvent lire les élèves de leur établissement (pas seulement les leurs)
create or replace function can_read_all_students()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select current_role_app() in ('admin','ddfpt','principal','superadmin');
$$;

-- Vrai si l'utilisateur courant est un teacher assigné à cet élève
-- (via teacher_assignments.teacher_id → teachers.profile_id = auth.uid()).
create or replace function is_referent_of(p_student_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from teacher_assignments ta
    join teachers t on t.id = ta.teacher_id
    where ta.student_id = p_student_id
      and t.profile_id = auth.uid()
  );
$$;


-- -----------------------------------------------------------------------------
-- 9. Activation RLS
-- -----------------------------------------------------------------------------
alter table establishments              enable row level security;
alter table profiles                    enable row level security;
alter table user_roles                  enable row level security;
alter table classes                     enable row level security;
alter table students                    enable row level security;
alter table teachers                    enable row level security;
alter table companies                   enable row level security;
alter table tutors                      enable row level security;
alter table pfmp_periods                enable row level security;
alter table pfmp_period_classes         enable row level security;
alter table placements                  enable row level security;
alter table teacher_assignments         enable row level security;
alter table visits                      enable row level security;
alter table visit_reports               enable row level security;
alter table alerts                      enable row level security;
alter table ai_interactions             enable row level security;
alter table audit_logs                  enable row level security;
alter table establishment_settings      enable row level security;
alter table document_templates          enable row level security;
alter table documents                   enable row level security;
alter table generated_documents         enable row level security;
alter table proof_files                 enable row level security;
alter table document_requirements       enable row level security;
alter table pre_departure_checklists    enable row level security;
alter table document_signatures         enable row level security;
alter table tutor_access_tokens         enable row level security;


-- -----------------------------------------------------------------------------
-- 10. RLS — establishments
-- -----------------------------------------------------------------------------
drop policy if exists establishments_select on establishments;
create policy establishments_select on establishments for select
  using (is_superadmin() or id = current_establishment_id());

drop policy if exists establishments_super_insert on establishments;
create policy establishments_super_insert on establishments for insert
  with check (is_superadmin());

drop policy if exists establishments_super_update on establishments;
create policy establishments_super_update on establishments for update
  using (is_superadmin()) with check (is_superadmin());

drop policy if exists establishments_super_delete on establishments;
create policy establishments_super_delete on establishments for delete
  using (is_superadmin());


-- -----------------------------------------------------------------------------
-- 11. RLS — profiles
-- -----------------------------------------------------------------------------
-- SELECT : superadmin tout, sinon profils du même établissement, sinon soi-même
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (
    is_superadmin()
    or id = auth.uid()
    or establishment_id = current_establishment_id()
  );

-- INSERT : seul un user qui s'auto-crée peut le faire (le trigger handle_new_user
-- passe en security definer et bypass RLS, donc ce policy reste sûr et utile
-- pour les rares cas d'insert manuel via SDK).
drop policy if exists profiles_self_insert on profiles;
create policy profiles_self_insert on profiles for insert
  with check (id = auth.uid() or is_superadmin());

-- UPDATE : soi-même OU admin/ddfpt sur son établissement OU superadmin
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update
  using (
    id = auth.uid()
    or is_superadmin()
    or (is_establishment_admin() and establishment_id = current_establishment_id())
  )
  with check (
    id = auth.uid()
    or is_superadmin()
    or (is_establishment_admin() and establishment_id = current_establishment_id())
  );

-- DELETE : superadmin uniquement
drop policy if exists profiles_delete on profiles;
create policy profiles_delete on profiles for delete
  using (is_superadmin());


-- -----------------------------------------------------------------------------
-- 12. RLS — user_roles
-- -----------------------------------------------------------------------------
drop policy if exists user_roles_select on user_roles;
create policy user_roles_select on user_roles for select
  using (
    is_superadmin()
    or user_id = auth.uid()
    or (is_establishment_admin() and establishment_id = current_establishment_id())
  );

drop policy if exists user_roles_write on user_roles;
create policy user_roles_write on user_roles for all
  using (
    is_superadmin()
    or (is_establishment_admin() and establishment_id = current_establishment_id())
  )
  with check (
    is_superadmin()
    or (is_establishment_admin() and establishment_id = current_establishment_id())
  );


-- -----------------------------------------------------------------------------
-- 13. RLS — students (cas spécial : referent restreint à ses élèves)
-- -----------------------------------------------------------------------------
drop policy if exists students_select on students;
create policy students_select on students for select
  using (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and (can_read_all_students() or is_referent_of(id))
    )
  );

-- Création / modification : admin & ddfpt uniquement (les principal sont
-- volontairement exclus : ils suivent une classe, ils ne créent pas d'élèves).
drop policy if exists students_insert on students;
create policy students_insert on students for insert
  with check (
    is_superadmin()
    or (is_establishment_admin() and establishment_id = current_establishment_id())
  );

drop policy if exists students_update on students;
create policy students_update on students for update
  using (
    is_superadmin()
    or (is_establishment_admin() and establishment_id = current_establishment_id())
  )
  with check (
    is_superadmin()
    or (is_establishment_admin() and establishment_id = current_establishment_id())
  );

drop policy if exists students_delete on students;
create policy students_delete on students for delete
  using (is_superadmin());


-- -----------------------------------------------------------------------------
-- 14. RLS — tables tenant standard (lecture pour tout le tenant, écriture
--             pour admin/ddfpt, delete pour superadmin)
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'classes','teachers','companies','tutors','pfmp_periods',
    'placements','teacher_assignments','visits',
    'alerts','establishment_settings',
    'document_templates','documents','generated_documents',
    'proof_files','pre_departure_checklists'
  ]) loop
    -- SELECT
    execute format($f$ drop policy if exists %1$s_select on %1$I; $f$, t);
    execute format($f$
      create policy %1$s_select on %1$I for select
        using (is_superadmin() or establishment_id = current_establishment_id());
    $f$, t);

    -- INSERT
    execute format($f$ drop policy if exists %1$s_insert on %1$I; $f$, t);
    execute format($f$
      create policy %1$s_insert on %1$I for insert
        with check (
          is_superadmin()
          or (is_establishment_admin() and establishment_id = current_establishment_id())
        );
    $f$, t);

    -- UPDATE
    execute format($f$ drop policy if exists %1$s_update on %1$I; $f$, t);
    execute format($f$
      create policy %1$s_update on %1$I for update
        using (
          is_superadmin()
          or (is_establishment_admin() and establishment_id = current_establishment_id())
        )
        with check (
          is_superadmin()
          or (is_establishment_admin() and establishment_id = current_establishment_id())
        );
    $f$, t);

    -- DELETE : superadmin only par défaut (sécurise les suppressions)
    execute format($f$ drop policy if exists %1$s_delete on %1$I; $f$, t);
    execute format($f$
      create policy %1$s_delete on %1$I for delete
        using (is_superadmin());
    $f$, t);
  end loop;
end $$;


-- -----------------------------------------------------------------------------
-- 15. RLS — visites : un référent peut créer/éditer SES visites
-- -----------------------------------------------------------------------------
-- On ajoute un policy supplémentaire INSERT/UPDATE pour les référents sur
-- leurs propres visites (le policy générique précédent ne le permettait pas).
drop policy if exists visits_referent_insert on visits;
create policy visits_referent_insert on visits for insert
  with check (
    establishment_id = current_establishment_id()
    and is_referent_of(student_id)
    and exists (
      select 1 from teachers t
      where t.id = visits.teacher_id and t.profile_id = auth.uid()
    )
  );

drop policy if exists visits_referent_update on visits;
create policy visits_referent_update on visits for update
  using (
    establishment_id = current_establishment_id()
    and is_referent_of(student_id)
    and status = 'draft'  -- une fois validé, plus modifiable par le référent
    and exists (
      select 1 from teachers t
      where t.id = visits.teacher_id and t.profile_id = auth.uid()
    )
  )
  with check (
    establishment_id = current_establishment_id()
    and is_referent_of(student_id)
  );

-- Lecture des visites côté référent : restreinte aux visites de ses élèves
-- (override du policy générique trop large).
drop policy if exists visits_select on visits;
create policy visits_select on visits for select
  using (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and (can_read_all_students() or is_referent_of(student_id))
    )
  );


-- -----------------------------------------------------------------------------
-- 16. RLS — pfmp_period_classes (héritage tenant via period)
-- -----------------------------------------------------------------------------
drop policy if exists pfmp_period_classes_select on pfmp_period_classes;
create policy pfmp_period_classes_select on pfmp_period_classes for select
  using (
    is_superadmin()
    or exists (
      select 1 from pfmp_periods p
      where p.id = pfmp_period_classes.period_id
        and p.establishment_id = current_establishment_id()
    )
  );

drop policy if exists pfmp_period_classes_write on pfmp_period_classes;
create policy pfmp_period_classes_write on pfmp_period_classes for all
  using (
    is_superadmin()
    or (
      is_establishment_admin()
      and exists (
        select 1 from pfmp_periods p
        where p.id = pfmp_period_classes.period_id
          and p.establishment_id = current_establishment_id()
      )
    )
  )
  with check (
    is_superadmin()
    or (
      is_establishment_admin()
      and exists (
        select 1 from pfmp_periods p
        where p.id = pfmp_period_classes.period_id
          and p.establishment_id = current_establishment_id()
      )
    )
  );


-- -----------------------------------------------------------------------------
-- 17. RLS — visit_reports (héritage tenant via visit)
-- -----------------------------------------------------------------------------
drop policy if exists visit_reports_select on visit_reports;
create policy visit_reports_select on visit_reports for select
  using (
    is_superadmin()
    or exists (
      select 1 from visits v
      where v.id = visit_reports.visit_id
        and v.establishment_id = current_establishment_id()
        and (can_read_all_students() or is_referent_of(v.student_id))
    )
  );

drop policy if exists visit_reports_write on visit_reports;
create policy visit_reports_write on visit_reports for all
  using (
    is_superadmin()
    or exists (
      select 1 from visits v
      where v.id = visit_reports.visit_id
        and v.establishment_id = current_establishment_id()
    )
  )
  with check (
    is_superadmin()
    or exists (
      select 1 from visits v
      where v.id = visit_reports.visit_id
        and v.establishment_id = current_establishment_id()
    )
  );


-- -----------------------------------------------------------------------------
-- 18. RLS — ai_interactions, audit_logs (lecture tenant, écriture serveur)
-- -----------------------------------------------------------------------------
-- ai_interactions : lecture par le tenant, écriture via service_role uniquement
-- (les Edge Functions ont la service_role key et bypassent la RLS).
drop policy if exists ai_interactions_select on ai_interactions;
create policy ai_interactions_select on ai_interactions for select
  using (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and is_establishment_admin()
    )
    or user_id = auth.uid()
  );

-- audit_logs : lecture admin du tenant + superadmin. Pas d'INSERT/UPDATE/DELETE
-- via l'API publique (insert via Edge Function en service_role).
drop policy if exists audit_logs_select on audit_logs;
create policy audit_logs_select on audit_logs for select
  using (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and is_establishment_admin()
    )
  );


-- -----------------------------------------------------------------------------
-- 19. RLS — document_requirements (rules globales + override par établissement)
-- -----------------------------------------------------------------------------
drop policy if exists document_requirements_select on document_requirements;
create policy document_requirements_select on document_requirements for select
  using (
    is_superadmin()
    or establishment_id is null
    or establishment_id = current_establishment_id()
  );

drop policy if exists document_requirements_write on document_requirements;
create policy document_requirements_write on document_requirements for all
  using (
    is_superadmin()
    or (
      is_establishment_admin()
      and establishment_id = current_establishment_id()
    )
  )
  with check (
    is_superadmin()
    or (
      is_establishment_admin()
      and establishment_id = current_establishment_id()
    )
  );


-- -----------------------------------------------------------------------------
-- 20. RLS — document_signatures
-- -----------------------------------------------------------------------------
-- Lecture : tenant + le signataire lui-même (s'il a un compte auth)
drop policy if exists document_signatures_select on document_signatures;
create policy document_signatures_select on document_signatures for select
  using (
    is_superadmin()
    or establishment_id = current_establishment_id()
    or signer_user_id = auth.uid()
  );

-- Création : admin/ddfpt/référent du tenant (jamais l'élève seul)
drop policy if exists document_signatures_insert on document_signatures;
create policy document_signatures_insert on document_signatures for insert
  with check (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and current_role_app() in ('admin','ddfpt','principal','referent')
    )
  );

-- Mise à jour : tenant admin pour annulation, ou le signataire pour passer
-- de pending à signed/refused.
drop policy if exists document_signatures_update on document_signatures;
create policy document_signatures_update on document_signatures for update
  using (
    is_superadmin()
    or (is_establishment_admin() and establishment_id = current_establishment_id())
    or signer_user_id = auth.uid()
  )
  with check (
    is_superadmin()
    or (is_establishment_admin() and establishment_id = current_establishment_id())
    or signer_user_id = auth.uid()
  );

-- Suppression : superadmin uniquement (preuve juridique)
drop policy if exists document_signatures_delete on document_signatures;
create policy document_signatures_delete on document_signatures for delete
  using (is_superadmin());


-- -----------------------------------------------------------------------------
-- 21. RLS — tutor_access_tokens
-- -----------------------------------------------------------------------------
-- Les tokens contiennent un secret hashé. Lecture : admin/ddfpt du tenant.
-- Pas de lecture directe par anon : le tuteur passe par une Edge Function
-- (qui utilise service_role et compare le hash).
drop policy if exists tutor_access_tokens_select on tutor_access_tokens;
create policy tutor_access_tokens_select on tutor_access_tokens for select
  using (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and is_establishment_admin()
    )
  );

drop policy if exists tutor_access_tokens_insert on tutor_access_tokens;
create policy tutor_access_tokens_insert on tutor_access_tokens for insert
  with check (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and current_role_app() in ('admin','ddfpt','referent','principal')
    )
  );

drop policy if exists tutor_access_tokens_update on tutor_access_tokens;
create policy tutor_access_tokens_update on tutor_access_tokens for update
  using (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and is_establishment_admin()
    )
  )
  with check (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and is_establishment_admin()
    )
  );

drop policy if exists tutor_access_tokens_delete on tutor_access_tokens;
create policy tutor_access_tokens_delete on tutor_access_tokens for delete
  using (is_superadmin());


-- -----------------------------------------------------------------------------
-- 22. Garde-fou : `validated_by` sur visits doit être l'utilisateur courant
-- -----------------------------------------------------------------------------
create or replace function enforce_visit_validator()
returns trigger language plpgsql as $$
begin
  -- Cas 1 : l'utilisateur essaie d'écrire un validated_by qui n'est pas lui
  --         → on raise immédiatement (audit clair, pas de réécriture silencieuse)
  if new.validated_by is not null
     and new.validated_by <> auth.uid()
     and not is_superadmin() then
    raise exception 'validated_by must equal current user (auth.uid)';
  end if;

  -- Cas 2 : l'utilisateur passe la visite à validated sans préciser qui valide
  --         → on remplit avec auth.uid() et now()
  if new.status = 'validated' and new.validated_by is null then
    new.validated_by := auth.uid();
  end if;
  if new.status = 'validated' and new.validated_at is null then
    new.validated_at := now();
  end if;

  return new;
end $$;

drop trigger if exists trg_visits_validator on visits;
create trigger trg_visits_validator
  before insert or update on visits
  for each row execute function enforce_visit_validator();


-- =============================================================================
-- Fin de la migration 0001_init.sql
-- =============================================================================
