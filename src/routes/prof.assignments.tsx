import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, GraduationCap, Network, RefreshCw, UserCheck } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { StageStatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/lib/AuthProvider'
import { assignReferentToStudent } from '@/server/assignments.functions'
import { fetchStudents, type StudentListItem } from '@/services/students'
import { fetchTeachersWithStats } from '@/services/teachers'
import type { TeacherWithStats } from '@/server/teachers.functions'

export const Route = createFileRoute('/prof/assignments')({
  component: ProfAssignmentsPage,
})

function ProfAssignmentsPage() {
  const auth = useAuth()
  const accessToken = auth.session?.access_token ?? ''
  const [students, setStudents] = useState<StudentListItem[]>([])
  const [teachers, setTeachers] = useState<TeacherWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningStudentId, setAssigningStudentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function reload() {
    if (!auth.profile || !accessToken) return
    const [nextStudents, nextTeachers] = await Promise.all([
      fetchStudents({}, auth.profile),
      fetchTeachersWithStats(accessToken, auth.activeEstablishmentId),
    ])
    setStudents(nextStudents)
    setTeachers(
      nextTeachers.filter(
        (teacher) =>
          Boolean(teacher.profile_id) &&
          (teacher.role === 'referent' || teacher.role === 'principal'),
      ),
    )
  }

  useEffect(() => {
    if (auth.loading) return
    if (!auth.profile || auth.profile.role !== 'principal' || !accessToken) {
      setLoading(false)
      return
    }
    let mounted = true
    setLoading(true)
    setError(null)
    reload()
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [auth.loading, auth.profile, auth.activeEstablishmentId, accessToken])

  const classes = useMemo(() => {
    const names = new Set(students.map((item) => item.class?.name ?? 'Sans classe'))
    return [...names].sort()
  }, [students])

  async function assign(student: StudentListItem, teacherId: string) {
    const teacher = teachers.find((item) => item.id === teacherId)
    if (!teacher?.profile_id) return
    setAssigningStudentId(student.student.id)
    setError(null)
    setMessage(null)
    try {
      await assignReferentToStudent({
        data: {
          accessToken,
          studentId: student.student.id,
          referentId: teacher.profile_id,
        },
      })
      await reload()
      setMessage(`${student.student.first_name} ${student.student.last_name} est affecte a ${teacher.first_name} ${teacher.last_name}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setAssigningStudentId(null)
    }
  }

  if (auth.loading || loading) {
    return (
      <AppLayout title="Mes affectations" subtitle="Repartition referents PFMP">
        <div className="h-80 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
      </AppLayout>
    )
  }

  if (!auth.profile) {
    return (
      <AppLayout title="Mes affectations" subtitle="Repartition referents PFMP">
        <EmptyState
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Session requise"
          description="Connectez-vous avec un compte professeur principal."
        />
      </AppLayout>
    )
  }

  if (auth.profile.role !== 'principal') {
    return (
      <AppLayout title="Mes affectations" subtitle="Repartition referents PFMP">
        <EmptyState
          icon={<Network className="h-5 w-5" />}
          title="Reserve aux professeurs principaux"
          description="Le professeur principal repartit les eleves de sa classe vers les professeurs referents. Les referents consultent ensuite leurs eleves dans Mes eleves."
          action={
            <Link to="/prof/my-students">
              <Button type="button" variant="secondary">Voir mes eleves</Button>
            </Link>
          }
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Mes affectations"
      subtitle={`${students.length} eleves - ${classes.join(', ') || 'aucune classe principale'}`}
      actions={
        <Button
          type="button"
          size="sm"
          variant="secondary"
          iconLeft={<RefreshCw className="w-4 h-4" />}
          onClick={() => {
            setLoading(true)
            reload()
              .catch((err) => setError(err instanceof Error ? err.message : String(err)))
              .finally(() => setLoading(false))
          }}
        >
          Actualiser
        </Button>
      }
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>}

        <Card>
          <CardHeader>
            <div>
              <CardTitle icon={<UserCheck className="w-4 h-4" />}>Repartition de la classe</CardTitle>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Affectez chaque eleve a un professeur referent. La liaison met a jour le dossier PFMP et l'espace du referent.
              </p>
            </div>
            <Badge tone={students.some((item) => !item.referent) ? 'warning' : 'success'}>
              {students.filter((item) => item.referent).length}/{students.length} affectes
            </Badge>
          </CardHeader>
          <CardBody>
            {students.length === 0 ? (
              <EmptyState
                icon={<GraduationCap className="w-5 h-5" />}
                title="Aucun eleve dans vos classes"
                description="Demandez au DDFPT de vous affecter comme professeur principal depuis la fiche classe."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                      <th className="py-3 pr-3 font-semibold">Eleve</th>
                      <th className="py-3 pr-3 font-semibold">Classe</th>
                      <th className="py-3 pr-3 font-semibold">Dossier PFMP</th>
                      <th className="py-3 pr-3 font-semibold">Entreprise</th>
                      <th className="py-3 pr-3 font-semibold">Referent PFMP</th>
                      <th className="py-3 pl-3 text-right font-semibold">Fiche</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {students.map((item) => (
                      <tr key={item.student.id}>
                        <td className="py-3 pr-3">
                          <p className="font-medium text-[var(--color-text)]">
                            {item.student.first_name} {item.student.last_name}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">{item.student.formation ?? item.class?.formation ?? 'Formation non renseignee'}</p>
                        </td>
                        <td className="py-3 pr-3">{item.class?.name ?? '-'}</td>
                        <td className="py-3 pr-3">
                          <StageStatusBadge status={item.stageStatus} />
                        </td>
                        <td className="py-3 pr-3 text-[var(--color-text-muted)]">
                          {item.company?.name ?? 'Non renseignee'}
                        </td>
                        <td className="py-3 pr-3">
                          <select
                            value={item.referent?.id ?? ''}
                            onChange={(event) => assign(item, event.target.value)}
                            disabled={assigningStudentId === item.student.id || teachers.length === 0}
                            className="h-10 w-full rounded-lg border border-[var(--color-border-strong)] bg-white px-3 text-sm"
                          >
                            <option value="">Choisir un referent</option>
                            {teachers.map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.first_name} {teacher.last_name}{teacher.discipline ? ` - ${teacher.discipline}` : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <Link to="/prof/students/$id" params={{ id: item.student.id }} className="text-sm font-medium text-[var(--color-brand-700)]">
                            Ouvrir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
