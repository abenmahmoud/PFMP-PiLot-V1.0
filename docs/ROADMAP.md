# PFMP Pilot — Roadmap (v2)

> **Document vivant.**
> Mis à jour à chaque sprint avec le statut, les blockers et les
> apprentissages. Voir `SPRINTS.md` pour le tracking détaillé.

**Principe :** avancer par phases priorisées (P0 → P4), avec build et
typecheck verts à chaque étape. Mode démo préservé jusqu'à ce que la
prod soit complète.

**v2 — 7 mai 2026** : intégration règle d'or référentielle (M26 + M27).

---

## ⚡ Statut global

| Phase | Sprints fait | Sprints restant | Statut |
|---|---|---|---|
| **Sprint 0** Cleanup repo | ✅ | — | Mergé |
| **Sprint 1** Tenant routing | ✅ | — | Mergé |
| **Sprint 2** Auth + superadmin switcher | ✅ | — | Mergé |
| **Sprint 3** RLS hardening | ✅ | — | Mergé |
| **P0** Fondations production | 0 | 9 | À démarrer |
| **P1** Productivité établissement de base | 0 | 5 | Pas commencé |
| **P2** 🆕 Intelligence référentielle | 0 | 7 | Pas commencé |
| **P3** Signatures et workflow tuteur | 0 | 5 | Pas commencé |
| **P4** Commercial et scaling | 0 | 5 | Pas commencé |

**Total : 31 sprints. Estimé 12-15 semaines à rythme BraveHeart.**
**Pilote Blaïse Cendrars utilisable : fin P2 (~5-7 semaines).**

---

## ✅ Sprints terminés (fondations techniques)

### Sprint 0 — Cleanup repo (PR #4)
Nettoyage des fichiers mal placés, structure propre.

### Sprint 1 — Tenant routing + schema fix (PR #4)
Migration `0002_tenant_routing.sql` : ajout `slug`, `subdomain`,
`custom_domain`, `domain_verified`, `primary_color`, `status` sur
`establishments`. Tenant resolver branché dans `__root.tsx`.

### Sprint 2 — Auth Supabase + superadmin switcher (PR #5)
Migration `0003_auth_jwt.sql` : `current_establishment_id()` JWT-aware,
`handle_new_user()`, trigger `set_updated_at()`. AuthProvider React,
`/deconnexion`, `SuperadminTenantSwitcher`, login.tsx câblé.

### Sprint 3 — RLS hardening + tests d'isolation (PR #6)
Migration `0004_rls_hardening.sql` : 14 indexes `establishment_id`, 15
triggers `prevent_tenant_change`, vue `rls_audit`, policies
`user_roles`. Script `rls_isolation.sql`.

---

## 🎯 P0 — Fondations production réelles

**Objectif :** Le parcours "user prod loggé voit son tenant vide
proprement, navigue sans crash" fonctionne.

**Estimé :** 2-3 semaines.

### P0.1 — Copie démo de référence + cleanup useCurrentUser
- `data-reference/demo.reference.ts` (copie figée)
- Vérifier `useCurrentUser` bridge démo↔Supabase
- `EmptyState` audit / amélioration
- Liste des 23 fichiers à migrer (audit)
- **Critère done :** prod loggée → empty states propres

### P0.2 — Validation prod Sprint 3
- Lancer `rls_isolation.sql` en prod
- Tester login `test@pfmp-pilot.fr` en prod
- Vérifier dropdown superadmin
- **Critère done :** rapport `P0.2_validation_prod.md` avec preuves

### P0.3 — Dashboard lit Supabase
- `dashboard.tsx` : remplacer imports `@/data/demo` par hooks Supabase
- KPIs calculés en SQL
- Empty states tenant vide
- **Critère done :** DDFPT voit son dashboard avec ses vrais chiffres

### P0.4 — Students lecture Supabase
- `students.tsx` + `students.$id.tsx` : SELECT Supabase
- Filtres / recherche fonctionnels
- **Critère done :** liste + détail élève fonctionnels

### P0.5 — Companies lecture Supabase
- `companies.tsx` : SELECT Supabase
- Recherche par ville, secteur, famille, fiabilité
- **Critère done :** réseau entreprises consultable

### P0.6 — My students (espace référent)
- `my-students.tsx` : filtré par `teacher_assignments` du user courant
- Cartes mobile-first (gros boutons)
- **Critère done :** un référent voit UNIQUEMENT ses élèves affectés

### P0.7 — createVisit réel (`/visits/new`)
- Formulaire mobile-first câblé sur `INSERT visits`
- Sauvegarde brouillon
- Audit log
- **Critère done :** prof crée une visite, elle est en DB

### P0.8 — Validation visite CR (`/visits/$id`)
- UPDATE statut visite : brouillon → validé
- **Critère done :** DDFPT voit visite validée dans son dashboard

### P0.9 — Empty states + RoleGuard sur toutes les routes
- Tour complet des routes
- RoleGuard branché correctement
- **Critère done :** parcours MVP étapes 7-12 sans crash en prod vide

---

## 🎯 P1 — Productivité établissement de base

**Objectif :** L'admin/DDFPT peut tout préparer (étapes 1-9 du
parcours MVP).

**Estimé :** 2-3 semaines.

### P1.1 — Import CSV élèves
- Page `/import/students`, drag & drop
- Mapping colonnes intelligent (compatibilité Pronote/STSWeb)
- Détection doublons (nom+prénom+date naissance)
- Rapport import
- **Critère done :** Blaïse Cendrars 398 élèves importés en 5 min

### P1.2 — Import CSV classes + profs
- Pareil que P1.1 pour classes (avec lien `formation_referential_id`
  optionnel à ce stade) et profs
- **Critère done :** structure pédagogique Blaïse Cendrars en DB

### P1.3 — Import XLSX entreprises
- Mapping colonnes pour fichier réel Blaïse Cendrars (646 entreprises,
  19 colonnes)
- Dédoublonnage SIRET
- **Critère done :** réseau Blaïse Cendrars chargé

### P1.4 — Affectations PP → référents (CRUD complet)
- `/assignments` : créer/modifier/supprimer affectations
- TeacherLoadIndicator, alerte surcharge
- **Critère done :** affectations enregistrées et reflétées dans
  my-students

### P1.5 — Périodes PFMP CRUD
- `/pfmp-periods` : création période, dates, classes concernées
- Statuts : préparation → en cours → terminée → archivée
- Audit logs actifs partout
- **Critère done :** DDFPT crée P1 et P2 pour 2025-2026

---

## 🎯 P2 — 🆕 Intelligence référentielle (différenciateur produit)

**Objectif :** Le **cœur intelligent** du produit. Quand un élève est
en `2nde MELEC`, le système déduit tout (convention, livret, AP,
compétences). L'admin a la main pour ajuster. Le superadmin valide les
champs sensibles.

**Estimé :** 3-4 semaines. **C'est LA phase qui rend le produit
vendable.**

### P2.1 — Schema `formation_referential` + `establishment_formation_setup`
- Migration SQL `0005_referentials.sql`
- Tables, indexes, RLS (national lisible par tous, local par tenant)
- Seed : 4 référentiels nationaux MELEC/PCEPC/AQE/ETL initiaux
- **Critère done :** schema appliqué, seed initial OK

### P2.2 — Module 27 : Analyseur IA superadmin (POC)
- Page `/superadmin/referential-analyzer`
- Upload .docx, .pdf
- Edge Function : extraction texte + appel API Claude/OpenAI
- Détection champs dynamiques + AP + compétences
- Validation manuelle dans UI
- **Critère done :** superadmin upload Blaïse Cendrars MELEC seconde,
  IA propose mapping, superadmin valide, référentiel enregistré

### P2.3 — Lien classe ↔ référentiel
- `classes.formation_referential_id` ajouté
- UI admin pour assigner référentiel à chaque classe
- Migration : si Blaïse Cendrars a `2NDE_MELEC_1`, lien auto au
  référentiel `BAC_PRO_MELEC` année 1
- **Critère done :** chaque classe Blaïse Cendrars a son référentiel

### P2.4 — Module 26 sous-onglet Coordonnées
- Page `/settings/coordonnees`
- Champs modifiables par admin (téléphone, email, logo, couleur,
  adresse annexe, familles métiers)
- Champs sensibles avec badge "🔒 demande au superadmin"
- Workflow demande → notification superadmin
- Audit log à chaque modif
- **Critère done :** admin Blaïse modifie son téléphone, demande
  modification proviseur

### P2.5 — Module 26 sous-onglets Référentiels + Documents + Alertes
- `/settings/referentiels` : voir/modifier référentiels locaux
- `/settings/documents` : voir/modifier templates DOCX
- `/settings/alertes` : seuils
- **Critère done :** admin Blaïse Cendrars personnalise ses 4 onglets

### P2.6 — Génération PDF templates + référentiel
- Edge Function `generate-document` (pdf-lib ou puppeteer)
- Combine : template DOCX/HTML + données élève + référentiel +
  coordonnées tenant → PDF final
- Buckets `generated-pdfs`
- **Critère done :** convention Blaïse Cendrars pré-remplie pour un
  élève réel, identique visuellement à l'original

### P2.7 — Page validation sensible superadmin
- Page `/superadmin/sensitive-validations`
- Liste des demandes en attente
- Approve / Reject avec motif
- Email de confirmation
- Audit log
- **Critère done :** superadmin valide la demande de Blaïse Cendrars

---

## 🎯 P3 — Signatures et workflow tuteur

**Objectif :** Cycle PFMP complet avec génération de documents et
signature tuteur.

**Estimé :** 2 semaines.

### P3.1 — Token sécurisé tuteur (`/sign/:token`)
- Génération token (table `tutor_access_tokens`)
- Lien unique par envoi email
- Expiration
- **Critère done :** un tuteur reçoit un lien, l'ouvre, voit la fiche
  stage limitée

### P3.2 — Signature simple côté tuteur
- Dessin signature ou case "j'atteste"
- Hash document
- Sauvegarde `proof-files`
- **Critère done :** signature simple opérationnelle (pas eIDAS)

### P3.3 — Dossier de preuve
- Génération auto : doc original + signatures + horodatage + audit log
- Téléchargement ZIP complet
- **Critère done :** dossier de preuve solide juridiquement

### P3.4 — Assistant IA professeur (Edge Function)
- Edge Function Anthropic API
- Prompts dans `aiPrompts.ts`
- Logs dans `ai_interactions`
- **Critère done :** un prof écrit 3 lignes, reçoit un brouillon CR

### P3.5 — Exports archivage
- Par élève / classe / période / année
- Format ZIP avec dossier de preuve
- **Critère done :** archive PFMP P1 2025 Blaïse Cendrars exportable

---

## 🎯 P4 — Commercial et scaling

**Objectif :** Pouvoir vendre PFMP Pilot AI.

**Estimé :** 3 semaines.

### P4.1 — Landing page publique
- Domaine `pfmp-pilot.fr` (ou nom final)
- Pages : présentation produit, comparatif Standard vs Premium IA,
  FAQ, contact, mentions légales
- Identité visuelle sobre Éducation Nationale
- **Critère done :** landing live avec formulaire contact

### P4.2 — Tunnel demande de licence
- Formulaire structuré (lycée, UAI, ville, contact, métiers
  enseignés, choix plan, add-on mise en place)
- Envoi email à BraveHeart
- **Critère done :** un lycée peut demander un devis

### P4.3 — Backoffice superadmin onboarding
- Création tenant via UI
- Workflow guidé : config formulaires + livret + grilles via Module 27
- Génération identifiants admin
- Email de bienvenue
- **Critère done :** BraveHeart onboarde un nouveau lycée en 30 min

### P4.4 — eIDAS prestataire signature qualifiée
- Choix prestataire (Yousign / Universign / LexPersona...)
- Intégration API
- **Critère done :** signature qualifiée disponible pour conventions

### P4.5 — Stripe abonnement annuel
- Plans : Standard, Premium IA
- Add-on mise en place facturé séparément
- Trial 90 jours
- Renouvellement auto
- **Critère done :** un lycée peut payer en ligne

---

## 🚧 Contraintes opérationnelles permanentes

À chaque sprint, vérifier :

1. **Build** : `npm run build` succès
2. **Typecheck** : `npm run typecheck` 0 erreur
3. **Mode démo** : `VITE_DEMO_MODE=true` continue de fonctionner sans
   Supabase
4. **RLS** : aucune route ne contourne RLS (pas de `service_role` côté
   client)
5. **Mobile** : test responsive 375px (iPhone SE) minimum

Toute régression sur ces 5 points = blocker du sprint.

---

## 🎯 Étapes-clés

| Étape | Quand | Critère |
|---|---|---|
| **Pilote Blaïse Cendrars utilisable** | Fin P2 (~5-7 sem) | DDFPT + admin + 1 PP + 2 référents utilisent en réel |
| **Premier client payant** | Fin P3 (~7-9 sem) | Convention + livret + signature tuteur opérationnels |
| **Ouverture commerciale 5-10 lycées** | Fin P4 (~10-12 sem) | Landing + Stripe + onboarding répétable |
| **Scale 50-100 tenants** | +3-6 mois après ouverture | Monitoring + automatisations + support |
