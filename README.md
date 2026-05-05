# PFMP Pilot AI

Plateforme SaaS multi-établissement pour piloter les **Périodes de Formation en Milieu Professionnel** (PFMP) en lycée professionnel — CAP, Bac Pro, BTS. Mobile-first, conçue pour être utilisée pendant les visites de stage en entreprise.

> Ce projet est totalement indépendant de SafeScol. Il est dédié au suivi des stages, des visites, des comptes rendus, des conventions, des attestations et au pilotage pédagogique des PFMP.

## Tech stack

| Couche | Choix |
|---|---|
| Framework | TanStack Start (React 19, TanStack Router) |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 (tokens via `@theme`) |
| Icônes | lucide-react |
| Backend (prévu) | Supabase (Auth, Postgres, Storage, Edge Functions) |
| Sécurité (prévue) | Row Level Security multi-tenant |
| Hosting | Netlify (`@netlify/vite-plugin-tanstack-start`) |
| Langage | TypeScript 5.7 strict |

## Prise en main

```bash
npm install
npm run dev    # http://localhost:3000
npm run build
```

La démo embarque un établissement fictif — *Lycée Professionnel Jean Moulin* — avec 4 classes, 20 élèves, 5 professeurs, 8 entreprises, 8 tuteurs, 2 périodes PFMP, plusieurs visites, des documents et des alertes.

## Mode démo : changer de rôle

L'application n'est pas encore branchée sur Supabase Auth. Une barre dans la sidebar permet de **basculer instantanément** entre les rôles :

- **Camille Lefèvre** — Superadmin SaaS
- **Sophie Bernard** — Admin établissement
- **Marc Dupont** — DDFPT
- **Élodie Lambert** — Professeur principal
- **Julien Garcia** — Professeur référent (3 élèves affectés)

Le rôle sélectionné détermine la navigation (sidebar), les pages accessibles (RoleGuard) et la page d'accueil par défaut.

## Schéma Supabase

Le schéma complet (tables, types, RLS multi-tenant) est dans [`supabase/schema.sql`](./supabase/schema.sql). Toutes les tables métier portent un `establishment_id` et une politique `tenant_read` / `tenant_write` qui restreint les données à l'établissement de l'utilisateur courant. Les superadmins voient tout.

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
