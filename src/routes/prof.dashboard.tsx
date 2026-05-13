import { createFileRoute, Link } from '@tanstack/react-router'
import { CalendarCheck, GraduationCap, Route as RouteIcon, Users } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { useCurrentUser } from '@/lib/useCurrentUser'

export const Route = createFileRoute('/prof/dashboard')({
  component: ProfDashboardPage,
})

function ProfDashboardPage() {
  const me = useCurrentUser()
  return (
    <AppLayout title="Dashboard professeur" subtitle="Suivi de vos classes, eleves et visites PFMP">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProfShortcut
          to="/prof/my-classes"
          icon={<Users className="h-5 w-5" />}
          title="Mes classes"
          description="Classes ou vous etes professeur principal."
        />
        <ProfShortcut
          to="/prof/my-students"
          icon={<GraduationCap className="h-5 w-5" />}
          title="Mes eleves"
          description="Eleves suivis comme principal ou referent."
        />
        <ProfShortcut
          to="/prof/visits"
          icon={<RouteIcon className="h-5 w-5" />}
          title="Visites"
          description="Planning et comptes-rendus de visite."
        />
        <ProfShortcut
          to="/prof/pfmp-periods"
          icon={<CalendarCheck className="h-5 w-5" />}
          title="Periodes PFMP"
          description="Calendrier des periodes de stage."
        />
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Bonjour {me.firstName}</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Votre espace professeur est separe de l'administration. Les actions sensibles restent
            limitees a vos classes et a vos eleves affectes.
          </p>
        </CardBody>
      </Card>
    </AppLayout>
  )
}

function ProfShortcut({
  to,
  icon,
  title,
  description,
}: {
  to:
    | '/prof/my-classes'
    | '/prof/my-students'
    | '/prof/visits'
    | '/prof/pfmp-periods'
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link to={to} className="block rounded-xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/50">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
        {icon}
      </div>
      <h2 className="font-semibold text-[var(--color-text)]">{title}</h2>
      <p className="mt-2 text-sm leading-5 text-[var(--color-text-muted)]">{description}</p>
    </Link>
  )
}
