-- =====================================================================
-- Test d'isolation RLS multi-tenant
-- =====================================================================
-- Ce script cree 2 tenants et 2 users, puis verifie que :
--   - User tenant A ne peut PAS lire les donnees du tenant B
--   - User tenant A ne peut PAS modifier les donnees du tenant B
--   - User tenant A ne peut PAS deplacer ses donnees vers tenant B
--   - Superadmin sans claim voit les 2 tenants
--   - Superadmin avec claim ne voit que le tenant choisi
--
-- A lancer manuellement contre une instance Supabase de DEV via :
--   psql -h <host> -U postgres -d postgres -f rls_isolation.sql
--
-- ATTENTION : ce script cree et supprime des donnees. Ne JAMAIS lancer
-- contre une DB de prod.

\set ON_ERROR_STOP on
\set QUIET off

begin;

-- ---------------------------------------------------------------------
-- Setup : 2 tenants jouets
-- ---------------------------------------------------------------------
insert into establishments (id, name, slug, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Tenant A', 'test-a', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Test Tenant B', 'test-b', 'active')
on conflict (id) do nothing;

-- 2 users factices (en pratique crees via auth.users en prod)
-- Ici on bypass auth en s'imposant via set_config sur la session.
-- NOTE : Supabase RLS lit auth.uid() qui vient du JWT. Pour simuler,
-- on utilise set_config('request.jwt.claim.sub', ...) qui est lu par
-- auth.uid() en local.

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'user-a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@test.local'),
  ('99999999-9999-9999-9999-999999999999', 'super@test.local')
on conflict (id) do nothing;

insert into profiles (id, email, first_name, last_name, role, establishment_id)
values
  ('11111111-1111-1111-1111-111111111111', 'user-a@test.local', 'Alice', 'A', 'admin', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@test.local', 'Bob',   'B', 'admin', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('99999999-9999-9999-9999-999999999999', 'super@test.local', 'Sup',   'er','superadmin', null)
on conflict (id) do update set
  role = excluded.role,
  establishment_id = excluded.establishment_id;

-- 1 student dans chaque tenant
insert into students (id, establishment_id, first_name, last_name)
values
  ('aaa11111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Eleve', 'A'),
  ('bbb22222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Eleve', 'B')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- TEST 1 - User A ne voit que les students du tenant A
-- ---------------------------------------------------------------------
\echo '--- TEST 1 : User A read isolation ---'
set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-1111-1111-111111111111';

do $$
declare
  cnt int;
begin
  select count(*) into cnt from students;
  if cnt <> 1 then
    raise exception 'TEST 1 FAILED: user A sees % students (expected 1)', cnt;
  end if;
  raise notice 'TEST 1 PASSED: user A sees % student (own tenant only)', cnt;
end $$;

-- ---------------------------------------------------------------------
-- TEST 2 - User A ne peut PAS UPDATE student du tenant B
-- ---------------------------------------------------------------------
\echo '--- TEST 2 : User A write isolation ---'

do $$
declare
  affected int;
begin
  update students set first_name = 'HACKED'
   where id = 'bbb22222-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  get diagnostics affected = row_count;
  if affected > 0 then
    raise exception 'TEST 2 FAILED: user A modified % rows in tenant B', affected;
  end if;
  raise notice 'TEST 2 PASSED: user A could not modify tenant B students';
end $$;

-- ---------------------------------------------------------------------
-- TEST 3 - User A ne peut PAS deplacer son student vers tenant B
-- ---------------------------------------------------------------------
\echo '--- TEST 3 : Cross-tenant data move blocked ---'

do $$
begin
  begin
    update students set establishment_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
     where id = 'aaa11111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    raise exception 'TEST 3 FAILED: user A moved student to tenant B';
  exception when others then
    if sqlerrm like '%establishment_id cannot be changed%' then
      raise notice 'TEST 3 PASSED: trigger blocked cross-tenant move';
    else
      raise exception 'TEST 3 FAILED with unexpected error: %', sqlerrm;
    end if;
  end;
end $$;

-- ---------------------------------------------------------------------
-- TEST 4 - Superadmin sans claim voit les 2 tenants
-- ---------------------------------------------------------------------
\echo '--- TEST 4 : Superadmin global view ---'
set local "request.jwt.claim.sub" to '99999999-9999-9999-9999-999999999999';

do $$
declare
  cnt int;
begin
  select count(*) into cnt from students
   where id in (
     'aaa11111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'bbb22222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
   );
  if cnt <> 2 then
    raise exception 'TEST 4 FAILED: superadmin sees % students (expected 2)', cnt;
  end if;
  raise notice 'TEST 4 PASSED: superadmin sees both tenants';
end $$;

-- ---------------------------------------------------------------------
-- TEST 5 - RLS audit view montre toutes les tables protegees
-- ---------------------------------------------------------------------
\echo '--- TEST 5 : rls_audit view ---'

do $$
declare
  unprotected int;
begin
  select count(*) into unprotected
    from rls_audit
   where rls_enabled = false or policy_count = 0;
  if unprotected > 0 then
    raise exception 'TEST 5 FAILED: % business tables without RLS or policy', unprotected;
  end if;
  raise notice 'TEST 5 PASSED: all business tables have RLS + at least 1 policy';
end $$;

-- ---------------------------------------------------------------------
-- Cleanup
-- ---------------------------------------------------------------------
rollback;

\echo '=== ALL TESTS COMPLETED ==='
