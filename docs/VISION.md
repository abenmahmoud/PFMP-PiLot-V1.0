# PFMP Pilot AI — Vision finale

> **Document de spécification produit figé.**
> Cette vision est la source de vérité pour Claude, Codex et BraveHeart.
> Toute évolution majeure doit être validée par BraveHeart et committée
> avec un message explicite `[VISION]`.
>
> Dernière mise à jour : 7 mai 2026 — version initiale par BraveHeart

---

## CONTEXTE GÉNÉRAL

PFMP Pilot AI est un SaaS indépendant destiné aux lycées professionnels,
CAP, Bac Pro, BTS et établissements ayant des périodes de formation en
milieu professionnel.

Ce projet est séparé de SafeScol.
SafeScol = signalement / climat scolaire.
PFMP Pilot AI = PFMP / stages / visites / documents / entreprises /
tuteurs / attestations / sécurité de suivi / pilotage établissement.

**Objectif :** Créer une plateforme moderne, professionnelle, simple,
mobile-first, multi-établissement, adaptée à la réalité du terrain
scolaire, utilisable par :

- superadmin SaaS
- chef d'établissement
- DDFPT / chef de travaux
- proviseur adjoint
- professeur principal
- professeur référent
- secrétariat / bureau des entreprises
- élève
- tuteur entreprise
- professionnel sur chantier, atelier, commerce, entreprise, restaurant,
  service public ou tout autre lieu de stage

La plateforme doit être à la fois :

- simple pour les professeurs
- sérieuse pour les directions
- pratique pour les entreprises
- sécurisée pour les données élèves
- exploitable par le superadmin
- adaptée au multi-établissement
- prête pour une commercialisation SaaS

---

## VISION PRODUIT

PFMP Pilot AI doit devenir :

> **Le cockpit intelligent des PFMP pour lycées professionnels.**

Le produit doit gérer tout le cycle PFMP :

1. Préparation de la période
2. Import élèves/classes/professeurs
3. Création des périodes PFMP
4. Gestion entreprises/tuteurs
5. Affectation élèves/professeurs référents
6. Création ou suivi des conventions
7. Suivi des documents obligatoires
8. Départ en stage sécurisé
9. Appel premier jour / contact initial
10. Visite de stage mobile
11. Compte rendu professeur
12. Évaluation tuteur
13. Attestation de stage
14. Signature/cachet entreprise
15. Dossier de preuve
16. Archivage
17. Exports
18. Analyse globale établissement
19. Analyse réseau entreprises
20. Cockpit superadmin SaaS

L'application ne doit pas être un ERP scolaire lourd. Elle doit être
beaucoup plus pratique que les solutions classiques, centrée sur le
terrain, mobile-first, rapide et claire.

---

## PRINCIPE CENTRAL : MOBILE-FIRST TERRAIN

Le professeur doit pouvoir utiliser l'application sur téléphone en
situation réelle :

- dans sa voiture
- dans une entreprise
- sur un chantier
- dans un atelier
- dans un magasin
- dans un restaurant
- dans un service administratif
- dans un lieu avec peu de temps disponible

**Le professeur doit trouver en moins de 10 secondes :**
ses élèves, l'adresse du stage, le nom du tuteur, le téléphone, les
dates, l'itinéraire, les documents, le formulaire de visite,
l'historique, les alertes.

**Le DDFPT doit pouvoir savoir en moins de 10 secondes :**
qui n'a pas de stage, qui n'a pas de convention signée, qui n'a pas été
visité, quels documents manquent, quelles entreprises sont fiables,
quelles entreprises sont à relancer, quels professeurs sont surchargés,
quelle classe est en retard, quelles situations sont urgentes.

**Le superadmin SaaS doit pouvoir savoir :**
quels établissements utilisent vraiment la plateforme, quels
établissements sont bloqués, quels établissements ont une base
entreprises faible, quels établissements doivent être accompagnés, quels
établissements ont beaucoup de documents manquants, quels clients
risquent d'abandonner, quelles fonctionnalités sont les plus utilisées.

---

## ARCHITECTURE CIBLE

**Frontend :**
- React + TypeScript
- TanStack Start + TanStack Router
- Tailwind CSS
- Design premium, sobre, moderne
- Mobile-first
- Vercel-ready

**Backend :**
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Supabase Edge Functions
- Row Level Security stricte
- Audit logs
- AI interactions logs
- Buckets privés documents

**Hosting :**
- Vercel
- multi-tenant par hostname/subdomain/custom domain
- GitHub source principale

**Multi-tenant :**
- chaque établissement est un tenant
- toutes les tables métier portent `establishment_id`
- isolation stricte par RLS
- superadmin voit tout
- établissement ne voit que ses données
- professeur référent ne voit que ses élèves affectés

**DNS / domaines prévus :**
- `pfmp-pilot.fr` pour la plateforme
- `demo.pfmp-pilot.fr`
- `jean-moulin.pfmp-pilot.fr`
- `choiseul-tours.pfmp-pilot.fr`
- possibilité future de custom domain : `stages.lycee-exemple.fr`

Dans `establishments` prévoir :
`slug`, `subdomain`, `custom_domain`, `domain_verified`, `logo_url`,
`primary_color`, `status`, `active`, `uai`, `ville`, `académie` optionnelle.

---

## RÔLES UTILISATEURS

### 1. Superadmin SaaS

Créer / désactiver établissement, voir tous les établissements, voir
statistiques globales, voir activité par établissement, voir clients
actifs/inactifs, voir établissements à accompagner, voir base
entreprises par établissement en agrégé, voir alertes globales, voir
logs, suivre usage IA, générer relances, préparer rapports, gérer
support, consulter cockpit santé SaaS.

**Le superadmin ne doit pas exploiter inutilement les données nominatives
des élèves. Priorité aux données agrégées.**

### 2. Admin établissement

Gérer utilisateurs, gérer rôles, configurer établissement, importer
données, gérer documents modèles, configurer année scolaire, gérer
paramètres IA, gérer seuils de charge professeur, exporter archives.

### 3. DDFPT / Chef de travaux

**Rôle central.**

Créer périodes PFMP, importer classes/élèves/profs, superviser
affectations, voir élèves sans stage, voir entreprises disponibles, voir
conventions non signées, voir visites non faites, voir attestations
manquantes, suivre documents, suivre alertes, gérer réseau entreprises,
voir professeurs surchargés, générer bilan direction, piloter familles
de métiers, utiliser assistant IA établissement.

### 4. Professeur principal

Voir ses classes, suivre élèves de sa classe, aider à l'affectation,
repérer élèves sans stage, suivre dossiers incomplets, voir alertes de
sa classe, préparer relances.

### 5. Professeur référent

Voir uniquement ses élèves affectés, fiche stage de chaque élève,
adresse cliquable, itinéraire Google Maps / Waze, téléphone tuteur, mail
entreprise, documents, historique, formulaire visite, compte rendu, aide
IA rédaction, validation brouillon, signalement problème, prochaine
action.

**Le professeur référent ne doit pas voir tous les élèves de
l'établissement.**

### 6. Secrétariat / Bureau des entreprises

Suivi documents, conventions, attestations, relances, dépôt fichiers,
vérification complétude, exports, contacts entreprises, suivi
signatures.

### 7. Élève

Espace futur ou optionnel au départ.

Voir son stage, voir dates, voir entreprise, voir documents à fournir,
déposer documents, suivre checklist, signaler problème, voir contact
référent.

### 8. Tuteur entreprise / professionnel

**Accès simple, sans compte lourd.**

Lien sécurisé, consultation fiche stage limitée, confirmation présence,
contact professeur, signature simple, cachet ou document transmis,
appréciation tuteur, attestation, remarques, dépôt fichier, validation
compte rendu si nécessaire.

**Important :** Le tuteur peut être sur chantier, atelier, magasin,
restaurant, entreprise. L'interface doit être extrêmement simple,
responsive, rapide, sans besoin de formation.

---

## MODULES FONCTIONNELS

### MODULE 1 — Dashboard Superadmin

Indicateurs : établissements actifs/inactifs/à accompagner, nombre total
d'élèves suivis, nombre total d'entreprises, partenaires forts, bases
entreprises faibles, documents critiques manquants, visites en retard,
taux d'usage par établissement, score activité, score complétude, risque
d'abandon, usage IA, volume imports, tickets/support futurs.

Actions : voir établissement, générer résumé IA, générer relance, voir
logs, voir santé client, filtrer par académie / ville / type
établissement.

### MODULE 2 — Gestion établissements

Chaque établissement : nom, ville, UAI/RNE, académie, slug,
sous-domaine, custom domain, statut domaine, logo, couleur, nombre
élèves, nombre professeurs, nombre entreprises, score activité, score
complétude, statut abonnement futur, date création, dernière connexion,
notes superadmin.

### MODULE 3 — Dashboard DDFPT / Établissement

Indicateurs : élèves en PFMP, élèves sans stage, élèves sans entreprise,
conventions en attente, attestations manquantes, documents critiques,
visites prévues/réalisées/en retard, professeurs surchargés, classes en
retard, entreprises actives/à relancer, partenaires forts, familles de
métiers couvertes, secteurs sous-représentés, alertes urgentes.

Graphes / blocs : progression par classe, charge par professeur, statut
documents, réseau entreprises, alertes, activité récente, assistant IA
établissement.

### MODULE 4 — Import données

Imports : élèves, classes, professeurs, entreprises, tuteurs, périodes
PFMP, affectations, documents modèles.

Formats : CSV, Excel, modèle téléchargeable, mapping colonnes,
prévisualisation, validation erreurs, détection doublons, rapport
import, rollback futur.

Dédoublonnage : élèves (nom/prénom/classe/date naissance optionnelle),
entreprises (SIRET si disponible), tuteurs (email/téléphone/entreprise),
professeurs (email).

### MODULE 5 — Classes et élèves

Classe : nom, niveau, formation, famille de métiers, année scolaire,
professeur principal, élèves, période PFMP associée, progression.

Élève : nom, prénom, classe, formation, téléphone optionnel, email
optionnel, statut stage, entreprise, tuteur, professeur référent,
période, documents, visites, alertes, checklist, historique.

Statuts stage : pas de stage, stage trouvé, convention en attente,
convention signée, en stage, terminé, interrompu.

### MODULE 6 — Périodes PFMP

Période : nom, année scolaire, classes concernées, date début, date fin,
statut, nombre élèves, taux affectation, taux conventions, taux visites,
taux attestations, documents manquants, alertes.

Statuts : préparation, en cours, terminée, archivée.

### MODULE 7 — Réseau entreprises intelligent

**Ce module est stratégique.**

Entreprise : nom, SIRET, SIREN, adresse, ville, code postal, téléphone,
email, site web, secteur, famille de métiers, formations compatibles,
nombre de stagiaires accueillis, dernière période d'accueil, tuteurs
liés, historique, fiabilité, réactivité, statut, notes internes
professionnelles, documents liés, placements passés, incidents
éventuels.

Statuts entreprise : active, partenaire fort, à relancer, à surveiller,
à éviter.

Fiabilité : inconnue, faible, moyenne, élevée.

Tuteur : nom, prénom, fonction, email, téléphone, entreprise,
réactivité, historique, préférence contact, notes internes.

**Familles de métiers :** commerce / relation client,
gestion-administration, automobile, maintenance, électricité, numérique,
bâtiment, logistique, hôtellerie-restauration, santé-social, service
public, artisanat, autres personnalisables.

Fonctions : recherche par ville/tuteur/secteur/famille, filtre
fiabilité, filtre statut, entreprises à relancer, partenaires forts,
entreprises à éviter, entreprises adaptées à une formation, historique
par entreprise, carte future, aide IA future.

**Objectif :** Créer une mémoire professionnelle de l'établissement.

### MODULE 8 — Affectations élèves / professeurs

Fonctions : affecter élève à professeur référent, voir charge par
professeur, alerte surcharge, filtre classe/période/entreprise, élèves
non affectés, regroupement par zone géographique futur, historique
affectations.

Règles : DDFPT/admin peut affecter, professeur principal peut proposer
selon droits, professeur référent voit ses élèves uniquement.

### MODULE 9 — Espace professeur référent

**Page "Mes élèves".**

Chaque élève : nom, classe, période, entreprise, ville, statut, alerte,
prochaine action, bouton fiche stage, bouton itinéraire, bouton appeler
tuteur, bouton visite, bouton documents.

Fiche stage : élève, entreprise, adresse, tuteur, téléphone, mail,
horaires, activités prévues, compétences visées, documents, historique,
visites, alertes, checklist.

### MODULE 10 — Visite mobile

**Formulaire mobile-first :**

date, type contact (visite sur site / appel / visio / email), élève
présent, tuteur rencontré, conditions de stage, activités réalisées,
posture professionnelle, points positifs, difficultés, remarque tuteur,
remarque professeur, niveau alerte, prochaine action, statut (brouillon
/ validé / archivé).

UX : gros boutons, peu de friction, sauvegarde brouillon, footer sticky,
utilisable sur téléphone, pas de champs trop longs obligatoires, dictée
vocale compatible si possible, aide IA pour reformuler.

### MODULE 11 — Assistant IA professeur

**Objectif :** Transformer des notes rapides en compte rendu propre.

Règles : ne jamais inventer, utiliser seulement les notes, brouillon
uniquement, validation humaine obligatoire, ton neutre / professionnel /
scolaire, journaliser l'usage.

### MODULE 12 — Assistant IA DDFPT

Résumé période PFMP, élèves sans stage, documents critiques, visites en
retard, classes à surveiller, professeurs surchargés, entreprises à
relancer, rapport proviseur, priorisation actions.

### MODULE 13 — Assistant IA Superadmin

Résumé établissement, établissements peu actifs, clients à accompagner,
base entreprise faible, risque d'abandon, rapport hebdo, relance
personnalisée, analyse usage, recommandations produit.

### MODULE 14 — Documents officiels PFMP

Documents : convention PFMP, annexe pédagogique, annexe financière,
attestation stage, livret de suivi, fiche visite, fiche évaluation
tuteur, document sécurité, autorisation parentale si besoin, documents
spécifiques par famille de métiers, documents allocation/paiement PFMP.

**Chaque établissement doit pouvoir fournir ses propres modèles.**

Onboarding documentaire : dépôt modèles, classement par type,
association famille de métiers, association formation, version, modèle
actif/archivé, champs dynamiques, validation admin.

Champs dynamiques : élève, classe, formation, période, dates, durée,
établissement, chef établissement, professeur référent, entreprise,
SIRET, adresse, tuteur, fonction, activités, compétences, modalités
suivi, signatures, cachet.

### MODULE 15 — Signatures, cachets et preuves

⚠️ **Attention juridique :**
**Ne jamais dire qu'une signature simple ou un scan est une signature
électronique qualifiée.**

Niveaux :
1. Validation interne simple
2. Signature simple par lien sécurisé
3. Signature manuscrite scannée / cachet transmis
4. Future signature avancée/qualifiée via prestataire eIDAS

Prestataires futurs possibles : Yousign, DocuSign, Universign,
LexPersona, CertEurope, Certigna.

Signature simple : lien sécurisé, token hashé, expiration, signataire,
rôle, email, date, IP si conforme RGPD, user agent, hash document,
statut.

Cachet entreprise : upload scan/photo, mention "cachet fourni par
l'entreprise", horodatage, lié au document, **ne pas appeler cachet
électronique qualifié**.

Dossier de preuve : document original, PDF généré, hash, signataires,
méthodes, date/heure, IP/user-agent si autorisé, audit log, fichiers
preuve, statut.

Statuts : modèle à paramétrer, brouillon, envoyé, en attente signature,
signé partiellement, signé complet, refusé, expiré, archivé, à corriger.

### MODULE 16 — Checklist sécurité avant départ PFMP

Checklist : convention signée, entreprise identifiée, tuteur identifié,
adresse vérifiée, horaires renseignés, activités prévues, compétences
visées, professeur référent affecté, contact premier jour prévu,
document sécurité si nécessaire, équipements / risques particuliers si
besoin, contact urgence connu.

Alertes : dossier incomplet avant départ, convention non signée, tuteur
non renseigné, entreprise sans SIRET, cachet manquant, attestation non
reçue, livret non complété, visite non faite, absence contact premier
jour.

### MODULE 17 — Alertes

Types : élève sans stage, convention manquante, visite en retard,
attestation manquante, professeur surchargé, stage interrompu,
entreprise à surveiller, base entreprise faible, dossier incomplet,
cachet manquant, tuteur non renseigné, document après PFMP manquant,
établissement peu actif.

Sévérités : info, vigilance, problème, urgent.

### MODULE 18 — Exports et archivage

Exports : par élève, par classe, par période, par professeur, par
entreprise, PDF, CSV, ZIP, archive complète.

Archivage : année scolaire, période, classe, documents, visites,
signatures, preuves, attestations, logs.

### MODULE 19 — Supabase Storage

Buckets privés : `documents-private`, `generated-pdfs`, `proof-files`,
`company-stamps`, `templates`.

Règles : pas de documents élèves en public, signed URLs, `storage_path`
en base, hash fichier, contrôle par RLS / Edge Functions.

### MODULE 20 — Audit logs

Journaliser : connexion, import, création élève, modification élève,
création entreprise, modification entreprise, affectation, création
visite, validation visite, génération document, envoi signature,
signature reçue, upload preuve, export, archivage, action superadmin,
génération IA.

### MODULE 21 — RGPD / sécurité

Principes : minimisation données, pas de données médicales inutiles,
cloisonnement établissement, RLS stricte, logs, soft delete, purge
programmée, export données, droits d'accès, stockage UE recommandé,
secrets serveur uniquement, **service_role jamais côté client**.

### MODULE 22 — Mode démo / mode production

**Mode démo** : `VITE_DEMO_MODE=true`, données `demo.ts`, switcher rôle
visible, IA mockée, pas de vraie base.

**Mode production** : `VITE_DEMO_MODE=false`, Supabase Auth, RLS, pas de
switcher rôle, vraies données, logs, variables sécurisées.

### MODULE 23 — UI / UX

Design : moderne, premium, sobre, lisible, mobile-first, rapide,
professionnel, pas enfantin, orienté terrain.

Style : tableaux propres, cartes, badges, filtres, recherche, empty
states, alertes claires, espaces aérés, navigation simple.

Pages principales :
`/login`, `/dashboard`, `/superadmin`, `/superadmin/establishments`,
`/superadmin/ai`, `/pitch`, `/classes`, `/students`, `/students/:id`,
`/teachers`, `/companies`, `/pfmp-periods`, `/assignments`,
`/my-students`, `/placements/:id`, `/visits/new`, `/visits/:id`,
`/documents`, `/alerts`, `/exports`, `/settings`, `/activity`,
`/sign/:token` (futur), `/tenant onboarding` (futur).

### MODULE 24 — SaaS abonnement futur

Ne pas brancher Stripe maintenant, mais prévoir : plans, licences
établissement, statut abonnement, trial, date renouvellement, blocage
doux, facturation Essuf Group, superadmin billing view.

### MODULE 25 — Tests

Prévoir : typecheck, build, tests RLS, tests Playwright, parcours
professeur, parcours DDFPT, parcours superadmin, parcours tuteur token,
test mobile.

---

## PARCOURS MVP PRIORITAIRE

**Le premier vrai parcours à rendre fonctionnel :**

1. Admin/DDFPT se connecte
2. Il voit son établissement
3. Il crée une période PFMP
4. Il importe ou crée élèves/classes/profs
5. Il crée entreprises/tuteurs
6. Il affecte élèves aux professeurs
7. Professeur référent se connecte
8. Il voit seulement ses élèves
9. Il ouvre fiche stage
10. Il remplit une visite
11. Il valide le compte rendu
12. DDFPT voit visite validée
13. Documents manquants restent visibles
14. Superadmin voit activité agrégée

---

## PRIORITÉS TECHNIQUES

**P0 (fondations production réelles) :**
Vercel build OK, Supabase migration, Auth, RLS stricte, useCurrentUser
réel, mode démo conservé, dashboard lecture Supabase, students lecture,
companies lecture, my-students filtré référent, createVisit réel.

**P1 (productivité établissement) :**
Import CSV, affectations réelles, documents lecture, audit logs,
superadmin stats, generated documents, storage privé.

**P2 (documents et signatures) :**
PDF, magic link tuteur, signature simple, dossier preuve réel, assistant
IA Edge Function.

**P3 (commercial et scaling) :**
eIDAS, Stripe, custom domains avancés, exports ZIP, monitoring avancé.

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
- ✅ Toujours privilégier RLS, sécurité et isolation
