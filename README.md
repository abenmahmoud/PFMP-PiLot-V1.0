# PFMP Pilot AI

> 🚨 **POUR CODEX ET CLAUDE :** Avant de coder ou répondre, lire **[`SYNC.md`](./SYNC.md)** — c'est la source de vérité de l'état actuel du projet et des sprints en cours.

Plateforme SaaS multi-établissement pour piloter les **Périodes de Formation en Milieu Professionnel** (PFMP) en lycée professionnel — CAP, Bac Pro, BTS. Mobile-first, conçue pour être utilisée pendant les visites de stage en entreprise.

> Ce projet est totalement indépendant de SafeScol. Il est dédié au suivi des stages, des visites, des comptes rendus, des conventions, des attestations et au pilotage pédagogique des PFMP.

## Tech stack

| Couche | Choix |
|---|---|
| Framework | TanStack Start (React 19, TanStack Router) |
| Build | Vite 7 + Nitro (preset Vercel auto-détecté) |
| Styling | Tailwind CSS 4 (tokens via `@theme`) |
| Icônes | lucide-react |
| Backend | Supabase (Auth, Postgres + RLS, Storage, Edge Functions) |
| Sécurité | Row Level Security multi-tenant strict |
| Hosting | Vercel (Fluid Compute) |
| Langage | TypeScript 5.7 strict |

## Prise en main

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run build        # build prod (Nitro génère .vercel/output)
npm run check        # typecheck + build
```

La démo embarque un établissement fictif — *Lycée Professionnel Jean Moulin* — avec 4 classes, 20 élèves, 5 professeurs, 8 entreprises, 8 tuteurs, 2 périodes PFMP, plusieurs visites, des documents et des alertes.

## Variables d'environnement

| Variable | Valeur | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | URL projet Supabase | requise pour mode réel |
| `VITE_SUPABASE_ANON_KEY` | clé publique anon | requise pour mode réel |
| `VITE_DEMO_MODE` | `true` / `false` | `true` = utilise data/demo.ts, `false` = utilise Supabase |
| `VITE_PLATFORM_DOMAIN` | `pfmp-pilot.fr` ou domaine acheté | domaine apex utilisé pour résoudre les tenants par sous-domaine |
| `SUPABASE_SERVICE_ROLE_KEY` | clé serveur Supabase | côté Vercel uniquement, utilisée par les fonctions serveur d'invitation |
| `PFMP_APP_URL` | `https://www.pfmp-pilot.fr` | URL publique utilisée dans les liens d'onboarding |
| `SUPABASE_SERVICE_ROLE_KEY` | secret backend | **JAMAIS côté client**, uniquement Edge Functions |

En l'absence de `VITE_SUPABASE_URL`, le mode démo s'active automatiquement.

## Architecture multi-tenant

Chaque ligne métier porte un `establishment_id`. La RLS garantit qu'aucune requête ne traverse la frontière d'un tenant. Voir [`supabase/README.md`](./supabase/README.md) pour le détail des rôles, policies, et de la stratégie de routing par hostname (`slug.pfmp-pilot.fr` ou `custom_domain`).

## Mode démo : changer de rôle

L'application n'est pas encore branchée sur Supabase Auth. Une barre dans la sidebar permet de **basculer instantanément** entre les rôles :

- **Camille Lefèvre** — Superadmin SaaS
- **Sophie Bernard** — Admin établissement
- **Marc Dupont** — DDFPT
- **Élodie Lambert** — Professeur principal
- **Julien Garcia** — Professeur référent (3 élèves affectés)

Le rôle sélectionné détermine la navigation (sidebar), les pages accessibles (RoleGuard) et la page d'accueil par défaut.

## Schéma Supabase

Le schéma complet (tables, enums, triggers, RLS multi-tenant) est dans [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql). Toutes les tables métier portent un `establishment_id` et des policies splittées (SELECT / INSERT / UPDATE / DELETE) qui restreignent les données par rôle :

- `superadmin` : voit tout, partout.
- `admin` / `ddfpt` : voit et modifie son établissement entier.
- `principal` : voit son établissement (lecture).
- `referent` : voit **uniquement** ses élèves assignés (via `teacher_assignments`), peut créer/éditer leurs visites en `draft`.
- `tuteur` / `eleve` : accès via magic link ou compte limité (à venir).

Les seules suppressions autorisées en RLS sont celles du `superadmin`. Pour les autres tables sensibles, on utilise un soft-delete via `archived_at`.

Voir [`supabase/README.md`](./supabase/README.md) pour la procédure d'application des migrations, du seed, et la liste des comptes de démo.

## Architecture IA

Trois assistants distincts, chacun avec ses prompts système et ses garde-fous :

- **SuperadminAssistant** — analyse usage multi-établissement, détecte les clients à risque, prépare relances et rapports.
- **EstablishmentAssistant** — résume les périodes PFMP, détecte les retards, prépare des points pour la direction.
- **TeacherAssistant** — reformule les notes brutes en compte rendu professionnel, sans inventer.

Règles communes appliquées partout :

- L'IA ne décide jamais.
- L'IA n'invente pas. Si une information manque, elle le dit.
- Toute génération est un brouillon, validation humaine obligatoire.
- Toute interaction est journalisée dans `ai_interactions` et `audit_logs`.
- Les données d'un établissement ne sont jamais exposées à un autre.

Les réponses sont aujourd'hui mockées dans `src/ai/mockAiResponses.ts` ; la signature de `src/ai/aiService.ts` est conçue pour être branchée plus tard sur un backend (Edge Function Supabase ou Netlify Function) qui appellera Claude/OpenAI.

## Pour aller plus loin

Voir [`AGENTS.md`](./AGENTS.md) pour la cartographie détaillée du code, les conventions et les décisions d'architecture.
