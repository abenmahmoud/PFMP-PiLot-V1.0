# AGENTS.md

Ce document décrit l'architecture et les conventions de **PFMP Pilot AI** pour les développeurs et les agents IA qui travaillent sur ce code.

## Vue d'ensemble

SaaS multi-établissement de pilotage des PFMP (stages en lycée pro). Phase actuelle : **fondation**. La structure, l'UX, les rôles, la logique métier, les types et les données de démo sont en place ; la plupart des actions de mutation et le câblage Supabase restent à brancher.

## Arborescence

```
src/
├── ai/                       # Architecture IA — types, prompts, service mocké
│   ├── aiTypes.ts            # AssistantType, AiRequest, AiResponse, log entry
│   ├── aiPrompts.ts          # System prompts par assistant + règles communes
│   ├── aiService.ts          # generateAiResponse() + logAiInteraction()
│   └── mockAiResponses.ts    # Réponses déterministes pour la démo
│
├── components/
│   ├── ui/                   # Primitives — Card, Badge, Button, Field
│   ├── AppLayout.tsx         # Shell page (Sidebar + Topbar + main)
│   ├── Sidebar.tsx           # Nav latérale + switcher de rôle (démo)
│   ├── Topbar.tsx            # Header avec recherche, alertes, profil
│   ├── StatCard.tsx          # KPI card avec delta + icône
│   ├── StatusBadge.tsx       # Badges : stage, période, alerte, document
│   ├── DataTable.tsx         # Table responsive (hideOnMobile par colonne)
│   ├── SearchFilterBar.tsx   # Barre de recherche + filtres
│   ├── StudentCard.tsx       # Carte élève (mobile-first)
│   ├── PlacementCard.tsx     # Carte fiche stage
│   ├── VisitForm.tsx         # Formulaire visite mobile-first + IA
│   ├── AiAssistantPanel.tsx  # Panneau IA réutilisable + AiSuggestionBox
│   ├── AlertList.tsx         # Liste d'alertes typées
│   ├── EmptyState.tsx
│   ├── ImportBox.tsx         # Drag & drop CSV/Excel + mapping (UI)
│   ├── RoleGuard.tsx         # Garde de rôle (rendu conditionnel)
│   ├── ActivityTimeline.tsx
│   ├── DocumentList.tsx
│   └── TeacherLoadIndicator.tsx
│
├── data/
│   └── demo.ts               # Établissement Jean Moulin, classes, élèves, etc.
│
├── lib/
│   ├── cn.ts                 # className merger
│   ├── supabase.ts           # Stub typé en attendant @supabase/supabase-js
│   └── useCurrentUser.ts     # Hook qui lit le rôle démo dans localStorage
│
├── routes/                   # File-based routing (TanStack Router)
│   ├── __root.tsx
│   ├── index.tsx             # Redirige vers /dashboard, /my-students ou /superadmin
│   ├── login.tsx
│   ├── dashboard.tsx         # Dashboard établissement (DDFPT)
│   ├── superadmin.index.tsx  # Vue globale Superadmin → /superadmin
│   ├── superadmin.establishments.tsx
│   ├── superadmin.ai.tsx
│   ├── classes.tsx
│   ├── students.tsx
│   ├── students.$id.tsx
│   ├── teachers.tsx
│   ├── companies.tsx
│   ├── pfmp-periods.tsx
│   ├── assignments.tsx
│   ├── my-students.tsx       # Vue référent / professeur principal
│   ├── placements.$id.tsx
│   ├── visits.new.tsx
│   ├── visits.$id.tsx
│   ├── documents.tsx
│   ├── alerts.tsx
│   ├── exports.tsx
│   ├── settings.tsx
│   └── activity.tsx
│
├── types/
│   ├── index.ts
│   └── domain.ts             # Toutes les interfaces & enums métier
│
├── router.tsx
└── styles.css                # Tokens @theme + reset minimal

supabase/
└── schema.sql                # Tables, enums, triggers, RLS multi-tenant
```

## Routing

File-based via TanStack Router :

- `students.$id.tsx` → `/students/$id` (param `id`)
- `superadmin.index.tsx` → `/superadmin/`
- `visits.new.tsx` → `/visits/new`

Le `routeTree.gen.ts` est régénéré par le plugin Vite à chaque dev/build.

## Rôles et garde-fous

7 rôles (`UserRole` dans `types/domain.ts`) : `superadmin`, `admin`, `ddfpt`, `principal`, `referent`, `tuteur`, `eleve`.

- **`Sidebar`** filtre les entrées de nav selon `roles: UserRole[]` par item.
- **`<RoleGuard allow={[...]}>`** protège le rendu d'une page (rendu de fallback EmptyState sinon).
- **`useCurrentUser()`** lit l'utilisateur démo depuis `localStorage`. Sera remplacé par un hook qui lit la session Supabase Auth.

Pour la séparation par établissement, voir RLS dans `supabase/schema.sql` :
`is_superadmin()`, `current_establishment_id()`, et politiques `tenant_read` / `tenant_write` générées en boucle pour toutes les tables métier.

## Architecture IA

Tous les appels IA passent par **un seul point d'entrée** : `generateAiResponse()` dans `src/ai/aiService.ts`. Aujourd'hui mocké, demain branché sur une Edge Function Supabase ou une Netlify Function.

Trois assistants distincts (`AssistantType`) : `superadmin`, `establishment`, `teacher`. Chaque assistant a son prompt système et ses garanties. Toute génération est journalisée via `logAiInteraction()`.

Règles invariantes (codées en dur dans les prompts) :

- L'IA n'invente pas, ne décide pas, ne valide pas.
- Toute sortie est un brouillon. Validation humaine obligatoire.
- Une donnée d'un établissement n'est jamais exposée à un autre.

## Données de démo

`src/data/demo.ts` contient l'unique source de vérité pour la démo. Toutes les pages lisent depuis ce module. Pour câbler Supabase, remplacer ces imports par des hooks `useQuery` ou des loaders TanStack Router qui appellent `supabase.from(...)`.

Établissement principal : **Lycée Professionnel Jean Moulin** (id `est_jean_moulin`).
4 classes, 20 élèves, 5 professeurs, 8 entreprises, 8 tuteurs, 2 périodes PFMP, 4 visites, 8 documents, 8 alertes.

## Conventions

### Nommage
- Composants en `PascalCase`, hooks en `camelCase`, routes en kebab-case.
- Types et enums centralisés dans `src/types/domain.ts`.

### Styling
- Tokens couleur via `@theme` dans `styles.css` (`--color-brand`, `--color-success`, etc.).
- Classes Tailwind avec `bg-[var(--color-...)]` pour rester proche des tokens.
- Helper `cn(...)` (`src/lib/cn.ts`) pour merger les classes.
- Mobile-first : grilles, tables et formulaires testés en largeur < 400 px.

### TypeScript
- `strict`, `noUnusedLocals`, `noUnusedParameters` activés.
- Path alias `@/*` → `src/*` (configuré dans `tsconfig.json` et `vite-tsconfig-paths`).

### State
- Hooks React locaux pour l'état UI.
- Zustand uniquement si un état global devient nécessaire (auth, préférences).

## Décisions non-évidentes

- **Pas de `@supabase/supabase-js` dans les dépendances** pour cette phase. `src/lib/supabase.ts` est un stub typé. Ajouter le client quand les variables d'env sont disponibles. La signature est conçue pour minimiser les changements.
- **Switcher de rôle dans la sidebar** — uniquement présent pour la démo. À retirer / cacher derrière un flag dès que Supabase Auth est branché.
- **`__root.tsx` n'a pas de `component`**, seulement un `shellComponent`. C'est intentionnel : le shell reçoit les routes enfants via sa prop `children` (équivalent Outlet pour TanStack Start).
- **Les liens d'alertes utilisent `Link` typé via discriminant sur `relatedEntity.type`** dans `AlertList.tsx`. Cela garantit la sécurité de typage TanStack Router malgré des cibles hétérogènes.
- **Le formulaire de visite a un footer sticky** pour garder « Brouillon / Valider » accessibles pendant la saisie terrain.
- **Les générations IA mockées sont déterministes** par mot-clé du prompt (« relance », « rapport », « point », « retard »). C'est volontaire pour rendre la démo crédible sans appel réseau.

## Prochaines étapes recommandées

1. Brancher `@supabase/supabase-js`, ajouter les variables d'env Netlify, remplacer le stub `lib/supabase.ts`.
2. Implémenter Supabase Auth ; `useCurrentUser()` lira la session.
3. Remplacer les imports de `data/demo.ts` par des loaders TanStack Router qui requêtent Supabase.
4. Connecter `aiService.ts` à une Edge Function Supabase (clé Anthropic / OpenAI côté serveur uniquement).
5. Implémenter l'import CSV/Excel réel (parsing côté client, validation Zod, écriture en lots).
6. Génération PDF (conventions, attestations, comptes rendus) via `pdf-lib` ou Edge Function.
7. Accès tuteur entreprise via tokens magic-link (table `tutor_access_tokens` à ajouter).
8. Tests Playwright pour les parcours référent, DDFPT et superadmin.

## Commandes

```bash
npm run dev      # Dev server sur :3000
npm run build    # Build production (sortie dans dist/)
```
