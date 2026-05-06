# Tests d'isolation RLS multi-tenant

## Pourquoi

PFMP Pilot manipule des donnees de mineurs (RGPD article 8). Le cloisonnement
entre etablissements est garanti par PostgreSQL Row Level Security (RLS).
Une seule fuite cross-tenant = proces CNIL + proces au penal.

Ce document decrit le protocole de test a executer :
- avant chaque deploiement majeur en prod
- apres toute migration qui touche au schema ou aux policies
- dans la CI a chaque PR qui modifie `supabase/`

## Pre-requis

- Une instance Supabase de DEV (jamais la prod)
- `psql` ou Supabase Studio SQL Editor
- Les migrations 0001 -> 0004 appliquees

## Lancement manuel

```bash
psql -h <host> -U postgres -d postgres -f supabase/tests/rls_isolation.sql
```

Sortie attendue :

```text
TEST 1 PASSED: user A sees 1 student (own tenant only)
TEST 2 PASSED: user A could not modify tenant B students
TEST 3 PASSED: trigger blocked cross-tenant move
TEST 4 PASSED: superadmin sees both tenants
TEST 5 PASSED: all business tables have RLS + at least 1 policy
=== ALL TESTS COMPLETED ===
```

Tout TEST en FAILED bloque le deploiement. Pas de "on corrigera apres".

## Controles manuels supplementaires (avant ouverture en prod)

1. Connecte-toi avec un user de Tenant A dans le navigateur.
2. Note un `id` de student visible dans le reseau (DevTools -> Network).
3. Ouvre une requete SQL via Supabase Studio en tant que ce user.
4. Tente : `select * from students where id = '<id-tenant-B>'`.
5. Le resultat DOIT etre 0 row, jamais une erreur de permission
   (sinon l'attaquant sait que la row existe).

## En cas de failed test

1. NE PAS DEPLOYER
2. Identifier la table fautive via `select * from rls_audit`
3. Corriger la migration ou la policy
4. Re-lancer les tests
5. Documenter le bug dans la PR
