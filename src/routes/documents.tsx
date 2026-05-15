import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BookOpen, Brain, Eye, FileText, RefreshCw, Save, UploadCloud } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { AppLayout } from '@/components/AppLayout'
import { DocumentList } from '@/components/DocumentList'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Label, Select, Textarea, Input } from '@/components/ui/Field'
import { DocumentStatusBadge } from '@/components/StatusBadge'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import {
  buildDocumentSummary,
  fetchDocumentPeriods,
  fetchDocuments,
  type DocumentListItem,
} from '@/services/documents'
import {
  assignConventionTemplateToClass,
  analyzeConventionTemplateSource,
  clearConventionTemplateForClass,
  ensureConventionDocumentsForPeriod,
  listClassConventionTemplateAssignments,
  listDocumentTemplatesForEstablishment,
  saveConventionTemplate,
  type ClassConventionTemplateAssignment,
  type ConventionTemplateSourceAnalysisResult,
} from '@/server/documents.functions'
import type { DocumentTemplateFieldRow, DocumentTemplateRow, DocumentTemplateSourceKind, PfmpPeriodRow } from '@/lib/database.types'
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
  const [validationOnly, setValidationOnly] = useState(false)
  const [items, setItems] = useState<DocumentListItem[]>([])
  const [periods, setPeriods] = useState<PfmpPeriodRow[]>([])
  const [templates, setTemplates] = useState<DocumentTemplateRow[]>([])
  const [assignments, setAssignments] = useState<ClassConventionTemplateAssignment[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [syncingConventions, setSyncingConventions] = useState(false)
  const [studioSaving, setStudioSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateBody, setTemplateBody] = useState(DEFAULT_TEMPLATE_DRAFT)
  const [sourceName, setSourceName] = useState('')
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [sourceKind, setSourceKind] = useState<DocumentTemplateSourceKind>('docx_import')
  const [sourceText, setSourceText] = useState('')
  const [sourceAnalyzing, setSourceAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<ConventionTemplateSourceAnalysisResult | null>(null)

  useEffect(() => {
    if (auth.loading) return
    if (!auth.profile) {
      setLoading(false)
      return
    }

    let mounted = true
    setLoading(true)
    setError(null)

    const accessToken = auth.session?.access_token

    withTimeout(
      Promise.all([
        fetchDocuments({ type: validationOnly ? 'convention' : type === 'all' ? undefined : type }),
        fetchDocumentPeriods(),
        accessToken ? fetchConventionStudio(accessToken, auth.activeEstablishmentId) : Promise.resolve({ templates: [], assignments: [] }),
      ]),
      LOAD_TIMEOUT_MS,
      'Lecture Supabase trop longue',
    )
      .then(([nextItems, nextPeriods, studio]) => {
        if (!mounted) return
        setItems(nextItems)
        setPeriods(nextPeriods)
        setTemplates(studio.templates)
        setAssignments(studio.assignments)
        setSelectedPeriodId((current) => current || nextPeriods[0]?.id || '')
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
  }, [auth.loading, auth.profile, auth.session, auth.activeEstablishmentId, type, validationOnly])

  const visibleItems = useMemo(
    () => validationOnly ? items.filter((item) => item.document.type === 'convention' && ['draft', 'generated'].includes(item.document.status)) : items,
    [items, validationOnly],
  )
  const summary = useMemo(() => buildDocumentSummary(visibleItems), [visibleItems])

  async function reloadDocuments() {
    const accessToken = auth.session?.access_token
    const [nextItems, nextPeriods] = await Promise.all([
      fetchDocuments({ type: validationOnly ? 'convention' : type === 'all' ? undefined : type }),
      fetchDocumentPeriods(),
    ])
    setItems(nextItems)
    setPeriods(nextPeriods)
    setSelectedPeriodId((current) => current || nextPeriods[0]?.id || '')
    if (accessToken) {
      const studio = await fetchConventionStudio(accessToken, auth.activeEstablishmentId)
      setTemplates(studio.templates)
      setAssignments(studio.assignments)
    }
  }

  async function prepareConventions() {
    const accessToken = auth.session?.access_token
    if (!accessToken || !selectedPeriodId) return
    setSyncingConventions(true)
    setError(null)
    setActionMessage(null)
    try {
      const result = await ensureConventionDocumentsForPeriod({
        data: {
          accessToken,
          establishmentId: auth.activeEstablishmentId,
          periodId: selectedPeriodId,
        },
      })
      setActionMessage(
        `${result.created} convention(s) creee(s), ${result.updated} mise(s) a jour pour ${result.placements} dossier(s) PFMP.`,
      )
      await reloadDocuments()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSyncingConventions(false)
    }
  }

  async function createTemplate() {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    setStudioSaving(true)
    setError(null)
    setActionMessage(null)
    try {
      const template = await saveConventionTemplate({
        data: {
          accessToken,
          establishmentId: auth.activeEstablishmentId,
          template: {
            name: templateName || 'Convention PFMP etablissement',
            bodyMarkdown: templateBody,
          },
        },
      })
      setTemplateName('')
      setTemplateBody(DEFAULT_TEMPLATE_DRAFT)
      setActionMessage(`Modele "${template.name}" enregistre. Vous pouvez maintenant l'affecter a une classe.`)
      await reloadDocuments()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setStudioSaving(false)
    }
  }

  async function analyzeSourceTemplate() {
    const accessToken = auth.session?.access_token
    if (!accessToken || !sourceFile) return
    setSourceAnalyzing(true)
    setError(null)
    setActionMessage(null)
    try {
      const sourceBase64 = await fileToBase64(sourceFile)
      const result = await analyzeConventionTemplateSource({
        data: {
          accessToken,
          establishmentId: auth.activeEstablishmentId,
          source: {
            name: sourceName || sourceFile.name.replace(/\.[^.]+$/, ''),
            fileName: sourceFile.name,
            mimeType: sourceFile.type || inferMimeTypeFromName(sourceFile.name),
            fileSizeBytes: sourceFile.size,
            sourceBase64,
            extractedText: sourceText || null,
            sourceKind,
          },
        },
      })
      setAnalysisResult(result)
      setSourceName('')
      setSourceFile(null)
      setSourceText('')
      setActionMessage(
        `Source analysee: ${result.fields.length} champ(s) detecte(s), analyse ${result.analysisSource}${result.sourceStored ? ', fichier source archive' : ''}.`,
      )
      await reloadDocuments()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSourceAnalyzing(false)
    }
  }

  async function assignTemplate(classId: string, templateId: string) {
    const accessToken = auth.session?.access_token
    if (!accessToken || !classId || !templateId) return
    setStudioSaving(true)
    setError(null)
    try {
      await assignConventionTemplateToClass({
        data: { accessToken, establishmentId: auth.activeEstablishmentId, classId, templateId },
      })
      await reloadDocuments()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setStudioSaving(false)
    }
  }

  async function clearTemplate(classId: string) {
    const accessToken = auth.session?.access_token
    if (!accessToken || !classId) return
    setStudioSaving(true)
    setError(null)
    try {
      await clearConventionTemplateForClass({
        data: { accessToken, establishmentId: auth.activeEstablishmentId, classId },
      })
      await reloadDocuments()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setStudioSaving(false)
    }
  }

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
      actions={
        <DocumentActions
          periods={periods}
          selectedPeriodId={selectedPeriodId}
          onPeriodChange={setSelectedPeriodId}
          onPrepareConventions={prepareConventions}
          preparing={syncingConventions}
        />
      }
    >
      {actionMessage && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {actionMessage}
        </div>
      )}
      <ConventionStudioPanel
        templates={templates}
        assignments={assignments}
        templateName={templateName}
        templateBody={templateBody}
        saving={studioSaving}
        onTemplateNameChange={setTemplateName}
        onTemplateBodyChange={setTemplateBody}
        onCreateTemplate={createTemplate}
        onAssignTemplate={assignTemplate}
        onClearTemplate={clearTemplate}
        sourceName={sourceName}
        sourceFile={sourceFile}
        sourceKind={sourceKind}
        sourceText={sourceText}
        sourceAnalyzing={sourceAnalyzing}
        analysisResult={analysisResult}
        onSourceNameChange={setSourceName}
        onSourceFileChange={setSourceFile}
        onSourceKindChange={setSourceKind}
        onSourceTextChange={setSourceText}
        onAnalyzeSource={analyzeSourceTemplate}
      />
      <DocumentTabs
        type={type}
        setType={(nextType) => {
          setType(nextType)
          setValidationOnly(false)
        }}
        validationOnly={validationOnly}
        setValidationOnly={setValidationOnly}
      />
      <Card>
        <CardHeader>
          <CardTitle icon={<FileText className="w-4 h-4" />}>
            {validationOnly ? 'Conventions a valider' : type === 'all' ? 'Tous les documents' : DOCUMENT_TYPE_LABELS[type]}
          </CardTitle>
        </CardHeader>
        <CardBody>
          {visibleItems.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-5 h-5" />}
              title="Aucun document"
              description="Aucun document ne correspond aux filtres actuels dans ce tenant."
            />
          ) : (
            <SupabaseDocumentList items={visibleItems} />
          )}
        </CardBody>
      </Card>
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">
        Les conventions sont creees par periode et par eleve. Les champs entreprise/tuteur restent vierges tant que le dossier PFMP n'est pas complete.
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

function DocumentActions({
  disabled = false,
  periods = [],
  selectedPeriodId = '',
  onPeriodChange,
  onPrepareConventions,
  preparing = false,
}: {
  disabled?: boolean
  periods?: PfmpPeriodRow[]
  selectedPeriodId?: string
  onPeriodChange?: (periodId: string) => void
  onPrepareConventions?: () => void
  preparing?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {onPrepareConventions && (
        <>
          <select
            value={selectedPeriodId}
            onChange={(event) => onPeriodChange?.(event.target.value)}
            className="h-9 rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm text-[var(--color-text)]"
            disabled={disabled || periods.length === 0 || preparing}
          >
            {periods.length === 0 ? (
              <option value="">Aucune periode</option>
            ) : (
              periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}
                </option>
              ))
            )}
          </select>
          <Button
            size="sm"
            variant="secondary"
            iconLeft={<RefreshCw className="w-4 h-4" />}
            onClick={onPrepareConventions}
            disabled={disabled || !selectedPeriodId || preparing}
          >
            {preparing ? 'Preparation...' : 'Preparer conventions'}
          </Button>
        </>
      )}
    </div>
  )
}

function ConventionStudioPanel({
  templates,
  assignments,
  templateName,
  templateBody,
  saving,
  sourceName,
  sourceFile,
  sourceKind,
  sourceText,
  sourceAnalyzing,
  analysisResult,
  onTemplateNameChange,
  onTemplateBodyChange,
  onCreateTemplate,
  onAssignTemplate,
  onClearTemplate,
  onSourceNameChange,
  onSourceFileChange,
  onSourceKindChange,
  onSourceTextChange,
  onAnalyzeSource,
}: {
  templates: DocumentTemplateRow[]
  assignments: ClassConventionTemplateAssignment[]
  templateName: string
  templateBody: string
  saving: boolean
  sourceName: string
  sourceFile: File | null
  sourceKind: DocumentTemplateSourceKind
  sourceText: string
  sourceAnalyzing: boolean
  analysisResult: ConventionTemplateSourceAnalysisResult | null
  onTemplateNameChange: (value: string) => void
  onTemplateBodyChange: (value: string) => void
  onCreateTemplate: () => void
  onAssignTemplate: (classId: string, templateId: string) => void
  onClearTemplate: (classId: string) => void
  onSourceNameChange: (value: string) => void
  onSourceFileChange: (value: File | null) => void
  onSourceKindChange: (value: DocumentTemplateSourceKind) => void
  onSourceTextChange: (value: string) => void
  onAnalyzeSource: () => void
}) {
  const conventionTemplates = templates.filter((template) => template.type === 'convention' && template.active)
  return (
    <div className="mb-5 grid grid-cols-1 2xl:grid-cols-4 gap-4">
      <Card className="2xl:col-span-2">
        <CardHeader>
          <CardTitle icon={<BookOpen className="w-4 h-4" />}>Studio conventions par classe</CardTitle>
          <Badge tone="brand">{assignments.filter((item) => item.template).length}/{assignments.length} classes configurees</Badge>
        </CardHeader>
        <CardBody className="space-y-3">
          {assignments.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-5 h-5" />}
              title="Aucune classe a configurer"
              description="Creez ou importez les classes avant d'affecter les conventions numeriques."
            />
          ) : (
            assignments.map((item) => (
              <div key={item.class.id} className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-white p-3 md:grid-cols-[1fr_2fr_auto] md:items-center">
                <div>
                  <p className="text-sm font-semibold">{item.class.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{[item.class.level, item.class.formation].filter(Boolean).join(' - ') || 'Formation non renseignee'}</p>
                </div>
                <Select
                  value={item.template?.id ?? ''}
                  onChange={(event) => {
                    if (event.target.value) void onAssignTemplate(item.class.id, event.target.value)
                    else void onClearTemplate(item.class.id)
                  }}
                  disabled={saving || conventionTemplates.length === 0}
                >
                  <option value="">Aucun modele affecte</option>
                  {conventionTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
                {item.template ? (
                  <Badge tone="success">Affecte</Badge>
                ) : (
                  <Badge tone="warning">A configurer</Badge>
                )}
              </div>
            ))
          )}
          <p className="text-xs text-[var(--color-text-muted)]">
            Quand une periode PFMP est synchronisee, chaque convention eleve utilise le modele affecte a sa classe.
          </p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle icon={<FileText className="w-4 h-4" />}>Nouveau modele</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div>
            <Label>Nom du modele</Label>
            <Input
              value={templateName}
              onChange={(event) => onTemplateNameChange(event.target.value)}
              placeholder="Convention MELEC 2025"
              disabled={saving}
            />
          </div>
          <div>
            <Label>Contenu avec champs variables</Label>
            <Textarea
              className="min-h-44 font-mono text-xs"
              value={templateBody}
              onChange={(event) => onTemplateBodyChange(event.target.value)}
              disabled={saving}
            />
          </div>
          <Button
            type="button"
            size="sm"
            iconLeft={<Save className="w-4 h-4" />}
            onClick={onCreateTemplate}
            disabled={saving || templateBody.trim().length < 80}
          >
            Enregistrer modele
          </Button>
          <p className="text-xs text-[var(--color-text-muted)]">
            Creation manuelle rapide pour les lycees qui n'ont pas encore fourni leur document officiel.
          </p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle icon={<Brain className="w-4 h-4" />}>Import intelligent</CardTitle>
          <Badge tone="warning">IA + validation</Badge>
        </CardHeader>
        <CardBody className="space-y-3">
          <div>
            <Label>Document source</Label>
            <Input
              type="file"
              accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={sourceAnalyzing || saving}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                onSourceFileChange(file)
                if (file && !sourceName) onSourceNameChange(file.name.replace(/\.[^.]+$/, ''))
              }}
            />
            {sourceFile && (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {sourceFile.name} - {formatFileSize(sourceFile.size)}
              </p>
            )}
          </div>
          <div>
            <Label>Nom du modele</Label>
            <Input
              value={sourceName}
              onChange={(event) => onSourceNameChange(event.target.value)}
              placeholder="Convention CAP EPC 2025"
              disabled={sourceAnalyzing}
            />
          </div>
          <div>
            <Label>Format source</Label>
            <Select
              value={sourceKind}
              onChange={(event) => onSourceKindChange(event.target.value as DocumentTemplateSourceKind)}
              disabled={sourceAnalyzing}
            >
              <option value="docx_import">DOCX officiel</option>
              <option value="pdf_fillable">PDF remplissable</option>
              <option value="pdf_flat">PDF non remplissable</option>
              <option value="pdf_scan">Scan papier/PDF scanne</option>
            </Select>
          </div>
          <div>
            <Label>Texte extrait ou consignes IA</Label>
            <Textarea
              className="min-h-28 text-xs"
              value={sourceText}
              onChange={(event) => onSourceTextChange(event.target.value)}
              placeholder="Optionnel : collez ici le texte OCR, les champs repérés ou les consignes du lycée."
              disabled={sourceAnalyzing}
            />
          </div>
          <Button
            type="button"
            size="sm"
            iconLeft={<UploadCloud className="w-4 h-4" />}
            onClick={onAnalyzeSource}
            disabled={!sourceFile || sourceAnalyzing}
          >
            {sourceAnalyzing ? 'Analyse...' : 'Importer et analyser'}
          </Button>
          <p className="text-xs text-[var(--color-text-muted)]">
            Le document est archive comme source. L'IA propose les champs, puis le superadmin ou DDFPT valide avant affectation a une classe.
          </p>
          {analysisResult && (
            <AnalysisResultPreview result={analysisResult} />
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function AnalysisResultPreview({ result }: { result: ConventionTemplateSourceAnalysisResult }) {
  const required = result.fields.filter((field) => field.required).length
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--color-text)]">
          {result.fields.length} champs detectes
        </p>
        <Badge tone={result.analysisSource === 'claude' ? 'brand' : 'neutral'}>
          {result.analysisSource === 'claude' ? 'Analyse IA' : 'Heuristique'}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        {required} champs obligatoires. Revue humaine requise avant usage officiel.
      </p>
      <div className="mt-3 max-h-36 space-y-1 overflow-auto">
        {result.fields.slice(0, 8).map((field) => (
          <FieldReviewLine key={field.id ?? field.field_key} field={field} />
        ))}
      </div>
      {result.warnings.length > 0 && (
        <p className="mt-2 text-xs text-amber-700">
          {result.warnings[0]}
        </p>
      )}
    </div>
  )
}

function FieldReviewLine({ field }: { field: DocumentTemplateFieldRow }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1 text-xs">
      <span className="min-w-0 truncate font-medium">{field.label}</span>
      <span className="shrink-0 text-[var(--color-text-muted)]">{field.role}</span>
    </div>
  )
}

function DocumentTabs({
  type,
  setType,
  validationOnly = false,
  setValidationOnly,
}: {
  type: DocumentType | 'all'
  setType: (type: DocumentType | 'all') => void
  validationOnly?: boolean
  setValidationOnly?: (value: boolean) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <FilterPill active={!validationOnly && type === 'all'} onClick={() => setType('all')}>Tous</FilterPill>
      {setValidationOnly && (
        <FilterPill active={validationOnly} onClick={() => setValidationOnly(true)}>
          A valider
        </FilterPill>
      )}
      {TABS.map((tab) => (
        <FilterPill key={tab} active={!validationOnly && type === tab} onClick={() => setType(tab)}>
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

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'))
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }
    reader.readAsDataURL(file)
  })
}

function inferMimeTypeFromName(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  return 'application/octet-stream'
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} o`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`
  return `${(size / 1024 / 1024).toFixed(1)} Mo`
}

async function fetchConventionStudio(
  accessToken: string,
  establishmentId: string | null,
): Promise<{ templates: DocumentTemplateRow[]; assignments: ClassConventionTemplateAssignment[] }> {
  const [templates, assignments] = await Promise.all([
    listDocumentTemplatesForEstablishment({ data: { accessToken, establishmentId } }),
    listClassConventionTemplateAssignments({ data: { accessToken, establishmentId } }),
  ])
  return { templates, assignments }
}

const DEFAULT_TEMPLATE_DRAFT = `# Convention PFMP

Eleve : {{student.first_name}} {{student.last_name}}

Classe : {{class.name}}

Periode : {{period.name}} du {{period.start_date}} au {{period.end_date}}

Entreprise : {{company.name}}

Adresse entreprise : {{company.address}} {{company.zip_code}} {{company.city}}

SIRET : {{company.siret}}

Tuteur entreprise : {{tutor.first_name}} {{tutor.last_name}}

Contact tuteur : {{tutor.email}} {{tutor.phone}}

Signature parent si eleve mineur : {{parent.signature}}

Signature tuteur entreprise : {{tutor.signature}}

Signature etablissement : {{school.signature}}
`
