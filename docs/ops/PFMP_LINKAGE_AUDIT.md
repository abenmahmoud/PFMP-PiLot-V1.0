# Audit des liaisons PFMP

Objectif : verifier en un seul point la coherence tenant des liaisons critiques :

- classe -> professeur principal
- eleve -> classe
- eleve -> referent PFMP
- periode PFMP -> classe
- placement -> eleve + periode + entreprise + tuteur + referent
- tuteur -> entreprise
- professeur -> profil utilisateur

## Methode applicative

La server function `auditTenantLinkages` dans `src/server/tenantReference.functions.ts` utilise le service-role cote serveur et respecte le tenant actif.

Elle retourne :

- `summary.errors` : erreurs bloquantes a corriger avant pilote
- `summary.warnings` : incoherences non bloquantes mais a nettoyer
- `issues[]` : relation, entite, id et message explicite

## Depuis l'interface

1. Se connecter en superadmin.
2. Selectionner l'etablissement actif dans le switcher.
3. Ouvrir `Superadmin -> Sante systeme`.
4. Lire la carte `Audit liaisons tenant`.

Un etablissement pilote est sain quand :

- `errors = 0`
- les warnings restants sont compris et acceptes
- les compteurs eleves/periodes/placements correspondent aux donnees attendues

## Relations controlees

| Relation | Niveau | Pourquoi |
| --- | --- | --- |
| `student.class_id` | error | Un eleve sans classe coherente bloque periodes et droits principal. |
| `student.referent_id` | error/warning | Le referent eleve doit etre un profil referent/principal et avoir une ligne professeur. |
| `pfmp_period.class_id` | error | Une periode rattachee a une classe absente casse les affectations. |
| `placement.student_id` | error | Un placement sans eleve est inutilisable. |
| `placement.period_id` | error | Un placement sans periode casse le calendrier PFMP. |
| `placement.company_id` | error | L'entreprise affectee doit exister dans le tenant. |
| `placement.tutor_id` | error | Le tuteur doit exister et appartenir a l'entreprise du placement. |
| `placement.referent_id` | error/warning | Le referent du placement doit correspondre a un professeur/profil connu. |
| `teacher.profile_id` | error | Un professeur connecte doit pointer vers un profil du meme tenant. |
| `class.principal_id` | error/warning | Le professeur principal doit exister et avoir un role coherent. |

## Utilisation operationnelle

Avant chaque import reel de lycee :

1. Creer l'etablissement.
2. Importer classes + eleves.
3. Creer professeurs, entreprises, tuteurs.
4. Creer une periode test et un placement test.
5. Lancer l'audit liaisons.
6. Corriger jusqu'a `errors = 0`.

Cet audit devient le controle qualite avant toute demo commerciale ou mise en production pilote.
