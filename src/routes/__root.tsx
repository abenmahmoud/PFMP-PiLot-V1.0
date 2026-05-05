import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import '../styles.css'

export const Route = createRootRoute({
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
        {children}
        <Scripts />
      </body>
    </html>
  )
}
