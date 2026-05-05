import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  FileCheck2,
  FileSignature,
  FileText,
  FolderArchive,
  Info,
  ShieldCheck,
  Stamp,
  Upload,
  XCircle,
} from 'lucide-react'
import { AppLayout } from '@/components/AppLayout'
import { AlertList } from '@/components/AlertList'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/StatCard'
import {
  DocumentWorkflowStatusBadge,
  SignatureStatusBadge,
} from '@/components/StatusBadge'
import {
  alerts,
  classes,
  companies,
  documentTemplates,
  generatedDocuments,
  pfmpPeriods,
  preDepartureChecklists,
  students,
} from '@/data/demo'
import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_WORKFLOW_STATUS_LABELS,
  PROFESSIONAL_FAMILY_LABELS,
  SIGNATORY_ROLE_LABELS,
  SIGNATURE_METHOD_LABELS,
  type DocumentCategory,
  type DocumentWorkflowStatus,
  type GeneratedDocument,
} from '@/types'

export const Route = createFileRoute('/documents')({ component: DocumentsPage })

type Tab = 'pilot' | 'templates' | 'to_sign' | 'proof' | 'checklist'

const CATEGORIES: DocumentCategory[] = [
  'convention',
  'pedagogical_annex',
  'financial_annex',
  'attestation',
  'tracking_booklet',
  'visit_sheet',
  'tutor_evaluation',
  'safety_document',
  'other',
]

const WORKFLOW_STATUSES: DocumentWorkflowStatus[] = [
  'template_to_configure',
  'draft',
  'sent',
  'awaiting_signature',
  'partially_signed',
  'fully_signed',
  'refused',
  'expired',
  'archived',
  'to_correct',
]

function DocumentsPage() {
  const [tab, setTab] = useState<Tab>('pilot')
  const [category, setCategory] = useState<DocumentCategory | 'all'>('all')
  const [status, setStatus] = useState<DocumentWorkflowStatus | 'all'>('all')
  const [classFilter, setClassFilter] = useState<string | 'all'>('all')
  const [periodFilter, setPeriodFilter] = useState<string | 'all'>('all')
  const [companyFilter, setCompanyFilter] = useState<string | 'all'>('all')

  const filtered = useMemo(() => {
    return generatedDocuments.filter((d) => {
      if (category !== 'all' && d.category !== category) return false
      if (status !== 'all' && d.workflowStatus !== status) return false
      if (companyFilter !== 'all' && d.companyId !== companyFilter) return false
      if (periodFilter !== 'all' && d.periodId !== periodFilter) return false
      if (classFilter !== 'all') {
        const s = students.find((st) => st.id === d.studentId)
        if (!s || s.classId !== classFilter) return false
      }
      return true
    })
  }, [category, status, classFilter, periodFilter, companyFilter])

  const kpiPendingConventions = generatedDocuments.filter(
    (d) =>
      d.category === 'convention' &&
      ['draft', 'sent', 'awaiting_signature', 'partially_signed', 'to_correct'].includes(
        d.workflowStatus,
      ),
  ).length

  const kpiSigned = generatedDocuments.filter(
    (d) => d.workflowStatus === 'fully_signed' || d.workflowStatus === 'archived',
  ).length

  const kpiMissingAttestations = generatedDocuments.filter(
    (d) =>
      d.category === 'attestation' &&
      ['expired', 'sent', 'awaiting_signature', 'draft'].includes(d.workflowStatus),
  ).length

  const kpiCompleteFolders = students.filter((s) => {
    const list = preDepartureChecklists[s.id]
    if (!list) return false
    return list.filter((i) => i.required).every((i) => i.done)
  }).length

  return (
    <AppLayout
      title="Documents & signatures PFMP"
      subtitle="Pilotage des conventions, annexes, attestations et dossier de preuve"
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
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Conventions en attente"
          value={kpiPendingConventions}
          icon={<FileSignature className="w-4 h-4" />}
          hint="Brouillons, envoyées ou partiellement signées"
        />
        <StatCard
          label="Documents signés"
          value={kpiSigned}
          icon={<CheckCircle2 className="w-4 h-4" />}
          hint="Signés complets ou archivés"
        />
        <StatCard
          label="Attestations manquantes"
          value={kpiMissingAttestations}
          icon={<AlertTriangle className="w-4 h-4" />}
          hint="Non reçues ou expirées"
        />
        <StatCard
          label="Dossiers complets"
          value={`${kpiCompleteFolders}/${Object.keys(preDepartureChecklists).length}`}
          icon={<ShieldCheck className="w-4 h-4" />}
          hint="Checklist avant départ — items requis"
        />
      </div>

      <LegalNotice />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <TabBtn active={tab === 'pilot'} onClick={() => setTab('pilot')} icon={<FileText className="w-3.5 h-3.5" />}>
          Pilotage
        </TabBtn>
        <TabBtn active={tab === 'templates'} onClick={() => setTab('templates')} icon={<FileCheck2 className="w-3.5 h-3.5" />}>
          Modèles établissement ({documentTemplates.length})
        </TabBtn>
        <TabBtn active={tab === 'to_sign'} onClick={() => setTab('to_sign')} icon={<FileSignature className="w-3.5 h-3.5" />}>
          Documents à signer
        </TabBtn>
        <TabBtn active={tab === 'proof'} onClick={() => setTab('proof')} icon={<FolderArchive className="w-3.5 h-3.5" />}>
          Dossier de preuve
        </TabBtn>
        <TabBtn active={tab === 'checklist'} onClick={() => setTab('checklist')} icon={<ClipboardList className="w-3.5 h-3.5" />}>
          Checklist avant départ
        </TabBtn>
      </div>

      {tab === 'pilot' && (
        <>
          {/* Filters */}
          <Card className="mb-4">
            <CardBody className="pt-5">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <SelectBox label="Type" value={category} onChange={(v) => setCategory(v as DocumentCategory | 'all')}>
                  <option value="all">Tous types</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{DOCUMENT_CATEGORY_LABELS[c]}</option>
                  ))}
                </SelectBox>
                <SelectBox label="Statut" value={status} onChange={(v) => setStatus(v as DocumentWorkflowStatus | 'all')}>
                  <option value="all">Tous statuts</option>
                  {WORKFLOW_STATUSES.map((s) => (
                    <option key={s} value={s}>{DOCUMENT_WORKFLOW_STATUS_LABELS[s]}</option>
                  ))}
                </SelectBox>
                <SelectBox label="Classe" value={classFilter} onChange={setClassFilter}>
                  <option value="all">Toutes classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </SelectBox>
                <SelectBox label="Période" value={periodFilter} onChange={setPeriodFilter}>
                  <option value="all">Toutes périodes</option>
                  {pfmpPeriods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </SelectBox>
                <SelectBox label="Entreprise" value={companyFilter} onChange={setCompanyFilter}>
                  <option value="all">Toutes entreprises</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </SelectBox>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={<FileText className="w-4 h-4" />}>
                Documents ({filtered.length})
              </CardTitle>
            </CardHeader>
            <CardBody>
              <DocumentTable docs={filtered} />
            </CardBody>
          </Card>
        </>
      )}

      {tab === 'templates' && <TemplatesSection />}
      {tab === 'to_sign' && <ToSignSection />}
      {tab === 'proof' && <ProofSection />}
      {tab === 'checklist' && <ChecklistSection />}

      {/* Alertes documentaires */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle icon={<AlertTriangle className="w-4 h-4" />}>Alertes documentaires</CardTitle>
        </CardHeader>
        <CardBody>
          <AlertList
            alerts={alerts.filter((a) => a.type.startsWith('document_'))}
            emptyMessage="Aucune alerte documentaire."
            compact
          />
        </CardBody>
      </Card>
    </AppLayout>
  )
}

function LegalNotice() {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-info-bg)] px-3 py-2 text-xs text-[var(--color-info-fg)]">
      <Info className="w-4 h-4 mt-0.5 shrink-0" />
      <p>
        Cette démo prépare la traçabilité documentaire. Les signatures simples par lien et les
        cachets transmis par les entreprises ne constituent pas une signature électronique
        qualifiée. Une intégration avec un prestataire conforme eIDAS pourra être ajoutée pour
        les signatures juridiquement renforcées.
      </p>
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 rounded-full text-xs font-medium border inline-flex items-center gap-1.5 ${
        active
          ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border-[var(--color-brand-100)]'
          : 'bg-white text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-muted)]'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function SelectBox({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 text-sm rounded-md border border-[var(--color-border)] bg-white px-2"
      >
        {children}
      </select>
    </label>
  )
}

function DocumentTable({ docs }: { docs: GeneratedDocument[] }) {
  if (docs.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
        Aucun document ne correspond aux filtres.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
            <th className="py-2 pr-3">Document</th>
            <th className="py-2 pr-3 hidden md:table-cell">Élève</th>
            <th className="py-2 pr-3 hidden lg:table-cell">Entreprise</th>
            <th className="py-2 pr-3">Statut</th>
            <th className="py-2 pr-3 hidden md:table-cell">Signatures</th>
            <th className="py-2 pr-3 hidden lg:table-cell">Preuve</th>
            <th className="py-2 pr-3 hidden md:table-cell">Échéance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {docs.map((d) => {
            const s = students.find((st) => st.id === d.studentId)
            const c = companies.find((co) => co.id === d.companyId)
            const totalSig = d.signatures.length
            const signed = d.signatures.filter((sg) => sg.status === 'signed').length
            const missing = totalSig - signed
            const hasProof = (d.proofFiles?.length ?? 0) > 0
            return (
              <tr key={d.id} className="hover:bg-[var(--color-muted)]/40">
                <td className="py-2 pr-3">
                  <div className="font-medium text-[var(--color-text)]">{d.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {DOCUMENT_CATEGORY_LABELS[d.category]}
                  </div>
                </td>
                <td className="py-2 pr-3 hidden md:table-cell">
                  {s ? `${s.firstName} ${s.lastName}` : '—'}
                </td>
                <td className="py-2 pr-3 hidden lg:table-cell">{c?.name ?? '—'}</td>
                <td className="py-2 pr-3"><DocumentWorkflowStatusBadge status={d.workflowStatus} /></td>
                <td className="py-2 pr-3 hidden md:table-cell">
                  {totalSig === 0 ? (
                    <span className="text-xs text-[var(--color-text-muted)]">—</span>
                  ) : missing === 0 ? (
                    <Badge tone="success" dot>{signed}/{totalSig}</Badge>
                  ) : (
                    <Badge tone="warning" dot>{signed}/{totalSig} · {missing} manquante{missing > 1 ? 's' : ''}</Badge>
                  )}
                </td>
                <td className="py-2 pr-3 hidden lg:table-cell">
                  {hasProof ? (
                    <Badge tone="info" dot>{d.proofFiles!.length} pièce{d.proofFiles!.length > 1 ? 's' : ''}</Badge>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">Aucune</span>
                  )}
                </td>
                <td className="py-2 pr-3 hidden md:table-cell text-xs text-[var(--color-text-muted)]">
                  {d.dueDate ? new Date(d.dueDate).toLocaleDateString('fr-FR') : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TemplatesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<FileCheck2 className="w-4 h-4" />}>Modèles de l'établissement</CardTitle>
        <Button size="sm" variant="secondary">Nouveau modèle</Button>
      </CardHeader>
      <CardBody>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                <th className="py-2 pr-3">Nom</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3 hidden md:table-cell">Famille de métiers</th>
                <th className="py-2 pr-3 hidden lg:table-cell">Formations</th>
                <th className="py-2 pr-3">Version</th>
                <th className="py-2 pr-3">Statut</th>
                <th className="py-2 pr-3 hidden md:table-cell">Dernier changement</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {documentTemplates.map((t) => (
                <tr key={t.id} className="hover:bg-[var(--color-muted)]/40">
                  <td className="py-2 pr-3 font-medium">{t.name}</td>
                  <td className="py-2 pr-3 text-xs">{DOCUMENT_CATEGORY_LABELS[t.category]}</td>
                  <td className="py-2 pr-3 hidden md:table-cell text-xs">
                    {t.professionalFamily ? PROFESSIONAL_FAMILY_LABELS[t.professionalFamily] : 'Toutes'}
                  </td>
                  <td className="py-2 pr-3 hidden lg:table-cell text-xs text-[var(--color-text-muted)]">
                    {t.compatibleFormations.length === 0 ? 'Toutes' : t.compatibleFormations.join(', ')}
                  </td>
                  <td className="py-2 pr-3 text-xs">{t.version}</td>
                  <td className="py-2 pr-3">
                    {t.active ? (
                      <Badge tone="success" dot>Actif</Badge>
                    ) : (
                      <Badge tone="neutral" dot>Archivé</Badge>
                    )}
                  </td>
                  <td className="py-2 pr-3 hidden md:table-cell text-xs text-[var(--color-text-muted)]">
                    {new Date(t.updatedAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <Button size="sm" variant="ghost">Configurer le modèle</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Les modèles définissent les rôles attendus pour signer, la méthode de signature par
          défaut et les formations compatibles. La configuration fine sera disponible une fois
          Supabase Storage branché.
        </p>
      </CardBody>
    </Card>
  )
}

function ToSignSection() {
  const toSign = generatedDocuments
    .flatMap((d) =>
      d.signatures
        .filter((sg) => sg.status === 'pending' || sg.status === 'sent')
        .map((sg) => ({ doc: d, sig: sg })),
    )
    .sort((a, b) => {
      const da = a.sig.expiresAt ?? a.doc.dueDate ?? '9999'
      const db = b.sig.expiresAt ?? b.doc.dueDate ?? '9999'
      return da.localeCompare(db)
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<FileSignature className="w-4 h-4" />}>
          Documents à signer ({toSign.length})
        </CardTitle>
      </CardHeader>
      <CardBody>
        {toSign.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
            Aucune signature en attente.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <th className="py-2 pr-3">Document</th>
                  <th className="py-2 pr-3">Signataire attendu</th>
                  <th className="py-2 pr-3 hidden md:table-cell">Rôle</th>
                  <th className="py-2 pr-3 hidden md:table-cell">Méthode prévue</th>
                  <th className="py-2 pr-3">Échéance</th>
                  <th className="py-2 pr-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {toSign.map(({ doc, sig }) => (
                  <tr key={sig.id} className="hover:bg-[var(--color-muted)]/40">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{doc.name}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {DOCUMENT_CATEGORY_LABELS[doc.category]}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-sm">
                      {sig.signatoryName ?? <span className="text-[var(--color-text-muted)] italic">À renseigner</span>}
                      {sig.signatoryEmail && (
                        <div className="text-xs text-[var(--color-text-muted)]">{sig.signatoryEmail}</div>
                      )}
                    </td>
                    <td className="py-2 pr-3 hidden md:table-cell text-xs">
                      {SIGNATORY_ROLE_LABELS[sig.signatoryRole]}
                    </td>
                    <td className="py-2 pr-3 hidden md:table-cell text-xs">
                      {SIGNATURE_METHOD_LABELS[sig.method]}
                    </td>
                    <td className="py-2 pr-3 text-xs text-[var(--color-text-muted)]">
                      {sig.expiresAt
                        ? new Date(sig.expiresAt).toLocaleDateString('fr-FR')
                        : doc.dueDate
                          ? new Date(doc.dueDate).toLocaleDateString('fr-FR')
                          : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      <SignatureStatusBadge status={sig.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function ProofSection() {
  const example = generatedDocuments.find((d) => d.id === 'gd_conv_s1')!
  const student = students.find((s) => s.id === example.studentId)
  const company = companies.find((c) => c.id === example.companyId)
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<FolderArchive className="w-4 h-4" />}>Dossier de preuve — exemple</CardTitle>
        <Badge tone="info">{example.name}</Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <Meta label="Élève">{student ? `${student.firstName} ${student.lastName}` : '—'}</Meta>
          <Meta label="Entreprise">{company?.name ?? '—'}</Meta>
          <Meta label="Statut workflow"><DocumentWorkflowStatusBadge status={example.workflowStatus} /></Meta>
          <Meta label="Cachet entreprise">
            {example.companyStampProvided ? (
              <Badge tone="success" dot><Stamp className="w-3 h-3" /> Fourni</Badge>
            ) : (
              <Badge tone="warning" dot>Manquant</Badge>
            )}
          </Meta>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
            Pièces justificatives
          </h4>
          <ul className="divide-y divide-[var(--color-border)]">
            {(example.proofFiles ?? []).map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-2 text-sm">
                <FileText className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{f.filename}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {kindLabel(f.kind)} · {f.sizeKb ?? '—'} ko
                    {f.hash && <span className="font-mono"> · {f.hash}</span>}
                  </div>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {new Date(f.uploadedAt).toLocaleDateString('fr-FR')}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
            Signatures
          </h4>
          <ul className="divide-y divide-[var(--color-border)]">
            {example.signatures.map((sg) => (
              <li key={sg.id} className="py-2 text-sm flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{sg.signatoryName ?? SIGNATORY_ROLE_LABELS[sg.signatoryRole]}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {SIGNATORY_ROLE_LABELS[sg.signatoryRole]} · {SIGNATURE_METHOD_LABELS[sg.method]}
                    {sg.signedAt && ` · ${new Date(sg.signedAt).toLocaleString('fr-FR')}`}
                    {sg.proofHash && <span className="font-mono"> · {sg.proofHash}</span>}
                  </div>
                </div>
                <SignatureStatusBadge status={sg.status} />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
            Audit log (simulé)
          </h4>
          <ul className="rounded-md bg-[var(--color-muted)]/40 border border-[var(--color-border)] p-3 text-xs font-mono space-y-1 text-[var(--color-text-muted)]">
            <li>2026-04-01T10:00:00Z · u_admin · document.created · convention_lucas_bernard_v1.docx</li>
            <li>2026-04-02T09:00:00Z · u_admin · document.sent · 3 signataires</li>
            <li>2026-04-02T14:32:00Z · sig.signed · establishment_head (simple_link)</li>
            <li>2026-04-03T18:42:00Z · sig.signed · student_or_legal_guardian (simple_link)</li>
            <li>2026-04-05T11:08:00Z · sig.signed · company (company_stamp)</li>
            <li>2026-04-05T11:09:00Z · proof.archived · convention_lucas_bernard.pdf</li>
          </ul>
        </div>
      </CardBody>
    </Card>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</div>
      <div className="text-sm font-medium mt-0.5">{children}</div>
    </div>
  )
}

function kindLabel(k: NonNullable<GeneratedDocument['proofFiles']>[number]['kind']): string {
  switch (k) {
    case 'original': return 'Document original'
    case 'generated_pdf': return 'PDF généré'
    case 'company_stamp_scan': return 'Scan cachet entreprise'
    case 'audit_log': return 'Audit log'
    default: return 'Autre'
  }
}

function ChecklistSection() {
  const entries = Object.entries(preDepartureChecklists)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {entries.map(([studentId, items]) => {
        const s = students.find((st) => st.id === studentId)
        const required = items.filter((i) => i.required)
        const done = required.filter((i) => i.done).length
        const complete = done === required.length
        return (
          <Card key={studentId}>
            <CardHeader>
              <CardTitle icon={<ClipboardList className="w-4 h-4" />}>
                {s ? `${s.firstName} ${s.lastName}` : studentId}
              </CardTitle>
              {complete ? (
                <Badge tone="success" dot>Dossier complet</Badge>
              ) : (
                <Badge tone="warning" dot>{done}/{required.length} items requis</Badge>
              )}
            </CardHeader>
            <CardBody>
              <ul className="space-y-1.5">
                {items.map((it) => (
                  <li key={it.id} className="flex items-start gap-2 text-sm">
                    {it.done ? (
                      <CheckCircle2 className="w-4 h-4 text-[var(--color-success-fg)] mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[var(--color-text-subtle)] mt-0.5 shrink-0" />
                    )}
                    <span className={it.done ? '' : 'text-[var(--color-text-muted)]'}>
                      {it.label}
                      {!it.required && (
                        <span className="ml-1 text-xs text-[var(--color-text-subtle)]">(facultatif)</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}
