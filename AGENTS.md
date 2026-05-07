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
│   ├── supabase.ts           # Client Supabase lazy + helpers env (isDemoMode, isSupabaseConfigured)
│   ├── auth.ts               # signInWithPassword, fetchProfile, buildAuthState, subscription
│   ├── tenant.ts             # Multi-tenant : extractTenantSlug, getTenantFromHostname
│   ├── permissions.ts        # Réplique RLS côté client (UX), pas la sécurité
│   ├── audit.ts              # logAudit() — trace dans audit_logs
│   ├── database.types.ts     # Row types nommés (regénérer via supabase gen types)
│   └── useCurrentUser.ts     # Hook démo (localStorage). Sera remplacé par AuthProvider
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
├── migrations/
│   └── 0001_init.sql         # Schéma complet (tables, enums, triggers, RLS, multi-tenant Vercel)
├── seed.sql                  # Données de démo (Lycée Jean Moulin + 4 lycées superadmin)
└── README.md                 # Procédure migration / seed / comptes démo
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

Pour la séparation par établissement, voir RLS dans `supabase/migrations/0001_init.sql` :
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

- **`@supabase/supabase-js` est installé**. `src/lib/supabase.ts` expose `getSupabase()` (lazy, typage non paramétré en attendant `supabase gen types`). `src/lib/auth.ts`, `src/lib/tenant.ts`, `src/lib/permissions.ts`, `src/lib/audit.ts` sont prêts mais **aucune page ne les utilise encore** — le frontend reste sur `data/demo.ts` derrière le flag `VITE_DEMO_MODE`.
- **Switcher de rôle dans la sidebar** — uniquement présent pour la démo. À cacher derrière `import.meta.env.PROD && !VITE_DEMO_MODE` quand Supabase Auth sera branchée page par page.
- **`__root.tsx` n'a pas de `component`**, seulement un `shellComponent`. C'est intentionnel : le shell reçoit les routes enfants via sa prop `children` (équivalent Outlet pour TanStack Start).
- **Les liens d'alertes utilisent `Link` typé via discriminant sur `relatedEntity.type`** dans `AlertList.tsx`. Cela garantit la sécurité de typage TanStack Router malgré des cibles hétérogènes.
- **Le formulaire de visite a un footer sticky** pour garder « Brouillon / Valider » accessibles pendant la saisie terrain.
- **Les générations IA mockées sont déterministes** par mot-clé du prompt (« relance », « rapport », « point », « retard »). C'est volontaire pour rendre la démo crédible sans appel réseau.
- **Hosting Vercel via Nitro** (et non plus Netlify). Le `vite.config.ts` charge `nitro/vite` qui détecte automatiquement l'environnement Vercel via `VERCEL=1` et génère `.vercel/output/`. Voir `vercel.json` pour `framework: null` (force Vercel à ne pas appliquer un preset par-dessus).
- **Migration SQL consolidée** : `supabase/migrations/0001_init.sql` (1405 lignes, 26 tables, 92 policies, 71 index). Idempotente, testée bout-en-bout sur Postgres 16. Inclut le multi-tenant Vercel (`slug`, `subdomain`, `custom_domain`, `domain_verified`, `primary_color`, `status`).
- **Database typing** : `database.types.ts` expose des Row types nommés (`StudentRow`, `VisitRow`, etc.) mais pas de `Database` global — sera regénéré via `supabase gen types typescript --project-id <id>` une fois le projet Supabase créé.

## Prochaines étapes recommandées

1. Créer le projet Supabase (région EU pour RGPD), pousser `supabase db push` (ou coller la migration dans le SQL Editor), créer les buckets Storage privés (`documents-private`, `proof-files`, `generated-pdfs`, `company-stamps`).
2. Régénérer `src/lib/database.types.ts` via `supabase gen types typescript --project-id <id> > src/lib/database.types.ts`. Cela typera automatiquement `getSupabase()` et tous les services à venir.
3. Câbler `useCurrentUser()` sur `auth.buildAuthState()` derrière le flag `VITE_DEMO_MODE`. Ajouter un `AuthProvider` à la racine.
4. Brancher `/login` sur `signInWithPassword()`. Garder le bouton "Entrer dans la démo" en `import.meta.env.DEV`.
5. Créer `src/services/*` (un service par domaine) qui lisent Supabase, retournent les Row types. Migrer pages dans cet ordre : `/dashboard` → `/students` → `/students/$id` → `/companies` → `/documents` → `/my-students` → `/superadmin`.
6. Brancher les mutations : création visite, validation visite, affectation référent, création entreprise.
7. Connecter `aiService.ts` à une Edge Function Supabase (clé Anthropic / OpenAI côté serveur uniquement).
8. Module signatures réel : génération PDF (`pdf-lib` côté Edge Function), workflow `tutor_access_tokens`, page publique `/sign/$token`.
9. Middleware Vercel pour résolution hostname → tenant via `slug` / `custom_domain`.
10. Tests Playwright pour les parcours référent, DDFPT et superadmin.

## Commandes

```bash
npm run dev          # Dev server sur :3000 (mode démo si pas de VITE_SUPABASE_URL)
npm run typecheck    # tsc --noEmit
npm run build        # Build production (Nitro génère .vercel/output sur Vercel, .output sinon)
npm run check        # typecheck + build
npm run clean        # supprime dist/ .vercel/ .output/ .netlify/
```

---

## 🎯 Hub projet — méthode de travail Claude ↔ Codex ↔ BraveHeart

> Ajouté le 7 mai 2026. Cette section définit comment les 3 collaborateurs avancent ensemble.

### Source de vérité

- **`docs/VISION.md`** — produit final cible (figé, sacré, ne change pas sans décision explicite)
- **`docs/ROADMAP.md`** — éclatement P0/P1/P2/P3 vivant
- **`docs/SPRINTS.md`** — tableau de tracking des sprints (statut, PR, audit)
- **`docs/briefs/PX.Y_*.md`** — un brief par sprint, format strict
- **`docs/sprints/PX.Y_*.md`** — rapports d'exécution Codex + audits Claude
- **`data-reference/`** — copies figées de référence (ex : `demo.reference.ts`)

### Rôles des 3 collaborateurs

**BraveHeart (Adel)** — décideur produit
- Tranche les choix produit / commerciaux / éthiques
- Valide les briefs avant exécution
- Merge les PR après audit
- Fournit les artefacts métier réels (conventions, livret de suivi, grilles compétences)
- Teste en prod après chaque sprint

**Claude (orchestration)** — co-architecte et reviewer
- Audite le code existant avant de proposer un sprint
- Rédige les briefs sprint en collaboration avec Codex
- Pilote l'infrastructure (Supabase via Chrome MCP, Vercel, DNS)
- Audite chaque PR Codex avant merge (clone + typecheck + revue critique)
- Tient à jour `ROADMAP.md` et `SPRINTS.md`

**Codex** — co-développeur
- Lit le brief, **propose son plan d'attaque** dans `docs/sprints/PX.Y_plan.md` avant de coder
- Code en autonomie une fois le plan validé
- Ouvre une PR avec rapport au format strict
- Dialogue avec Claude/BraveHeart si doute mid-execution

**Codex n'est pas un ouvrier de Claude.** C'est un peer. Les briefs donnent le **pourquoi** et les **contraintes**, Codex décide le **comment** technique selon son expertise. Claude révise les choix avec respect.

### Workflow d'un sprint

```
1. Claude rédige docs/briefs/PX.Y_titre.md
   (objectif, contexte, contraintes non-négociables, critères d'acceptation, format rapport)

2. BraveHeart lit le brief, valide ou demande modif

3. Claude colle l'URL GitHub du brief à Codex avec consigne :
   "Lis ce brief, propose ton plan d'attaque dans docs/sprints/PX.Y_plan.md
    en commit séparé avant de toucher au code métier."

4. Codex commit son plan. Claude révise. Dialogue éventuel.

5. Codex code, ouvre une PR.

6. Codex écrit son rapport dans docs/sprints/PX.Y_rapport.md
   (format défini dans le brief : fichiers modifiés, décisions prises,
    ce qui reste mocké, blockers, build/typecheck verts)

7. Claude clone la PR, audit dans docs/sprints/PX.Y_audit.md
   (verdict GO/CHANGES_REQUESTED, points de revue, suggestions)

8. BraveHeart merge si Claude dit GO.

9. SPRINTS.md mis à jour, sprint suivant ouvert.
```

### Format strict des briefs (template)

```markdown
# PX.Y — [Titre du sprint]

## Objectif fonctionnel
[1 phrase : ce que l'utilisateur final pourra faire après ce sprint]

## Contexte
[État actuel du code concerné, dépendances, ce qui doit rester intact]

## Contraintes non-négociables
- Mode démo (`VITE_DEMO_MODE=true`) doit continuer à fonctionner
- Build et typecheck verts à la fin
- RLS jamais contournée
- Mobile-first si UI

## Critères d'acceptation
- [ ] Critère 1 vérifiable
- [ ] Critère 2 vérifiable
- ...

## Fichiers concernés (audit Claude initial)
- `src/...` (lecture)
- `src/...` (écriture)
- `supabase/migrations/...` (si nécessaire)

## Format de rapport attendu (Codex)
1. Fichiers modifiés/créés (liste)
2. Décisions techniques prises (avec pourquoi)
3. Ce qui reste mocké ou TODO
4. Blockers rencontrés
5. Preuves : build OK, typecheck OK, captures d'écran si UI

## Estimation : X-Y heures
```

### Règles de PR

- Une PR par sprint (squash merge sur main)
- Titre : `PX.Y: [titre court]`
- Description : copie du critère d'acceptation cochée
- Audit Claude obligatoire avant merge (sauf cas trivial)
