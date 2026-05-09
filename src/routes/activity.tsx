import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Archive,
  ClipboardCheck,
  Download,
  History,
  LogIn,
  Network,
  Shield,
  Sparkles,
  Upload,
  UserPlus,
  AlertTriangle,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { ActivityTimeline } from '@/components/ActivityTimeline'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import { fetchActivity, type ActivityItem } from '@/services/activity'
import { activityLog } from '@/data/demo'

export const Route = createFileRoute('/activity')({ component: ActivityPage })

const LOAD_TIMEOUT_MS = 12000

function ActivityPage() {
  if (isDemoMode()) return <ActivityDemo />
  return <ActivitySupabase />
}

function ActivitySupabase() {
  const auth = useAuth()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (auth.loading) return
    if (!auth.profile) {
      setLoading(false)
      return
    }

    let mounted = true
    setLoading(true)
    setError(null)

    withTimeout(fetchActivity(), LOAD_TIMEOUT_MS, 'Lecture Supabase trop longue')
      .then((nextItems) => {
        if (mounted) setItems(nextItems)
      })
      .catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [auth.loading, auth.profile])

  if (auth.loading || loading) return <ActivitySkeleton />

  if (!auth.profile) {
    return (
      <BareActivityState
        title="Session requise"
        description="Connectez-vous avec un compte Supabase pour afficher le journal d'activite."
      />
    )
  }

  if (!['admin', 'ddfpt', 'superadmin'].includes(auth.profile.role)) {
    return (
      <AppLayout title="Journal d'activite" subtitle="Donnees Supabase">
        <EmptyState
          icon={<Shield className="w-5 h-5" />}
          title="Acces non autorise"
          description="Le journal d'activite est reserve aux administrateurs et DDFPT."
        />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Journal d'activite" subtitle="Donnees Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger le journal"
          description={error}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Journal d'activite"
      subtitle="Connexions, imports, creations, validations, generations IA, exports - donnees Supabase"
    >
      <Card>
        <CardHeader>
          <CardTitle icon={<History className="w-4 h-4" />}>Audit logs</CardTitle>
        </CardHeader>
        <CardBody>
          {items.length === 0 ? (
            <EmptyState
              icon={<History className="w-5 h-5" />}
              title="Aucune activite enregistree"
              description="Les actions de votre equipe apparaitront ici : invitations, imports, visites, validations et exports."
            />
          ) : (
            <SupabaseActivityTimeline entries={items} />
          )}
          <p className="mt-4 text-xs text-[var(--color-text-muted)]">
            Le journal est persiste dans `audit_logs`. Les actions sensibles sont rattachees a
            l'utilisateur et a l'etablissement concernes.
          </p>
        </CardBody>
      </Card>
    </AppLayout>
  )
}

function ActivityDemo() {
  return (
    <AppLayout
      title="Journal d'activite"
      subtitle="Connexions, imports, creations, validations, generations IA, exports - mode demo"
    >
      <Card>
        <CardHeader>
          <CardTitle icon={<History className="w-4 h-4" />}>Audit logs</CardTitle>
        </CardHeader>
        <CardBody>
          <ActivityTimeline entries={activityLog} />
          <p className="mt-4 text-xs text-[var(--color-text-muted)]">
            Le journal sera persiste dans la table `audit_logs`. Chaque action sensible
            est enregistree avec l'utilisateur et l'etablissement concerne.
          </p>
        </CardBody>
      </Card>
    </AppLayout>
  )
}

function SupabaseActivityTimeline({ entries }: { entries: ActivityItem[] }) {
  return (
    <ul className="space-y-3">
      {entries.map((entry) => {
        const Icon = iconForAction(entry.log.action)
        const author = entry.user
        return (
          <li key={entry.log.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--color-text)]">
                {entry.log.description ?? entry.log.action}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {author ? `${author.first_name} ${author.last_name}` : 'Systeme'} -{' '}
                {new Date(entry.log.created_at).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function iconForAction(action: string): typeof LogIn {
  if (action.includes('login')) return LogIn
  if (action.includes('import')) return Upload
  if (action.includes('student') || action.includes('user.invited')) return UserPlus
  if (action.includes('assignment')) return Network
  if (action.includes('visit')) return ClipboardCheck
  if (action.includes('ai')) return Sparkles
  if (action.includes('export')) return Download
  if (action.includes('archive')) return Archive
  if (action.includes('role') || action.includes('superadmin')) return Shield
  return History
}

function ActivitySkeleton() {
  return (
    <AppLayout title="Journal d'activite" subtitle="Lecture des donnees Supabase...">
      <div className="h-72 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
    </AppLayout>
  )
}

function BareActivityState({ title, description }: { title: string; description: string }) {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-6 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <EmptyState icon={<History className="w-5 h-5" />} title={title} description={description} />
      </div>
    </main>
  )
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
