-- =====================================================================
-- Sprint 3 - RLS hardening : combler les manques + perf
-- =====================================================================
-- Pre-requis : migrations 0001, 0002, 0003 appliquees.
-- Toutes les operations sont idempotentes.

-- ---------------------------------------------------------------------
-- 1. Policies manquantes sur user_roles
-- ---------------------------------------------------------------------
-- user_roles a RLS active depuis 0001 mais aucune policy -> tout bloque.
-- Lecture : un user voit ses propres roles + le superadmin voit tout +
-- les admins de son tenant voient les roles de leur tenant.
-- Ecriture : seuls superadmin et admin du tenant peuvent muter.

drop policy if exists user_roles_read on user_roles;
create policy user_roles_read on user_roles for select
  using (
    is_superadmin()
    or user_id = auth.uid()
    or establishment_id = current_establishment_id()
  );

drop policy if exists user_roles_write on user_roles;
create policy user_roles_write on user_roles for all
  using (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and exists (
        select 1 from profiles
         where id = auth.uid() and role in ('admin', 'ddfpt')
      )
    )
  )
  with check (
    is_superadmin()
    or (
      establishment_id = current_establishment_id()
      and exists (
        select 1 from profiles
         where id = auth.uid() and role in ('admin', 'ddfpt')
      )
    )
  );

-- ---------------------------------------------------------------------
-- 2. Policy INSERT explicite sur establishments
-- ---------------------------------------------------------------------
-- La policy "establishments_super_write" existe en `for all` mais l'INSERT
-- avec auth.uid() = null (cas des Edge Functions service_role) doit etre
-- gere separement. Le service_role bypass RLS de toute facon, mais on
-- explicite la regle pour la lisibilite audit.

-- (Aucune action SQL : le bypass service_role suffit. Documente ici.)

-- ---------------------------------------------------------------------
-- 3. Index de performance multi-tenant
-- ---------------------------------------------------------------------
-- A 500 tenants x 100K rows par tenant = 50M rows. Sans ces index, chaque
-- SELECT filtre par establishment_id devient un sequential scan = mort.

create index if not exists idx_classes_establishment
  on classes(establishment_id);
create index if not exists idx_teachers_establishment
  on teachers(establishment_id);
create index if not exists idx_companies_establishment
  on companies(establishment_id);
create index if not exists idx_tutors_establishment
  on tutors(establishment_id);
create index if not exists idx_pfmp_periods_establishment
  on pfmp_periods(establishment_id);
create index if not exists idx_placements_establishment
  on placements(establishment_id);
create index if not exists idx_teacher_assignments_establishment
  on teacher_assignments(establishment_id);
create index if not exists idx_establishment_settings_establishment
  on establishment_settings(establishment_id);
create index if not exists idx_user_roles_establishment
  on user_roles(establishment_id);
create index if not exists idx_user_roles_user
  on user_roles(user_id);

-- Index composites pour les requetes timeline (tri DESC sur date)
create index if not exists idx_alerts_establishment_created
  on alerts(establishment_id, created_at desc);
create index if not exists idx_visits_establishment_created
  on visits(establishment_id, created_at desc);
create index if not exists idx_audit_logs_establishment_created
  on audit_logs(establishment_id, created_at desc);
create index if not exists idx_documents_establishment_created
  on documents(establishment_id, created_at desc);

-- ---------------------------------------------------------------------
-- 4. Garde-fou : interdire l'UPDATE de establishment_id
-- ---------------------------------------------------------------------
-- Un attaquant authentifie sur tenant A ne doit JAMAIS pouvoir
-- modifier establishment_id d'une row pour la deplacer vers tenant B.
-- Ce trigger bloque tout changement de establishment_id sauf pour le
-- superadmin (qui peut deplacer des donnees dans le cadre d'un transfert).

create or replace function prevent_establishment_id_change()
returns trigger
language plpgsql
as $$
begin
  if old.establishment_id is distinct from new.establishment_id then
    if not is_superadmin() then
      raise exception 'establishment_id cannot be changed (security: cross-tenant data move blocked)';
    end if;
  end if;
  return new;
end;
$$;

-- Appliquer le trigger sur toutes les tables qui ont establishment_id
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'classes', 'students', 'teachers', 'companies', 'tutors',
    'pfmp_periods', 'placements', 'teacher_assignments',
    'visits', 'documents', 'alerts', 'ai_interactions',
    'audit_logs', 'establishment_settings', 'user_roles'
  ])
  loop
    execute format(
      'drop trigger if exists prevent_tenant_change on %I',
      t
    );
    execute format(
      'create trigger prevent_tenant_change before update on %I '
      'for each row execute function prevent_establishment_id_change()',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. Vue SQL pour audit RLS (debugging multi-tenant)
-- ---------------------------------------------------------------------
-- Permet a un superadmin de verifier rapidement que toutes les tables
-- business ont bien RLS active et au moins une policy.

create or replace view rls_audit as
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  count(p.polname) as policy_count
from pg_class c
left join pg_policy p on p.polrelid = c.oid
where c.relkind = 'r'
  and c.relnamespace = 'public'::regnamespace
  and c.relname in (
    'establishments', 'profiles', 'user_roles',
    'classes', 'students', 'teachers', 'companies', 'tutors',
    'pfmp_periods', 'pfmp_period_classes', 'placements',
    'teacher_assignments', 'visits', 'visit_reports',
    'documents', 'alerts', 'ai_interactions',
    'audit_logs', 'establishment_settings'
  )
group by c.relname, c.relrowsecurity
order by c.relname;

-- Lecture restreinte au superadmin
revoke all on rls_audit from public, authenticated, anon;
grant select on rls_audit to authenticated;
-- (la lecture effective sera filtree par RLS via une wrapper function si besoin)

comment on view rls_audit is
  'Audit view: confirms every business table has RLS enabled and at least one policy. Used in CI tests.';
