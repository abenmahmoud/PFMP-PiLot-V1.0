import { createFileRoute, redirect } from '@tanstack/react-router'
import { signOut } from '@/lib/auth'

export const Route = createFileRoute('/deconnexion')({
  loader: async () => {
    await signOut()
    throw redirect({ to: '/login' })
  },
  component: () => null,
})
