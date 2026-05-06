import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

// TanStack Start déploie sur Vercel via le plugin Nitro (pattern officiel
// Vercel + TanStack, mars 2026). Nitro auto-détecte l'environnement Vercel
// au build (présence de la variable d'env VERCEL=1) et génère le bundle
// `.vercel/output` attendu par Vercel. Aucune config supplémentaire requise.
//
// En local (npm run dev), Vite passe outre Nitro et lance le serveur dev
// TanStack Start normalement sur :3000.

const config = defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact(),
  ],
})

export default config
