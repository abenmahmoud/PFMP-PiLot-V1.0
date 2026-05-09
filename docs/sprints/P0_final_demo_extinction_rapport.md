# P0 final — Rapport Codex

## Objectif

Finir le chantier P0 sans commencer P1 onboarding ni P2 Pronote :

- routes restantes en lecture Supabase ;
- premiere mutation visite reelle ;
- suppression du fallback demo superadmin en mode Supabase ;
- conservation du mode demo via `VITE_DEMO_MODE=true`.

## Fichiers crees

- `src/services/activity.ts`
- `src/services/alerts.ts`
- `src/services/assignments.ts`
- `src/services/placements.ts`
- `src/services/settings.ts`
- `src/services/visits.ts`

## Fichiers modifies

- `src/lib/database.types.ts`
- `src/lib/useCurrentUser.ts`
- `src/components/RoleGuard.tsx`
- `src/routes/index.tsx`
- `src/routes/activity.tsx`
- `src/routes/alerts.tsx`
- `src/routes/assignments.tsx`
- `src/routes/settings.tsx`
- `src/routes/placements.$id.tsx`
- `src/routes/visits.$id.tsx`
- `src/routes/visits.new.tsx`

## Decisions techniques

1. `useCurrentUser()` ne retombe plus sur le profil demo quand Supabase est actif et que `auth.profile` est absent.
   Cela evite le bug visible ou le shell repartait en "Superadmin demo".

2. `/` utilise maintenant `useAuth()` en mode Supabase :
   - session en chargement : pas de redirection prematuree ;
   - pas de profil : redirection `/login` ;
   - profil superadmin : `/superadmin` ;
   - profil referent/principal : `/my-students` ;
   - autres roles : `/dashboard`.

3. `RoleGuard` lit `auth.role` en mode Supabase et garde `useCurrentUser()` uniquement pour la demo.

4. `/visits/new` cree une visite `draft` dans Supabase avec RLS comme source de verite.
   `establishment_id` est fourni depuis le profil courant uniquement pour satisfaire la contrainte `NOT NULL`; la policy RLS continue de verifier le tenant.

5. `/visits/$id` et `/placements/$id` ont des vues Supabase dediees et ne reutilisent pas les composants demo dependants de `data/demo`.

## Ce qui reste volontairement hors scope

- P1 onboarding et invitations magic link.
- P2 import Pronote.
- CRUD complet classes/entreprises/periodes.
- Refactor complet des composants demo-only (`StudentCard`, `PlacementCard`, `DocumentList`, `ActivityTimeline`, `VisitForm`) en props-only. Ils restent utilises par les chemins demo ou par des routes deja isolees.

## Validation

- `npm run typecheck` : OK
- `npm run build` : OK

Warnings build restants :

- warnings TanStack/Vite habituels sur `"use client"` dans les modules tiers ;
- warning CSS existant lie a une classe `bg-[var(--color-...)]`.

## Notes pour Claude

La branche respecte la doctrine : pas de mega-sprint P1/P2. Le produit avance uniquement sur P0 final, avec un point important corrige pour Adel : en Supabase, un profil absent ou encore en chargement ne peut plus afficher le superadmin demo.
