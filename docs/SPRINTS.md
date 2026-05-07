# PFMP Pilot — Sprints tracking

> **Source de vérité opérationnelle.**
> Mis à jour à chaque ouverture/fermeture de sprint.
> Référence pour Claude (orchestration) et Codex (exécution).

**Dernière mise à jour :** 7 mai 2026

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
| P0.1 | Copie démo référence + cleanup useCurrentUser | `briefs/P0.1.md` | — | — | — | 🔵 |
| P0.2 | Validation prod Sprint 3 | — | — | — | — | 🔵 |
| P0.3 | Dashboard lit Supabase | — | — | — | — | 🔵 |
| P0.4 | Students lecture Supabase | — | — | — | — | 🔵 |
| P0.5 | Companies lecture Supabase | — | — | — | — | 🔵 |
| P0.6 | My students filtré référent | — | — | — | — | 🔵 |
| P0.7 | createVisit réel | — | — | — | — | 🔵 |
| P0.8 | Validation visite CR | — | — | — | — | 🔵 |
| P0.9 | Empty states + RoleGuard | — | — | — | — | 🔵 |

---

## P1 — Productivité établissement

| ID | Titre | Brief | PR | Statut |
|---|---|---|---|---|
| P1.1 | Import CSV élèves/classes/profs | — | — | 🔵 |
| P1.2 | Affectations élève → prof référent | — | — | 🔵 |
| P1.3 | Documents lecture + association | — | — | 🔵 |
| P1.4 | Audit logs actifs | — | — | 🔵 |
| P1.5 | Superadmin stats agrégées | — | — | 🔵 |

---

## P2 — Documents et signatures

| ID | Titre | Brief | PR | Statut |
|---|---|---|---|---|
| P2.1 | Génération PDF (convention, attestation) | — | — | 🔵 |
| P2.2 | Token sécurisé tuteur (`/sign/:token`) | — | — | 🔵 |
| P2.3 | Signature simple côté tuteur | — | — | 🔵 |
| P2.4 | Dossier de preuve | — | — | 🔵 |
| P2.5 | Assistant IA professeur | — | — | 🔵 |

---

## P3 — Commercial et scaling

| ID | Titre | Brief | PR | Statut |
|---|---|---|---|---|
| P3.1 | Landing page pfmp-pilot.fr | — | — | 🔵 |
| P3.2 | Tunnel demande de licence | — | — | 🔵 |
| P3.3 | Backoffice superadmin onboarding | — | — | 🔵 |
| P3.4 | Intégration eIDAS | — | — | 🔵 |
| P3.5 | Stripe abonnement annuel | — | — | 🔵 |

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

### 7 mai 2026 — Modèle commercial
- Décision : Standard / Premium IA + add-on Mise en place obligatoire
  (chaque lycée = formulaires + livret + grilles compétences
  sur-mesure).
- Trial : 90 jours **après signature contrat**.
- Stripe : pas avant P3.5.

### 7 mai 2026 — Pilote zéro
- Décision : Lycée Polyvalent Blaïse Cendrars (école de BraveHeart),
  gratuit, valider en réel.
- BraveHeart fournit : convention PFMP réelle, livret de suivi, grilles
  compétences pour 1 ou 2 métiers.
