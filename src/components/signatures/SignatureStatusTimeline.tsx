import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import type { DocumentSignatureRow } from '@/lib/database.types'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

export function SignatureStatusTimeline({ signatures }: { signatures: DocumentSignatureRow[] }) {
  if (signatures.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">Aucune demande de signature envoyee.</p>
  }

  return (
    <ol className="space-y-3">
      {signatures.map((signature) => {
        const signed = signature.status === 'signed'
        const cancelled = signature.status === 'cancelled' || signature.status === 'expired' || signature.status === 'refused'
        const Icon = signed ? CheckCircle2 : cancelled ? XCircle : Clock
        return (
          <li key={signature.id} className="flex gap-3">
            <span
              className={cn(
                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                signed ? 'bg-green-50 text-green-700' : cancelled ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700',
              )}
            >
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-[var(--color-text)]">{signature.signer_name ?? signature.signer_email}</p>
                <Badge tone={signed ? 'success' : cancelled ? 'danger' : 'warning'}>{statusLabel(signature.status)}</Badge>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                {roleLabel(signature.signer_role)}
                {signature.signed_at ? ` - signe le ${formatDateTime(signature.signed_at)}` : signature.sent_at ? ` - envoye le ${formatDateTime(signature.sent_at)}` : ''}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function statusLabel(status: DocumentSignatureRow['status']): string {
  const labels: Record<DocumentSignatureRow['status'], string> = {
    pending: 'En attente',
    sent: 'Envoye',
    viewed: 'Vu',
    signed: 'Signe',
    refused: 'Refuse',
    expired: 'Expire',
    cancelled: 'Annule',
  }
  return labels[status]
}

function roleLabel(role: DocumentSignatureRow['signer_role']): string {
  const labels: Record<DocumentSignatureRow['signer_role'], string> = {
    student: 'Eleve',
    parent: 'Parent',
    tutor: 'Tuteur entreprise',
    employer: 'Entreprise',
    school: 'Etablissement',
    referent: 'Referent PFMP',
    principal: 'Professeur principal',
    ddfpt: 'DDFPT',
    admin: 'Administration',
  }
  return labels[role]
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}
