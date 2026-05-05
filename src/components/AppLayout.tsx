import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useCurrentUser } from '@/lib/useCurrentUser'

interface AppLayoutProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

export function AppLayout({ title, subtitle, actions, children }: AppLayoutProps) {
  const me = useCurrentUser()
  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      <div className="hidden md:block">
        <Sidebar role={me.role} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={title} subtitle={subtitle} actions={actions} />
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
