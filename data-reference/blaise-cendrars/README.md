# Lycée Polyvalent Blaïse Cendrars — Artefacts terrain

> **Documents réels** fournis par BraveHeart (DDFPT/professeur du lycée).
> Source de vérité métier pour PFMP Pilot AI — pilote zéro.
> Ces fichiers sont **versionnés en repo** comme spécification produit.
> Tous les noms d'élèves et entreprises ont vocation à être anonymisés
> dans les exemples de tests. Les modèles vierges sont OK tels quels.

**Date d'apport :** 7 mai 2026
**Année scolaire concernée :** 2025-2026

---

## 📍 Identité du lycée

| Champ | Valeur |
|---|---|
| Nom officiel | Lycée Polyvalent Blaise Cendrars |
| Adresse | 12 avenue Léon Jouhaux, 93270 Sevran |
| Téléphone | 01 49 36 20 50 |
| Fax | 01 43 85 61 31 |
| Email | ce.0932048w@ac-creteil.fr |
| **UAI / RNE** | **0932048W** |
| Académie | Créteil |
| Cheffe d'établissement | Madame VER EECKE |
| Assurance MAIF | n° 1995437 R |

→ C'est ce **tenant zéro** qu'on créera dans Supabase pour le pilote.

---

## 🎓 Formations professionnelles enseignées

D'après les modèles de conventions et livrets fournis :

### Niveau Bac Pro (3 ans)

| Code | Nom complet | Famille métier |
|---|---|---|
| **MELEC** | Métiers de l'Électricité et de ses Environnements Connectés | Électricité |
| **PCEPC** | Pilotage et Contrôle des installations Énergétiques de Production de Chaleur | Maintenance / énergie |
| **AQE** | Animation Qualité de l'Environnement (1ère et BTS) | Hygiène / environnement |

### Niveau CAP (2 ans)

| Code | Nom complet | Famille métier |
|---|---|---|
| **CAP ETL** | Équipier Polyvalent du Commerce ou autre — à préciser | Commerce / logistique |
| **CAP AQE** | (Variante AQE) | Hygiène / environnement |

→ **Pour le pilote : 2 Bac Pro + 1 CAP** (comme tu m'as dit).
À confirmer : c'est probablement MELEC + PCEPC + CAP ETL ?

---

## 📅 Calendrier PFMP 2025-2026

Source : `calendrier/calendrier des PFMP 2025-2026.docx`

### Niveau Seconde Bac Pro

| Classe | Période 1 | Période 2 | Total |
|---|---|---|---|
| 2 PRO 1 | 24/11/25 → 12/12/25 (3 sem) | 25/05/26 → 12/06/26 (3 sem) | 6 sem |
| 2 PRO 2 | 24/11/25 → 12/12/25 (3 sem) | 25/05/26 → 12/06/26 (3 sem) | 6 sem |
| 2 PRO 3 | 24/11/25 → 12/12/25 (3 sem) | 25/05/26 → 12/06/26 (3 sem) | 6 sem |
| 2 PRO 4 | 24/11/25 → 12/12/25 (3 sem) | 25/05/26 → 12/06/26 (3 sem) | 6 sem |
| AQE 1 | 24/11/25 → 19/12/25 (4 sem) | 25/05/26 → 12/06/26 (3 sem) | 7 sem |

### Niveau Première Bac Pro

| Classe | Période 1 | Période 2 | Total |
|---|---|---|---|
| 1 MELEC 1 | 19/01/26 → 20/02/26 (5 sem) | 04/05/26 → 22/05/26 (3 sem) | 8 sem |
| 1 MELEC 2 | 19/01/26 → 20/02/26 (5 sem) | 04/05/26 → 22/05/26 (3 sem) | 8 sem |
| 1 PCEPC | 19/01/26 → 20/02/26 (5 sem) | 04/05/26 → 22/05/26 (3 sem) | 8 sem |

### Niveau Terminale Bac Pro

| Classe | Période 1 | Période 2 | P3 (parcours Y) | Total |
|---|---|---|---|---|
| T MELEC 1 | 03/11/25 → 21/11/25 (3 sem) | 16/03/26 → 03/04/26 (3 sem) | 6 sem mai-juin | 12 sem |
| T MELEC 2 | 03/11/25 → 21/11/25 (3 sem) | 16/03/26 → 03/04/26 (3 sem) | 6 sem | 12 sem |
| T PCEPC | 03/11/25 → 21/11/25 (3 sem) | 16/03/26 → 03/04/26 (3 sem) | 6 sem | 12 sem |
| ETL 2 (CAP) | 03/11/25 → 21/11/25 (3 sem) | 09/03/26 → 03/04/26 (4 sem) | — | 7 sem |

**Total durée PFMP cumulée Bac Pro 3 ans :** 22 semaines (réglementaire).

→ Un module **calendrier annuel** dans le produit doit gérer ces
plannings croisés.

---

## 📋 Structure d'une convention PFMP

Source : `conventions/convention MELEC2025.docx`

### Champs en double chevron (variables Word/mailmerge)

```
«NOM»          → nom de l'élève
«PRENOM»       → prénom de l'élève
«NEE_LE»       → date de naissance
«DIV»          → division (classe)
«P2»           → code période (P1, P2, P3...)
```

→ Le futur **moteur de génération de docs** doit supporter ces
variables, plus probablement bien d'autres (entreprise, tuteur, dates,
horaires).

### Articles juridiques (21)

La convention est encadrée par **21 articles** alignés sur :
- Code du travail : L.4121-1, L.4153-1 à L.4153-9, L.4154-2/3,
  R.4153-38 à R.4153-52, D.4153-2 à D.4153-4, D.4153-15 à D.4153-37
- Code de l'éducation : L 124-1 à 20, R.124-10 à R.124-13,
  D.124-1 à D.124-9
- Note de service n° 2008-176 du 24-12-2008 (BO n° 2 du 8 janvier 2009)
- Articles santé/sécurité : L.4154-2/3 spécifiquement pour
  apprentis/stagiaires mineurs

→ Le produit doit conserver intactes ces références juridiques sur les
conventions générées.

### Sections types

1. Page de garde
2. Annexe pédagogique : personnes chargées du suivi (prof + tuteur),
   horaires hebdo, compétences à développer
3. Articles 1 à 21 (texte de loi)
4. Annexe sécurité : équipements/produits/milieux de travail autorisés
   après déclaration inspection du travail (variable selon métier)
5. Assurances : entreprise + établissement (MAIF pour Blaïse Cendrars)
6. Signatures : 4 signataires (lycée + entreprise + élève + responsable
   légal si mineur)

---

## 📓 Structure d'un livret de suivi

Source : `livrets/LIVRET PFMP premMELEC.docx`

### Sections obligatoires

1. **Page de garde** : NOM élève, classe, période 1 et 2
2. **La FORMATION et son évaluation** (texte standardisé)
3. **Évaluation des attitudes professionnelles** (6 items, sur 5 niveaux) :
   - **AP1** Habileté
   - **AP2** Sociabilité
   - **AP3** Intérêt porté au travail
   - **AP4 / AP41** Initiative
   - **AP5 / AP51** Analyse critique du travail
   - **AP6** Assiduité, ponctualité, présentation
4. **Description des activités faites pendant la PFMP** (texte libre)
5. **Évaluation des compétences professionnelles** (selon référentiel
   métier — voir ci-dessous)
6. **Appréciation générale** (texte libre tuteur + prof)
7. **Date visite + signature**

### Référentiel de compétences MELEC (1ère)

Compétences évaluées par tâche, sur 4 niveaux d'autonomie : **Non
évalué / Non acquis / En cours d'acquisition / Acquis**.

Exemples de compétences :

| Code | Libellé |
|---|---|
| **C1** | Analyser les conditions de l'opération et son contexte |
| **C2** | Organiser l'opération dans son contexte |
| **C3** | Définir une installation à l'aide de solutions préétablies |
| **C4** | Réaliser une installation de manière éco-responsable |
| **C5** | Contrôler les grandeurs caractéristiques de l'installation |
| **C6** | Régler, paramétrer les matériels de l'installation |
| **C7** | Valider le fonctionnement de l'installation |
| **C8** | Diagnostiquer un dysfonctionnement |
| **C9** | Remplacer un matériel électrique |
| **C11** | Compléter les documents liés aux opérations |
| **C12** | Communiquer entre professionnels sur l'opération |
| **C13** | Communiquer avec le client/usager sur l'opération |

Chaque compétence se décompose en **tâches** codifiées (T1-1-a, T1-2-a,
T2-3-b, etc.) issues du référentiel officiel BO Éducation Nationale.

→ **Le moteur de validation des compétences** doit modéliser cette
hiérarchie : Compétence → Tâche → Niveau d'autonomie. Et chaque
référentiel métier (MELEC, PCEPC, CAP ETL, AQE…) a son propre arbre.

---

## 📄 Liste élèves (format Pronote-like)

Source : `listes/EXP_Liste_des_eleves_par_division2025-2026.csv`
**1158 élèves** (toutes filières confondues, pro + général).

### Colonnes CSV

```
NOM ; PRENOM ; SEXE ; NE(E) LE ; MEF ; DIV. ; REG. ; OPT1..OPT12 ;
DIV. PREC. ; Doublant
```

| Colonne | Sens |
|---|---|
| NOM, PRENOM | Identité |
| SEXE | M / F |
| NE(E) LE | Date naissance JJ/MM/AAAA |
| MEF | Module Élémentaire de Formation (ex: PREMIERE GENERALE SELO) |
| DIV. | Division = classe (ex: 1G1, 1MELEC1, 2PRO1, AQE1) |
| REG. | Régime (DEMI-PENSIONNAIRE, EXTERNE…) |
| OPT1..OPT12 | Options et langues |
| DIV. PREC. | Division année précédente |
| Doublant | Booléen redoublant |

→ Le module **Import CSV** (P1.1 dans roadmap) doit accepter ce
format Pronote standard, c'est l'export que tous les lycées français
font.

→ ⚠️ Cette liste contient **toutes les filières** (générale + techno + pro).
Pour PFMP, seules les divisions pro/CAP nous intéressent. Filtrage à
prévoir sur la division (`1MELEC*`, `2PRO*`, `T*`, `AQE*`, `CAP*`,
`ETL*`, `PCEPC*`).

---

## 📜 Attestations de stage

3 modèles fournis dans `attestations/` :
- `attestation.pdf` (modèle générique)
- `attestationNUMERIQUE.pdf` (variante numérique)
- `attestationNUMERIQUEibis.pdf` (autre variante)

→ Ces attestations sont délivrées **par le tuteur** à la fin du stage.
Le moteur PDF du produit doit générer une attestation pré-remplie que
le tuteur n'a qu'à signer + tamponner.

---

## 🎯 Implications pour le produit PFMP Pilot AI

### Données à modéliser de toute urgence

1. **Référentiel de compétences par formation** — table
   `competence_referentials` avec hiérarchie compétence → tâche, par
   formation/code (MELEC, PCEPC, AQE, CAP ETL, etc.)

2. **Modèles de documents par établissement** — table
   `document_templates` avec association formation, type (convention,
   livret, attestation, autorisation parentale, RIB) — déjà prévue dans
   le schema actuel ✅

3. **Calendrier PFMP par classe** — table `pfmp_periods` avec
   `class_id, period_number, start_date, end_date, weeks` — déjà prévue ✅

4. **Évaluation attitudes professionnelles** (6 items × 5 niveaux) à
   ajouter au formulaire visite ou au livret PDF

5. **Évaluation compétences professionnelles** (multi-tâches × 4
   niveaux) — table `competence_evaluations` à créer

### Champs dynamiques minimum pour le moteur de génération

```
{{ELEVE.NOM}}, {{ELEVE.PRENOM}}, {{ELEVE.NEE_LE}}, {{ELEVE.SS}},
{{ELEVE.ADRESSE}}, {{ELEVE.TELEPHONE}}, {{ELEVE.EMAIL}}
{{CLASSE.DIVISION}}, {{CLASSE.FORMATION}}, {{CLASSE.NIVEAU}}
{{PERIODE.NUMERO}}, {{PERIODE.DATE_DEBUT}}, {{PERIODE.DATE_FIN}},
{{PERIODE.SEMAINES}}
{{ENTREPRISE.RAISON_SOCIALE}}, {{ENTREPRISE.SIRET}}, {{ENTREPRISE.APE}},
{{ENTREPRISE.ADRESSE}}, {{ENTREPRISE.TELEPHONE}}, {{ENTREPRISE.EMAIL}}
{{TUTEUR.NOM}}, {{TUTEUR.PRENOM}}, {{TUTEUR.FONCTION}},
{{TUTEUR.TELEPHONE}}, {{TUTEUR.EMAIL}}
{{ETABLISSEMENT.NOM}}, {{ETABLISSEMENT.ADRESSE}}, {{ETABLISSEMENT.UAI}},
{{ETABLISSEMENT.TELEPHONE}}, {{ETABLISSEMENT.EMAIL}}, {{ETABLISSEMENT.CHEF}}
{{ASSURANCE.NOM_ASSUREUR}}, {{ASSURANCE.NUMERO_CONTRAT}}
{{HORAIRES.LUNDI_MATIN}}, etc.
{{COMPETENCES.LISTE}} (multi-ligne, formatable)
{{ANNEXE_SECURITE.EQUIPEMENTS}} (texte libre par formation)
```

→ Codex devra implémenter ce moteur de templating en P2.1.

### Stratégie commerciale validée par cette analyse

- L'add-on **"mise en place sur-mesure"** est **obligatoire** : chaque
  lycée a son propre référentiel de compétences (selon ses BTS/Bac
  Pro/CAP), ses propres modèles de documents, ses propres champs
  d'horaires.
- Pour Blaïse Cendrars : 5+ formations à modéliser (MELEC, PCEPC, AQE,
  CAP ETL, 2 PRO 5...). Prestation estimée : **3-5 jours de config
  manuelle** par lycée.
- Pour les lycées suivants, le produit s'enrichit : référentiels MELEC
  / PCEPC / AQE déjà modélisés deviennent réutilisables. **Le coût de
  mise en place baisse à mesure qu'on accumule des référentiels métier.**

---

## ✅ Tâches concrètes débloquées par cette livraison

| Tâche | Sprint cible |
|---|---|
| Créer le tenant `lycee-blaise-cendrars-sevran` en Supabase | P0.6 ou avant pilote |
| Importer le CSV des 1158 élèves (filtré pro/CAP) | P1.1 |
| Modéliser le référentiel MELEC complet (compétences + tâches) | P1.5 ou P2.1 |
| Modéliser le référentiel PCEPC complet | P2.1 |
| Modéliser le référentiel CAP ETL complet | P2.1 |
| Implémenter le moteur de templating PDF avec tous les champs ci-dessus | P2.1 |
| Configurer le calendrier PFMP 2025-2026 pour Blaïse Cendrars | P0.7 ou avant pilote |
| Construire le formulaire visite avec **6 attitudes professionnelles** | P0.7 |

---

## 📂 Inventaire des fichiers livrés

```
data-reference/blaise-cendrars/
├── README.md (ce fichier)
├── conventions/
│   ├── convention MELEC2025.docx       (modèle MELEC vierge)
│   ├── convention CAP ETL2025.docx     (modèle CAP ETL vierge)
│   ├── convention PCEPC2025docx.docx   (modèle PCEPC vierge)
│   ├── CONVENTION 2 PRO5.docx          (modèle 2 PRO 5 vierge)
│   └── autorisation parentale rib.docx (modèle autorisation parentale)
├── livrets/
│   ├── LIVRET PFMP premMELEC.docx      (1ère MELEC)
│   ├── LIVRET PFMP secMELEC.docx       (Seconde MELEC)
│   ├── LIVRET PFMP termMELEC.docx      (Term MELEC)
│   ├── LIVRET PFMP premPCEPC.docx      (1ère PCEPC)
│   ├── LIVRET PFMP secPCEPC.docx       (Seconde PCEPC)
│   ├── LIVRET PFMP termpcepc.docx      (Term PCEPC)
│   ├── LIVRET PFMP 1ERE ANNEECAPETL.docx (CAP ETL 1)
│   ├── LIVRET PFMP 2EME ANNEECAPETL.docx (CAP ETL 2)
│   └── LIVRET PFMP AQE.docx            (AQE)
├── calendrier/
│   └── calendrier des PFMP 2025-2026.docx
├── attestations/
│   ├── attestation.pdf
│   ├── attestationNUMERIQUE.pdf
│   └── attestationNUMERIQUEibis.pdf
└── listes/
    └── (CSV non commité — données nominatives élèves, RGPD)
```

**Note RGPD :** la liste CSV des 1158 élèves nominatifs n'est **pas
commitée dans le repo**. Elle reste sur la machine de BraveHeart et
sera importée directement dans Supabase prod via l'UI au moment du
pilote, après création du tenant.
