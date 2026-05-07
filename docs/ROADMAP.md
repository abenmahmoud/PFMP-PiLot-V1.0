# PFMP Pilot — Roadmap

> **Document vivant.**
> Mis à jour à chaque sprint avec le statut, les blockers et les
> apprentissages. Voir `SPRINTS.md` pour le tracking détaillé.

**Principe** : avancer par phases priorisées (P0 → P3), avec build et
typecheck verts à chaque étape. Mode démo préservé jusqu'à ce que la
prod soit complète.

**Dernière mise à jour :** 7 mai 2026

---

## ⚡ Statut global

| Phase | Sprints fait | Sprints restant | Statut |
|---|---|---|---|
| **Sprint 0** Cleanup repo | ✅ | — | Mergé |
| **Sprint 1** Tenant routing | ✅ | — | Mergé |
| **Sprint 2** Auth + superadmin switcher | ✅ | — | Mergé |
| **Sprint 3** RLS hardening | ✅ | — | Mergé |
| **P0** Fondations production | 0 | 9 | À démarrer |
| **P1** Productivité établissement | 0 | 5 | Pas commencé |
| **P2** Documents et signatures | 0 | 5 | Pas commencé |
| **P3** Commercial et scaling | 0 | 5 | Pas commencé |

---

## ✅ Sprints terminés (fondations techniques)

### Sprint 0 — Cleanup repo (PR #4)
Nettoyage des fichiers mal placés, structure propre.

### Sprint 1 — Tenant routing + schema fix (PR #4)
Migration `0002_tenant_routing.sql` : ajout `slug`, `subdomain`,
`custom_domain`, `domain_verified`, `primary_color`, `status` sur
`establishments`. Tenant resolver branché dans `__root.tsx` via
`createServerFn` + `beforeLoad`. Hook `useTenant()`.

### Sprint 2 — Auth Supabase + superadmin switcher (PR #5)
Migration `0003_auth_jwt.sql` : `current_establishment_id()` JWT-aware,
trigger `handle_new_user()`, trigger `set_updated_at()` sur profiles.
AuthProvider React, `/deconnexion`, `SuperadminTenantSwitcher`,
login.tsx câblé.

### Sprint 3 — RLS hardening + tests d'isolation (PR #6)
Migration `0004_rls_hardening.sql` : 14 indexes establishment_id, 15
triggers `prevent_tenant_change`, vue `rls_audit`, policies
`user_roles`. Script `rls_isolation.sql` (5 tests, jamais lancés en
réel).

---

## 🎯 P0 — Fondations production réelles

**Objectif :** Le parcours MVP étapes 7-12 fonctionne en prod (un prof
référent se logge, voit ses élèves, fait une visite, valide son CR).

**Estimé :** 2-3 semaines

### P0.1 — Copie démo de référence + nettoyage useCurrentUser
- Copier `src/data/demo.ts` → `data-reference/demo.reference.ts` (figé)
- Vérifier que `useCurrentUser` bridge bien démo↔Supabase (Sprint 2)
- Ajouter empty states clairs partout où il y avait des données démo
- **Critère done :** un user prod loggé voit "vous n'avez encore rien"
  proprement, sans crash, sans données démo en prod

### P0.2 — Validation prod Sprint 3
- Lancer `rls_isolation.sql` sur la vraie DB
- Tester login en prod via URL Vercel
- Vérifier le dropdown superadmin
- **Critère done :** rapport `docs/sprints/P0.2_validation.md` avec
  preuves (screenshots, logs)

### P0.3 — Dashboard lit Supabase (DDFPT)
- `dashboard.tsx` : remplacer imports `@/data/demo` par hooks Supabase
- Compteurs : élèves PFMP, élèves sans stage, conventions en attente,
  visites en retard, etc. — calculs SQL, pas client-side
- **Critère done :** le DDFPT du Lycée Blaïse Cendrars (créé
  manuellement) voit son dashboard avec ses vrais chiffres

### P0.4 — Students lecture Supabase
- `students.tsx` : SELECT supabase filtré par tenant via RLS
- `students.$id.tsx` : fiche élève complète
- **Critère done :** liste + détail élève fonctionnels

### P0.5 — Companies lecture Supabase
- `companies.tsx` : SELECT supabase
- Recherche par ville, secteur, famille de métiers, fiabilité
- **Critère done :** réseau entreprises consultable

### P0.6 — My Students (espace référent)
- `my-students.tsx` : filtré par `teacher_assignments` du user courant
- Cartes mobile-first (gros boutons)
- Boutons : itinéraire, appeler tuteur, fiche stage, visite, documents
- **Critère done :** un prof référent voit UNIQUEMENT ses élèves affectés

### P0.7 — Création visite réelle (`/visits/new`)
- Formulaire mobile-first câblé sur `INSERT visits`
- Sauvegarde brouillon
- Audit log entrée
- **Critère done :** prof crée une visite, elle est en DB

### P0.8 — Validation compte rendu (`/visits/$id`)
- UPDATE statut visite : brouillon → validé
- Audit log
- **Critère done :** DDFPT voit la visite validée dans son dashboard

### P0.9 — Sécurisation et empty states finaux
- Tous les écrans ont un empty state pro quand Supabase retourne 0 rows
- RoleGuard branché correctement sur les routes sensibles
- **Critère done :** tour complet du MVP sans bug ni écran cassé

---

## 🎯 P1 — Productivité établissement

**Objectif :** Le parcours MVP étapes 1-6 (préparation par DDFPT)
fonctionne. Le DDFPT peut tout configurer.

**Estimé :** 2 semaines

### P1.1 — Import CSV élèves/classes/profs
- Page `/import` avec drag & drop
- Mapping colonnes intelligent
- Détection doublons
- Rapport import avec erreurs
- **Critère done :** Blaïse Cendrars importé en 5 min

### P1.2 — Création/affectation élèves → profs référents
- `/assignments` câblé en CRUD complet
- Vue charge professeur (TeacherLoadIndicator)
- Alerte surcharge
- **Critère done :** affectations enregistrées en DB et reflétées dans
  my-students

### P1.3 — Documents lecture + association
- `/documents` câblé (DocumentList)
- Upload basique vers `documents-private` bucket
- **Critère done :** un document peut être uploadé et associé à une
  classe

### P1.4 — Audit logs actifs partout
- Brancher `logAudit()` sur toutes les mutations existantes
- Page `/activity` lit `audit_logs`
- **Critère done :** chaque action laisse une trace

### P1.5 — Superadmin stats agrégées
- `superadmin.index.tsx` lit Supabase
- Compteurs cross-tenant (sans données nominatives)
- Liste établissements avec score activité
- **Critère done :** le superadmin a un vrai cockpit

---

## 🎯 P2 — Documents et signatures

**Objectif :** Le cycle PFMP complet avec génération de documents et
signature tuteur.

**Estimé :** 2 semaines

### P2.1 — Génération PDF
- Convention PFMP avec champs dynamiques (élève, dates, entreprise…)
- Attestation de stage
- Stockage `generated-pdfs`
- **Critère done :** convention générée pour un élève réel

### P2.2 — Token sécurisé tuteur (`/sign/:token`)
- Génération token (table `tutor_access_tokens`)
- Lien unique par envoi email
- Expiration
- **Critère done :** un tuteur reçoit un lien, l'ouvre, voit la fiche
  stage limitée

### P2.3 — Signature simple côté tuteur
- Dessin signature ou case "j'atteste"
- Hash document
- Sauvegarde dans `proof-files`
- **Critère done :** signature simple opérationnelle (pas eIDAS)

### P2.4 — Dossier de preuve
- Génération automatique : doc original + signatures + horodatage +
  audit log
- Téléchargement ZIP complet
- **Critère done :** dossier de preuve solide juridiquement (sauf
  qualification eIDAS)

### P2.5 — Assistant IA professeur (Edge Function)
- Edge Function Supabase Anthropic API
- Prompts dans `aiPrompts.ts`
- Logs dans `ai_interactions`
- **Critère done :** un prof écrit 3 lignes de notes, reçoit un brouillon
  CR propre

---

## 🎯 P3 — Commercial et scaling

**Objectif :** Pouvoir vendre PFMP Pilot AI.

**Estimé :** 2-3 semaines

### P3.1 — Landing page publique pfmp-pilot.fr
- Pages : présentation produit, comparatif Standard vs Premium IA, FAQ,
  contact
- Identité visuelle sobre Éducation Nationale
- **Critère done :** landing live avec formulaire contact

### P3.2 — Tunnel demande de licence
- Formulaire structuré (nom lycée, UAI, ville, contact, métiers
  enseignés, choix plan, add-on mise en place)
- Envoi email à BraveHeart
- **Critère done :** un lycée peut demander un devis

### P3.3 — Backoffice superadmin pour configurer un nouveau lycée
- Création tenant via UI
- Config formulaires sur-mesure (livret, conventions, grilles
  compétences)
- Génération identifiants admin
- Email de bienvenue
- **Critère done :** BraveHeart configure un nouveau lycée en 30 min

### P3.4 — eIDAS prestataire signature qualifiée
- Choix prestataire (Yousign / Universign / LexPersona…)
- Intégration API
- Migration des signatures simples vers qualifiées sur demande
- **Critère done :** signature qualifiée disponible pour conventions

### P3.5 — Stripe abonnement annuel
- Plans : Standard, Premium IA
- Add-on mise en place facturé séparément
- Trial 90 jours
- Renouvellement annuel auto
- **Critère done :** un lycée peut payer en ligne

---

## 🚧 Contraintes opérationnelles permanentes

À chaque sprint, vérifier :

1. **Build** : `npm run build` — succès
2. **Typecheck** : `npm run typecheck` — 0 erreur
3. **Mode démo** : `VITE_DEMO_MODE=true` continue de fonctionner sans
   Supabase
4. **RLS** : aucune route ne contourne RLS (pas de `service_role` côté
   client)
5. **Mobile** : test responsive sur 375px (iPhone SE) minimum

Toute régression sur ces 5 points = blocker du sprint.
