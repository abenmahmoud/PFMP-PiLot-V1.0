import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Send, ShieldCheck } from 'lucide-react'
import { isDemoMode } from '@/lib/supabase'
import type { SalesLeadOrganizationType } from '@/lib/database.types'
import { submitSalesLead, type SalesLeadInput } from '@/server/sales.functions'

export const Route = createFileRoute('/devis')({
  component: QuoteRequestPage,
})

type QuoteFormState = {
  contactName: string
  email: string
  phone: string
  organizationName: string
  roleLabel: string
  organizationType: SalesLeadOrganizationType
  city: string
  establishmentsCount: string
  studentsCount: string
  message: string
  needsDemo: boolean
  website: string
}

const initialForm: QuoteFormState = {
  contactName: '',
  email: '',
  phone: '',
  organizationName: '',
  roleLabel: '',
  organizationType: 'lycee',
  city: '',
  establishmentsCount: '',
  studentsCount: '',
  message: '',
  needsDemo: true,
  website: '',
}

function QuoteRequestPage() {
  const [form, setForm] = useState<QuoteFormState>(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (isDemoMode()) {
        setSent(true)
        return
      }
      await submitSalesLead({ data: toServerInput(form) })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demande impossible pour le moment.')
    } finally {
      setLoading(false)
    }
  }

  function update<K extends keyof QuoteFormState>(key: K, value: QuoteFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  if (sent) return <QuoteSuccess />

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto grid min-h-screen max-w-7xl gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <div className="mt-12 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Pilote PFMP multi-etablissement
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
              Cadrer votre demonstration PFMP Pilot AI.
            </h1>
            <p className="mt-5 text-base leading-8 text-white/72">
              Donnez-nous le nombre d etablissements, le volume eleves et le contexte. La demande
              arrive dans le pipeline superadmin pour preparer un pilote propre.
            </p>
          </div>

          <div className="mt-10 grid gap-4">
            {[
              'Isolation stricte par etablissement',
              'Portails admin, prof et eleve separes',
              'Codes eleves sans compte email',
              'Trajectoire pilote vers 2 lycees puis reseau',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm font-medium text-white/82">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-white/12 bg-white p-5 text-slate-950 shadow-[0_34px_120px_rgba(0,0,0,0.34)] sm:p-6"
        >
          <div className="flex items-start gap-3 border-b border-slate-200 pb-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-normal">Demande de demonstration</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Reponse cible sous 24h ouvre. Aucun compte n est cree a cette etape.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nom et prenom" required>
              <input
                value={form.contactName}
                onChange={(event) => update('contactName', event.target.value)}
                required
                autoComplete="name"
                className={inputClass}
              />
            </Field>
            <Field label="Email professionnel" required>
              <input
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
                required
                type="email"
                autoComplete="email"
                className={inputClass}
              />
            </Field>
            <Field label="Telephone">
              <input
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                type="tel"
                autoComplete="tel"
                className={inputClass}
              />
            </Field>
            <Field label="Fonction">
              <input
                value={form.roleLabel}
                onChange={(event) => update('roleLabel', event.target.value)}
                placeholder="DDFPT, proviseur, DSI..."
                className={inputClass}
              />
            </Field>
            <Field label="Etablissement ou reseau" required>
              <input
                value={form.organizationName}
                onChange={(event) => update('organizationName', event.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Type">
              <select
                value={form.organizationType}
                onChange={(event) => update('organizationType', event.target.value as SalesLeadOrganizationType)}
                className={inputClass}
              >
                <option value="lycee">Lycee professionnel</option>
                <option value="groupe_scolaire">Groupe scolaire</option>
                <option value="rectorat">Rectorat</option>
                <option value="collectivite">Collectivite</option>
                <option value="autre">Autre</option>
              </select>
            </Field>
            <Field label="Ville">
              <input
                value={form.city}
                onChange={(event) => update('city', event.target.value)}
                autoComplete="address-level2"
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lycees">
                <input
                  value={form.establishmentsCount}
                  onChange={(event) => update('establishmentsCount', event.target.value)}
                  type="number"
                  min="0"
                  className={inputClass}
                />
              </Field>
              <Field label="Eleves">
                <input
                  value={form.studentsCount}
                  onChange={(event) => update('studentsCount', event.target.value)}
                  type="number"
                  min="0"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          <Field label="Objectif du pilote" className="mt-4">
            <textarea
              value={form.message}
              onChange={(event) => update('message', event.target.value)}
              placeholder="Ex: 2 lycees, 600 eleves, demarrage en septembre, besoin d importer SIECLE puis gerer les entreprises."
              className={`${inputClass} min-h-28 resize-y`}
            />
          </Field>

          <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.needsDemo}
              onChange={(event) => update('needsDemo', event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            Je souhaite une demonstration guidee avant creation des etablissements.
          </label>

          <input
            value={form.website}
            onChange={(event) => update('website', event.target.value)}
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer la demande'}
            <Send className="ml-2 h-4 w-4" />
          </button>
        </form>
      </section>
    </main>
  )
}

function QuoteSuccess() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col justify-center">
        <div className="rounded-lg border border-white/12 bg-white p-6 text-slate-950 shadow-[0_34px_120px_rgba(0,0,0,0.34)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-normal">Demande recue.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Le pilote peut maintenant etre qualifie proprement : volume, calendrier, donnees a
            importer, comptes admin/DDFPT et etapes de mise en route.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-slate-700">
            <p>1. Validation du perimetre et du calendrier pilote.</p>
            <p>2. Creation des etablissements et des admins dedies.</p>
            <p>3. Import SIECLE, annuaire professeurs, entreprises, periodes et placements.</p>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/"
              className="inline-flex h-11 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-semibold transition hover:bg-slate-50"
            >
              Retour accueil
            </Link>
            <Link
              to="/portails"
              className="inline-flex h-11 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Acceder aux portails
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function Field({
  label,
  required,
  className = '',
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-800">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
    </label>
  )
}

function toServerInput(form: QuoteFormState): SalesLeadInput {
  return {
    contactName: form.contactName,
    email: form.email,
    phone: form.phone || null,
    organizationName: form.organizationName,
    roleLabel: form.roleLabel || null,
    organizationType: form.organizationType,
    city: form.city || null,
    establishmentsCount: parseOptionalInt(form.establishmentsCount),
    studentsCount: parseOptionalInt(form.studentsCount),
    message: form.message || null,
    needsDemo: form.needsDemo,
    website: form.website || null,
  }
}

function parseOptionalInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

const inputClass =
  'h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100'
