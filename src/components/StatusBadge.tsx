import { Badge } from '@/components/ui/Badge'
import {
  ALERT_LEVEL_LABELS,
  DOCUMENT_WORKFLOW_STATUS_LABELS,
  PERIOD_STATUS_LABELS,
  SIGNATURE_STATUS_LABELS,
  STAGE_STATUS_LABELS,
  type AlertLevel,
  type DocumentWorkflowStatus,
  type PeriodStatus,
  type SignatureStatus,
  type StageStatus,
} from '@/types'

export function StageStatusBadge({ status }: { status: StageStatus }) {
  const tone =
    status === 'in_progress' || status === 'completed' || status === 'signed_convention'
      ? 'success'
      : status === 'pending_convention' || status === 'found'
        ? 'info'
        : status === 'no_stage'
          ? 'warning'
          : status === 'interrupted'
            ? 'danger'
            : 'neutral'
  return <Badge tone={tone} dot>{STAGE_STATUS_LABELS[status]}</Badge>
}

export function AlertLevelBadge({ level }: { level: AlertLevel }) {
  const tone =
    level === 'urgent'
      ? 'danger'
      : level === 'problem'
        ? 'danger'
        : level === 'vigilance'
          ? 'warning'
          : 'success'
  return <Badge tone={tone} dot>{ALERT_LEVEL_LABELS[level]}</Badge>
}

export function PeriodStatusBadge({ status }: { status: PeriodStatus }) {
  const tone =
    status === 'in_progress'
      ? 'info'
      : status === 'preparation'
        ? 'warning'
        : status === 'completed'
          ? 'success'
          : 'neutral'
  return <Badge tone={tone} dot>{PERIOD_STATUS_LABELS[status]}</Badge>
}

export function DocumentStatusBadge({
  status,
}: {
  status: 'missing' | 'draft' | 'validated' | 'archived'
}) {
  const map = {
    missing: { tone: 'danger', label: 'Manquant' },
    draft: { tone: 'warning', label: 'Brouillon' },
    validated: { tone: 'success', label: 'Validé' },
    archived: { tone: 'neutral', label: 'Archivé' },
  } as const
  const { tone, label } = map[status]
  return <Badge tone={tone} dot>{label}</Badge>
}

export function DocumentWorkflowStatusBadge({ status }: { status: DocumentWorkflowStatus }) {
  const tone =
    status === 'fully_signed' || status === 'archived'
      ? 'success'
      : status === 'partially_signed' || status === 'awaiting_signature' || status === 'sent'
        ? 'info'
        : status === 'draft' || status === 'template_to_configure'
          ? 'warning'
          : status === 'to_correct'
            ? 'warning'
            : status === 'refused' || status === 'expired'
              ? 'danger'
              : 'neutral'
  return <Badge tone={tone} dot>{DOCUMENT_WORKFLOW_STATUS_LABELS[status]}</Badge>
}

export function SignatureStatusBadge({ status }: { status: SignatureStatus }) {
  const tone =
    status === 'signed'
      ? 'success'
      : status === 'sent'
        ? 'info'
        : status === 'pending'
          ? 'warning'
          : status === 'refused' || status === 'expired'
            ? 'danger'
            : 'neutral'
  return <Badge tone={tone} dot>{SIGNATURE_STATUS_LABELS[status]}</Badge>
}
