import { createFileRoute } from '@tanstack/react-router'
import { AppLayout } from '@/components/AppLayout'
import { RoleGuard } from '@/components/RoleGuard'
import { VisitForm } from '@/components/VisitForm'

export const Route = createFileRoute('/visits/new')({ component: NewVisitPage })

function NewVisitPage() {
  return (
    <AppLayout
      title="Nouvelle visite"
      subtitle="Mobile-first · saisissez vos notes pendant la visite, l'IA peut les reformuler"
    >
      <RoleGuard allow={['referent', 'principal', 'ddfpt', 'admin']}>
        <VisitForm />
      </RoleGuard>
    </AppLayout>
  )
}
