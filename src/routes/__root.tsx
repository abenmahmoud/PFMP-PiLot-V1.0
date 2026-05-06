import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import '../styles.css'
import { AuthProvider } from '@/lib/AuthProvider'
import {
  resolveServerTenant,
  type ServerTenantContext,
} from '@/server/tenant-middleware'

// Server function: executed server-side (Nitro), resolves the tenant from the
// request Host header and returns a serializable router context.
const getTenant = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ServerTenantContext> => {
    const host = getRequestHeader('host') ?? ''
    return resolveServerTenant(host)
  },
)

export interface RouterContext {
  tenant: ServerTenantContext
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const tenant = await getTenant()
    return { tenant }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#1e3a8a' },
      {
        name: 'description',
        content:
          'PFMP Pilot AI — plateforme SaaS de pilotage des PFMP en lycée professionnel : suivi terrain, visites, comptes rendus, attestations et assistant IA responsable.',
      },
      { title: 'PFMP Pilot AI · Pilotage des stages en lycée professionnel' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Scripts />
      </body>
    </html>
  )
}
