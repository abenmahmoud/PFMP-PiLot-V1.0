import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Download, Eye, FileText, Upload } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { AppLayout } from '@/components/AppLayout'
import { DocumentList } from '@/components/DocumentList'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DocumentStatusBadge } from '@/components/StatusBadge'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import {
  buildDocumentSummary,
  fetchDocuments,
  type DocumentListItem,
} from '@/services/documents'
import { documents } from '@/data/demo'
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '@/types'

export const Route = createFileRoute('/documents')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/documents' })
  },
  component: DocumentsPage,
})

const TABS: DocumentType[] = ['convention', 'attestation', 'visit_report', 'evaluation', 'other']
const LOAD_TIMEOUT_MS = 12000

export function DocumentsPage() {
  if (isDemoMode()) return <DocumentsDemo />
  return <DocumentsSupabase />
}

function DocumentsSupabase() {
  const auth = useAuth()
  const [type, setType] = useState<DocumentType | 'all'>('all')
  const [items, setItems] = useState<DocumentListItem[]>([])
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

    withTimeout(
      fetchDocuments({ type: type === 'all' ? undefined : type }),
      LOAD_TIMEOUT_MS,
      'Lecture Supabase trop longue',
    )
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
  }, [auth.loading, auth.profile, type])

  const summary = useMemo(() => buildDocumentSummary(items), [items])

  if (auth.loading || loading) return <DocumentsSkeleton />

  if (!auth.profile) {
    return (
      <BareDocumentsState
        title="Session requise"
        description="Connectez-vous avec un compte Supabase pour afficher les documents."
      />
    )
  }

  if (error) {
    return (
      <AppLayout title="Documents" subtitle="Donnees Supabase">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Impossible de charger les documents"
          description={error}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Documents"
      subtitle={`${summary.total} documents - conventions, attestations, comptes rendus - donnees Supabase`}
      actions={<DocumentActions disabled />}
    >
      <DocumentTabs type={type} setType={setType} />
      <Card>
        <CardHeader>
          <CardTitle icon={<FileText className="w-4 h-4" />}>
            {type === 'all' ? 'Tous les documents' : DOCUMENT_TYPE_LABELS[type]}
          </CardTitle>
        </CardHeader>
        <CardBody>
          {items.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-5 h-5" />}
              title="Aucun document"
              description="Aucun document ne correspond aux filtres actuels dans ce tenant."
            />
          ) : (
            <SupabaseDocumentList items={items} />
          )}
        </CardBody>
      </Card>
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">
        Storage, generation PDF et export ZIP restent prepares pour la phase documents/signatures.
      </p>
    </AppLayout>
  )
}

function DocumentsDemo() {
  const [type, setType] = useState<DocumentType | 'all'>('all')
  const filtered = documents.filter((document) => type === 'all' || document.type === type)

  return (
    <AppLayout
      title="Documents"
      subtitle={`${documents.length} documents - conventions, attestations, comptes rendus - mode demo`}
      actions={<DocumentActions />}
    >
      <DocumentTabs type={type} setType={setType} />
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
        Generation PDF, export ZIP par classe / periode et archivage automatique sont prevus
        dans la prochaine phase, branches sur Supabase Storage.
      </p>
    </AppLayout>
  )
}

function DocumentActions({ disabled = false }: { disabled?: boolean }) {
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="secondary" iconLeft={<Upload className="w-4 h-4" />} disabled={disabled}>
        Televerser
      </Button>
      <Button size="sm" iconLeft={<Download className="w-4 h-4" />} disabled={disabled}>
        Export ZIP
      </Button>
    </div>
  )
}

function DocumentTabs({
  type,
  setType,
}: {
  type: DocumentType | 'all'
  setType: (type: DocumentType | 'all') => void
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <FilterPill active={type === 'all'} onClick={() => setType('all')}>Tous</FilterPill>
      {TABS.map((tab) => (
        <FilterPill key={tab} active={type === tab} onClick={() => setType(tab)}>
          {DOCUMENT_TYPE_LABELS[tab]}
        </FilterPill>
      ))}
    </div>
  )
}

function SupabaseDocumentList({ items }: { items: DocumentListItem[] }) {
  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {items.map((item) => {
        const type = asDocumentType(item.document.type)
        return (
          <li key={item.document.id} className="flex items-center gap-3 py-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-muted)] text-[var(--color-text-muted)] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.document.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {type ? DOCUMENT_TYPE_LABELS[type] : item.document.type}
                {item.student && ` - ${item.student.first_name} ${item.student.last_name}`}
                {item.period && ` - ${item.period.name}`}
                {item.company && ` - ${item.company.name}`}
                {' - '}
                {formatDate(item.document.created_at)}
              </p>
            </div>
            <DocumentStatusBadge status={item.document.status} />
            {item.document.storage_path ? (
              <Badge tone="success">Fichier</Badge>
            ) : (
              <Badge tone="neutral">Sans fichier</Badge>
            )}
            <Link to="/admin/documents/$id" params={{ id: item.document.id }}>
              <Button size="sm" variant="ghost" iconLeft={<Eye className="w-3.5 h-3.5" />}>
                <span className="hidden sm:inline">Voir</span>
              </Button>
            </Link>
            <Button size="sm" variant="ghost" iconLeft={<Download className="w-3.5 h-3.5" />} disabled>
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </li>
        )
      })}
    </ul>
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

function DocumentsSkeleton() {
  return (
    <AppLayout title="Documents" subtitle="Lecture des donnees Supabase...">
      <Card>
        <CardBody className="space-y-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-12 rounded-md bg-[var(--color-muted)] animate-pulse" />
          ))}
        </CardBody>
      </Card>
    </AppLayout>
  )
}

function BareDocumentsState({ title, description }: { title: string; description: string }) {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-6 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <EmptyState icon={<FileText className="w-5 h-5" />} title={title} description={description} />
      </div>
    </main>
  )
}

function asDocumentType(value: string): DocumentType | null {
  return TABS.includes(value as DocumentType) ? (value as DocumentType) : null
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR')
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
