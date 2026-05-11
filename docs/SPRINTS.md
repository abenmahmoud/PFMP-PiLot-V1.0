# PFMP Pilot — Sprints tracking (v2)

> **Source de vérité opérationnelle.**
> Mis à jour à chaque ouverture/fermeture de sprint.
> Référence pour Claude (orchestration) et Codex (exécution).

**Dernière mise à jour :** 11 mai 2026 (P1.2.1 + P1.2.2 mergés + audit Claude, doctrine SIECLE actée)

---

## Légende statuts

- 🔵 **À démarrer** — brief écrit, pas commencé
- 🟡 **En cours** — Codex code, ou Claude révise
- 🟢 **Mergé** — PR mergée sur main, validé
- 🔴 **Bloqué** — décision produit ou problème technique

---

## Sprints fondations (terminés)

| ID | Titre | PR | Owner | Audit Claude | Statut |
|---|---|---|---|---|---|
| S0 | Cleanup repo | #4 (`2da108e`) | Codex | OK | 🟢 |
| S1 | Tenant routing + 0002 | #4 (`bcd6492`) | Codex | OK | 🟢 |
| S2 | Auth + superadmin switcher + 0003 | #5 (`702545c`) | Codex | OK | 🟢 |
| S3 | RLS hardening + 0004 | #6 (`29150fc`) | Codex | OK | 🟢 |

---

## P0 — Fondations production réelles

| ID | Titre | Brief | Plan Codex | PR | Audit | Statut |
|---|---|---|---|---|---|---|
| P0.1 | Copie démo réf + audit imports | `briefs/P0.1.md` ✅ | `sprints/P0.1_plan.md` ✅ | [#7](https://github.com/abenmahmoud/PFMP-PiLot-V1.0/pull/7) | `sprints/P0.1_pr_audit.md` GO | ✅ MERGÉ (`117e86b`) |
| P0.2 | Validation prod Sprint 3 | `briefs/P0.2.md` ✅ | — | — | — | 🟡 EN COURS (Codex prépare plan) |
| P0.3 | Dashboard lit Supabase | `briefs/P0.3.md` ✅ | — | — | — | 🔵 |
| P0.4 | Students lecture Supabase | `briefs/P0.4.md` ✅ | — | — | — | 🔵 |
| P0.5 | Companies lecture Supabase | `briefs/P0.5.md` ✅ | — | — | — | 🔵 |
| P0.6 | My students filtré référent | `briefs/P0.6.md` ✅ | — | — | — | 🔵 |
| P0.7 | createVisit réel | `briefs/P0.7.md` ✅ | — | — | — | 🔵 |
| P0.8 | Validation visite CR | `briefs/P0.8.md` ✅ | — | — | — | 🔵 |
| P0.9 | Empty states + RoleGuard | `briefs/P0.9.md` ✅ | — | — | — | 🔵 |

---

## P1 — Productivité établissement de base

> Note : un sprint **P1.2 invitations DDFPT** (hors-roadmap initiale, demandé par BraveHeart pour débloquer le flow superadmin→tenant) a été inséré et mergé le 11 mai 2026 (PR #24). Voir `sprints/P1.2_pr_audit.md`. Les P1.1-P1.5 ci-dessous restent ceux de la roadmap v2.

| ID | Titre | Brief | PR | Statut |
|---|---|---|---|---|
| P1.2 (hors-roadmap) | Invitations DDFPT + email FR | — | [#24](https://github.com/abenmahmoud/PFMP-PiLot-V1.0/pull/24) (`7a0582a`) | ✅ MERGÉ (`sprints/P1.2_pr_audit.md` GO) |
| P1.2.1 (hors-roadmap) | Identité tenant éditable + SetupChecklist | `briefs/P1.2.1_tenant_identity_setup_checklist.md` ✅ | [#25](https://github.com/abenmahmoud/PFMP-PiLot-V1.0/pull/25) (`3cac9d1`) | ✅ MERGÉ (`sprints/P1.2.1_P1.2.2_P1.3_audit_claude.md` GO) |
| P1.2.2 (hors-roadmap) | Lien tenant + QR code établissement | `briefs/P1.2.2_tenant_access_link_qr.md` ✅ | [#26](https://github.com/abenmahmoud/PFMP-PiLot-V1.0/pull/26) + [#28](https://github.com/abenmahmoud/PFMP-PiLot-V1.0/pull/28) (`977418e`) | ✅ MERGÉ (`sprints/P1.2.1_P1.2.2_P1.3_audit_claude.md` GO) |
| P1.3 | Import SIECLE classes + élèves | `briefs/P1.3_siecle_import_classes_students.md` ✅ | — | 🔵 prêt |
| P1.4 | Codes élèves par classe | `briefs/P1.4_student_codes_by_class.md` ✅ | — | 🔵 prêt |
| P1.5 | Portail entrée Administration / Enseignant / Élève | — | — | 🔵 à briefer |
| P1.6 | Import XLSX entreprises | `briefs/P1.3_import_companies.md` ✅ | — | 🔵 prêt à renommer |
| P1.7 | Affectations PP → référents | `briefs/P1.4_assignments.md` ✅ | — | 🔵 prêt à renommer |
| P1.8 | Périodes PFMP CRUD | `briefs/P1.5_pfmp_periods.md` ✅ | — | 🔵 prêt à renommer |

---

## P2 — 🆕 Intelligence référentielle (différenciateur produit)

| ID | Titre | Brief | PR | Statut |
|---|---|---|---|---|
| P2.1 | Schema `formation_referential` + setup (+ migration 0005) | `briefs/P2.1.md` ✅ | — | 🔵 prêt |
| P2.2 | Module 27 : Analyseur IA superadmin (Edge Function) | `briefs/P2.2.md` ✅ | — | 🔵 prêt |
| P2.3 | Lien classe ↔ référentiel (avec heuristique) | `briefs/P2.3.md` ✅ | — | 🔵 prêt |
| P2.4 | Module 26 onglet Coordonnées + workflow sensible (+ migration 0007) | `briefs/P2.4.md` ✅ | — | 🔵 prêt |
| P2.5 | Module 26 onglets Référentiels + Documents + Alertes (+ migration 0008) | `briefs/P2.5.md` ✅ | — | 🔵 prêt |
| P2.6 | Génération PDF templates + référentiel | `briefs/P2.6.md` ✅ | — | 🔵 prêt |
| P2.7 | Page validation sensible superadmin (+ migration 0009) | `briefs/P2.7.md` ✅ | — | 🔵 prêt |

---

## P3 — Signatures et workflow tuteur

| ID | Titre | Brief | PR | Statut |
|---|---|---|---|---|
| P3.1 | Token sécurisé tuteur (`/sign/:token`) (+ migration 0010) | `briefs/P3.1.md` ✅ | — | 🔵 prêt |
| P3.2 | Signature simple côté tuteur (+ migration 0011) | `briefs/P3.2.md` ✅ | — | 🔵 prêt |
| P3.3 | Dossier de preuve par élève (ZIP avec manifest) | `briefs/P3.3.md` ✅ | — | 🔵 prêt |
| P3.4 | Assistant IA professeur (CR visite, Claude Haiku) | `briefs/P3.4.md` ✅ | — | 🔵 prêt |
| P3.5 | Exports en lot classe/période/année (+ migration 0012) | `briefs/P3.5.md` ✅ | — | 🔵 prêt |

---

## P4 — Commercial et scaling

| ID | Titre | Brief | PR | Statut |
|---|---|---|---|---|
| P4.1 | Landing page publique (Next.js/Astro) | `briefs/P4.1.md` ✅ | — | 🔵 prêt |
| P4.2 | Tunnel demande de licence (+ migration 0013) | `briefs/P4.2.md` ✅ | — | 🔵 prêt |
| P4.3 | Backoffice superadmin onboarding wizard (+ migration 0014) | `briefs/P4.3.md` ✅ | — | 🔵 prêt |
| P4.4 | eIDAS prestataire Yousign (+ migration 0015) | `briefs/P4.4.md` ✅ | — | 🔵 prêt |
| P4.5 | Stripe abonnement annuel (+ migration 0016) | `briefs/P4.5.md` ✅ | — | 🔵 prêt |

---

## Décisions produit (trace écrite)

### 7 mai 2026 — Vidage prod
- Décision : prod doit être vide, pas de seed démo en prod
- Action : suppression atomique des 5 establishments + 9 profils + 9
  users seed. Promotion `test@pfmp-pilot.fr` superadmin.
- État final DB : `auth.users=1`, `profiles=1` (superadmin), tout le
  reste à 0.

### 7 mai 2026 — Méthode de travail Claude ↔ Codex
- Décision : repo GitHub = single source of truth (pas Notion).
- AGENTS.md = hub. docs/VISION.md = sacré. docs/ROADMAP.md = vivant.
- Codex = peer collaborateur (pas ouvrier). Plan d'attaque proposé
  avant code, dialogue mid-execution, co-audit avant merge.

### 7 mai 2026 — Identité produit
- Décision : PFMP Pilot AI a une identité **autonome**, sobre,
  Éducation Nationale (pas branding Essuf).
- Branding Essuf reste pour Essuf-Group lui-même (holding) + Essuf
  Music.
- Nom final non encore décidé (BraveHeart cherche mieux).

### 7 mai 2026 — Modèle commercial
- Décision : Standard / Premium IA + add-on Mise en place obligatoire
  (chaque lycée = formulaires + livret + grilles compétences
  sur-mesure).
- Trial : 90 jours **après signature contrat**.
- Stripe : pas avant P4.5.
- Tarifs cibles : placeholders pour l'instant, décidés plus tard.

### 7 mai 2026 — Pilote zéro
- Décision : Lycée Polyvalent Blaïse Cendrars (école de BraveHeart),
  gratuit, valider en réel.
- 2 Bac Pro (MELEC, PCEPC) + 2 CAP (AQE, ETL).
- BraveHeart a fourni : convention type, 6 livrets PFMP, attestations,
  CSV 1158 élèves, XLSX 646 entreprises.
- Conformité RGPD : CSV/XLSX nominatifs en `.gitignore`, jamais en
  repo public.

### 7 mai 2026 — VISION v2 (règle d'or référentielle)
- Décision : ajout du **module 26** (espace paramétrage avec 4
  sous-onglets) et **module 27** (analyseur IA superadmin).
- Élève → classe → `formation_referential` → tout déduit
  automatiquement (convention, livret, attestation, AP, compétences).
- Champs sensibles (RNE, raison sociale, proviseur signataire,
  assureur, mentions légales) : modification admin → validation
  superadmin obligatoire.
- Phase P2 ajoutée à la roadmap (entre l'ancienne P1 et l'ancienne
  P2 documents/signatures, qui devient P3).

### 11 mai 2026 — P1.2.1 + P1.2.2 mergés + régularisation stacked PRs
- PR #25 (P1.2.1 identité tenant + SetupChecklist) : auditée GO_MERGE, mergée sur main (`901a8f8`).
- PR #26 (P1.2.2 TenantAccessCard + QR) et PR #27 (doctrine SIECLE) : initialement mergées dans des branches empilées au lieu de main.
- Régularisation via PR #28 (`436fee0`) qui ramène tous les commits sur main : TenantAccessCard, lib/tenantAccess, qrcode.react@4.2.0, briefs P1.3/P1.4 SIECLE, ROADMAP/SPRINTS/VISION update doctrine.
- Audit complet Claude : `sprints/P1.2.1_P1.2.2_P1.3_audit_claude.md` (`640b2a8`). Build + typecheck verts sur les 3 PR. Aucun blocker.
- Investigation "boutons cassés" : code statiquement OK, hypothèses popup blocker / confusion produit / test localhost. À valider en test manuel BraveHeart.
- Prochaine étape : test prod 15 min puis P1.2.3 Resend SMTP avant P1.3 import SIECLE.

### 11 mai 2026 — P1.2 invitations DDFPT (hors-roadmap)
- Décision : insertion d'un sprint hors-roadmap pour débloquer le flow superadmin → DDFPT
avant d'attaquer P1.1 (import CSV élèves).
- Livré (PR #24, `7a0582a`) : `/admin/users`, `/onboarding`, API service-role
`auth.admin.inviteUserByEmail`, audit log `user.invited`.
- Découverte critique : trigger `handle_new_user()` hardcodait `role='eleve'`. Corrigé via
migration `fix_handle_new_user_role_propagation` (lecture `raw_user_meta_data.role`).
- Action manuelle Supabase Auth (URL Config prod + email template FR) faite par Claude
via Chrome MCP. Voir `sprints/P1.2_pr_audit.md`.
- Suivi P1.2.1 (hors-roadmap aussi) : identité tenant éditable + SetupChecklist sur dashboard.

### 11 mai 2026 — SMTP built-in flag
- Décision : continuer avec SMTP built-in Supabase pour la phase actuelle (1 invitation
test → OK). Rate limit ~4 emails/h tolérable.
- Bloquant avant phase pilote Blaïse Cendrars : sprint dédié configuration Resend SMTP
à insérer **après P1.2.1**, **avant P1.1** (import CSV élèves = vague d'invitations).

### 11 mai 2026 — Accès élèves : SIECLE d'abord, pas d'invitation email
- Décision : les élèves ne seront pas invités par email dans le MVP.
- Source prioritaire pour créer classes + élèves : export SIECLE.
- Les accès élèves seront générés par classe, avec un code personnel par élève.
- Un code partagé par classe est interdit.
- Les adultes gardent des comptes nominatifs pour audit, validation et responsabilité.
- Roadmap réordonnée : P1.3 import SIECLE, P1.4 codes élèves, P1.5 portail d'entrée.
- Trace détaillée : `sprints/P1.3_siecle_student_access_decision.md`.

### 7 mai 2026 — Briefs P0.1-P0.9 alignés v2
- Décision : tous les briefs P0 incluent une note "Note v2" qui
  rappelle de **NE PAS anticiper** la logique référentielle.
- P0 reste "lecture Supabase basique des tables existantes".
- La règle d'or arrive en P2 avec un sprint dédié à la migration des
  classes vers `formation_referential_id`.
