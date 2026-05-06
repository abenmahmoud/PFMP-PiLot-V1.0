# Activation du multi-tenant Vercel

Ce document décrit la procédure exacte pour activer le routing multi-tenant
par sous-domaine, à exécuter dès que le domaine `pfmp-pilot.fr` (ou autre)
est acheté.

## Prérequis

- Un domaine acheté (ex : `pfmp-pilot.fr`).
- Accès au registrar (OVH, Gandi, Cloudflare Registrar, etc.) pour configurer
  les nameservers ou les enregistrements DNS.
- Accès au dashboard Vercel du projet `pfmp-pi-lot-v1-0`.
- Le projet Supabase configuré (URL + anon key dans Vercel env vars).

## Architecture cible

```
                 utilisateur tape une URL
                          │
                          ▼
┌────────────────────────────────────────────────┐
│  pfmp-pilot.fr             → landing publique  │ apex
│  www.pfmp-pilot.fr         → redirect apex     │
│  pfmp-pilot.fr/demo        → mode démo public  │
│  pfmp-pilot.fr/login       → login générique   │
│  pfmp-pilot.fr/signup      → demande tenant    │
│  pfmp-pilot.fr/superadmin  → cockpit (toi)     │
├────────────────────────────────────────────────┤
│  jean-moulin.pfmp-pilot.fr → tenant            │ subdomain wildcard
│  voltaire.pfmp-pilot.fr    → tenant            │
│  *.pfmp-pilot.fr           → résolution        │
├────────────────────────────────────────────────┤
│  pfmp.lyceejeanmoulin.fr   → custom_domain     │ custom (futur)
└────────────────────────────────────────────────┘
```

## Étape 1 — Ajouter le domaine sur Vercel

1. Vercel dashboard → projet `pfmp-pi-lot-v1-0` → **Settings → Domains**
2. **Add Domain** → entrer `pfmp-pilot.fr`
3. Vercel propose deux options de configuration DNS :
   - **A** (apex) : pointer un enregistrement A vers `76.76.21.21`
   - **NS** (nameservers) : déléguer à Vercel via `ns1.vercel-dns.com` et `ns2.vercel-dns.com`

   **Recommandation : NS (nameservers Vercel).** Plus simple pour le wildcard,
   gestion DNS centralisée, pas de propagation manuelle à chaque ajout. Le
   seul cas où on ne le fait pas, c'est si tu veux garder OVH pour gérer
   d'autres sous-domaines (mail, etc.). Mais pour ce SaaS, tout sur Vercel.

4. Vercel donne les 2 nameservers — les copier dans la zone de ton registrar
   (OVH : "Serveurs DNS" sur la fiche du domaine, remplacer les serveurs
   actuels par ceux de Vercel). **Propagation : 1-48h, généralement <1h.**

## Étape 2 — Ajouter le wildcard

Une fois `pfmp-pilot.fr` vérifié sur Vercel :

1. **Settings → Domains → Add Domain**
2. Entrer **`*.pfmp-pilot.fr`** (avec l'astérisque, c'est le wildcard)
3. Vercel certifie automatiquement (Let's Encrypt) si les nameservers sont
   sur Vercel. Sinon il faudra valider manuellement avec un TXT record.

**Critère de succès** : `nslookup test123.pfmp-pilot.fr` retourne une IP
Vercel. Si oui, le wildcard est actif et n'importe quel sous-domaine est
intercepté par notre app.

## Étape 3 — Activer le code middleware

Dans `src/router.tsx`, sur le route `__root`, ajouter le `beforeLoad` qui
appelle `resolveServerTenant()` :

```ts
import { createRootRouteWithContext } from '@tanstack/react-router'
import { resolveServerTenant, type ServerTenantContext } from '@/server/tenant-middleware'

interface RootContext {
  tenant: ServerTenantContext
}

export const Route = createRootRouteWithContext<RootContext>()({
  beforeLoad: async ({ location }) => {
    const tenant = await resolveServerTenant(location.href)
    return { tenant }
  },
  shellComponent: RootShell,
})
```

Puis dans tous les loaders enfants :

```ts
export const Route = createFileRoute('/dashboard')({
  loader: async ({ context }) => {
    const { tenant } = context
    if (!tenant.establishment && !tenant.isDemo) {
      throw redirect({ to: '/login' })
    }
    // ... fetch les données du tenant
  },
})
```

## Étape 4 — Tester

1. **Apex** : visiter `https://pfmp-pilot.fr` → doit servir la landing.
2. **Subdomain inconnu** : visiter `https://test123.pfmp-pilot.fr` → doit
   rediriger vers l'apex avec `?error=unknown-tenant`.
3. **Subdomain connu (depuis le seed)** : visiter `https://jean-moulin.pfmp-pilot.fr`
   → doit servir le dashboard du tenant Jean Moulin (lecture seule depuis
   le seed, en attendant le branchement Auth+pages réelles).

## Étape 5 — Variable d'environnement

Vérifier que `VITE_PLATFORM_DOMAIN=pfmp-pilot.fr` est défini côté Vercel
(Production + Preview + Development). Si tu utilises un autre domaine,
remplace partout dans `src/lib/tenant.ts` (la constante `PLATFORM_DOMAIN`).

## Cas d'erreur courants

**"Domain is invalid" sur Vercel** : le DNS du registrar n'est pas encore
propagé. Attendre 30 min et réessayer.

**Wildcard refusé** : tu n'as pas pointé les nameservers vers Vercel et tu
essaies d'utiliser des A records. Le wildcard avec A records nécessite un
enregistrement `*` dans la zone DNS, ce que tous les registrars n'autorisent
pas. Utilise les NS de Vercel pour éviter ce problème.

**Le subdomain redirige vers l'apex au lieu de servir le tenant** : check que
`VITE_SUPABASE_URL` est bien définie côté serveur (pas seulement côté client).
Sur Vercel, les variables `VITE_*` sont injectées côté client, mais doivent
aussi être disponibles au build pour Nitro SSR.

## Mode démo après activation

L'apex `pfmp-pilot.fr/demo` continue de servir les données de `data/demo.ts`
(mode "vitrine"). Les subdomains servent les vrais tenants depuis Supabase.
La bascule se fait automatiquement via `tenant.isDemo` dans les loaders.

## Custom domains (sprint futur)

Quand un établissement voudra son propre domaine (ex : `pfmp.lyceejeanmoulin.fr`),
le workflow est :
1. Le tenant entre son domaine dans ses settings → API met à jour `custom_domain`
2. Toi (superadmin) tu ajoutes le domaine dans Vercel via l'API Vercel Domains
3. Vercel génère un challenge DNS (TXT ou CNAME)
4. Le tenant configure son DNS
5. Edge Function vérifie périodiquement → passe `domain_verified=true` quand OK
6. Le middleware lit le custom_domain et résout le tenant

Code à écrire : Edge Function `verify-domain` + UI dans settings établissement.
Pas urgent — à faire seulement quand un client le demande.
