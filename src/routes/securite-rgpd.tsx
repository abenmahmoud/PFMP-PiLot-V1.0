import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Database, FileCheck2, KeyRound, LockKeyhole, ServerCog, ShieldCheck } from 'lucide-react'

export const Route = createFileRoute('/securite-rgpd')({
  component: SecurityRgpdPage,
})

const sections = [
  {
    title: 'Isolation multi-etablissement',
    icon: Database,
    text: 'Chaque tenant dispose de ses donnees, de ses roles et de ses permissions. Les server functions verifient le perimetre avant toute lecture ou mutation.',
  },
  {
    title: 'Eleves mineurs sans email',
    icon: KeyRound,
    text: 'Le portail eleve fonctionne avec un code PFMP et une session courte en sessionStorage. Aucun compte Supabase Auth n est cree pour un eleve mineur.',
  },
  {
    title: 'Secrets cote serveur uniquement',
    icon: ServerCog,
    text: 'Les operations sensibles passent par service-role cote serveur. Les cles et providers email ou IA ne sont jamais exposes au navigateur.',
  },
  {
    title: 'Audit logs et preuves',
    icon: FileCheck2,
    text: 'Les mutations importantes sont journalisees. Les signatures simples stockent hash, horodatage, signataire, IP et user-agent quand disponibles.',
  },
]

function SecurityRgpdPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 px-5 py-8 text-white sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Accueil
            </Link>
            <Link
              to="/portails"
              className="inline-flex h-10 items-center justify-center rounded-md border border-white/18 px-4 text-sm font-semibold text-white/86 transition hover:bg-white/10"
            >
              Acces portails
            </Link>
          </div>

          <div className="max-w-3xl py-20">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-white text-slate-950">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
              Securite, RGPD et pilotage responsable.
            </h1>
            <p className="mt-5 text-base leading-8 text-white/74">
              PFMP Pilot AI est concu pour des donnees scolaires sensibles : eleves mineurs,
              etablissements multiples, workflows terrain, documents et signatures.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-4">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <article key={section.title} className="border-t border-slate-200 pt-5">
                <Icon className="h-6 w-6 text-slate-950" />
                <h2 className="mt-5 text-lg font-semibold text-slate-950">{section.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{section.text}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="bg-slate-50 px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal text-slate-950">
              Le bon modele pour vendre a plusieurs etablissements.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              La solution evite le piege de la demo unique : un superadmin cree les lycees,
              chaque admin/DDFPT pilote son tenant, et les professeurs accedent a leur espace
              restreint. C est durable pour un groupe scolaire, un rectorat ou un reseau de lycees.
            </p>
          </div>
          <div className="grid gap-4">
            <TrustRow
              title="Avant le pilote"
              text="Reset propre, creation des tenants, comptes admin/DDFPT, verification des variables et du stockage."
            />
            <TrustRow
              title="Pendant le pilote"
              text="Import SIECLE, annuaire professeurs, referentiel entreprises, periodes PFMP et placements."
            />
            <TrustRow
              title="Apres le pilote"
              text="Signatures, preuves, exports, audit logs et lecture superadmin pour arbitrage multi-lycees."
            />
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl rounded-lg border border-slate-200 p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
                Preparer une mise en route controlee.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Le formulaire de demande permet de qualifier le volume et de creer les
                etablissements au bon moment, avec un flux d onboarding reproductible.
              </p>
            </div>
            <Link
              to="/devis"
              className="inline-flex h-11 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Demander une demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function TrustRow({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </article>
  )
}
