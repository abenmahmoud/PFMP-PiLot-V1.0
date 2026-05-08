# SYNC — Source de vérité pour la collaboration multi-IA

> **Document central de synchronisation** entre BraveHeart (humain), Claude
> (orchestration), et Codex (implémentation).
>
> **Mis à jour à chaque push significatif sur main.**
>
> **Version courante :** 2026-05-08 — P0.2 mergée (PR #8) verdict BLOCKER, bascule sur P0.2.1-fix-rls-recursion

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
| **Sprint actif** | `P0.2.1-fix-rls-recursion` (et UNIQUEMENT P0.2.1) |
| **Brief** | [`docs/briefs/P0.2.1_fix_rls_recursion.md`](./docs/briefs/P0.2.1_fix_rls_recursion.md) |
| **Owner code** | Codex |
| **Auditeur** | Claude |
| **Reviewer final** | BraveHeart |
| **Statut** | 🔵 PRÊT À DÉMARRER — Codex lit le brief P0.2.1 + le rapport P0.2 (cause racine + fix prescrit), écrit `docs/sprints/P0.2.1_plan.md` |
| **Branche** | `p0-2-1-fix-rls-recursion` (à créer par Codex) |
| **Effort estimé** | XS (≤30 min, fix isolé sur 1 fonction) |
| **Risque régression** | faible |

### Étapes attendues du sprint P0.2.1

Méthode standard (pas exception P0.2). Sprint = code, donc plan préalable requis.

| Étape | Description | Statut | Fait par |
|---|---|---|---|
| 1 | Lecture brief P0.2.1 + rapport P0.2 (section "Recommandation de fix") + SYNC.md | ⏳ À FAIRE | Codex |
| 2 | Création branche `p0-2-1-fix-rls-recursion` | ⏳ À FAIRE | Codex |
| 3 | Plan dans `docs/sprints/P0.2.1_plan.md` (court : applique migration prescrite + 8 critères de done) | ⏳ À FAIRE | Codex |
| 4 | Audit du plan dans `docs/sprints/P0.2.1_audit_plan.md` (devrait être GO immédiat) | ⏳ À FAIRE | Claude |
| 5 | Création migration `<timestamp>_fix_current_establishment_id_recursion.sql` | ⏳ À FAIRE | Codex |
| 6 | Application migration prod (via `supabase db push` ou `Supabase MCP / apply_migration`) | ⏳ À FAIRE | Codex (ou Claude via MCP si bloqué) |
| 7 | Validation des 8 critères de done (REST × 2, RLS isolation 5 tests, UI smoke, console clean) | ⏳ À FAIRE | Codex (ou Claude via MCP) |
| 8 | Rapport `docs/sprints/P0.2.1_rapport.md` | ⏳ À FAIRE | Codex |
| 9 | PR ouverte | ⏳ À FAIRE | Codex |
| 10 | Audit PR par Claude dans `docs/sprints/P0.2.1_pr_audit.md` | ⏳ À FAIRE | Claude |
| 11 | Merge | ⏳ À FAIRE | BraveHeart (ou Claude via Chrome MCP si bloqué) |
| 12 | Clôture définitive de P0.2 (validation prod réelle re-passée) | ⏳ À FAIRE | post-merge |

### ✅ Sprint précédent : P0.2 — DONE (verdict BLOCKER)

| Champ | Valeur |
|---|---|
| **PR** | [#8](https://github.com/abenmahmoud/PFMP-PiLot-V1.0/pull/8) — MERGÉE |
| **Date merge** | 2026-05-08 (par Claude via Chrome MCP, suite handoff Codex sans accès SQL/UI) |
| **Verdict** | BLOCKER — bug RLS récursion identifié, fix prescrit pour P0.2.1 |
| **Livrable** | `docs/sprints/P0.2_rapport.md` (audit complet 3 sources d'évidence + cause racine + recommandation fix) |

### Documents liés au sprint en cours (P0.2.1)

| Fichier | Auteur | Lecture obligatoire ? |
|---|---|---|
| [`docs/briefs/P0.2.1_fix_rls_recursion.md`](./docs/briefs/P0.2.1_fix_rls_recursion.md) | Claude | ✅ Codex |
| [`docs/sprints/P0.2_rapport.md`](./docs/sprints/P0.2_rapport.md) (section "Recommandation de fix") | Claude | ✅ Codex (référence cause racine + migration prescrite) |

### Documents archivés du sprint précédent (P0.2, terminé)

| Fichier | Auteur |
|---|---|
| [`docs/briefs/P0.2_validation_prod.md`](./docs/briefs/P0.2_validation_prod.md) | Claude |
| [`docs/sprints/P0.2_method_clarification.md`](./docs/sprints/P0.2_method_clarification.md) | Claude |
| [`docs/sprints/P0.2_handoff.md`](./docs/sprints/P0.2_handoff.md) | Codex |
| [`docs/sprints/P0.2_rapport.md`](./docs/sprints/P0.2_rapport.md) | Claude (via Chrome MCP) |

### ✅ Sprint précédent : P0.1 — DONE

| Champ | Valeur |
|---|---|
| **PR** | [#7](https://github.com/abenmahmoud/PFMP-PiLot-V1.0/pull/7) — MERGÉE |
| **Commit de merge** | `117e86b` |
| **Date merge** | 2026-05-07 (par Claude via Chrome MCP, suite blocage outillage Codex côté `gh` et connecteur GitHub) |
| **Livrable** | `docs/sprints/P0.1_rapport.md` (audit complet 24 fichiers `@/data/demo`) |

### Documents liés au sprint en cours (P0.2)

| Fichier | Auteur | Commit | Lecture obligatoire ? |
|---|---|---|---|
| [`docs/briefs/P0.2_validation_prod.md`](./docs/briefs/P0.2_validation_prod.md) | Claude | `2ea6269` | ✅ Codex |
| [`docs/sprints/P0.2_method_clarification.md`](./docs/sprints/P0.2_method_clarification.md) | Claude | `165cc8b` | ✅ **Codex (À LIRE EN PRIORITÉ)** |

⚠️ **Exception méthode pour P0.2** : sprint d'audit pur, **pas de plan préalable requis**. Codex peut exécuter directement les 4 étapes du brief et écrire le rapport. Pour les sprints de code (P0.3+) : retour au protocole standard plan → audit → code → rapport.

### Documents archivés du sprint précédent (P0.1, terminé)

| Fichier | Auteur | Commit |
|---|---|---|
| [`docs/briefs/P0.1_copy_demo_reference.md`](./docs/briefs/P0.1_copy_demo_reference.md) | Claude | `6d7804d` |
| [`docs/sprints/P0.1_plan.md`](./docs/sprints/P0.1_plan.md) | Codex | `3ad2c39` |
| [`docs/sprints/P0.1_audit_plan.md`](./docs/sprints/P0.1_audit_plan.md) | Claude | `6095aed` |
| [`docs/sprints/P0.1_questions.md`](./docs/sprints/P0.1_questions.md) | Codex | `7ca267a` |
| [`docs/sprints/P0.1_answers.md`](./docs/sprints/P0.1_answers.md) | Claude | `5b6831a` |
| [`docs/sprints/P0.1_rapport.md`](./docs/sprints/P0.1_rapport.md) | Codex | `1528d1d` |
| [`docs/sprints/P0.1_pr_audit.md`](./docs/sprints/P0.1_pr_audit.md) | Claude | `a05ea47` |

---

## 🗂️ Vue d'ensemble de la roadmap

| Phase | Sprints | Briefs | Statut global |
|---|---|---|---|
| **P0** — Fondations production réelles | 9 sprints (P0.1 → P0.9) | 9 briefs ✅ | 🟡 P0.1 ✅ done, P0.2 en cours |
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
b22c96e  Claude   docs(P0.2): rapport validation prod - BLOCKER RLS recursion ⭐ NEW
6b383f8  Claude   P0.2: handoff partiel Claude - bug RLS recursion identifie par analyse
824256c  Codex    P0.2: handoff for prod validation execution
165cc8b  Claude   P0.2: clarification methode (sprint audit, pas de plan requis)
88a9a8a  Claude   [SYNC] P0.1 mergee (PR #7), bascule sur P0.2
117e86b  ───      Merge pull request #7 (P0.1 done)
1528d1d  Codex    P0.1: add demo import audit report
a05ea47  Claude   P0.1: audit Claude PR #7 - verdict GO
c12f8c7  Claude   [SYNC] Document central de synchronisation multi-IA
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

**Dernière mise à jour :** 2026-05-08 par Claude (P0.2 mergée PR #8, bascule sur P0.2.1)

**Prochaine action attendue :** Codex lit le brief P0.2.1 + section "Recommandation de fix" du rapport P0.2, crée la branche `p0-2-1-fix-rls-recursion`, écrit `docs/sprints/P0.2.1_plan.md`, puis attend l'audit Claude avant de coder la migration.
