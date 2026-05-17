# Securite PFMP Pilot AI

## Signature electronique avancee eIDAS

PFMP Pilot AI collecte une signature electronique avancee applicative pour les conventions PFMP.

Le parcours signataire impose :

- lecture du document avec delai minimal ;
- verification telephone par OTP SMS ;
- saisie exacte de la mention `Lu et approuve` ;
- signature click-to-sign ou trace manuscrit optionnel ;
- conservation de l'adresse IP, du user-agent, du hash SHA-256 et des horodatages.

Chaque signature avancee stocke aussi un token d'horodatage applicatif signe HMAC-SHA512 avec `SIGNATURE_TSA_SECRET`. Ce token contient l'identifiant du document, l'email du signataire, l'heure UTC de signature, le hash du PDF au moment de la signature, le telephone valide et la mention saisie.

Ce dispositif n'est pas une signature qualifiee au sens strict RFC 3161/eIDAS qualifie, mais il correspond au niveau attendu pour un workflow SaaS de convention scolaire : identification raisonnable du signataire, consentement explicite et integrite cryptographique du document.

## RGPD telephone

Les numeros de telephone OTP sont stockes en base pour preuve de signature et affiches masques dans les journaux et PDF de preuve. Les logs applicatifs ne doivent jamais contenir de numero en clair. Toute demande de suppression doit etre traitee avec l'etablissement responsable de traitement, sous reserve des obligations d'archivage scolaire.
