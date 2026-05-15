# PFMP Pilot AI — Runbook Onboarding Pilote

Objectif : creer un etablissement pilote propre, reproductible et vendable sans reutiliser les donnees historiques de test.

## 1. Preconditions

- Compte superadmin actif.
- Variables Vercel production renseignees : Supabase, Mailtrap, signatures, IA si active.
- Migrations appliquees en production.
- Storage buckets disponibles : `generated-pdfs`, `visit-photos`.

## 2. Reset avant pilote

Etat cible avant de creer les vrais tenants :

- 1 profil superadmin conserve.
- 0 etablissement client historique.
- 0 classe, eleve, prof, entreprise, tuteur, periode, placement.

Verification SQL utile :

```sql
select count(*) from establishments;
select count(*) from profiles where role <> 'superadmin';
select count(*) from classes;
select count(*) from students;
select count(*) from companies;
select count(*) from pfmp_periods;
select count(*) from placements;
```

## 3. Creation d un etablissement

1. Se connecter en superadmin.
2. Aller sur `/superadmin/establishments`.
3. Creer l etablissement avec nom, ville, statut actif et metadonnees utiles.
4. Ouvrir le contexte tenant depuis le switcher superadmin.
5. Verifier que `/admin/dashboard` affiche le dashboard de cet etablissement.

## 4. Comptes et roles

1. Dans le tenant ouvert, aller sur `/admin/users`.
2. Inviter au minimum :
   - 1 admin etablissement.
   - 1 DDFPT.
   - 1 professeur principal.
   - 1 referent PFMP.
3. Verifier que les roles visibles respectent les permissions :
   - admin invite DDFPT, principal, referent, tuteur, eleve.
   - DDFPT invite principal, referent, tuteur, eleve.
   - principal et referent n invitent personne.

## 5. Donnees scolaires

1. Importer les classes et eleves via `/admin/imports/siecle`.
2. Controler `/admin/classes` et `/admin/students`.
3. Assigner le professeur principal sur chaque classe.
4. Generer les codes eleves depuis `/admin/classes/$id`.
5. Tester un code sur `/eleve`.

## 6. Annuaire professeurs

1. Aller sur `/admin/teachers`.
2. Creer ou importer les enseignants.
3. Rattacher les profils existants quand un compte auth existe.
4. Verifier les compteurs : classes principales et eleves referents.

## 7. Entreprises et tuteurs

1. Aller sur `/admin/companies`.
2. Creer les entreprises avec SIRET si disponible.
3. Ajouter les tuteurs rattaches.
4. Verifier que `/prof/companies` est en lecture seule.

## 8. Periodes et placements

1. Creer une periode PFMP depuis `/admin/pfmp-periods`.
2. Aller sur `/admin/placements`.
3. Creer un placement : eleve, periode, entreprise, tuteur, referent.
4. Verifier le workflow : `draft` puis `confirmed`.
5. Verifier que le portail eleve affiche le placement.

## 9. Visites terrain

1. Planifier une visite pour un referent.
2. Se connecter en espace prof.
3. Ouvrir `/prof/visits`.
4. Tester demarrage, compte-rendu et completion.

## 10. Documents et signatures

1. Generer un document lie au placement.
2. Demander les signatures depuis `/admin/documents/$id`.
3. Tester un magic link tuteur.
4. Verifier `/verify/$documentId`.

## 11. Validation commerciale

Un tenant pilote est vendable quand :

- Dashboard etablissement charge sans erreur.
- Admin/DDFPT peuvent creer/importer les donnees.
- Professeur voit uniquement son perimetre.
- Eleve accede sans email.
- Superadmin peut ouvrir et quitter le contexte tenant.
- Une demande commerciale peut etre deposee depuis `/devis`.

## 12. Regle de qualite

Ne jamais melanger un vieux tenant de test avec un vrai pilote. Pour une demonstration durable, creer un tenant `Lycee Demo PFMP` dedie et conserver les vrais lycees separes.
