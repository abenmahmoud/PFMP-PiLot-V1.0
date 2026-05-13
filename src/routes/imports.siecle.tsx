import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useMemo, useRef, useState, type DragEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  RotateCcw,
  Table,
  Upload,
  Users,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { RoleGuard } from '@/components/RoleGuard'
import { useAuth } from '@/lib/AuthProvider'
import { cn } from '@/lib/cn'
import { isDemoMode } from '@/lib/supabase'
import {
  parseSiecleFile,
  type SiecleParseResult,
  type SiecleRawRow,
} from '@/services/imports/siecle'
import { importSiecleData, type ImportSiecleResult } from '@/server/imports.functions'

export const Route = createFileRoute('/imports/siecle')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/imports/siecle' })
  },
  component: ImportSieclePage,
})

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['csv', 'xlsx', 'xls']
const STEP_LABELS = ['Upload', 'Preview', 'Divisions', 'Confirmation'] as const

export function ImportSieclePage() {
  return (
    <AppLayout
      title="Import SIECLE"
      subtitle="Creation classes et eleves sans compte eleve"
    >
      <RoleGuard allow={['admin', 'ddfpt', 'superadmin']}>
        <ImportSiecleContent />
      </RoleGuard>
    </AppLayout>
  )
}

function ImportSiecleContent() {
  const auth = useAuth()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const demoMode = isDemoMode()
  const establishmentId = auth.establishmentId ?? auth.activeEstablishmentId
  const accessToken = auth.session?.access_token ?? ''

  const [step, setStep] = useState(1)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<SiecleParseResult | null>(null)
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([])
  const [dryRunResult, setDryRunResult] = useState<ImportSiecleResult | null>(null)
  const [finalResult, setFinalResult] = useState<ImportSiecleResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const divisionStats = useMemo(() => buildDivisionStats(parseResult), [parseResult])
  const hasSelection = selectedDivisions.length > 0

  async function handleFile(file: File | null) {
    if (!file) return
    setError(null)
    setDryRunResult(null)
    setFinalResult(null)

    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setError('Format non supporte. Importez un fichier CSV, XLS ou XLSX.')
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('Fichier trop volumineux. Taille maximale: 5 MB.')
      return
    }

    setLoading(true)
    setFileName(file.name)
    try {
      const parsed = await parseSiecleFile(file)
      setParseResult(parsed)
      setSelectedDivisions(parsed.classes.map((klass) => klass.name))
      setStep(2)
    } catch (e) {
      setParseResult(null)
      setSelectedDivisions([])
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function runDryRun() {
    if (!parseResult) return
    setLoading(true)
    setError(null)
    try {
      const result = demoMode
        ? computeDemoResult(parseResult, selectedDivisions, true)
        : await importSiecleData({
            data: {
              accessToken,
              establishmentId: requireEstablishmentScope(establishmentId),
              classes: parseResult.classes,
              students: parseResult.students,
              selectedDivisions,
              dryRun: true,
            },
          })
      setDryRunResult(result)
      setStep(4)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function confirmImport() {
    if (!parseResult) return
    setLoading(true)
    setError(null)
    try {
      const result = demoMode
        ? computeDemoResult(parseResult, selectedDivisions, false)
        : await importSiecleData({
            data: {
              accessToken,
              establishmentId: requireEstablishmentScope(establishmentId),
              classes: parseResult.classes,
              students: parseResult.students,
              selectedDivisions,
              dryRun: false,
            },
          })
      setFinalResult(result)
      setDryRunResult(result)
      setStep(4)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function resetImport() {
    setStep(1)
    setFileName(null)
    setParseResult(null)
    setSelectedDivisions([])
    setDryRunResult(null)
    setFinalResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function toggleDivision(name: string) {
    setDryRunResult(null)
    setSelectedDivisions((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    )
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    void handleFile(event.dataTransfer.files.item(0))
  }

  if (!demoMode && auth.loading) {
    return (
      <EmptyState
        icon={<Database className="w-5 h-5" />}
        title="Session en cours de verification"
        description="Lecture de votre profil Supabase avant import."
      />
    )
  }

  if (!demoMode && !auth.profile) {
    return (
      <EmptyState
        icon={<AlertTriangle className="w-5 h-5" />}
        title="Session requise"
        description="Connectez-vous pour importer les classes et eleves."
        action={
          <Link to="/login">
            <Button>Connexion</Button>
          </Link>
        }
      />
    )
  }

  if (!demoMode && !establishmentId) {
    return (
      <EmptyState
        icon={<Database className="w-5 h-5" />}
        title="Aucun etablissement actif"
        description="En superadmin, incarnez un etablissement avant de lancer un import SIECLE."
        action={
          <Link to="/superadmin/establishments">
            <Button>Choisir un etablissement</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-5">
      <Stepper currentStep={step} />

      {demoMode && (
        <Card className="border-amber-200 bg-amber-50">
          <CardBody className="pt-5 text-sm text-amber-900">
            Mode demo : le fichier est parse localement et le resultat est simule sans ecriture
            Supabase.
          </CardBody>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardBody className="pt-5 flex items-start gap-3 text-sm text-red-900">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle icon={<Upload className="w-4 h-4" />}>1. Upload</CardTitle>
            <CardDescription>CSV, XLS ou XLSX exporte depuis SIECLE.</CardDescription>
          </div>
          {fileName && <Badge tone="info">{fileName}</Badge>}
        </CardHeader>
        <CardBody>
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
              'border-[var(--color-border-strong)] bg-[var(--color-muted)]/30 hover:bg-[var(--color-muted)]',
            )}
          >
            <FileSpreadsheet className="w-10 h-10 mx-auto text-[var(--color-brand-600)]" />
            <p className="mt-3 text-sm font-medium text-[var(--color-text)]">
              Deposez un export SIECLE ou selectionnez un fichier.
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Max 5 MB. Le fichier n'est jamais stocke.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(event) => void handleFile(event.target.files?.item(0) ?? null)}
            />
            <Button
              type="button"
              className="mt-4"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              {loading ? 'Lecture...' : 'Choisir un fichier'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {parseResult && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle icon={<Table className="w-4 h-4" />}>2. Preview</CardTitle>
              <CardDescription>
                {parseResult.students.length} eleves detectes, {parseResult.classes.length} classes.
              </CardDescription>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep(3)}>
              Continuer
            </Button>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {parseResult.rawHeaders.map((header) => (
                <Badge key={header} tone="neutral">
                  {header}
                </Badge>
              ))}
            </div>

            {parseResult.errors.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-medium">Points a verifier</p>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  {parseResult.errors.slice(0, 6).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <DivisionSummary stats={divisionStats} />
            <PreviewTable headers={parseResult.rawHeaders} rows={parseResult.preview} />
          </CardBody>
        </Card>
      )}

      {parseResult && step >= 3 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle icon={<Users className="w-4 h-4" />}>3. Selection des divisions</CardTitle>
              <CardDescription>Selectionnez les classes a importer dans le tenant actif.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setSelectedDivisions(parseResult.classes.map((klass) => klass.name))}
              >
                Tout selectionner
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedDivisions([])
                  setDryRunResult(null)
                }}
              >
                Tout deselectionner
              </Button>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {parseResult.classes.map((klass) => {
              const stat = divisionStats.find((item) => item.name === klass.name)
              const checked = selectedDivisions.includes(klass.name)
              return (
                <label
                  key={klass.name}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                    checked
                      ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-50)]'
                      : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-muted)]',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDivision(klass.name)}
                    className="w-4 h-4 accent-[var(--color-brand)]"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-[var(--color-text)]">
                      {klass.name}
                    </span>
                    <span className="block text-xs text-[var(--color-text-muted)] truncate">
                      {klass.formation}
                    </span>
                  </span>
                  <Badge tone="neutral">{stat?.studentCount ?? 0} eleves</Badge>
                </label>
              )
            })}
            <div className="flex justify-end">
              <Button type="button" onClick={() => void runDryRun()} disabled={!hasSelection || loading}>
                {loading ? 'Calcul...' : "Previsualiser l'import"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {dryRunResult && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle icon={<CheckCircle2 className="w-4 h-4" />}>
                4. Confirmation et resultat
              </CardTitle>
              <CardDescription>
                Verifiez le resume avant l'ecriture reelle en base.
              </CardDescription>
            </div>
            <Badge tone={finalResult ? 'success' : 'warning'}>
              {finalResult ? 'Import termine' : 'Dry-run'}
            </Badge>
          </CardHeader>
          <CardBody className="space-y-4">
            <ResultGrid result={dryRunResult} />

            {dryRunResult.errors.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {dryRunResult.errors.slice(0, 8).map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" iconLeft={<RotateCcw className="w-4 h-4" />} onClick={resetImport}>
                Nouvel import
              </Button>
              {finalResult ? (
                <>
                  <Link to="/students">
                    <Button type="button" variant="secondary">Voir les eleves</Button>
                  </Link>
                  <Link to="/classes">
                    <Button type="button">Voir les classes</Button>
                  </Link>
                </>
              ) : (
                <Button type="button" onClick={() => void confirmImport()} disabled={loading}>
                  {loading ? 'Import...' : "Confirmer l'import"}
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {STEP_LABELS.map((label, index) => {
        const stepNumber = index + 1
        const active = currentStep >= stepNumber
        return (
          <div
            key={label}
            className={cn(
              'rounded-lg border px-3 py-2 text-sm font-medium',
              active
                ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
                : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)]',
            )}
          >
            {stepNumber}. {label}
          </div>
        )
      })}
    </div>
  )
}

function DivisionSummary({ stats }: { stats: DivisionStat[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div key={stat.name} className="rounded-lg border border-[var(--color-border)] p-3">
          <p className="text-sm font-semibold text-[var(--color-text)]">{stat.name}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)] truncate">{stat.formation}</p>
          <Badge className="mt-2" tone="brand">
            {stat.studentCount} eleves
          </Badge>
        </div>
      ))}
    </div>
  )
}

function PreviewTable({ headers, rows }: { headers: string[]; rows: SiecleRawRow[] }) {
  if (headers.length === 0 || rows.length === 0) return null
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--color-muted)] text-[var(--color-text-muted)]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {rows.map((row, index) => (
            <tr key={`${index}-${Object.values(row).join('|')}`}>
              {headers.map((header) => (
                <td key={header} className="px-3 py-2 whitespace-nowrap text-[var(--color-text)]">
                  {row[header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ResultGrid({ result }: { result: ImportSiecleResult }) {
  const items = [
    { label: 'Classes creees', value: result.classesCreated },
    { label: 'Classes reutilisees', value: result.classesReused },
    { label: 'Eleves importes', value: result.studentsCreated },
    { label: 'Doublons ignores', value: result.studentsSkipped },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-[var(--color-border)] p-3">
          <p className="text-2xl font-semibold text-[var(--color-text)]">{item.value}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

interface DivisionStat {
  name: string
  formation: string
  studentCount: number
}

function buildDivisionStats(parseResult: SiecleParseResult | null): DivisionStat[] {
  if (!parseResult) return []
  return parseResult.classes.map((klass) => ({
    name: klass.name,
    formation: klass.formation,
    studentCount: parseResult.students.filter((student) => student.divisionName === klass.name).length,
  }))
}

function computeDemoResult(
  parseResult: SiecleParseResult,
  selectedDivisions: string[],
  dryRun: boolean,
): ImportSiecleResult {
  const selected = new Set(selectedDivisions)
  return {
    classesCreated: parseResult.classes.filter((klass) => selected.has(klass.name)).length,
    classesReused: 0,
    studentsCreated: parseResult.students.filter((student) => selected.has(student.divisionName)).length,
    studentsSkipped: 0,
    errors: [],
    dryRun,
  }
}

function requireEstablishmentScope(establishmentId: string | null): string {
  if (!establishmentId) {
    throw new Error('Aucun etablissement actif pour cet import.')
  }
  return establishmentId
}
