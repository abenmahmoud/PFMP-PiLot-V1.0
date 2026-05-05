import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Lock,
  Network,
  Rocket,
  Shield,
  Smartphone,
  Sparkles,
  Target,
  Upload,
  UserCog,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RoleGuard } from '@/components/RoleGuard'

export const Route = createFileRoute('/pitch')({ component: PitchPage })

function PitchPage() {
  return (
    <AppLayout
      title="Présentation produit"
      subtitle="Support de pitch pour DDFPT, proviseurs et partenaires"
      actions={<Badge tone="brand">Démo</Badge>}
    >
      <RoleGuard allow={['superadmin', 'admin', 'ddfpt']}>
        <div className="space-y-6">
          <Hero />
          <Problem />
          <Solution />
          <Journey />
          <RoleValue />
          <CompanyNetwork />
          <ReadyInDemo />
          <ToWire />
          <MvpChecklist />
        </div>
      </RoleGuard>
    </AppLayout>
  )
}

function Hero() {
  return (
    <Card className="overflow-hidden">
      <div className="relative px-5 sm:px-8 py-8 sm:py-10 bg-gradient-to-br from-[var(--color-brand-50)] via-white to-white">
        <div className="absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(circle_at_top_right,_var(--color-brand-100),_transparent_60%)]" />
        <div className="relative max-w-3xl">
          <Badge tone="brand" dot>
            <Sparkles className="w-3 h-3" />
            <span>Cockpit PFMP</span>
          </Badge>
          <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-text)]">
            PFMP Pilot AI
          </h1>
          <p className="mt-2 text-base sm:text-lg text-[var(--color-text-muted)]">
            Le cockpit intelligent des PFMP pour lycées professionnels.
          </p>
          <p className="mt-3 text-sm sm:text-[15px] text-[var(--color-text-muted)] leading-relaxed">
            Centralisez les stages, les visites, les documents et le réseau entreprises
            dans une interface simple, mobile-first et pensée pour le terrain.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/dashboard">
              <Button variant="primary" iconLeft={<LayoutDashboard className="w-4 h-4" />}>
                Voir le dashboard
              </Button>
            </Link>
            <Link to="/companies">
              <Button variant="secondary" iconLeft={<Building2 className="w-4 h-4" />}>
                Voir les entreprises
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}

const PROBLEMS: { icon: ReactNode; title: string; desc: string }[] = [
  {
    icon: <Database className="w-4 h-4" />,
    title: 'Données dispersées',
    desc: 'Excel, mails, Pronote, PDF, papiers : aucune source unique.',
  },
  {
    icon: <GraduationCap className="w-4 h-4" />,
    title: 'Élèves sans stage',
    desc: 'Les profils à risque sont difficiles à identifier à temps.',
  },
  {
    icon: <Clock className="w-4 h-4" />,
    title: 'Visites oubliées',
    desc: 'Sans rappel, certaines visites passent à la trappe.',
  },
  {
    icon: <FileText className="w-4 h-4" />,
    title: 'Documents manquants',
    desc: 'Conventions, attestations : un suivi qui reste artisanal.',
  },
  {
    icon: <Network className="w-4 h-4" />,
    title: 'Réseau peu exploité',
    desc: "L'historique entreprises se perd d'année en année.",
  },
  {
    icon: <AlertTriangle className="w-4 h-4" />,
    title: 'Charge mentale DDFPT',
    desc: 'Le pilotage des PFMP repose sur une seule tête.',
  },
]

function Problem() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle icon={<AlertTriangle className="w-4 h-4" />}>
            Le problème terrain
          </CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Ce qui freine aujourd'hui les équipes pédagogiques
          </p>
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PROBLEMS.map((p) => (
            <div
              key={p.title}
              className="rounded-lg border border-[var(--color-border)] bg-white p-3"
            >
              <div className="flex items-center gap-2 text-[var(--color-warning-fg)]">
                <span className="w-7 h-7 rounded-md bg-[var(--color-warning-bg)] flex items-center justify-center">
                  {p.icon}
                </span>
                <p className="text-sm font-medium text-[var(--color-text)]">{p.title}</p>
              </div>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{p.desc}</p>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

const SOLUTIONS: { icon: ReactNode; title: string; desc: string }[] = [
  { icon: <Upload className="w-4 h-4" />, title: 'Import élèves, classes, profs', desc: 'Démarrage en quelques minutes via fichiers existants.' },
  { icon: <Clock className="w-4 h-4" />, title: 'Création des périodes PFMP', desc: 'Définissez vos périodes et leurs cibles en un clic.' },
  { icon: <UserCog className="w-4 h-4" />, title: 'Affectation des référents', desc: 'Charge équilibrée et visibilité immédiate sur les surcharges.' },
  { icon: <FileText className="w-4 h-4" />, title: 'Fiche stage centralisée', desc: 'Élève, entreprise, tuteur, documents : une seule fiche.' },
  { icon: <Smartphone className="w-4 h-4" />, title: 'Visite mobile', desc: "Saisie sur téléphone, pensée pour l'usage terrain." },
  { icon: <FileText className="w-4 h-4" />, title: 'Compte rendu archivé', desc: 'Traçabilité complète pour le proviseur et l\'inspection.' },
  { icon: <LayoutDashboard className="w-4 h-4" />, title: 'Dashboard DDFPT', desc: 'Pilotage temps réel, alertes priorisées.' },
  { icon: <Building2 className="w-4 h-4" />, title: 'Base entreprises intelligente', desc: 'Mémoire vivante du réseau et de ses tuteurs.' },
  { icon: <Shield className="w-4 h-4" />, title: 'Cockpit superadmin', desc: 'Vue multi-établissement pour le pilotage SaaS.' },
]

function Solution() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle icon={<Sparkles className="w-4 h-4" />}>La solution</CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Une plateforme unique, du terrain au pilotage
          </p>
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SOLUTIONS.map((s) => (
            <div
              key={s.title}
              className="rounded-lg border border-[var(--color-border)] bg-white p-3"
            >
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-md bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center">
                  {s.icon}
                </span>
                <p className="text-sm font-medium text-[var(--color-text)]">{s.title}</p>
              </div>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{s.desc}</p>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

const STEPS: { title: string; desc: string }[] = [
  { title: 'Le DDFPT importe les données', desc: 'Élèves, classes, professeurs et entreprises sont chargés.' },
  { title: 'Il crée une période PFMP', desc: 'Dates, cibles, classes concernées.' },
  { title: 'Il affecte les élèves aux professeurs', desc: 'Répartition équitable, charge surveillée.' },
  { title: 'Le professeur consulte ses élèves', desc: 'Vue dédiée référent, tout est en un coup d\'œil.' },
  { title: 'Il remplit la visite sur téléphone', desc: 'Formulaire mobile, signatures et photos en option.' },
  { title: 'Le compte rendu est archivé', desc: 'PDF généré, accessible au proviseur et à l\'élève.' },
  { title: 'Le DDFPT suit tout depuis son dashboard', desc: 'Alertes, taux de visites, documents en règle.' },
]

function Journey() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle icon={<Rocket className="w-4 h-4" />}>Parcours simple</CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            De l'import des élèves au compte rendu archivé
          </p>
        </div>
      </CardHeader>
      <CardBody>
        <ol className="relative space-y-4 sm:space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="w-7 h-7 rounded-full bg-[var(--color-brand)] text-white text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="flex-1 w-px bg-[var(--color-border)] my-1" />
                )}
              </div>
              <div className="pb-2">
                <p className="text-sm font-medium text-[var(--color-text)]">{s.title}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  )
}

const ROLES: {
  title: string
  badge: string
  icon: ReactNode
  bullets: string[]
}[] = [
  {
    title: 'DDFPT',
    badge: 'Pilotage',
    icon: <Target className="w-4 h-4" />,
    bullets: [
      'Vision globale en temps réel',
      'Alertes priorisées',
      'Pilotage des périodes PFMP',
    ],
  },
  {
    title: 'Professeur',
    badge: 'Terrain',
    icon: <UserCog className="w-4 h-4" />,
    bullets: [
      'Visites plus rapides en mobile',
      'Informations centralisées par élève',
      'Compte rendu prérempli',
    ],
  },
  {
    title: 'Proviseur',
    badge: 'Direction',
    icon: <Shield className="w-4 h-4" />,
    bullets: [
      'Traçabilité complète',
      'Archivage conforme',
      'Vision établissement consolidée',
    ],
  },
  {
    title: 'Superadmin',
    badge: 'SaaS',
    icon: <Sparkles className="w-4 h-4" />,
    bullets: [
      'Suivi multi-établissement',
      'Accompagnement client',
      'Vue assistée par IA',
    ],
  },
]

function RoleValue() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle icon={<Users className="w-4 h-4" />}>Valeur pour chaque rôle</CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Une plateforme, plusieurs lectures
          </p>
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ROLES.map((r) => (
            <div
              key={r.title}
              className="rounded-lg border border-[var(--color-border)] bg-white p-4 flex flex-col"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-md bg-[var(--color-brand-50)] text-[var(--color-brand-700)] flex items-center justify-center">
                    {r.icon}
                  </span>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {r.title}
                  </p>
                </div>
                <Badge tone="info">{r.badge}</Badge>
              </div>
              <ul className="mt-3 space-y-1.5">
                {r.bullets.map((b) => (
                  <li
                    key={b}
                    className="text-sm text-[var(--color-text-muted)] flex items-start gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-[var(--color-success-fg)] shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

const NETWORK_BLOCKS: { label: string; desc: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'brand' }[] = [
  { label: 'Entreprises actives', desc: 'Avec une PFMP en cours ou récente.', tone: 'info' },
  { label: 'Tuteurs', desc: 'Contact, fonction, réactivité historique.', tone: 'brand' },
  { label: 'Familles de métiers', desc: 'Cartographie des secteurs couverts.', tone: 'brand' },
  { label: 'Formations compatibles', desc: 'Filtrage rapide pour chaque classe.', tone: 'info' },
  { label: 'Fiabilité', desc: 'Score basé sur les comptes rendus passés.', tone: 'success' },
  { label: 'Entreprises à relancer', desc: 'Sans activité récente, à réactiver.', tone: 'warning' },
  { label: 'Partenaires forts', desc: 'Récurrents, fiables, à valoriser.', tone: 'success' },
  { label: 'À surveiller / éviter', desc: 'Signalées par incidents ou non-conformité.', tone: 'danger' },
  { label: 'Mémoire pro', desc: "L'historique du réseau ne se perd plus.", tone: 'brand' },
]

function CompanyNetwork() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle icon={<Network className="w-4 h-4" />}>Réseau entreprises</CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Le module qui transforme un carnet d'adresses en mémoire collective
          </p>
        </div>
        <Badge tone="brand">Différenciant</Badge>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {NETWORK_BLOCKS.map((b) => (
            <div
              key={b.label}
              className="rounded-lg border border-[var(--color-border)] bg-white p-3"
            >
              <Badge tone={b.tone}>{b.label}</Badge>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{b.desc}</p>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

const READY: string[] = [
  'Dashboards (établissement & superadmin)',
  'Module entreprises / tuteurs',
  'Élèves & classes',
  'Visites mobile-first',
  'Cockpit superadmin',
  'IA mockée déterministe',
]

const TODO_BACKEND: string[] = [
  'Supabase Auth',
  'RLS stricte multi-tenant',
  'Base réelle (remplacement des données démo)',
  'Imports CSV / Excel',
  'Sauvegarde réelle des visites',
  'Génération PDF (conventions, comptes rendus)',
  'IA réelle côté serveur',
  'Paiement (étape ultérieure)',
]

function ReadyInDemo() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle icon={<CheckCircle2 className="w-4 h-4" />}>
            Ce qui est prêt en démo
          </CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Cliquable et navigable dès maintenant
          </p>
        </div>
        <Badge tone="success">Démo</Badge>
      </CardHeader>
      <CardBody>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {READY.map((t) => (
            <li key={t} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-[var(--color-success-fg)] shrink-0" />
              <span className="text-[var(--color-text)]">{t}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}

function ToWire() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle icon={<Lock className="w-4 h-4" />}>Ce qui reste à brancher</CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Étapes techniques pour passer en production
          </p>
        </div>
        <Badge tone="warning">À faire</Badge>
      </CardHeader>
      <CardBody>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TODO_BACKEND.map((t) => (
            <li key={t} className="flex items-start gap-2 text-sm">
              <Clock className="w-4 h-4 mt-0.5 text-[var(--color-warning-fg)] shrink-0" />
              <span className="text-[var(--color-text)]">{t}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}

const MVP: { label: string; done: boolean }[] = [
  { label: 'Auth Supabase', done: false },
  { label: 'RLS stricte', done: false },
  { label: 'Import CSV', done: false },
  { label: 'Affectation élèves / profs', done: true },
  { label: 'Sauvegarde visite', done: false },
  { label: 'PDF compte rendu', done: false },
  { label: 'Export période', done: true },
  { label: 'Cockpit superadmin', done: true },
  { label: 'IA professeur', done: false },
  { label: 'IA DDFPT', done: false },
  { label: 'IA superadmin', done: false },
]

function MvpChecklist() {
  const total = MVP.length
  const done = MVP.filter((m) => m.done).length
  const pct = Math.round((done / total) * 100)
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle icon={<Target className="w-4 h-4" />}>MVP Checklist</CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {done}/{total} chantiers livrés · {pct}% du MVP
          </p>
        </div>
        <Badge tone="brand">{pct}%</Badge>
      </CardHeader>
      <CardBody>
        <div className="h-1.5 mb-4 rounded-full bg-[var(--color-muted)] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MVP.map((m) => (
            <li
              key={m.label}
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                {m.done ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success-fg)]" />
                ) : (
                  <Clock className="w-4 h-4 text-[var(--color-text-subtle)]" />
                )}
                {m.label}
              </span>
              <Badge tone={m.done ? 'success' : 'neutral'}>
                {m.done ? 'Prêt démo' : 'À brancher'}
              </Badge>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}
