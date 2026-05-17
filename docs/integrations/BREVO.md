# Integration Brevo SMS

## Variables Vercel

Ajouter en Production, Preview et Development :

```bash
BREVO_API_KEY=xkeysib-...
BREVO_SMS_SENDER=PFMPPilot
BREVO_DEV_MODE=false
SIGNATURE_TSA_SECRET=<openssl rand -hex 32>
```

`BREVO_SMS_SENDER` doit contenir 11 caracteres maximum.

## Creation de la cle

1. Ouvrir Brevo.
2. Aller dans `SMTP & API` puis `API Keys`.
3. Creer une cle API avec acces SMS transactionnel.
4. Copier la cle dans Vercel en variable sensible.

## Mode developpement

`BREVO_DEV_MODE=true` n'envoie pas de SMS. Le code OTP est ecrit dans `audit_logs` avec le telephone masque. Ce mode ne doit jamais etre active en production reelle.

## Comportement production

Si `BREVO_API_KEY` est absent et que `BREVO_DEV_MODE` n'est pas `true`, la signature avancee est bloquee avec le message : `Service SMS non configure, contactez l administrateur.`
