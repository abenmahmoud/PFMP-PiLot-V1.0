# P0 final - Audit profond post-merge

Date : 2026-05-11  
Commit audite : `origin/main` = `0d9f1d3`  
PR concernee : #19 `P0 final: mutations visites + routes restantes + composants partages`

## Verdict

Verdict : GO technique pour garder P0 final merge, mais CHANGES REQUIRED avant de lancer P1 onboarding.

La base est saine :

- PR #19 est mergee sur `main`.
- `npm run typecheck` passe.
- `npm run build` passe.
- Le fallback demo superadmin hors demo a ete corrige.
- Les routes restantes lisent Supabase ou restent explicitement isolees derriere `isDemoMode()`.

Mais trois points doivent etre durcis avant P1, car P1 va ajouter onboarding, invitations et creation de vrais tenants. Il faut eviter de construire cette couche sur un comportement tenant ambigu.

## Findings

### 1. P1 blocker - `settings` superadmin choisit le premier etablissement au lieu du tenant actif

Fichier : `src/services/settings.ts`

Ligne critique :

- `fetchTenantSettings(profile)` utilise `profile.establishment_id`.
- Si `profile.establishment_id` est null et `profile.role === 'superadmin'`, le service fait :
  `sb.from('establishments').select('*').order('created_at').limit(1).maybeSingle()`.

Probleme :

Un superadmin sans incarnation active peut ouvrir `/settings` et charger/modifier le premier etablissement par date de creation. Ce n'est pas une fuite RLS, car superadmin peut lire, mais c'est un risque produit : modification du mauvais tenant.

Impact :

- Un superadmin peut modifier les settings du mauvais etablissement.
- Le futur P1 onboarding va creer plusieurs etablissements ; ce comportement deviendra dangereux.

Correction attendue :

- Lire `active_establishment_id` depuis `auth.session.user.user_metadata`.
- Si superadmin sans active tenant : afficher "Selectionnez un etablissement".
- Ne jamais fallback sur le premier etablissement.
- Le service `fetchTenantSettings` doit recevoir explicitement un `activeEstablishmentId` ou un contexte auth calcule.

### 2. P1 blocker - `/visits/new` ne sait pas utiliser l'incarnation superadmin

Fichier : `src/routes/visits.new.tsx`

Lignes critiques :

- `if (!auth.profile.establishment_id) { ... }`
- `establishmentId: auth.profile.establishment_id`

Probleme :

Pour un admin/DDFPT rattache a un etablissement, c'est OK. Pour un superadmin qui a selectionne un tenant via `active_establishment_id`, `auth.profile.establishment_id` reste null. Donc la creation visite echoue avec "Aucun etablissement actif" meme si le switcher superadmin indique une incarnation.

Impact :

- Support superadmin/imitation tenant incomplet.
- P1 onboarding va probablement demander au superadmin de tester un tenant fraichement cree ; les mutations metier seront incoherentes si elles lisent seulement `profile.establishment_id`.

Correction attendue :

- Introduire un helper client `getActiveEstablishmentId(auth)` :
  - si profil non-superadmin : `profile.establishment_id`;
  - si superadmin : `session.user.user_metadata.active_establishment_id || null`.
- Utiliser ce helper dans `/visits/new` et `/settings`.

### 3. P1 blocker - validation visite met seulement `status='validated'`

Fichier : `src/services/visits.ts`

Lignes critiques :

- `validateVisit(id)`
- `.update({ status: 'validated' })`

Contexte :

La migration SQL contient un trigger qui doit auto-remplir `validated_by` et `validated_at`. Le code frontend s'appuie implicitement dessus.

Probleme :

Techniquement acceptable si le trigger est bien en prod, mais le frontend ne verifie pas apres update que `validated_by` et `validated_at` sont bien remplis. Si le trigger est absent ou casse dans un projet clone, l'UI affichera une visite validee sans preuve de validation.

Impact :

- Risque de preuve incomplete sur les comptes rendus de visite.
- P3 documents/signatures aura besoin de traces solides.

Correction attendue :

- Apres update, verifier que `visit.status === 'validated'`.
- Si `validated_by` ou `validated_at` sont absents, remonter une erreur claire ou documenter le fallback.
- Idealement afficher la date/validateur dans `/visits/$id`.

### 4. P2 - artefact d'encodage visible dans `/visits/new`

Fichier : `src/routes/visits.new.tsx`

Ligne :

- texte fallback : `Choisissez un eleve avant d’enregistrer.`

Dans la sortie console, le caractere apparait comme `dâ€™enregistrer`. Le build passe, mais l'UI peut afficher un texte degrade selon encodage.

Correction attendue :

- Remplacer par ASCII : `Choisissez un eleve avant d'enregistrer.`
- Profiter du meme passage pour harmoniser les textes P0 final en ASCII ou UTF-8 propre.

### 5. P2 - services P0 sans timeouts centralises

Certains services utilisent des fetchs directs et les routes ajoutent parfois `withTimeout` localement. Le pattern fonctionne, mais il n'est pas centralise.

Impact faible maintenant, mais P1/P2 vont multiplier les mutations.

Correction future :

- Extraire un helper `withTimeout` partage dans `src/lib/async.ts`.
- Standardiser les messages : lecture trop longue / mutation trop longue.

### 6. P2 - composants partages demo-only encore dependants de `data/demo`

Fichiers :

- `src/components/StudentCard.tsx`
- `src/components/PlacementCard.tsx`
- `src/components/DocumentList.tsx`
- `src/components/ActivityTimeline.tsx`
- `src/components/VisitForm.tsx`

Ce n'est pas un bug runtime tant qu'ils restent utilises uniquement dans les chemins `isDemoMode()`. Mais c'est une dette de maintenabilite : un futur dev peut les reutiliser dans une route Supabase et reintroduire des donnees demo.

Correction future :

- Les renommer `DemoStudentCard`, `DemoPlacementCard`, etc. ou les rendre props-only.
- Pas necessaire avant P1 si le brief interdit leur usage hors demo.

## Ce qui est solide

- Separation demo/Supabase beaucoup plus claire qu'avant P0.
- `useCurrentUser()` ne retombe plus sur `data/demo` hors demo.
- RLS reste la frontiere de securite : pas de `service_role` dans le frontend.
- Routes principales superadmin/dashboard/students/companies/classes/teachers/periods/documents/my-students sont migrees.
- Empty states Supabase coherents sur base vide.
- Build Nitro/Vercel OK.

## Ce qu'il faut faire avant P1

Creer un sprint court `P0.10 - Hardening tenant actif et visite` :

1. Ajouter un helper client pour calculer le tenant actif.
2. Corriger `/settings` pour ne jamais fallback sur le premier etablissement.
3. Corriger `/visits/new` pour supporter l'incarnation superadmin ou refuser proprement sans faux contexte.
4. Durcir `validateVisit`.
5. Corriger le texte `d'enregistrer`.
6. Ajouter le rapport P0.10.

Estimation : 2 a 4 heures.

## Decision recommandee

Ne pas lancer P1 onboarding tant que P0.10 n'est pas merge.  
P1 va creer plusieurs tenants et inviter des admins ; il faut que l'application sache clairement quel tenant est actif avant de manipuler des settings ou des visites.
