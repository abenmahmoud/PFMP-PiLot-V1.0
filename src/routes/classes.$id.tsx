import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  KeyRound,
  Printer,
  QrCode,
  RefreshCw,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { RoleGuard } from '@/components/RoleGuard'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/lib/AuthProvider'
import { isDemoMode } from '@/lib/supabase'
import {
  generateClassStudentAccessCodes,
  generateSingleStudentAccessCode,
  listClassStudentAccess,
  revokeStudentAccessCode,
  type ClassStudentAccessResult,
  type ClassStudentAccessRow,
  type GeneratedStudentCode,
  type StudentAccessStatus,
} from '@/server/studentAccessCodes.functions'
import { classes as demoClasses, students as demoStudents } from '@/data/demo'

export const Route = createFileRoute('/classes/$id')({ component: ClassDetailPage })

function ClassDetailPage() {
  const { id } = useParams({ from: '/classes/$id' })

  return (
    <AppLayout title="Classe" subtitle="Codes eleves et acces sans email">
      <RoleGuard allow={['admin', 'ddfpt', 'principal', 'superadmin']}>
        {isDemoMode() ? <ClassAccessDemo classId={id} /> : <ClassAccessSupabase classId={id} />}
      </RoleGuard>
    </AppLayout>
  )
}

function ClassAccessSupabase({ classId }: { classId: string }) {
  const auth = useAuth()
  const accessToken = auth.session?.access_token ?? ''
  const [detail, setDetail] = useState<ClassStudentAccessResult | null>(null)
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedStudentCode[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (auth.loading) return
    if (!accessToken) {
      setLoading(false)
      return
    }

    let mounted = true
    setLoading(true)
    setError(null)

    listClassStudentAccess({ data: { accessToken, classId } })
      .then((nextDetail) => {
        if (mounted) setDetail(nextDetail)
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
  }, [auth.loading, accessToken, classId])

  async function refresh() {
    const nextDetail = await listClassStudentAccess({ data: { accessToken, classId } })
    setDetail(nextDetail)
  }

  async function runAction(label: string, action: () => Promise<GeneratedStudentCode[] | null>) {
    setActionLoading(label)
    setError(null)
    setSuccess(null)
    try {
      const codes = await action()
      if (codes) setGeneratedCodes(codes)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setActionLoading(null)
    }
  }

  async function generateMissing() {
    await runAction('missing', async () => {
      const result = await generateClassStudentAccessCodes({
        data: { accessToken, classId, mode: 'missing' },
      })
      setSuccess(`${result.generatedCodes.length} code(s) eleve generes.`)
      return result.generatedCodes
    })
  }

  async function regenerateAll() {
    const ok = window.confirm(
      'Regenerer tous les codes actifs de cette classe ? Les anciens codes seront revoques.',
    )
    if (!ok) return
    await runAction('all', async () => {
      const result = await generateClassStudentAccessCodes({
        data: { accessToken, classId, mode: 'all' },
      })
      setSuccess(`${result.generatedCodes.length} code(s) regeneres, ${result.revokedCount} ancien(s) revoques.`)
      return result.generatedCodes
    })
  }

  async function regenerateOne(studentId: string) {
    await runAction(`regen-${studentId}`, async () => {
      const result = await generateSingleStudentAccessCode({
        data: { accessToken, classId, studentId },
      })
      setSuccess('Code eleve regenere.')
      return result.generatedCodes
    })
  }

  async function revokeOne(studentId: string) {
    const ok = window.confirm('Revoquer le code actif de cet eleve ?')
    if (!ok) return
    await runAction(`revoke-${studentId}`, async () => {
      const result = await revokeStudentAccessCode({ data: { accessToken, classId, studentId } })
      setSuccess(`${result.revokedCount} code revoque.`)
      return null
    })
  }

  if (auth.loading || loading) {
    return (
      <EmptyState
        icon={<KeyRound className="w-5 h-5" />}
        title="Chargement des acces eleves"
        description="Lecture de la classe et des codes existants..."
      />
    )
  }

  if (!accessToken) {
    return (
      <EmptyState
        icon={<ShieldAlert className="w-5 h-5" />}
        title="Session requise"
        description="Connectez-vous pour gerer les codes eleves."
      />
    )
  }

  if (error && !detail) {
    return (
      <EmptyState
        icon={<AlertTriangle className="w-5 h-5" />}
        title="Impossible de charger la classe"
        description={error}
        action={<BackToClasses />}
      />
    )
  }

  if (!detail) {
    return (
      <EmptyState
        icon={<Users className="w-5 h-5" />}
        title="Classe introuvable"
        description="Cette classe est introuvable ou inaccessible."
        action={<BackToClasses />}
      />
    )
  }

  return (
    <ClassAccessView
      detail={detail}
      generatedCodes={generatedCodes}
      actionLoading={actionLoading}
      error={error}
      success={success}
      onGenerateMissing={generateMissing}
      onRegenerateAll={regenerateAll}
      onRegenerateOne={regenerateOne}
      onRevokeOne={revokeOne}
    />
  )
}

function ClassAccessDemo({ classId }: { classId: string }) {
  const klass = demoClasses.find((item) => item.id === classId)
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedStudentCode[]>([])
  const [activeByStudent, setActiveByStudent] = useState<Record<string, string>>({})

  if (!klass) {
    return (
      <EmptyState
        icon={<Users className="w-5 h-5" />}
        title="Classe demo introuvable"
        description="Cette classe n'existe pas dans les donnees de demo."
        action={<BackToClasses />}
      />
    )
  }
  const demoClass = klass

  const rows = demoStudents
    .filter((student) => student.classId === demoClass.id)
    .map((student) => ({
      student: {
        id: student.id,
        establishment_id: 'demo',
        class_id: demoClass.id,
        first_name: student.firstName,
        last_name: student.lastName,
        email: student.email ?? null,
        phone: student.phone ?? null,
        formation: student.formation,
        notes: student.notes ?? null,
        referent_id: student.referentId ?? null,
        archived_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      accessCode: activeByStudent[student.id]
        ? {
            id: `code-${student.id}`,
            student_id: student.id,
            code_hint: activeByStudent[student.id].slice(-4),
            status: 'active' as const,
            expires_at: null,
            last_used_at: null,
            revoked_at: null,
            created_at: new Date().toISOString(),
          }
        : null,
    }))

  const detail: ClassStudentAccessResult = {
    class: {
      id: demoClass.id,
      establishment_id: 'demo',
      name: demoClass.name,
      level: demoClass.level,
      formation: demoClass.formation,
      school_year: '2025-2026',
      principal_id: demoClass.principalId ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    students: rows,
  }

  function generateDemoCodes(all: boolean) {
    const next: Record<string, string> = { ...activeByStudent }
    const codes = rows
      .filter((row) => all || !next[row.student.id])
      .map((row, index) => {
        const code = `PFMP-DEMO-${String(index + 1).padStart(2, '0')}`
        next[row.student.id] = code
        return {
          studentId: row.student.id,
          firstName: row.student.first_name,
          lastName: row.student.last_name,
          className: demoClass.name,
          code,
          codeHint: code.slice(-4),
          qrPayload: `https://demo.pfmp-pilot.fr/eleve?code=${encodeURIComponent(code)}`,
        }
      })
    setActiveByStudent(next)
    setGeneratedCodes(codes)
  }

  return (
    <ClassAccessView
      detail={detail}
      generatedCodes={generatedCodes}
      actionLoading={null}
      error={null}
      success={generatedCodes.length ? `${generatedCodes.length} code(s) demo generes.` : null}
      onGenerateMissing={() => generateDemoCodes(false)}
      onRegenerateAll={() => generateDemoCodes(true)}
      onRegenerateOne={(studentId) => {
        const row = rows.find((item) => item.student.id === studentId)
        if (!row) return
        const code = `PFMP-DEMO-${row.student.last_name.slice(0, 3).toUpperCase()}`
        setActiveByStudent((current) => ({ ...current, [studentId]: code }))
        setGeneratedCodes([
          {
            studentId,
            firstName: row.student.first_name,
            lastName: row.student.last_name,
            className: demoClass.name,
            code,
            codeHint: code.slice(-4),
            qrPayload: `https://demo.pfmp-pilot.fr/eleve?code=${encodeURIComponent(code)}`,
          },
        ])
      }}
      onRevokeOne={(studentId) => {
        setActiveByStudent((current) => {
          const next = { ...current }
          delete next[studentId]
          return next
        })
      }}
    />
  )
}

function ClassAccessView({
  detail,
  generatedCodes,
  actionLoading,
  error,
  success,
  onGenerateMissing,
  onRegenerateAll,
  onRegenerateOne,
  onRevokeOne,
}: {
  detail: ClassStudentAccessResult
  generatedCodes: GeneratedStudentCode[]
  actionLoading: string | null
  error: string | null
  success: string | null
  onGenerateMissing: () => void | Promise<void>
  onRegenerateAll: () => void | Promise<void>
  onRegenerateOne: (studentId: string) => void | Promise<void>
  onRevokeOne: (studentId: string) => void | Promise<void>
}) {
  const stats = useMemo(() => buildStats(detail.students), [detail.students])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            to="/classes"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-brand-700)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour aux classes
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{detail.class.name}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {detail.class.formation} - {detail.students.length} eleves
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="secondary"
            iconLeft={<KeyRound className="w-4 h-4" />}
            onClick={onGenerateMissing}
            disabled={Boolean(actionLoading)}
          >
            {actionLoading === 'missing' ? 'Generation...' : 'Generer les manquants'}
          </Button>
          <Button
            type="button"
            variant="primary"
            iconLeft={<RefreshCw className="w-4 h-4" />}
            onClick={onRegenerateAll}
            disabled={Boolean(actionLoading)}
          >
            {actionLoading === 'all' ? 'Regeneration...' : 'Regenerer toute la classe'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard label="Eleves" value={detail.students.length} />
        <MetricCard label="Codes actifs" value={stats.active} tone="success" />
        <MetricCard label="Codes manquants" value={stats.missing} tone={stats.missing ? 'warning' : 'success'} />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {generatedCodes.length > 0 && <PrintableCodes codes={generatedCodes} />}

      <Card>
        <CardHeader>
          <div>
            <CardTitle icon={<Users className="w-4 h-4" />}>Eleves de la classe</CardTitle>
            <CardDescription className="mt-1">
              Le code complet n'est visible qu'au moment de la generation ou regeneration.
            </CardDescription>
          </div>
          <Badge tone="brand">{detail.class.school_year}</Badge>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                  <th className="py-3 pr-3 font-semibold">Eleve</th>
                  <th className="py-3 pr-3 font-semibold">Contact</th>
                  <th className="py-3 pr-3 font-semibold">Statut code</th>
                  <th className="py-3 pr-3 font-semibold">Derniere action</th>
                  <th className="py-3 pl-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {detail.students.map((row) => (
                  <StudentAccessTableRow
                    key={row.student.id}
                    row={row}
                    actionLoading={actionLoading}
                    onRegenerateOne={onRegenerateOne}
                    onRevokeOne={onRevokeOne}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function StudentAccessTableRow({
  row,
  actionLoading,
  onRegenerateOne,
  onRevokeOne,
}: {
  row: ClassStudentAccessRow
  actionLoading: string | null
  onRegenerateOne: (studentId: string) => void | Promise<void>
  onRevokeOne: (studentId: string) => void | Promise<void>
}) {
  const code = row.accessCode
  const student = row.student
  const fullName = `${student.first_name} ${student.last_name}`
  const isBusy =
    actionLoading === `regen-${student.id}` || actionLoading === `revoke-${student.id}`

  return (
    <tr>
      <td className="py-3 pr-3">
        <Link
          to="/students/$id"
          params={{ id: student.id }}
          className="font-medium text-[var(--color-text)] hover:text-[var(--color-brand-700)]"
        >
          {fullName}
        </Link>
        <p className="text-xs text-[var(--color-text-muted)]">{student.formation ?? '-'}</p>
      </td>
      <td className="py-3 pr-3 text-[var(--color-text-muted)]">{student.email ?? 'Sans email'}</td>
      <td className="py-3 pr-3">
        <AccessStatusBadge code={code} />
      </td>
      <td className="py-3 pr-3 text-xs text-[var(--color-text-muted)]">
        {code ? formatDateTime(code.created_at) : '-'}
      </td>
      <td className="py-3 pl-3">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            iconLeft={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => onRegenerateOne(student.id)}
            disabled={Boolean(actionLoading)}
          >
            {isBusy && actionLoading?.startsWith('regen') ? '...' : 'Regenerer'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            iconLeft={<Ban className="w-3.5 h-3.5" />}
            onClick={() => onRevokeOne(student.id)}
            disabled={Boolean(actionLoading) || code?.status !== 'active'}
          >
            Revoquer
          </Button>
        </div>
      </td>
    </tr>
  )
}

function PrintableCodes({ codes }: { codes: GeneratedStudentCode[] }) {
  return (
    <Card className="border-[var(--color-brand-100)]">
      <CardHeader>
        <div>
          <CardTitle icon={<QrCode className="w-4 h-4" />}>Fiche codes a remettre aux eleves</CardTitle>
          <CardDescription className="mt-1">
            Imprimez maintenant : ces codes complets ne seront plus recuperables apres rechargement.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="secondary"
          iconLeft={<Printer className="w-4 h-4" />}
          onClick={() => window.print()}
        >
          Imprimer
        </Button>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {codes.map((code) => (
            <div
              key={`${code.studentId}-${code.code}`}
              className="rounded-lg border border-[var(--color-border)] bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {code.firstName} {code.lastName}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">{code.className}</p>
                </div>
                <QRCodeCanvas value={code.qrPayload} size={76} level="M" marginSize={1} />
              </div>
              <p className="mt-3 rounded-md bg-[var(--color-muted)] px-3 py-2 text-center font-mono text-base font-semibold tracking-wide text-[var(--color-text)] select-all">
                {code.code}
              </p>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

function AccessStatusBadge({ code }: { code: StudentAccessStatus | null }) {
  if (!code) return <Badge tone="warning">Absent</Badge>
  if (code.status === 'active') {
    return (
      <Badge tone="success" dot>
        Actif - ...{code.code_hint}
      </Badge>
    )
  }
  if (code.status === 'expired') return <Badge tone="warning">Expire</Badge>
  return <Badge tone="neutral">Revoque</Badge>
}

function MetricCard({
  label,
  value,
  tone = 'brand',
}: {
  label: string
  value: number
  tone?: BadgeTone
}) {
  return (
    <Card>
      <CardBody className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{value}</p>
        </div>
        <Badge tone={tone}>{label}</Badge>
      </CardBody>
    </Card>
  )
}

function BackToClasses() {
  return (
    <Link to="/classes">
      <Button variant="secondary" iconLeft={<ArrowLeft className="w-4 h-4" />}>
        Retour aux classes
      </Button>
    </Link>
  )
}

function buildStats(rows: ClassStudentAccessRow[]): { active: number; missing: number } {
  return rows.reduce(
    (acc, row) => {
      if (row.accessCode?.status === 'active') acc.active += 1
      else acc.missing += 1
      return acc
    },
    { active: 0, missing: 0 },
  )
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}
