# PFMP Pilot AI — Vision finale (v2)

> **Document de spécification produit figé.**
> Source de vérité pour Claude, Codex et BraveHeart.
> Toute évolution majeure validée par BraveHeart, commit `[VISION]`.
>
> **v1** : 7 mai 2026 — version initiale (25 modules, parcours MVP)
> **v2** : 7 mai 2026 — règle d'or référentielle, module 26
> paramétrage, module 27 analyseur IA, gouvernance superadmin/admin
> pour champs sensibles.

---

## 🌟 RÈGLE D'OR (cœur intelligent du produit)

> **Un élève n'est jamais saisi seul.**
> **Il est inscrit dans une CLASSE liée à un RÉFÉRENTIEL FORMATION,**
> **et tout le reste se déduit automatiquement.**

### Ce qui est AUTOMATIQUE (déduit du référentiel)

Quand un élève est inscrit en `2nde Bac Pro MELEC` :

1. ✅ Le **type de convention** (modèle MELEC seconde du lycée)
2. ✅ Le **type de livret PFMP** (livret seconde MELEC, attitudes
   AP1-AP6, compétences C1-C13)
3. ✅ Le **type d'attestation** à générer
4. ✅ Le **nombre et la nature des périodes PFMP** prévues
5. ✅ Les **compétences à valider** sur le livret

### Ce que l'ADMIN du lycée garde la main pour faire

L'automatique propose, **l'humain dispose** :

1. 🎯 **Définir les dates précises** des périodes (l'IA propose, admin
   ajuste)
2. 🎯 **Modifier les élèves** : changer de classe, mettre à jour
   coordonnées, ajouter/retirer
3. 🎯 **Modifier les classes** : créer, fusionner, splitter, archiver
4. 🎯 **Affecter les profs principaux** aux classes
5. 🎯 **Modifier les référentiels formation locaux** (compétences en
   plus, libellés modifiés)
6. 🎯 **Modifier les coordonnées non-sensibles** (téléphone, email
   contact, logo, adresse postale annexe)

### Ce que le PROF PRINCIPAL fait

7. 🎯 **Affecte les élèves de sa classe à des profs référents**
8. 🎯 **Suit l'avancement** des élèves de sa classe

### Ce que le PROF RÉFÉRENT fait

9. 🎯 Voit **uniquement ses élèves attribués** (RLS)
10. 🎯 Saisit **entreprise + tuteur + dates** → pré-remplit la
    convention automatiquement
11. 🎯 **Visite et complète le livret** PFMP (CR + AP)

### Champs SENSIBLES (gouvernance superadmin)

Ces champs nécessitent une **validation superadmin (BraveHeart /
Essuf)** :

- 🔒 **RNE / UAI** de l'établissement
- 🔒 **Raison sociale** du lycée
- 🔒 **Nom du proviseur signataire** (impact juridique conventions)
- 🔒 **Numéro et nom de l'assureur** (MAIF, etc.)
- 🔒 **Mentions légales** des conventions

Workflow : admin demande modification → notification superadmin →
écran validation → modification appliquée + audit log + email
confirmation.

### Ce qui est EXPORTABLE pour archivage

Tous les documents d'un élève (convention + livret rempli +
attestation + CR visites + évaluation tuteur) → PDF individuels ou ZIP
global, par élève / classe / période / année.

L'archive inclut le **dossier de preuve** (signatures, hash, audit
log, horodatage) pour conformité juridique.

---

## CONTEXTE GÉNÉRAL

PFMP Pilot AI est un SaaS indépendant destiné aux lycées
professionnels, CAP, Bac Pro, BTS et établissements ayant des périodes
de formation en milieu professionnel.

Ce projet est séparé de SafeScol.
SafeScol = signalement / climat scolaire.
PFMP Pilot AI = PFMP / stages / visites / documents / entreprises /
tuteurs / attestations.

**Objectif :** plateforme moderne, professionnelle, simple,
mobile-first, multi-établissement, **intelligente** (déduction auto),
**paramétrable** (chaque lycée personnalise), **durable** (configurée
une fois, fonctionne en autonomie d'année en année).

---

## VISION PRODUIT

> **Le cockpit intelligent des PFMP pour lycées professionnels.**

Le produit gère tout le cycle PFMP :

1. Préparation de la période
2. Import élèves/classes/professeurs
3. Création des périodes PFMP
4. Gestion entreprises/tuteurs
5. Affectation élèves/professeurs référents
6. Création ou suivi des conventions (auto-générées via référentiel)
7. Suivi des documents obligatoires
8. Départ en stage sécurisé
9. Appel premier jour / contact initial
10. Visite de stage mobile
11. Compte rendu professeur
12. Évaluation tuteur (livret + AP)
13. Attestation de stage (auto-générée)
14. Signature/cachet entreprise
15. Dossier de preuve
16. Archivage
17. Exports
18. Analyse globale établissement
19. Analyse réseau entreprises
20. Cockpit superadmin SaaS

L'application n'est pas un ERP scolaire lourd. Elle est **plus
pratique** que les solutions classiques, centrée terrain, mobile-first,
rapide et claire.

---

## PRINCIPE CENTRAL : MOBILE-FIRST TERRAIN

Le professeur utilise l'application sur téléphone en situation réelle
(voiture, entreprise, chantier, atelier, magasin, restaurant, service
administratif).

**Trouver en moins de 10 secondes** : élèves, adresse stage, tuteur,
téléphone, dates, itinéraire, documents, formulaire visite,
historique, alertes.

Le DDFPT et le superadmin ont chacun leur cockpit avec les bonnes
infos prioritaires.

---

## ARCHITECTURE CIBLE

**Frontend :** React + TypeScript + TanStack Start + TanStack Router +
Tailwind CSS. Mobile-first. Vercel-ready.

**Backend :** Supabase (Auth + Postgres + Storage + Edge Functions).
RLS stricte. Audit logs. AI interactions logs. Buckets privés
documents.

**Hosting :** Vercel multi-tenant par hostname/subdomain/custom domain.
GitHub source principale.

**Multi-tenant :** chaque établissement = tenant. Toutes les tables
métier portent `establishment_id`. Isolation RLS. Superadmin voit
tout. Établissement voit ses données. Référent voit ses élèves
affectés.

**DNS prévus :**
- `pfmp-pilot.fr` plateforme principale (nom final à finaliser)
- `demo.pfmp-pilot.fr` démo publique
- `<slug>.pfmp-pilot.fr` par établissement (ex
  `blaise-cendrars.pfmp-pilot.fr`)
- Custom domain futur

`establishments` : `slug`, `subdomain`, `custom_domain`,
`domain_verified`, `logo_url`, `primary_color`, `status`, `active`,
`uai`, `rne`, `ville`, `académie`, `assureur_nom`, `assureur_numero`,
`proviseur_nom`, `proviseur_signataire_legal`.

---

## 🆕 MODÈLE DE DONNÉES — RÉFÉRENTIELS FORMATION (cœur règle d'or)

### Nouvelle entité : `formation_referential`

```
formation_referential
├── id                      uuid
├── source                  enum : 'national' | 'establishment'
├── parent_id               uuid? (héritage si 'establishment')
├── establishment_id        uuid? (null si national)
├── formation_code          ex: "BAC_PRO_MELEC", "CAP_AQE"
├── formation_label         ex: "Bac Pro MELEC"
├── year_level              1, 2, 3 (seconde, première, terminale)
├── total_pfmp_weeks        ex: 22 (Bac Pro 3 ans), 14 (CAP 2 ans)
├── periods_per_year        ex: 2
├── attitudes_grid          jsonb : [{code, label, levels}]
├── competences_grid        jsonb : [{code, label, indicateurs}]
├── default_period_dates    jsonb : suggestions, modifiables
├── created_by              'system' | uuid (admin/superadmin)
├── created_at, updated_at
```

**Logique :**
- Si MELEC est commun à tous les lycées (probable), 1 seul référentiel
  `source='national'`
- Si Blaïse Cendrars a des spécificités, référentiel local
  `source='establishment'`, `parent_id=national`, customizations
- À la création élève, on remonte la chaîne : élève → classe →
  formation_referential → tout déduit

### Nouvelle entité : `establishment_formation_setup`

```
establishment_formation_setup
├── id                       uuid
├── establishment_id         uuid (Blaïse Cendrars)
├── formation_referential_id uuid (Bac Pro MELEC seconde)
├── convention_template_id   uuid (DOCX modèle propre au lycée)
├── livret_template_id       uuid
├── attestation_template_id  uuid
├── customizations_json      jsonb (variations spécifiques)
├── active                   boolean
└── created_at, updated_at
```

Quand élève créé dans `class_id = 2NDE_MELEC_1` :
1. Récupère `class.formation_referential_id`
2. Cherche `establishment_formation_setup` correspondant
3. Lie automatiquement les bons templates

---

## RÔLES UTILISATEURS

### 1. Superadmin SaaS (BraveHeart / Essuf)

- Crée / désactive établissement
- Voit tous les établissements et stats globales
- **Pilote la mise en place IA** des référentiels (Module 27)
- **Valide modifications sensibles** (RNE, proviseur, assureur)
- Voit logs, suit usage IA, gère support
- Priorité aux données agrégées, pas aux données nominatives élèves

### 2. Admin établissement

- Gère utilisateurs et rôles internes (PP, référents, secrétariat)
- **Module Paramétrage (M26)** : coordonnées, référentiels locaux,
  modèles de documents, alertes
- Demande au superadmin les modifications sensibles
- Importe données (CSV)
- Configure année scolaire et périodes PFMP
- Exporte archives

### 3. DDFPT / Chef de travaux

**Rôle central pédagogique.** Tableau de bord complet, gestion réseau
entreprises, supervision affectations, **co-accès au Module
Paramétrage** avec l'admin.

### 4. Professeur principal

Voit ses classes, **affecte les élèves à des profs référents**, suit
l'avancement.

### 5. Professeur référent

Voit **uniquement ses élèves affectés** (RLS strict). Saisit entreprise
+ tuteur + dates → pré-remplissage convention. Visite, CR, livret,
évaluation AP.

### 6. Secrétariat / Bureau des entreprises

Suivi documents, conventions, attestations, relances, dépôt fichiers,
exports, contacts entreprises.

### 7. Élève

Espace optionnel : voit son stage, dates, entreprise, documents à
fournir, dépose, signale.

### 8. Tuteur entreprise

**Accès simple, sans compte lourd.** Lien sécurisé (token), expiration.
Consultation fiche stage limitée, signature simple, cachet, appréciation
tuteur, dépôt fichier.

---

## MODULES FONCTIONNELS

### MODULE 1 — Dashboard Superadmin

Indicateurs : établissements actifs/inactifs/à accompagner, élèves
suivis, entreprises, partenaires forts, bases entreprises faibles,
documents critiques, visites en retard, taux d'usage, score activité,
score complétude, risque d'abandon, usage IA.

### MODULE 2 — Gestion établissements

Nom, ville, UAI/RNE, académie, slug, subdomain, custom domain, logo,
couleur, nb élèves/profs/entreprises, scores, statut abonnement, dates,
notes superadmin, **état mise en place IA**.

### MODULE 3 — Dashboard DDFPT / Établissement

Élèves en PFMP, sans stage, sans entreprise, conventions en attente,
attestations manquantes, documents critiques, visites,
prof surchargés, classes en retard, entreprises actives/à relancer,
familles métiers couvertes, alertes urgentes.

### MODULE 4 — Import données

Imports : élèves, classes, professeurs, entreprises, tuteurs, périodes
PFMP, affectations, documents modèles. Formats CSV/Excel, mapping,
prévisualisation, dédoublonnage, rapport.

### MODULE 5 — Classes et élèves

Classe : nom, niveau, **formation_referential_id (lien direct)**,
famille de métiers, année, prof principal, élèves, période, progression.

Élève : nom, prénom, classe, formation **(déduite)**, contacts, statut
stage, entreprise, tuteur, prof référent, période, documents
**(déduits)**, visites, alertes, checklist, historique.

Statuts stage : pas de stage, stage trouvé, convention en attente,
convention signée, en stage, terminé, interrompu.

### MODULE 6 — Périodes PFMP

Nom, année, classes concernées, dates début/fin, statut, nb élèves,
taux affectation/conventions/visites/attestations, documents manquants,
alertes.

**Dates par défaut suggérées par le référentiel**, **admin/DDFPT a la
main** pour ajuster.

### MODULE 7 — Réseau entreprises intelligent

**Module stratégique. Mémoire professionnelle de l'établissement.**

Entreprise : nom, SIRET, SIREN, adresse, contact, secteur, famille
métiers, formations compatibles, nb stagiaires accueillis, dernière
période, tuteurs liés, fiabilité, statut, notes internes, historique,
incidents.

Statuts : active, partenaire fort, à relancer, à surveiller, à éviter.
Fiabilité : inconnue, faible, moyenne, élevée.

Tuteur : nom, prénom, fonction, contacts, entreprise, réactivité,
historique, préférences contact, notes.

**Familles de métiers (modifiables par établissement) :** commerce,
gestion-administration, automobile, maintenance, électricité, numérique,
bâtiment, logistique, hôtellerie-restauration, santé-social, service
public, artisanat, autres.

### MODULE 8 — Affectations élèves / professeurs

Affectation par PP ou DDFPT. Charge par professeur, alerte surcharge.
Filtres classe/période/entreprise. Élèves non affectés. Historique.

### MODULE 9 — Espace professeur référent

Page "Mes élèves" mobile-first. Élève → fiche stage avec entreprise,
adresse, tuteur, contacts, horaires, activités, **compétences visées
(via référentiel)**, documents auto-générés, historique, visites,
alertes, checklist.

### MODULE 10 — Visite mobile

Formulaire mobile : date, type contact, élève présent, tuteur, conditions,
activités, posture, points positifs/difficultés, remarques, niveau
alerte, prochaine action, statut.

UX : gros boutons, footer sticky, brouillon, dictée vocale, aide IA.

### MODULE 11 — Assistant IA professeur

Notes rapides → CR propre. Ne jamais inventer. Validation humaine
obligatoire. Logs.

### MODULE 12 — Assistant IA DDFPT

Résumé période, élèves sans stage, documents critiques, visites en
retard, classes à surveiller, profs surchargés, entreprises à relancer,
priorisation actions.

### MODULE 13 — Assistant IA Superadmin

Résumé établissement, peu actifs, à accompagner, base entreprise faible,
risque d'abandon, rapport hebdo, relance personnalisée, recommandations
produit.

### MODULE 14 — Documents officiels PFMP

Documents (auto-déduits via référentiel) : convention, annexe
pédagogique, annexe financière, attestation, livret de suivi, fiche
visite, fiche évaluation tuteur, document sécurité, autorisation
parentale, documents par famille de métiers, documents
allocation/paiement.

**Chaque établissement fournit ses modèles**, l'IA les analyse au
paramétrage initial (Module 27).

Champs dynamiques : élève, classe, formation, période, dates, durée,
établissement, chef établissement, prof référent, entreprise, SIRET,
adresse, tuteur, fonction, activités, **compétences (référentiel)**,
modalités, signatures, cachet.

### MODULE 15 — Signatures, cachets et preuves

⚠️ Ne jamais dire qu'un scan est une signature qualifiée.

Niveaux : 1) validation interne, 2) signature simple par lien sécurisé,
3) signature manuscrite scannée / cachet, 4) future eIDAS via
prestataire (Yousign, DocuSign, Universign, LexPersona, CertEurope,
Certigna).

Dossier de preuve : document, PDF, hash, signataires, méthodes,
date/heure, IP/UA si autorisé, audit log, fichiers preuve.

### MODULE 16 — Checklist sécurité avant départ PFMP

Convention signée, entreprise/tuteur identifiés, adresse vérifiée,
horaires, activités, **compétences visées (référentiel)**, prof
référent affecté, contact premier jour, document sécurité, équipements
risques, contact urgence.

### MODULE 17 — Alertes

Élève sans stage, convention manquante, visite en retard, attestation
manquante, prof surchargé, stage interrompu, entreprise à surveiller,
base faible, dossier incomplet, cachet manquant, tuteur non renseigné,
**demande modification sensible en attente superadmin**.

Sévérités : info, vigilance, problème, urgent.

### MODULE 18 — Exports et archivage

Exports : par élève, classe, période, prof, entreprise. PDF, CSV, ZIP,
archive complète.

Archive d'un élève : tous ses documents + dossier de preuve.

### MODULE 19 — Supabase Storage

Buckets privés : `documents-private`, `generated-pdfs`, `proof-files`,
`company-stamps`, `templates`, `referentials-source`.

### MODULE 20 — Audit logs

Connexion, import, créa/modif élève, créa/modif entreprise, affectation,
visite, validation visite, génération document, signature, upload
preuve, export, archivage, action superadmin, génération IA,
**modification de référentiel**, **demande modification sensible**,
**validation superadmin**.

### MODULE 21 — RGPD / sécurité

Minimisation, pas de médical inutile, cloisonnement, RLS, logs, soft
delete, purge programmée, export données, droits d'accès, stockage UE,
**service_role jamais côté client**.

### MODULE 22 — Mode démo / production

Démo : `VITE_DEMO_MODE=true`, données démo, switcher rôle, IA mockée.
Production : `VITE_DEMO_MODE=false`, Auth Supabase, RLS, logs, secrets.

### MODULE 23 — UI / UX

Design moderne, premium, sobre, lisible, mobile-first, professionnel,
pas enfantin, terrain.

Pages : `/login`, `/dashboard`, `/superadmin`,
`/superadmin/establishments`, `/superadmin/ai`,
`/superadmin/sensitive-validations` 🆕, `/classes`, `/students`,
`/students/:id`, `/teachers`, `/companies`, `/pfmp-periods`,
`/assignments`, `/my-students`, `/placements/:id`, `/visits/new`,
`/visits/:id`, `/documents`, `/alerts`, `/exports`,
`/settings/coordonnees` 🆕, `/settings/referentiels` 🆕,
`/settings/documents` 🆕, `/settings/alertes` 🆕, `/activity`,
`/sign/:token`, onboarding tenant.

### MODULE 24 — SaaS abonnement futur

Pas Stripe maintenant mais prévoir : plans, licences, statut, trial,
renouvellement, blocage doux, facturation Essuf, billing view.

### MODULE 25 — Tests

Typecheck, build, tests RLS, Playwright, parcours référent / DDFPT /
superadmin / tuteur token, tests mobiles.

---

### 🆕 MODULE 26 — Espace paramétrage établissement

**Module unique avec 4 sous-onglets, accessible aux admins et DDFPT.**

#### Sous-onglet 1 : Coordonnées

**Modifiables par admin** :
- Téléphone, email contact
- Logo, couleur primaire
- Adresse postale annexe
- Familles de métiers acceptées par le lycée

**Champs sensibles (demande au superadmin)** :
- 🔒 RNE / UAI
- 🔒 Raison sociale
- 🔒 Nom du proviseur signataire
- 🔒 Numéro et nom de l'assureur

UI : badge "🔒 Sensible — validation superadmin requise" sur les
champs sensibles. Bouton "Demander la modification" qui crée une
notification superadmin.

#### Sous-onglet 2 : Référentiels

Pour chaque formation enseignée :
- Voir le référentiel actif (national ou local)
- Voir attitudes professionnelles (AP1-APn) avec niveaux
- Voir compétences (C1-Cn) avec indicateurs
- Modifier libellés / ajouter compétences locales
- Si référentiel national, créer version locale qui hérite
- L'IA aide à analyser et proposer modifications

#### Sous-onglet 3 : Documents

Pour chaque type (convention, livret, attestation) :
- Voir le modèle actuel
- Voir les champs dynamiques détectés
- Modifier le texte fixe (mentions légales, articles)
- Tester la génération sur un élève fictif
- Versionner les modèles

#### Sous-onglet 4 : Alertes

- Seuil de surcharge professeur (par défaut 6)
- Délai d'alerte visite (par défaut 7 jours avant fin)
- Activer/désactiver types d'alertes
- Notification email/SMS (futur)

---

### 🆕 MODULE 27 — Outil superadmin "Analyseur de référentiel" (IA hybride)

**Outil interne accessible au superadmin uniquement.**

Workflow de mise en place d'un nouveau lycée :

1. Le superadmin upload les documents fournis par le lycée :
   - Convention vierge (.docx)
   - Livret PFMP (.docx) — un par formation
   - Attestation type (.docx)
   - Référentiel compétences si disponible
2. **L'IA analyse** :
   - Détecte les champs dynamiques ({{ }} ou sémantiquement)
   - Détecte les éléments fixes (en-tête, mentions légales)
   - Détecte les attitudes professionnelles (AP1-APn) dans livrets
   - Détecte les compétences listées
   - Propose un mapping `formation_referential`
3. **Le superadmin valide / ajuste** :
   - Modifie les champs détectés
   - Ajoute champs manquants
   - Confirme mapping formation
   - Sauvegarde le référentiel établissement
4. Le système crée automatiquement :
   - Entrées `formation_referential` (national ou local)
   - Entrées `establishment_formation_setup`
5. Le lycée est prêt à utiliser

Justifie le **service "Mise en place" payant** : technique + IA +
validation humaine pour chaque nouveau lycée.

---

## PARCOURS MVP PRIORITAIRE (mis à jour v2)

1. Superadmin (BraveHeart) crée Blaïse Cendrars en tenant
2. Superadmin lance l'analyseur IA sur les .docx Blaïse Cendrars
3. Superadmin valide les référentiels MELEC, PCEPC, AQE, ETL
4. Admin Blaïse Cendrars se connecte
5. Admin importe la liste SIECLE (classes + élèves)
6. Admin génère les codes élèves par classe (pas d'email élève requis)
7. Admin importe la liste profs
8. Admin crée les périodes PFMP P1 et P2 avec dates précises
9. Admin importe la liste des 646 entreprises (CSV/XLSX)
10. PP remet les codes élèves de sa classe si l'espace élève est activé
11. PP affecte les élèves de sa classe à des profs référents
12. Professeur référent se connecte
13. Il voit seulement ses élèves
14. Il ouvre fiche stage d'un élève
15. La convention est pré-remplie automatiquement (référentiel +
    coordonnées élève)
16. Il saisit l'entreprise + tuteur + dates → la convention se met à
    jour
17. Il génère la convention PDF
18. Il fait une visite (formulaire mobile)
19. Il valide le compte rendu
20. DDFPT voit la visite validée
21. À la fin du stage, attestation auto-générée avec bilan livret
22. Documents archivables en ZIP

---

## PRIORITÉS TECHNIQUES (v2)

**P0 — Fondations production réelles (2-3 semaines)**
- Vercel build OK, Supabase migration, Auth, RLS stricte
- useCurrentUser réel, mode démo conservé
- Dashboard / students / companies / my-students en lecture Supabase
- createVisit réel
- Empty states partout

**P1 — Productivité établissement de base (2-3 semaines)**
- Import SIECLE classes/élèves + import profs/entreprises (646 entreprises Blaïse)
- Affectations réelles (PP → référents)
- Documents lecture, audit logs actifs
- Superadmin stats agrégées
- Création/édition périodes PFMP avec dates

**P2 — Intelligence référentielle (différenciateur produit, 3-4 semaines)**
- Schema `formation_referential` + `establishment_formation_setup`
- **Module 27** : Analyseur IA pour superadmin
- **Module 26** : Espace paramétrage établissement (4 sous-onglets)
- Workflow validation sensible admin → superadmin
- Génération PDF à partir des templates + référentiel

**P3 — Signatures et workflow tuteur (2 semaines)**
- Token sécurisé tuteur (`/sign/:token`)
- Signature simple côté tuteur
- Dossier de preuve
- Assistant IA professeur (Edge Function)

**P4 — Commercial et scaling (3 semaines)**
- Landing page `pfmp-pilot.fr` (ou nom final)
- Tunnel demande licence
- Backoffice superadmin onboarding partiel
- eIDAS prestataire
- Stripe abonnement annuel

**Total estimé jusqu'à commercialisation : 12-15 semaines.**
**Total jusqu'au pilote Blaïse Cendrars vivant : 5-7 semaines.**

---

## CONTRAINTES ABSOLUES

- ❌ Ne pas mélanger avec SafeScol
- ❌ Ne jamais exposer service_role
- ❌ Ne jamais mélanger deux établissements
- ❌ Ne jamais donner à un référent accès à tous les élèves
- ❌ Ne pas dire qu'un scan est une signature qualifiée
- ❌ Ne pas casser le mode démo avant production
- ❌ Ne pas ajouter Stripe avant MVP métier
- ❌ Ne pas ajouter IA réelle avant sécurité
- ❌ **Ne pas laisser un admin modifier un champ sensible sans
  validation superadmin**
- ✅ Toujours privilégier RLS, sécurité et isolation
- ✅ **Toujours déduire automatiquement ce qui peut l'être via
  référentiel** (règle d'or)
- ✅ **Toujours laisser à l'humain la main sur les ajustements**
  (admin ↔ superadmin selon sensibilité)
- ✅ **Toujours rendre les documents exportables** pour archivage
