import { FileText, Download, Eye } from 'lucide-react'
import type { Document } from '@/types'
import { DOCUMENT_TYPE_LABELS } from '@/types'
import { DocumentStatusBadge } from './StatusBadge'
import { students } from '@/data/demo'
import { Button } from './ui/Button'

interface DocumentListProps {
  documents: Document[]
}

export function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
        Aucun document.
      </p>
    )
  }
  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {documents.map((d) => {
        const s = students.find((st) => st.id === d.studentId)
        return (
          <li key={d.id} className="flex items-center gap-3 py-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-muted)] text-[var(--color-text-muted)] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{d.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {DOCUMENT_TYPE_LABELS[d.type]}
                {s && ` · ${s.firstName} ${s.lastName}`} ·{' '}
                {new Date(d.date).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <DocumentStatusBadge status={d.status} />
            <Button size="sm" variant="ghost" iconLeft={<Eye className="w-3.5 h-3.5" />}>
              <span className="hidden sm:inline">Voir</span>
            </Button>
            <Button size="sm" variant="ghost" iconLeft={<Download className="w-3.5 h-3.5" />}>
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
