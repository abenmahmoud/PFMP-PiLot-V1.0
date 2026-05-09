import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  Calendar,
  FileText,
  GraduationCap,
  MapPin,
  Phone,
  Route as RouteIcon,
  ClipboardEdit,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { RoleGuard } from '@/components/RoleGuard'
import { StudentCard } from '@/components/StudentCard'
import { SearchFilterBar } from '@/components/SearchFilterBar'
import { EmptyState } from '@/components/EmptyState'
import { StageStatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import {
  fetchMyStudents,
  fetchMyStudentsFilterOptions,
  type MyStudentCard,
} from '@/services/myStudents'
import { students, classes, pfmpPeriods } from '@/data/demo'

export const Route = createFileRoute('/my-students')({ component: MyStudentsPage })

function MyStudentsPage() {
  if (isDemoMode()) return <MyStudentsDemo />
  return <MyStudentsSupabase />
}

function MyStudentsSupabase() {
  const auth = useAuth()
  const [q, setQ] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all')
  const [cards, setCards] = useState<MyStudentCard[]>([])
  const [classOptions, setClassOptions] = useState<Array<{ id: string; name: string }>>([])
  const [periodOptions, setPeriodOptions] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (auth.loading) return
    if (!auth.profile) {
      setLoading(false)
      return
    }
    if (!['referent', 'principal'].includes(auth.profile.role)) {
      setLoading(false)
      return
    }

    let mounted = true
    setLoading(true)
    setError(null)

    Promise.all([
      fetchMyStudents(auth.profile, {
        classId: classFilter === 'all' ? undefined : classFilter,
        periodId: periodFilter === 'all' ? undefined : periodFilter,
      }),
      fetchMyStudentsFilterOptions(auth.profile),
    ])
      .then(([nextCards, options]) => {
        if (!mounted) return
        setCards(nextCards)
        setClassOptions(options.classes)
        setPeriodOptions(options.periods)
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
  }, [auth.loading, auth.profile, classFilter, periodFilter])

  const visibleCards = useMemo(() => {
    const normalized = q.trim().toLowerCase()
    if (!normalized) return cards
    return cards.filter((card) =>
      [
        card.fullName,
        card.className,
        card.formation,
        card.companyName,
        card.companyCity,
        card.tutorName,
        card.periodLabel,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized)),
    )
  }, [cards, q])

  if (auth.loading || loading) return <MyStudentsSkeleton />

  if (!auth.profile) {
    return (
      <BareMyStudentsState
        title="Session requise"
        description="Connectez-vous avec un compte professeur pour afficher vos eleves."
      />
    )
  }

  if (!['referent', 'principal'].includes(auth.profile.role)) {
    return (
      <AppLayout title="Mes eleves" subtitle="Vue referent - donnees Supabase">
        <EmptyState
          icon={<GraduationCap className="w-5 h-5" />}
          title="Acces non autorise"
          description="Cette page est reservee aux professeurs referents et professeurs principaux."
        />
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Mes eleves" subtitle="Vue referent - donnees Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger vos eleves"
          description={error}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Mes eleves"
      subtitle={`${visibleCards.length} eleves affectes - donnees Supabase`}
    >
      <Filters
        q={q}
        setQ={setQ}
        classFilter={classFilter}
        setClassFilter={setClassFilter}
        periodFilter={periodFilter}
        setPeriodFilter={setPeriodFilter}
        classOptions={classOptions}
        periodOptions={periodOptions}
      />

      {visibleCards.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-5 h-5" />}
          title="Aucun eleve affecte"
          description="Aucun eleve ne correspond aux filtres actuels ou aucune affectation n'existe encore pour ce role."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleCards.map((card) => (
            <MyStudentSupabaseCard key={card.studentId} card={card} />
          ))}
        </div>
      )}
    </AppLayout>
  )
}

function MyStudentsDemo() {
  return (
    <AppLayout
      title="Mes eleves"
      subtitle="Vue referent - eleves dont vous etes responsable - mode demo"
    >
      <RoleGuard allow={['referent', 'principal']}>
        <MyStudentsDemoInner />
      </RoleGuard>
    </AppLayout>
  )
}

function MyStudentsDemoInner() {
  const me = useCurrentUser()
  const [q, setQ] = useState('')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<string>('all')

  let mine = students.filter((student) =>
    me.role === 'principal'
      ? classes.find((klass) => klass.id === student.classId)?.principalId === me.id
      : student.referentId === me.id,
  )

  if (classFilter !== 'all') mine = mine.filter((student) => student.classId === classFilter)
  if (periodFilter !== 'all') mine = mine.filter((student) => student.periodId === periodFilter)
  if (q) {
    const normalized = q.toLowerCase()
    mine = mine.filter(
      (student) =>
        student.firstName.toLowerCase().includes(normalized) ||
        student.lastName.toLowerCase().includes(normalized) ||
        student.formation.toLowerCase().includes(normalized),
    )
  }

  return (
    <>
      <Filters
        q={q}
        setQ={setQ}
        classFilter={classFilter}
        setClassFilter={setClassFilter}
        periodFilter={periodFilter}
        setPeriodFilter={setPeriodFilter}
        classOptions={classes.map((klass) => ({ id: klass.id, name: klass.name }))}
        periodOptions={pfmpPeriods.map((period) => ({ id: period.id, name: period.name }))}
      />

      {mine.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-5 h-5" />}
          title="Aucun eleve a afficher"
          description="Aucun eleve ne correspond aux filtres ou aucune affectation n'existe encore pour ce role."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mine.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      )}
    </>
  )
}

interface FiltersProps {
  q: string
  setQ: (value: string) => void
  classFilter: string
  setClassFilter: (value: string) => void
  periodFilter: string
  setPeriodFilter: (value: string) => void
  classOptions: Array<{ id: string; name: string }>
  periodOptions: Array<{ id: string; name: string }>
}

function Filters({
  q,
  setQ,
  classFilter,
  setClassFilter,
  periodFilter,
  setPeriodFilter,
  classOptions,
  periodOptions,
}: FiltersProps) {
  const filterSelect =
    'h-9 px-3 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm'

  return (
    <SearchFilterBar
      query={q}
      onQueryChange={setQ}
      placeholder="Rechercher un eleve..."
      filters={
        <>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className={filterSelect}
          >
            <option value="all">Toutes les classes</option>
            {classOptions.map((klass) => (
              <option key={klass.id} value={klass.id}>
                {klass.name}
              </option>
            ))}
          </select>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className={filterSelect}
          >
            <option value="all">Toutes les periodes</option>
            {periodOptions.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name}
              </option>
            ))}
          </select>
        </>
      }
    />
  )
}

function MyStudentSupabaseCard({ card }: { card: MyStudentCard }) {
  const mapUrl = card.companyAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(card.companyAddress)}`
    : null
  const phoneUrl = card.tutorPhone ? `tel:${card.tutorPhone.replace(/\s/g, '')}` : null

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center text-sm font-semibold shrink-0">
            {initials(card.fullName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/students/$id"
                params={{ id: card.studentId }}
                className="font-semibold text-[var(--color-text)] hover:text-[var(--color-brand-700)]"
              >
                {card.fullName}
              </Link>
              <StageStatusBadge status={card.status} />
              {card.hasAlert && <Badge tone="warning">Alerte</Badge>}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {card.className} - {card.formation}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[var(--color-text-muted)]">
          <Info icon={<Building2 className="w-3.5 h-3.5" />} text={card.companyName ?? 'Entreprise non renseignee'} />
          <Info icon={<MapPin className="w-3.5 h-3.5" />} text={card.companyCity ?? 'Ville non renseignee'} />
          <Info icon={<Calendar className="w-3.5 h-3.5" />} text={card.periodLabel} />
          <Info icon={<Phone className="w-3.5 h-3.5" />} text={card.tutorName ?? 'Tuteur non renseigne'} />
        </div>

        {card.nextAction && (
          <p className="text-xs text-[var(--color-warning-fg)] bg-[var(--color-warning-bg)] border border-amber-200 rounded-md px-2 py-1.5">
            {card.nextAction}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <ActionAnchor
            href={mapUrl}
            disabled={!mapUrl}
            icon={<RouteIcon className="w-4 h-4" />}
            label="Itineraire"
          />
          <ActionAnchor
            href={phoneUrl}
            disabled={!phoneUrl}
            icon={<Phone className="w-4 h-4" />}
            label="Appeler"
          />
          <Link
            to={card.placementId ? '/placements/$id' : '/students/$id'}
            params={{ id: card.placementId ?? card.studentId }}
            className="min-h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm font-medium hover:bg-[var(--color-muted)]"
          >
            <FileText className="w-4 h-4" />
            Fiche
          </Link>
          <a
            href={`/visits/new?studentId=${encodeURIComponent(card.studentId)}`}
            className="min-h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] px-3 text-sm font-medium text-white hover:bg-[var(--color-brand-700)]"
          >
            <ClipboardEdit className="w-4 h-4" />
            Visite
          </a>
        </div>
      </CardBody>
    </Card>
  )
}

function ActionAnchor({
  href,
  disabled,
  icon,
  label,
}: {
  href: string | null
  disabled: boolean
  icon: React.ReactNode
  label: string
}) {
  if (disabled || !href) {
    return (
      <span className="min-h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 text-sm font-medium text-[var(--color-text-subtle)]">
        {icon}
        {label}
      </span>
    )
  }
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noreferrer' : undefined}
      className="min-h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm font-medium hover:bg-[var(--color-muted)]"
    >
      {icon}
      {label}
    </a>
  )
}

function Info({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      {icon}
      <span className="truncate">{text}</span>
    </span>
  )
}

function MyStudentsSkeleton() {
  return (
    <AppLayout title="Mes eleves" subtitle="Lecture des donnees Supabase...">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-56 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
        ))}
      </div>
    </AppLayout>
  )
}

function BareMyStudentsState({ title, description }: { title: string; description: string }) {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-6 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <EmptyState icon={<GraduationCap className="w-5 h-5" />} title={title} description={description} />
      </div>
    </main>
  )
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
