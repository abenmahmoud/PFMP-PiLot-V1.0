# Supabase — PFMP Pilot AI

Backend du SaaS multi-établissement : Auth, Postgres avec RLS strict, Storage, Edge Functions.

## Structure

```
supabase/
├── migrations/
│   └── 0001_init.sql      # Schéma complet (tables, enums, triggers, RLS, multi-tenant Vercel)
├── seed.sql               # Données de démo (Lycée Jean Moulin + 4 lycées superadmin)
└── README.md              # Ce fichier
```

## Prérequis

- Un projet Supabase (région EU recommandée pour RGPD : Frankfurt ou Paris).
- L'extension `pgcrypto` (installée par défaut sur Supabase). `unaccent` est optionnelle (fallback prévu).

## Application des migrations

### Mode 1 — via le SQL Editor Supabase

1. Ouvrir le projet sur https://supabase.com/dashboard
2. Aller dans **SQL Editor → New query**
3. Copier-coller le contenu de `migrations/0001_init.sql`
4. Cliquer **Run**
5. Vérifier les comptes : `select count(*) from pg_tables where schemaname='public';` (attendu : 26)

### Mode 2 — via la CLI Supabase (recommandé pour la suite)

```bash
npm install -g supabase
supabase link --project-ref <ton-project-ref>
supabase db push
```

Les futures migrations seront créées sous le nom `0002_xxx.sql`, `0003_xxx.sql` (toujours additif, jamais modifier 0001).

## Application du seed

```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

Ou via le SQL Editor : copier-coller le contenu, cliquer **Run**.

Le seed est **idempotent** (peut être rejoué) : les `on conflict do nothing` ou `do update` empêchent les doublons.

## Vérification post-seed

```sql
select 'establishments' as t, count(*) from establishments
union all select 'students', count(*) from students
union all select 'teachers', count(*) from teachers
union all select 'companies', count(*) from companies
union all select 'profiles', count(*) from profiles;
```

Attendu : 5 establishments, 20 students, 5 teachers, 8 companies, 8 profiles.

## Comptes de démo

| Email | Rôle | Établissement | Mot de passe |
|---|---|---|---|
| camille.lefevre@pfmp-pilot.fr | superadmin | — | à définir via dashboard Auth |
| sophie.bernard@jean-moulin.fr | admin | Jean Moulin | à définir via dashboard Auth |
| marc.dupont@jean-moulin.fr | ddfpt | Jean Moulin | à définir via dashboard Auth |
| elodie.lambert@jean-moulin.fr | principal | Jean Moulin | à définir via dashboard Auth |
| julien.garcia@jean-moulin.fr | referent (3 élèves) | Jean Moulin | à définir via dashboard Auth |

**Important** : le seed crée des `auth.users` factices sans mot de passe. Pour des comptes utilisables, créer chaque user via le dashboard **Authentication → Users → Add user**, puis :

```sql
update profiles
   set role = 'superadmin', establishment_id = null
 where email = 'camille.lefevre@pfmp-pilot.fr';
```

## Architecture multi-tenant

Chaque ligne métier porte un `establishment_id` qui pointe sur `establishments.id`. La RLS garantit qu'aucune requête ne traverse la frontière d'un tenant, même via une faille applicative.

### Les 7 rôles

| Rôle | Lecture | Écriture |
|---|---|---|
| `superadmin` | tout, partout | tout, partout |
| `admin` | son établissement | crée/modifie tout dans son établissement |
| `ddfpt` | son établissement | crée/modifie tout dans son établissement |
| `principal` | son établissement (élèves entiers) | non (lecture seule en l'état) |
| `referent` | uniquement ses élèves (via `teacher_assignments`) | crée visites pour ses élèves |
| `tuteur` | accès via `tutor_access_tokens` (magic link) | dépose remarques/signatures |
| `eleve` | ses propres données (futur) | aucune |

### Isolation prouvée

Les RLS sont testées de bout en bout : un référent qui passe par l'API Supabase directement (sans le frontend) ne voit **techniquement** que ses élèves assignés, pas tout le tenant. Voir le fichier d'audit pour les 16 tests RLS validés.

## Multi-tenant Vercel

La table `establishments` porte les colonnes nécessaires au routage Vercel :

| Colonne | Usage |
|---|---|
| `slug` | identifiant URL-safe, unique, NOT NULL |
| `subdomain` | sous-domaine sous `pfmp-pilot.fr` (NULL si pas configuré) |
| `custom_domain` | domaine propre de l'établissement (NULL par défaut) |
| `domain_verified` | TRUE quand Vercel a vérifié le DNS |
| `primary_color` | hex `#RRGGBB` pour personnalisation light |
| `status` | `active` / `trial` / `suspended` / `archived` |

Le middleware Vercel (à venir) résoudra `hostname` → `establishment_id` via :

```sql
select id, slug, status from establishments
 where slug = $1 or subdomain = $1 or custom_domain = $1
 limit 1;
```

## Storage

À configurer manuellement via le dashboard Supabase **Storage** :

| Bucket | Privé | Usage |
|---|---|---|
| `documents-private` | ✅ | conventions, attestations, comptes rendus |
| `proof-files` | ✅ | RIB, attestations d'assurance, autorisations parentales |
| `generated-pdfs` | ✅ | PDF générés à partir des templates |
| `company-stamps` | ✅ | cachets entreprise |

Tous privés. L'accès se fait via **signed URLs** générés par les Edge Functions (TTL court, par exemple 60 minutes).

## Edge Functions (futur)

Plusieurs fonctions sont prévues mais pas encore implémentées :

- `ai-generate` — appel Claude/OpenAI avec clé en `Deno.env`, jamais côté client.
- `generate-document` — rendu PDF d'un template avec ses variables.
- `send-tutor-link` — création d'un `tutor_access_token` (token clair par email, hash en DB).
- `verify-domain` — vérification DNS pour passer `domain_verified` à `true`.

## Limites actuelles

- Le seed fournit `auth.users` factices sans mot de passe. Pour tester l'auth réelle, créer manuellement les comptes via le dashboard puis assigner les rôles via `update profiles`.
- Aucune signature qualifiée eIDAS : la table `document_signatures` ne fait pour l'instant que de la signature simple traçable (preuve via SHA256 + IP + user-agent).
- Aucun bucket Storage n'est créé automatiquement par la migration. À faire au dashboard.
- Pas de cron job pour expirer les `tutor_access_tokens` (à faire via `pg_cron` ou Edge Function planifiée).

## Variables d'environnement

| Variable | Utilisée côté | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | client | URL publique du projet |
| `VITE_SUPABASE_ANON_KEY` | client | clé publique anon (RLS s'applique) |
| `SUPABASE_SERVICE_ROLE_KEY` | **serveur uniquement** | bypass RLS, **jamais côté client** |
| `VITE_DEMO_MODE` | client | `true` = utilise les données de `data/demo.ts`, `false` = utilise Supabase |
| `SUPABASE_DB_URL` | scripts CLI | URL Postgres directe pour `psql -f` |

## Sécurité — règles d'or

- **Jamais** la `service_role` côté client.
- **Toujours** RLS activée sur toute table métier.
- **Pas de DELETE** par les rôles tenant : seul le superadmin peut supprimer définitivement (préférer le soft-delete via `archived_at`).
- **Tokens tuteurs** : jamais stockés en clair, uniquement leur hash SHA256.
- **Audit logs** : à écrire via Edge Function (service_role) pour éviter qu'un user falsifie sa propre trace.
