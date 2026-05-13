import type { ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { AppLayoutAdmin } from '@/layouts/AppLayoutAdmin'
import { AppLayoutProf } from '@/layouts/AppLayoutProf'

interface AppLayoutProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

export function AppLayout({ title, subtitle, actions, children }: AppLayoutProps) {
  const router = useRouterState()
  if (router.location.pathname.startsWith('/prof')) {
    return (
      <AppLayoutProf title={title} subtitle={subtitle} actions={actions}>
        {children}
      </AppLayoutProf>
    )
  }
  return (
    <AppLayoutAdmin title={title} subtitle={subtitle} actions={actions}>
      {children}
    </AppLayoutAdmin>
  )
}
