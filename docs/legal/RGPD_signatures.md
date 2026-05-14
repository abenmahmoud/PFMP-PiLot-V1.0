# Signatures electroniques simples - mentions RGPD

PFMP Pilot AI propose une signature electronique simple pour les attestations et documents PFMP. Elle ne doit jamais etre presentee comme une signature qualifiee eIDAS.

## Donnees collectees

- Identite du signataire : nom, role, email, telephone si fourni.
- Preuve technique : date et heure de signature, adresse IP, user-agent navigateur.
- Preuve cryptographique : hash SHA-256 du document au moment de la signature.
- Signature dessinee si le signataire choisit cette methode.
- Historique des emails de demande et de relance.

## Finalites

Ces donnees sont traitees pour :

- recueillir une preuve de validation simple du document PFMP ;
- permettre l'archivage scolaire par l'etablissement ;
- verifier l'integrite du document signe ;
- repondre aux demandes de controle interne, rectorat ou audit RGPD.

## Conservation

Les preuves de signature sont conservees pendant la duree d'archivage scolaire applicable aux documents PFMP, avec une cible operationnelle de 10 ans sauf instruction contraire de l'etablissement.

## Droits des personnes

Chaque signataire peut demander l'acces aux donnees le concernant, leur rectification lorsque cela est possible, et l'exercice de ses droits RGPD via le contact DPO ou le responsable de traitement de son etablissement.

## Securite

Les liens de signature sont personnels, aleatoires, expires automatiquement, et leur jeton n'est pas stocke en clair en base. Les lignes signees sont traitees comme immuables : aucune suppression ou modification fonctionnelle n'est autorisee apres signature.
