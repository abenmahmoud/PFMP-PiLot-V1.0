import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2, Flag, MapPin, Save } from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { EmptyState } from '@/components/EmptyState'
import { OfflineIndicator } from '@/components/offline/OfflineIndicator'
import { CompetenceEvaluationGrid } from '@/components/visits/CompetenceEvaluationGrid'
import { PhotoCapture } from '@/components/visits/PhotoCapture'
import { VisitInProgress } from '@/components/visits/VisitInProgress'
import { VisitStatusBadge } from '@/components/visits/VisitStatusBadge'
import { VisitTimeline } from '@/components/visits/VisitTimeline'
import { VoiceRecorder } from '@/components/visits/VoiceRecorder'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input, Label, Textarea } from '@/components/ui/Field'
import { getCurrentPosition } from '@/lib/geolocation'
import { offlineQueue } from '@/lib/offlineQueue'
import { useAuth } from '@/lib/AuthProvider'
import type { VisitEvaluationLevel, VisitPhoto } from '@/lib/database.types'
import {
  addVisitEvaluation,
  completeVisit,
  flagVisitForReview,
  getVisitDetail,
  startVisit,
  updateVisitReport,
  type FieldVisitWithRelations,
} from '@/server/visits.functions'

export const Route = createFileRoute('/prof/visits/$id')({
  component: ProfVisitDetailPage,
})

function ProfVisitDetailPage() {
  const { id } = useParams({ from: '/prof/visits/$id' })
  const auth = useAuth()
  const [detail, setDetail] = useState<FieldVisitWithRelations | null>(null)
  const [summary, setSummary] = useState('')
  const [fullReport, setFullReport] = useState('')
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [studentSatisfaction, setStudentSatisfaction] = useState('')
  const [tutorSatisfaction, setTutorSatisfaction] = useState('')
  const [photos, setPhotos] = useState<VisitPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    const accessToken = auth.session?.access_token
    if (!accessToken) return
    const next = await getVisitDetail({
      data: {
        accessToken,
        establishmentId: auth.activeEstablishmentId,
        visitId: id,
      },
    })
    setDetail(next)
    if (next) {
      setSummary(next.visit.summary ?? '')
      setFullReport(next.visit.full_report ?? '')
      setVoiceTranscript(next.visit.voice_transcript ?? '')
      setStudentSatisfaction(next.visit.student_satisfaction?.toString() ?? '')
      setTutorSatisfaction(next.visit.tutor_satisfaction?.toString() ?? '')
      setPhotos(next.visit.photos ?? [])
    }
  }

  useEffect(() => {
    if (auth.loading) return
    if (!auth.session) {
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
  }, [auth.loading, auth.session, auth.activeEstablishmentId, id])

  async function handleStart() {
    const accessToken = auth.session?.access_token
    if (!accessToken || !detail) return
    setSaving(true)
    setError(null)
    try {
      const position = await getCurrentPosition().catch(() => null)
      if (!navigator.onLine) {
        await offlineQueue.enqueue({
          type: 'visit.update',
          payload: { visitId: detail.visit.id, status: 'in_progress', location: position },
        })
        setError('Action enregistree hors-ligne. Elle sera synchronisee au retour reseau.')
        return
      }
      const next = await startVisit({
        data: {
          accessToken,
          visitId: detail.visit.id,
          locationLat: position?.lat ?? null,
          locationLng: position?.lng ?? null,
        },
      })
      setDetail(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveReport() {
    const accessToken = auth.session?.access_token
    if (!accessToken || !detail) return
    setSaving(true)
    setError(null)
    const payload = {
      summary: summary || null,
      fullReport: fullReport || null,
      voiceTranscript: voiceTranscript || null,
      studentSatisfaction: studentSatisfaction ? Number(studentSatisfaction) : null,
      tutorSatisfaction: tutorSatisfaction ? Number(tutorSatisfaction) : null,
      photos,
    }
    try {
      if (!navigator.onLine) {
        await offlineQueue.enqueue({ type: 'visit.update', payload: { visitId: detail.visit.id, report: payload } })
        setError('Compte-rendu garde hors-ligne. Synchronisation automatique au retour reseau.')
        return
      }
      const next = await updateVisitReport({ data: { accessToken, visitId: detail.visit.id, report: payload } })
      setDetail(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
    const accessToken = auth.session?.access_token
    if (!accessToken || !detail) return
    setSaving(true)
    setError(null)
    try {
      if (!navigator.onLine) {
        await offlineQueue.enqueue({ type: 'visit.complete', payload: { visitId: detail.visit.id } })
        setError('Fin de visite gardee hors-ligne. Elle sera synchronisee au retour reseau.')
        return
      }
      const next = await completeVisit({ data: { accessToken, visitId: detail.visit.id } })
      setDetail(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleFlag() {
    const accessToken = auth.session?.access_token
    if (!accessToken || !detail) return
    const reason = window.prompt('Motif du signalement ?')
    if (!reason) return
    const next = await flagVisitForReview({ data: { accessToken, visitId: detail.visit.id, reason } })
    setDetail(next)
  }

  async function handleAddEvaluation(input: {
    competenceCode: string
    competenceLabel: string
    level: VisitEvaluationLevel
    notes: string | null
  }) {
    const accessToken = auth.session?.access_token
    if (!accessToken || !detail) return
    if (!navigator.onLine) {
      await offlineQueue.enqueue({
        type: 'visit.add_evaluation',
        payload: { visitId: detail.visit.id, ...input },
      })
      setError('Evaluation gardee hors-ligne.')
      return
    }
    await addVisitEvaluation({
      data: {
        accessToken,
        visitId: detail.visit.id,
        ...input,
        evaluatedByRole: 'referent',
      },
    })
    await reload()
  }

  if (auth.loading || loading) {
    return (
      <AppLayout title="Visite terrain" subtitle="Chargement...">
        <div className="h-96 rounded-lg border border-[var(--color-border)] bg-white animate-pulse" />
      </AppLayout>
    )
  }

  if (error && !detail) {
    return (
      <AppLayout title="Visite terrain" subtitle="Espace professeur">
        <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="Impossible de charger la visite" description={error} />
      </AppLayout>
    )
  }

  if (!detail) {
    return (
      <AppLayout title="Visite introuvable" subtitle="Espace professeur">
        <EmptyState title="Visite introuvable ou inaccessible" action={<Link to="/prof/visits">Retour aux visites</Link>} />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title={detail.student ? `${detail.student.first_name} ${detail.student.last_name}` : 'Visite terrain'}
      subtitle={`${detail.company?.name ?? 'Entreprise non affectee'} - ${detail.company?.city ?? 'Ville inconnue'}`}
      actions={<OfflineIndicator />}
    >
      <div className="space-y-5">
        <Link to="/prof/visits" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
          <ArrowLeft className="w-4 h-4" />
          Retour planning
        </Link>
        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle icon={<MapPin className="w-4 h-4" />}>Suivi terrain</CardTitle>
            <VisitStatusBadge status={detail.visit.status} />
          </CardHeader>
          <CardBody className="space-y-4">
            <VisitTimeline visit={detail.visit} />
            {detail.visit.status === 'in_progress' && <VisitInProgress startedAt={detail.visit.updated_at} />}
            <div className="flex flex-wrap gap-2">
              {detail.visit.status === 'planned' && (
                <Button type="button" onClick={handleStart} disabled={saving}>
                  Demarrer visite
                </Button>
              )}
              {detail.visit.status === 'in_progress' && (
                <Button type="button" iconLeft={<CheckCircle2 className="w-4 h-4" />} onClick={handleComplete} disabled={saving}>
                  Terminer visite
                </Button>
              )}
              <Button type="button" variant="secondary" iconLeft={<Flag className="w-4 h-4" />} onClick={handleFlag} disabled={saving}>
                Signaler
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compte-rendu vocal et texte</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <VoiceRecorder
              transcript={voiceTranscript}
              onTranscriptChange={setVoiceTranscript}
              onStructured={(structured) => {
                setSummary(structured.summary)
                setFullReport([structured.summary, ...structured.key_points.map((point) => `- ${point}`), ...structured.next_actions.map((action) => `Action: ${action}`)].join('\n'))
                setStudentSatisfaction(structured.student_satisfaction?.toString() ?? '')
                setTutorSatisfaction(structured.tutor_satisfaction?.toString() ?? '')
              }}
            />
            <div>
              <Label>Resume</Label>
              <Input value={summary} onChange={(event) => setSummary(event.target.value)} />
            </div>
            <div>
              <Label>Compte-rendu complet</Label>
              <Textarea value={fullReport} onChange={(event) => setFullReport(event.target.value)} className="min-h-40" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Satisfaction eleve (1-5)</Label>
                <Input type="number" min={1} max={5} value={studentSatisfaction} onChange={(event) => setStudentSatisfaction(event.target.value)} />
              </div>
              <div>
                <Label>Satisfaction tuteur (1-5)</Label>
                <Input type="number" min={1} max={5} value={tutorSatisfaction} onChange={(event) => setTutorSatisfaction(event.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PhotoCapture
                visitId={detail.visit.id}
                onPhoto={(photo) => setPhotos((current) => [...current, photo])}
                onError={setError}
              />
              {photos.map((photo) => (
                <Badge key={photo.url ?? photo.offline_id ?? photo.taken_at} tone={photo.url ? 'success' : 'warning'}>
                  Photo {photo.url ? 'envoyee' : 'hors-ligne'}
                </Badge>
              ))}
            </div>
            <Button type="button" iconLeft={<Save className="w-4 h-4" />} onClick={handleSaveReport} disabled={saving}>
              Enregistrer le CR
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Competences observees</CardTitle>
          </CardHeader>
          <CardBody>
            <CompetenceEvaluationGrid evaluations={detail.evaluations} onAdd={handleAddEvaluation} />
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
