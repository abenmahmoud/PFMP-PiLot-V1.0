import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { AppLayout } from '@/components/AppLayout'
import { DocumentList } from '@/components/DocumentList'
import { Button } from '@/components/ui/Button'
import { Download, Upload, FileText } from 'lucide-react'
import { documents } from '@/data/demo'
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '@/types'

export const Route = createFileRoute('/documents')({ component: DocumentsPage })

const TABS: DocumentType[] = ['convention', 'attestation', 'visit_report', 'evaluation', 'other']

function DocumentsPage() {
  const [type, setType] = useState<DocumentType | 'all'>('all')
  const filtered = documents.filter((d) => type === 'all' || d.type === type)

  return (
    <AppLayout
      title="Documents"
      subtitle={`${documents.length} documents · conventions, attestations, comptes rendus`}
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" iconLeft={<Upload className="w-4 h-4" />}>
            Téléverser
          </Button>
          <Button size="sm" iconLeft={<Download className="w-4 h-4" />}>
            Export ZIP
          </Button>
        </div>
      }
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <FilterPill active={type === 'all'} onClick={() => setType('all')}>Tous</FilterPill>
        {TABS.map((t) => (
          <FilterPill key={t} active={type === t} onClick={() => setType(t)}>
            {DOCUMENT_TYPE_LABELS[t]}
          </FilterPill>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle icon={<FileText className="w-4 h-4" />}>
            {type === 'all' ? 'Tous les documents' : DOCUMENT_TYPE_LABELS[type]}
          </CardTitle>
        </CardHeader>
        <CardBody>
          <DocumentList documents={filtered} />
        </CardBody>
      </Card>
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">
        Génération PDF, export ZIP par classe / période et archivage automatique sont prévus
        dans la prochaine phase, branchés sur Supabase Storage.
      </p>
    </AppLayout>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 rounded-full text-xs font-medium border ${
        active
          ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border-[var(--color-brand-100)]'
          : 'bg-white text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-muted)]'
      }`}
    >
      {children}
    </button>
  )
}
