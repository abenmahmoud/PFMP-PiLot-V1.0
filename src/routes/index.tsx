import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileSignature,
  MapPinned,
  Network,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'

export const Route = createFileRoute('/')({
  component: CommercialHomePage,
})

const proofItems = [
  'Import SIECLE classes et eleves',
  'Portails admin, prof et eleve separes',
  'Placements PFMP et matching entreprises',
  'Visites terrain PWA et signatures horodatees',
]

const workflow = [
  {
    title: 'Demarrer un lycee',
    text: 'Le superadmin cree le tenant, invite le DDFPT, puis l etablissement importe ses classes et eleves.',
    icon: Building2,
  },
  {
    title: 'Piloter la campagne PFMP',
    text: 'Professeurs, entreprises, tuteurs, periodes et placements restent dans un seul espace coherent.',
    icon: ClipboardList,
  },
  {
    title: 'Suivre le terrain',
    text: 'Les referents consultent leurs eleves, preparent les visites et conservent les preuves terrain.',
    icon: MapPinned,
  },
  {
    title: 'Archiver proprement',
    text: 'Attestations, signatures simples et audit logs consolident la trace administrative.',
    icon: FileSignature,
  },
]

function CommercialHomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative isolate min-h-screen overflow-hidden bg-slate-950">
        <ProductScene />
        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link to="/" className="flex items-center gap-3 text-white" aria-label="PFMP Pilot AI">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-base font-bold text-slate-950">
              P
            </span>
            <span className="text-sm font-semibold">PFMP Pilot AI</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-white/76 md:flex">
            <a href="#pilotage" className="hover:text-white">Pilotage</a>
            <a href="#multi" className="hover:text-white">Multi-etablissements</a>
            <Link to="/securite-rgpd" className="hover:text-white">Securite RGPD</Link>
          </nav>
          <Link
            to="/portails"
            className="inline-flex h-10 items-center justify-center rounded-md border border-white/18 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/18"
          >
            Acces portails
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col justify-center px-5 pb-20 pt-10 sm:px-8">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-normal text-white sm:text-6xl lg:text-7xl">
              PFMP Pilot AI
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78 sm:text-xl">
              Le cockpit SaaS qui centralise les PFMP de vos lycees professionnels :
              eleves, professeurs, entreprises, visites, documents et signatures.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/devis"
                className="inline-flex h-12 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-slate-950 shadow-[0_18px_60px_rgba(255,255,255,0.18)] transition hover:bg-slate-100"
              >
                Demander une demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                to="/securite-rgpd"
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/20 bg-white/8 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/14"
              >
                Voir la securite
              </Link>
            </div>
          </div>

          <div className="mt-14 grid max-w-4xl gap-3 sm:grid-cols-2">
            {proofItems.map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm font-medium text-white/82">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      <section id="pilotage" className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              Un parcours complet, pas une feuille de calcul de plus.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              PFMP Pilot AI relie les equipes administratives, les enseignants et les eleves autour
              d un meme cycle de vie : importer, affecter, visiter, signer, archiver.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-4">
            {workflow.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="border-t border-slate-200 pt-5">
                  <Icon className="h-6 w-6 text-slate-900" />
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section id="multi" className="bg-slate-50 px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              Pense pour un lycee. Pret pour un reseau.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Chaque etablissement garde ses donnees, ses roles et ses workflows. La console
              superadmin donne une lecture groupe pour preparer les arbitrages, les alertes et les
              rapports de pilotage.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Metric value="3" label="portails dedies" />
              <Metric value="8h" label="contexte support superadmin" />
              <Metric value="0" label="compte eleve requis" />
              <Metric value="1" label="audit trail par action" />
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-sm font-semibold text-slate-950">Console groupe scolaire</p>
            </div>
            <div className="divide-y divide-slate-100">
              <EstablishmentLine name="Lycee professionnel Blaise Cendrars" rate="88%" status="Campagne active" />
              <EstablishmentLine name="Lycee des metiers Jean Moulin" rate="74%" status="12 eleves a traiter" />
              <EstablishmentLine name="Campus professionnel Simone Veil" rate="93%" status="Visites en cours" />
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3">
          <TrustBlock icon={<ShieldCheck className="h-6 w-6" />} title="Isolation tenant">
            Donnees separees par etablissement, permissions serveur et traces d audit.
          </TrustBlock>
          <TrustBlock icon={<UsersRound className="h-6 w-6" />} title="Mineurs sans compte email">
            Les eleves accedent par code PFMP ou QR, sans compte Supabase Auth.
          </TrustBlock>
          <TrustBlock icon={<Network className="h-6 w-6" />} title="Pilotage multi-lycees">
            Le superadmin suit les etablissements sans exposer les donnees entre tenants.
          </TrustBlock>
        </div>
      </section>

      <section className="bg-slate-950 px-5 py-16 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal">Preparer votre pilote PFMP.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Nous cadrons le nombre d etablissements, le volume eleves et le planning de demarrage.
            </p>
          </div>
          <Link
            to="/devis"
            className="inline-flex h-12 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Planifier une demonstration
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}

function ProductScene() {
  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.92),rgba(15,23,42,0.68)_48%,rgba(14,116,144,0.38))]" />
      <div className="absolute right-[-12rem] top-20 hidden w-[62rem] rotate-[-7deg] rounded-xl border border-white/12 bg-white/10 p-5 shadow-[0_40px_120px_rgba(0,0,0,0.35)] backdrop-blur md:block">
        <div className="grid grid-cols-[15rem_1fr] gap-4">
          <div className="space-y-3 rounded-lg bg-slate-950/54 p-4">
            <div className="h-4 w-28 rounded bg-white/24" />
            {['Dashboard groupe', 'Etablissements', 'Placements', 'Visites terrain', 'Signatures'].map((item) => (
              <div key={item} className="rounded-md bg-white/8 px-3 py-2 text-xs text-white/72">
                {item}
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {['5 lycees', '3 240 eleves', '88% places', '42 alertes'].map((item) => (
                <div key={item} className="rounded-lg bg-white p-4 text-sm font-semibold text-slate-950">
                  {item}
                  <div className="mt-4 h-2 rounded bg-slate-100" />
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="h-4 w-44 rounded bg-slate-200" />
                <Sparkles className="h-5 w-5 text-cyan-600" />
              </div>
              <div className="space-y-3">
                {[88, 74, 93, 61].map((width, index) => (
                  <div key={width} className="grid grid-cols-[10rem_1fr_4rem] items-center gap-4">
                    <div className="h-3 rounded bg-slate-200" />
                    <div className="h-2 rounded bg-slate-100">
                      <div className="h-2 rounded bg-cyan-600" style={{ width: `${width}%` }} />
                    </div>
                    <div className="text-xs font-semibold text-slate-500">{index + 1}MSPC</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-l border-slate-200 pl-4">
      <p className="text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{label}</p>
    </div>
  )
}

function EstablishmentLine({ name, rate, status }: { name: string; rate: string; status: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4">
      <div>
        <p className="text-sm font-semibold text-slate-950">{name}</p>
        <p className="mt-1 text-xs text-slate-500">{status}</p>
      </div>
      <p className="text-lg font-semibold text-slate-950">{rate}</p>
    </div>
  )
}

function TrustBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <article className="border-t border-slate-200 pt-5">
      <div className="text-slate-950">{icon}</div>
      <h3 className="mt-5 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{children}</p>
    </article>
  )
}
