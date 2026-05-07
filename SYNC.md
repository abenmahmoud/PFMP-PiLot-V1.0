# SYNC — Source de vérité pour la collaboration multi-IA

> **Document central de synchronisation** entre BraveHeart (humain), Claude
> (orchestration), et Codex (implémentation).
>
> **Mis à jour à chaque push significatif sur main.**
>
> **Version courante :** 2026-05-07 — sync post P3/P4 briefs

---

## 🚨 Règle d'or

**Avant de coder quoi que ce soit, TOUJOURS commencer par :**

```bash
git pull --rebase origin main
git log --oneline -10
cat SYNC.md
```

Si tu vois des commits que tu ne connaissais pas → lis-les, comprends-les,
adapte-toi. **Ne pas re-coder ce qui est déjà fait.**

---

## 📍 État actuel du sprint en cours

| Champ | Valeur |
|---|---|
| **Sprint actif** | `P0.1` (et UNIQUEMENT P0.1) |
| **Brief** | [`docs/briefs/P0.1_copy_demo_reference.md`](./docs/briefs/P0.1_copy_demo_reference.md) |
| **Owner code** | Codex |
| **Auditeur** | Claude |
| **Reviewer final** | BraveHeart |
| **Statut** | 🟡 EN COURS — Codex doit reprendre à l'étape 5 |

### Étapes du sprint P0.1

| Étape | Description | Statut | Fait par |
|---|---|---|---|
| 1 | Audit du repo (relectures fichiers existants) | ✅ DONE | Codex |
| 2 | Création `data-reference/demo.reference.ts` | ✅ DONE | Claude (commit `5b6831a` — Codex avait un blocker env) |
| 3 | `useCurrentUser` : audit only (PAS de patch) | ⏭️ À DOC | Codex (audit only, voir P0.1_answers.md) |
| 4 | `EmptyState` : audit only (PAS de modif) | ⏭️ À DOC | Codex (audit only, voir P0.1_answers.md) |
| 5 | **Audit imports `@/data/demo`** (24 fichiers) | ⏳ À FAIRE | Codex |
| 6 | Rapport `docs/sprints/P0.1_rapport.md` | ⏳ À FAIRE | Codex |
| 7 | typecheck + build verts | ⏳ À FAIRE | Codex |
| 8 | Ouvrir PR `P0.1: ...` depuis branche dédiée | ⏳ À FAIRE | Codex |

### Documents liés au sprint en cours

| Fichier | Auteur | Commit | Lecture obligatoire ? |
|---|---|---|---|
| [`docs/briefs/P0.1_copy_demo_reference.md`](./docs/briefs/P0.1_copy_demo_reference.md) | Claude | `6d7804d` | ✅ Codex |
| [`docs/sprints/P0.1_plan.md`](./docs/sprints/P0.1_plan.md) | Codex | `3ad2c39` | ✅ Claude (audit) |
| [`docs/sprints/P0.1_audit_plan.md`](./docs/sprints/P0.1_audit_plan.md) | Claude | `6095aed` | ✅ Codex |
| [`docs/sprints/P0.1_questions.md`](./docs/sprints/P0.1_questions.md) | Codex | `7ca267a` | ✅ Claude (réponse) |
| [`docs/sprints/P0.1_answers.md`](./docs/sprints/P0.1_answers.md) | Claude | `5b6831a` | ✅ **Codex (À LIRE EN PRIORITÉ)** |

---

## 🗂️ Vue d'ensemble de la roadmap

| Phase | Sprints | Briefs | Statut global |
|---|---|---|---|
| **P0** — Fondations production réelles | 9 sprints (P0.1 → P0.9) | 9 briefs ✅ | 🟡 P0.1 en cours |
| **P1** — Productivité établissement | 5 sprints (P1.1 → P1.5) | 5 briefs ✅ | 🔵 prêt |
| **P2** — Intelligence référentielle ⭐ | 7 sprints (P2.1 → P2.7) | 7 briefs ✅ | 🔵 prêt |
| **P3** — Signatures + IA + preuve | 5 sprints (P3.1 → P3.5) | 5 briefs ✅ | 🔵 prêt |
| **P4** — Commercial et scaling | 5 sprints (P4.1 → P4.5) | 5 briefs ✅ | 🔵 prêt |
| **TOTAL** | **31 sprints** | **31 briefs** | — |

→ Détails complets dans [`docs/SPRINTS.md`](./docs/SPRINTS.md)
→ Vision produit complète dans [`docs/VISION.md`](./docs/VISION.md)
→ Roadmap détaillée dans [`docs/ROADMAP.md`](./docs/ROADMAP.md)

---

## 🚫 Sprints DÉJÀ TERMINÉS — NE PAS RE-CODER

Ces sprints sont **mergés dans main** depuis avant l'arrivée de la
roadmap actuelle. Si Codex se retrouve à parler de ces sujets,
c'est un **vieux contexte** à ignorer.

| Sprint | PR | Commit merge | Migration | Date merge |
|---|---|---|---|---|
| **Sprint 1** — Tenant routing + schema | #4 | `40b0c2e` (approx.) | `0001_init.sql` + `0002_tenant_routing.sql` | il y a ~3 jours |
| **Sprint 2** — Supabase Auth (email/password) + superadmin switcher | #5 | (avant `75eb1d8`) | `0003_auth_jwt.sql` | il y a ~2 jours |
| **Sprint 3** — RLS hardening + isolation tests | #6 | `75eb1d8` | `0004_rls_hardening.sql` | il y a 14h |

**Tout ce qui suit `0004_rls_hardening.sql` est NEW WORK** : à coder
selon les briefs P0/P1/P2/P3/P4.

### En particulier :

- ❌ **NE PAS** recréer la table `user_roles` — existe déjà
- ❌ **NE PAS** recréer le trigger `prevent_establishment_id_change` —
  existe déjà
- ❌ **NE PAS** recréer la vue `rls_audit` — existe déjà
- ❌ **NE PAS** ajouter d'autres indexes sur les tables Sprint 1/2/3
- ❌ **NE PAS** modifier les policies user_roles existantes

---

## 🤝 Méthode collaborative peer-to-peer

### Pour Codex

1. **Avant de commencer un sprint** :
   - `git pull --rebase origin main`
   - Lire le brief : `docs/briefs/<sprint_id>_*.md`
   - Lire ce SYNC.md
   - Créer une branche dédiée : `git checkout -b <sprint-id-slug>`
     (ex: `p0-1-demo-reference`)

2. **Avant de coder** :
   - Écrire un plan : `docs/sprints/<sprint_id>_plan.md`
   - Commit + push UNIQUEMENT le plan (pas le code)
   - Attendre le GO de Claude (commit `<sprint_id>_audit_plan.md`)

3. **Pendant le code** :
   - Si question/blocker : `docs/sprints/<sprint_id>_questions.md`
     + commit + push + STOP. Ne pas continuer en bricolant.
   - Lire la réponse Claude dans `docs/sprints/<sprint_id>_answers.md`

4. **À la fin du sprint** :
   - Rapport : `docs/sprints/<sprint_id>_rapport.md`
   - Ouvrir une PR depuis ta branche vers main
   - Notifier BraveHeart pour merge

### Pour Claude

1. **À chaque message de BraveHeart** :
   - `git pull origin main` pour voir les commits Codex récents
   - Lire les nouveaux fichiers dans `docs/sprints/`
   - Répondre par commit (audit, réponse à questions, brief...)

2. **À chaque PR Codex** :
   - Cloner la branche
   - Auditer le code
   - Écrire `docs/sprints/<sprint_id>_pr_audit.md` avec verdict
     GO / CHANGES_REQUESTED
   - Notifier BraveHeart

### Pour BraveHeart

1. **Tu es le pont humain** entre Codex et Claude.
2. Tu ne dois **jamais** copier-coller un message d'une session à
   l'autre sans qu'il soit **destiné** à l'autre IA.
3. Tu valides les merges des PR (Codex propose, Claude audite, tu
   décides).

---

## 📊 Historique des commits récents (mis à jour à chaque push)

```
c2ca8a5  Claude   docs: 10 briefs P3 + P4 (signatures + commercial + scaling)
095f044  Claude   docs: 7 briefs P2.1-P2.7 (intelligence referentielle)
5b6831a  Claude   P0.1: deblocage Codex - copie demo reference + reponses
647afec  Claude   docs: 5 briefs P1.1-P1.5 (productivite etablissement)
7ca267a  Codex    docs: add P0.1 blocker questions
e419d15  Claude   docs: 4 briefs P0.6-P0.9 + alignement notes v2 + SPRINTS v2
35fe4fc  Claude   [VISION] v2 : regle d or referentielle + Module 26 + Module 27
6095aed  Claude   docs: audit Claude du plan P0.1 (GO + 2 simplifications)
607d37d  Codex    data-reference: artefacts terrain Lycee Blaise Cendrars
3ad2c39  Codex    docs: add P0.1 execution plan
2ea6269  Claude   docs: briefs P0.2, P0.3, P0.4, P0.5
6d7804d  Claude   docs: hub projet (VISION + ROADMAP + SPRINTS + brief P0.1)
75eb1d8  ───      Merge pull request #6 (Sprint 3 RLS hardening)
```

---

## 🔗 Liens utiles

- **Repo** : https://github.com/abenmahmoud/PFMP-PiLot-V1.0
- **PRs ouvertes** : https://github.com/abenmahmoud/PFMP-PiLot-V1.0/pulls
- **App prod** : https://pfmp-pi-lot-v1-0.vercel.app
- **Supabase** : https://supabase.com/dashboard/project/snxdpmxubgjlfdakmnjk
- **Vercel** : https://vercel.com/safe-scol/pfmp-pi-lot-v1-0
- **VPS Hostinger** (futur PDF service) : `187.124.50.143`

---

## 🚪 Quand mettre à jour ce fichier ?

À chaque commit qui change l'état d'un sprint :
- Sprint qui passe de `🔵 prêt` à `🟡 en cours` → mettre à jour
- Sprint qui passe de `🟡 en cours` à `✅ done` → mettre à jour
- Plan / blocker / réponse écrits → ajouter dans la liste documents

**Responsable de la mise à jour :** celui qui fait le commit qui
change l'état.

---

## 📞 En cas de doute

- **Codex** : écrit dans `docs/sprints/<sprint_id>_questions.md` et stop.
- **Claude** : répond dans `docs/sprints/<sprint_id>_answers.md`.
- **BraveHeart** : valide ou tranche dans le README ou dans un commit
  texte direct sur ce SYNC.md.

Si on est tous bloqués → conversation directe avec BraveHeart.

---

**Dernière mise à jour :** 2026-05-07 par Claude
**Prochaine action attendue :** Codex pull/rebase + reprend P0.1 étape 5
