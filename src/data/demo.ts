import type {
  Alert,
  Class,
  Company,
  CompanyIntelligenceSummary,
  Document,
  DocumentRequirement,
  DocumentTemplate,
  Establishment,
  GeneratedDocument,
  PfmpPeriod,
  Placement,
  PreDepartureChecklistItem,
  Profile,
  ProfessionalFamily,
  Student,
  Teacher,
  Tutor,
  Visit,
  ActivityLogEntry,
} from '@/types'
import { PRE_DEPARTURE_CHECKLIST_LABELS } from '@/types'

const E1 = 'est_jean_moulin'
const E2 = 'est_voltaire'
const E3 = 'est_curie'
const E4 = 'est_montaigne'
const E5 = 'est_zola'

export const establishments: Establishment[] = [
  {
    id: E1,
    name: 'Lycée Professionnel Jean Moulin',
    city: 'Lyon',
    uai: '0691234A',
    active: true,
    studentCount: 320,
    userCount: 28,
    lastConnectionAt: '2026-05-04T09:12:00Z',
    activityScore: 86,
    createdAt: '2025-09-01T08:00:00Z',
    companyCount: 14,
    companyCompletionRate: 78,
    strongPartnerCount: 4,
  },
  {
    id: E2,
    name: 'Lycée Voltaire',
    city: 'Marseille',
    uai: '0132211B',
    active: true,
    studentCount: 412,
    userCount: 34,
    lastConnectionAt: '2026-05-02T16:42:00Z',
    activityScore: 64,
    createdAt: '2025-09-15T08:00:00Z',
    companyCount: 22,
    companyCompletionRate: 52,
    strongPartnerCount: 3,
  },
  {
    id: E3,
    name: 'Lycée Marie Curie',
    city: 'Lille',
    uai: '0590876C',
    active: false,
    studentCount: 198,
    userCount: 9,
    lastConnectionAt: '2026-03-12T11:08:00Z',
    activityScore: 18,
    createdAt: '2025-10-04T08:00:00Z',
    companyCount: 6,
    companyCompletionRate: 28,
    strongPartnerCount: 0,
  },
  {
    id: E4,
    name: 'Lycée Montaigne',
    city: 'Bordeaux',
    uai: '0331002D',
    active: true,
    studentCount: 276,
    userCount: 21,
    lastConnectionAt: '2026-05-03T14:20:00Z',
    activityScore: 74,
    createdAt: '2025-09-10T08:00:00Z',
    companyCount: 11,
    companyCompletionRate: 64,
    strongPartnerCount: 2,
  },
  {
    id: E5,
    name: 'Lycée Émile Zola',
    city: 'Rennes',
    uai: '0350551E',
    active: true,
    studentCount: 154,
    userCount: 12,
    lastConnectionAt: '2026-04-20T10:00:00Z',
    activityScore: 36,
    createdAt: '2025-11-12T08:00:00Z',
    companyCount: 5,
    companyCompletionRate: 31,
    strongPartnerCount: 0,
  },
]

export const profiles: Profile[] = [
  { id: 'u_super', establishmentId: null, firstName: 'Camille', lastName: 'Lefèvre', email: 'camille@pfmp-pilot.ai', role: 'superadmin', avatarColor: '#1d4ed8' },
  { id: 'u_admin', establishmentId: E1, firstName: 'Sophie', lastName: 'Bernard', email: 'sophie.bernard@jeanmoulin.fr', role: 'admin', avatarColor: '#0ea5e9' },
  { id: 'u_ddfpt', establishmentId: E1, firstName: 'Marc', lastName: 'Dupont', email: 'marc.dupont@jeanmoulin.fr', role: 'ddfpt', avatarColor: '#7c3aed' },
  { id: 't_lambert', establishmentId: E1, firstName: 'Élodie', lastName: 'Lambert', email: 'e.lambert@jeanmoulin.fr', role: 'principal', avatarColor: '#f59e0b' },
  { id: 't_garcia', establishmentId: E1, firstName: 'Julien', lastName: 'Garcia', email: 'j.garcia@jeanmoulin.fr', role: 'referent', avatarColor: '#16a34a' },
  { id: 't_rossi', establishmentId: E1, firstName: 'Laura', lastName: 'Rossi', email: 'l.rossi@jeanmoulin.fr', role: 'referent', avatarColor: '#dc2626' },
  { id: 't_martin', establishmentId: E1, firstName: 'Thomas', lastName: 'Martin', email: 't.martin@jeanmoulin.fr', role: 'referent', avatarColor: '#0891b2' },
  { id: 't_pereira', establishmentId: E1, firstName: 'Inès', lastName: 'Pereira', email: 'i.pereira@jeanmoulin.fr', role: 'principal', avatarColor: '#be185d' },
]

export const classes: Class[] = [
  { id: 'c_1mva', establishmentId: E1, name: '1ère MVA', level: 'Bac Pro', formation: 'Maintenance des véhicules', year: '2025-2026', studentCount: 6, principalId: 't_lambert' },
  { id: 'c_tcom', establishmentId: E1, name: 'Term Commerce', level: 'Bac Pro', formation: 'Métiers du commerce et de la vente', year: '2025-2026', studentCount: 6, principalId: 't_pereira' },
  { id: 'c_capeb', establishmentId: E1, name: 'CAP EBT', level: 'CAP', formation: 'Ébéniste', year: '2025-2026', studentCount: 4, principalId: 't_lambert' },
  { id: 'c_2gat', establishmentId: E1, name: '2nde GATL', level: 'Bac Pro', formation: 'Gestion administrative', year: '2025-2026', studentCount: 4, principalId: 't_pereira' },
]

export const companies: Company[] = [
  {
    id: 'co_renault',
    establishmentId: E1,
    name: 'Garage Renault Vaise',
    address: '12 rue de la Mécanique',
    city: 'Lyon',
    zipCode: '69009',
    phone: '04 78 12 34 56',
    email: 'contact@renault-vaise.fr',
    website: 'https://renault-vaise.fr',
    siret: '40428293100024',
    sector: 'Automobile',
    professionalFamily: 'automobile',
    compatibleFormations: ['Bac Pro MVA', 'CAP MV'],
    studentsHosted: 14,
    lastHostedAt: '2026-04-13',
    reliability: 'high',
    status: 'strong_partner',
    history: [
      'Partenaire depuis 2022, 5 PFMP successives sans incident.',
      'Atelier propre, EPI fournis, encadrement individualisé.',
    ],
  },
  {
    id: 'co_peugeot',
    establishmentId: E1,
    name: 'Peugeot Lyon Sud',
    address: '5 avenue Berthelot',
    city: 'Lyon',
    zipCode: '69007',
    sector: 'Automobile',
    professionalFamily: 'automobile',
    compatibleFormations: ['Bac Pro MVA'],
    studentsHosted: 8,
    lastHostedAt: '2026-04-13',
    reliability: 'high',
    status: 'active',
    history: [
      'Accueille régulièrement la 1ère MVA depuis 2023.',
    ],
  },
  {
    id: 'co_norauto',
    establishmentId: E1,
    name: 'Norauto Confluence',
    address: 'Centre Confluence',
    city: 'Lyon',
    zipCode: '69002',
    sector: 'Automobile',
    professionalFamily: 'automobile',
    compatibleFormations: ['Bac Pro MVA', 'CAP MV'],
    studentsHosted: 5,
    lastHostedAt: '2026-04-13',
    reliability: 'medium',
    status: 'to_watch',
    internalNotes: 'Roulement de tuteurs important, nécessite un brief renforcé en début de PFMP.',
    history: [
      'Stage Nathan Faure interrompu en avril 2026 (conflit relationnel).',
    ],
  },
  {
    id: 'co_carrefour',
    establishmentId: E1,
    name: 'Carrefour Part-Dieu',
    address: 'Centre commercial Part-Dieu',
    city: 'Lyon',
    zipCode: '69003',
    siret: '65201405300011',
    sector: 'Grande distribution',
    professionalFamily: 'commerce_vente',
    compatibleFormations: ['Bac Pro Commerce', 'Bac Pro MCV', 'CAP EPC'],
    studentsHosted: 11,
    lastHostedAt: '2026-04-13',
    reliability: 'high',
    status: 'strong_partner',
    history: [
      'Tutorat structuré, livret PFMP rempli systématiquement.',
      'Référent magasin dédié à l\'accueil PFMP.',
    ],
  },
  {
    id: 'co_fnac',
    establishmentId: E1,
    name: 'Fnac Bellecour',
    address: '85 rue de la République',
    city: 'Lyon',
    zipCode: '69002',
    sector: 'Commerce spécialisé',
    professionalFamily: 'commerce_vente',
    compatibleFormations: ['Bac Pro Commerce', 'Bac Pro MCV'],
    studentsHosted: 4,
    lastHostedAt: '2026-04-13',
    reliability: 'medium',
    status: 'active',
  },
  {
    id: 'co_atelier',
    establishmentId: E1,
    name: "Atelier d'ébénisterie Marquet",
    address: '14 rue des Artisans',
    city: 'Villeurbanne',
    zipCode: '69100',
    phone: '04 72 33 44 55',
    email: 'contact@atelier-marquet.fr',
    sector: 'Artisanat du bois',
    professionalFamily: 'artisanat_art',
    compatibleFormations: ['CAP Ébéniste', 'Bac Pro Artisanat'],
    studentsHosted: 3,
    lastHostedAt: '2026-04-13',
    reliability: 'high',
    status: 'strong_partner',
    history: [
      'Maître artisan reconnu, suivi qualitatif des élèves.',
      'Accueille un élève par PFMP depuis 2024.',
    ],
  },
  {
    id: 'co_axa',
    establishmentId: E1,
    name: 'AXA Assurances Lyon Centre',
    address: '21 cours Lafayette',
    city: 'Lyon',
    zipCode: '69006',
    siret: '72202610200042',
    sector: 'Assurance',
    professionalFamily: 'gestion_administration',
    compatibleFormations: ['Bac Pro GA', 'Bac Pro AGOrA'],
    studentsHosted: 6,
    lastHostedAt: '2026-04-13',
    reliability: 'high',
    status: 'active',
  },
  {
    id: 'co_mairie',
    establishmentId: E1,
    name: 'Mairie du 8e',
    address: '12 av. Jean Mermoz',
    city: 'Lyon',
    zipCode: '69008',
    sector: 'Administration publique',
    professionalFamily: 'service_public',
    compatibleFormations: ['Bac Pro GA', 'Bac Pro AGOrA'],
    studentsHosted: 2,
    lastHostedAt: '2026-04-13',
    reliability: 'low',
    status: 'to_recontact',
    internalNotes: 'Tuteur peu disponible, point de vigilance sur la PFMP en cours.',
    history: [
      'Tuteur indisponible lors de la dernière visite (avril 2026).',
    ],
  },
  // Entreprises élargies pour densifier le réseau
  {
    id: 'co_decathlon',
    establishmentId: E1,
    name: 'Decathlon Vaise',
    address: 'Quai Paul Sédallian',
    city: 'Lyon',
    zipCode: '69009',
    sector: 'Distribution sport',
    professionalFamily: 'commerce_vente',
    compatibleFormations: ['Bac Pro Commerce', 'Bac Pro MCV'],
    studentsHosted: 0,
    reliability: 'unknown',
    status: 'active',
    history: ['Première prise de contact, à formaliser.'],
  },
  {
    id: 'co_logistic',
    establishmentId: E1,
    name: 'Geodis Logistic Lyon',
    address: 'ZI Saint-Priest',
    city: 'Saint-Priest',
    zipCode: '69800',
    siret: '38242103200078',
    sector: 'Logistique',
    professionalFamily: 'transport_logistique',
    compatibleFormations: ['Bac Pro Logistique'],
    studentsHosted: 2,
    lastHostedAt: '2025-12-12',
    reliability: 'medium',
    status: 'active',
  },
  {
    id: 'co_bpaca',
    establishmentId: E1,
    name: 'Banque Populaire AURA',
    address: '4 boulevard Eugène Deruelle',
    city: 'Lyon',
    zipCode: '69003',
    sector: 'Banque',
    professionalFamily: 'gestion_administration',
    compatibleFormations: ['Bac Pro GA', 'Bac Pro AGOrA'],
    studentsHosted: 3,
    lastHostedAt: '2025-12-12',
    reliability: 'high',
    status: 'active',
  },
  {
    id: 'co_brico',
    establishmentId: E1,
    name: 'Brico Dépôt Vénissieux',
    address: 'Rue Marcel Mérieux',
    city: 'Vénissieux',
    zipCode: '69200',
    sector: 'Bricolage',
    professionalFamily: 'commerce_vente',
    compatibleFormations: ['Bac Pro Commerce'],
    studentsHosted: 1,
    lastHostedAt: '2025-12-12',
    reliability: 'low',
    status: 'to_avoid',
    internalNotes: 'Encadrement défaillant en 2025, ne pas y replacer d\'élèves sans validation DDFPT.',
    history: [
      'Stage 2025 : tuteur absent 50% du temps, élève laissé seul.',
    ],
  },
  {
    id: 'co_sncf',
    establishmentId: E1,
    name: 'SNCF Gare Part-Dieu',
    address: 'Place Charles Béraudier',
    city: 'Lyon',
    zipCode: '69003',
    sector: 'Transport ferroviaire',
    professionalFamily: 'transport_logistique',
    compatibleFormations: ['Bac Pro GA', 'Bac Pro AGOrA'],
    studentsHosted: 0,
    reliability: 'unknown',
    status: 'to_recontact',
    internalNotes: 'Pas de retour suite à la prise de contact de février.',
  },
  {
    id: 'co_resto',
    establishmentId: E1,
    name: 'Brasserie Georges',
    address: '30 cours de Verdun Perrache',
    city: 'Lyon',
    zipCode: '69002',
    sector: 'Restauration',
    professionalFamily: 'hotellerie_restauration',
    compatibleFormations: ['CAP Cuisine', 'Bac Pro Cuisine'],
    studentsHosted: 0,
    reliability: 'unknown',
    status: 'active',
    history: ['Visite de prospection en mars 2026.'],
  },
]

export const tutors: Tutor[] = [
  { id: 'tu_1', establishmentId: E1, firstName: 'Pierre', lastName: 'Moreau', function: 'Chef d\'atelier', email: 'p.moreau@renault-vaise.fr', phone: '06 11 22 33 44', companyId: 'co_renault', responsiveness: 'fast' },
  { id: 'tu_2', establishmentId: E1, firstName: 'Karim', lastName: 'Benali', function: 'Responsable mécanique', email: 'k.benali@peugeot-lyon.fr', companyId: 'co_peugeot', responsiveness: 'medium' },
  { id: 'tu_3', establishmentId: E1, firstName: 'Sandra', lastName: 'Dubois', function: 'Manager rayon', email: 's.dubois@carrefour.fr', companyId: 'co_carrefour', responsiveness: 'fast' },
  { id: 'tu_4', establishmentId: E1, firstName: 'Hugo', lastName: 'Robert', function: 'Responsable boutique', email: 'h.robert@fnac.com', companyId: 'co_fnac', responsiveness: 'medium' },
  { id: 'tu_5', establishmentId: E1, firstName: 'Anne', lastName: 'Marquet', function: 'Maître artisan', email: 'a.marquet@atelier.fr', companyId: 'co_atelier', responsiveness: 'fast' },
  { id: 'tu_6', establishmentId: E1, firstName: 'Nicolas', lastName: 'Faure', function: 'Conseiller commercial', email: 'n.faure@axa.fr', companyId: 'co_axa', responsiveness: 'medium' },
  { id: 'tu_7', establishmentId: E1, firstName: 'Valérie', lastName: 'Petit', function: 'Chef d\'équipe', email: 'v.petit@norauto.fr', companyId: 'co_norauto', responsiveness: 'slow', internalNotes: 'Disponibilité variable selon les semaines.' },
  { id: 'tu_8', establishmentId: E1, firstName: 'Olivier', lastName: 'Roux', function: 'Adjoint administratif', companyId: 'co_mairie', responsiveness: 'slow', internalNotes: 'Réponses tardives, cumul de fonctions.' },
  { id: 'tu_9', establishmentId: E1, firstName: 'Mehdi', lastName: 'Sellier', function: 'Chef de quai', email: 'm.sellier@geodis.fr', companyId: 'co_logistic', responsiveness: 'medium' },
  { id: 'tu_10', establishmentId: E1, firstName: 'Claire', lastName: 'Henry', function: 'Conseillère clientèle', email: 'c.henry@bpaca.fr', companyId: 'co_bpaca', responsiveness: 'fast' },
  { id: 'tu_11', establishmentId: E1, firstName: 'Bruno', lastName: 'Lemaire', function: 'Chef de rayon', companyId: 'co_brico', responsiveness: 'unknown' },
]

export const pfmpPeriods: PfmpPeriod[] = [
  {
    id: 'p_1',
    establishmentId: E1,
    name: 'PFMP 1 — Automne 2025',
    schoolYear: '2025-2026',
    classIds: ['c_1mva', 'c_tcom', 'c_capeb'],
    startDate: '2025-11-03',
    endDate: '2025-12-12',
    status: 'completed',
    studentCount: 16,
    assignmentRate: 100,
    visitRate: 88,
    missingDocuments: 2,
  },
  {
    id: 'p_2',
    establishmentId: E1,
    name: 'PFMP 2 — Printemps 2026',
    schoolYear: '2025-2026',
    classIds: ['c_1mva', 'c_tcom', 'c_capeb', 'c_2gat'],
    startDate: '2026-04-13',
    endDate: '2026-05-29',
    status: 'in_progress',
    studentCount: 20,
    assignmentRate: 80,
    visitRate: 35,
    missingDocuments: 6,
  },
]

export const students: Student[] = [
  // 1ère MVA
  { id: 's1', establishmentId: E1, classId: 'c_1mva', firstName: 'Lucas', lastName: 'Bernard', formation: 'Maintenance véhicules', stageStatus: 'in_progress', referentId: 't_garcia', companyId: 'co_renault', tutorId: 'tu_1', periodId: 'p_2', email: 'lucas.b@eleves.jeanmoulin.fr', phone: '06 11 11 11 11' },
  { id: 's2', establishmentId: E1, classId: 'c_1mva', firstName: 'Maxime', lastName: 'Dubois', formation: 'Maintenance véhicules', stageStatus: 'in_progress', referentId: 't_garcia', companyId: 'co_peugeot', tutorId: 'tu_2', periodId: 'p_2' },
  { id: 's3', establishmentId: E1, classId: 'c_1mva', firstName: 'Yanis', lastName: 'Cheikh', formation: 'Maintenance véhicules', stageStatus: 'signed_convention', referentId: 't_garcia', companyId: 'co_norauto', tutorId: 'tu_7', periodId: 'p_2' },
  { id: 's4', establishmentId: E1, classId: 'c_1mva', firstName: 'Théo', lastName: 'Leroy', formation: 'Maintenance véhicules', stageStatus: 'pending_convention', referentId: 't_rossi', companyId: 'co_renault', tutorId: 'tu_1', periodId: 'p_2' },
  { id: 's5', establishmentId: E1, classId: 'c_1mva', firstName: 'Adam', lastName: 'Bouzid', formation: 'Maintenance véhicules', stageStatus: 'no_stage', periodId: 'p_2' },
  { id: 's6', establishmentId: E1, classId: 'c_1mva', firstName: 'Nathan', lastName: 'Faure', formation: 'Maintenance véhicules', stageStatus: 'interrupted', referentId: 't_garcia', companyId: 'co_norauto', tutorId: 'tu_7', periodId: 'p_2', notes: 'Conflit avec le tuteur, à reclasser.' },

  // Term Commerce
  { id: 's7', establishmentId: E1, classId: 'c_tcom', firstName: 'Léa', lastName: 'Marin', formation: 'Commerce', stageStatus: 'in_progress', referentId: 't_rossi', companyId: 'co_carrefour', tutorId: 'tu_3', periodId: 'p_2', email: 'lea.m@eleves.jeanmoulin.fr' },
  { id: 's8', establishmentId: E1, classId: 'c_tcom', firstName: 'Camille', lastName: 'Roche', formation: 'Commerce', stageStatus: 'in_progress', referentId: 't_rossi', companyId: 'co_fnac', tutorId: 'tu_4', periodId: 'p_2' },
  { id: 's9', establishmentId: E1, classId: 'c_tcom', firstName: 'Sofia', lastName: 'Almeida', formation: 'Commerce', stageStatus: 'signed_convention', referentId: 't_martin', companyId: 'co_carrefour', tutorId: 'tu_3', periodId: 'p_2' },
  { id: 's10', establishmentId: E1, classId: 'c_tcom', firstName: 'Hugo', lastName: 'Chevalier', formation: 'Commerce', stageStatus: 'no_stage', periodId: 'p_2' },
  { id: 's11', establishmentId: E1, classId: 'c_tcom', firstName: 'Mathilde', lastName: 'Girard', formation: 'Commerce', stageStatus: 'in_progress', referentId: 't_garcia', companyId: 'co_fnac', tutorId: 'tu_4', periodId: 'p_2' },
  { id: 's12', establishmentId: E1, classId: 'c_tcom', firstName: 'Sami', lastName: 'Haddad', formation: 'Commerce', stageStatus: 'pending_convention', referentId: 't_martin', companyId: 'co_carrefour', tutorId: 'tu_3', periodId: 'p_2' },

  // CAP EBT
  { id: 's13', establishmentId: E1, classId: 'c_capeb', firstName: 'Enzo', lastName: 'Vidal', formation: 'Ébéniste', stageStatus: 'in_progress', referentId: 't_garcia', companyId: 'co_atelier', tutorId: 'tu_5', periodId: 'p_2' },
  { id: 's14', establishmentId: E1, classId: 'c_capeb', firstName: 'Tom', lastName: 'Gauthier', formation: 'Ébéniste', stageStatus: 'in_progress', referentId: 't_rossi', companyId: 'co_atelier', tutorId: 'tu_5', periodId: 'p_2' },
  { id: 's15', establishmentId: E1, classId: 'c_capeb', firstName: 'Léo', lastName: 'Perrin', formation: 'Ébéniste', stageStatus: 'no_stage', periodId: 'p_2' },
  { id: 's16', establishmentId: E1, classId: 'c_capeb', firstName: 'Noah', lastName: 'Garnier', formation: 'Ébéniste', stageStatus: 'signed_convention', referentId: 't_martin', companyId: 'co_atelier', tutorId: 'tu_5', periodId: 'p_2' },

  // 2nde GATL
  { id: 's17', establishmentId: E1, classId: 'c_2gat', firstName: 'Eva', lastName: 'Brun', formation: 'Gestion administrative', stageStatus: 'pending_convention', referentId: 't_martin', companyId: 'co_axa', tutorId: 'tu_6', periodId: 'p_2' },
  { id: 's18', establishmentId: E1, classId: 'c_2gat', firstName: 'Jade', lastName: 'Riviere', formation: 'Gestion administrative', stageStatus: 'in_progress', referentId: 't_martin', companyId: 'co_axa', tutorId: 'tu_6', periodId: 'p_2' },
  { id: 's19', establishmentId: E1, classId: 'c_2gat', firstName: 'Inès', lastName: 'Bonnet', formation: 'Gestion administrative', stageStatus: 'no_stage', periodId: 'p_2' },
  { id: 's20', establishmentId: E1, classId: 'c_2gat', firstName: 'Liam', lastName: 'Mercier', formation: 'Gestion administrative', stageStatus: 'in_progress', referentId: 't_garcia', companyId: 'co_mairie', tutorId: 'tu_8', periodId: 'p_2', notes: 'Tuteur peu présent — point de vigilance.' },
]

export const teachers: Teacher[] = [
  { id: 't_garcia', establishmentId: E1, firstName: 'Julien', lastName: 'Garcia', email: 'j.garcia@jeanmoulin.fr', phone: '06 22 11 33 44', classes: ['c_1mva', 'c_tcom', 'c_capeb'], studentLoad: 7 },
  { id: 't_rossi', establishmentId: E1, firstName: 'Laura', lastName: 'Rossi', email: 'l.rossi@jeanmoulin.fr', classes: ['c_1mva', 'c_tcom', 'c_capeb'], studentLoad: 4 },
  { id: 't_martin', establishmentId: E1, firstName: 'Thomas', lastName: 'Martin', email: 't.martin@jeanmoulin.fr', classes: ['c_tcom', 'c_capeb', 'c_2gat'], studentLoad: 5 },
  { id: 't_lambert', establishmentId: E1, firstName: 'Élodie', lastName: 'Lambert', email: 'e.lambert@jeanmoulin.fr', classes: ['c_1mva', 'c_capeb'], studentLoad: 0 },
  { id: 't_pereira', establishmentId: E1, firstName: 'Inès', lastName: 'Pereira', email: 'i.pereira@jeanmoulin.fr', classes: ['c_tcom', 'c_2gat'], studentLoad: 0 },
]

export const visits: Visit[] = [
  {
    id: 'v1', establishmentId: E1, studentId: 's1', teacherId: 't_garcia', periodId: 'p_2',
    date: '2026-04-22', contactType: 'visit', studentPresent: true, tutorMet: true,
    conditions: 'Atelier propre, EPI fournis, accueil correct.',
    activities: 'Vidange, contrôle freins, diagnostic électronique en autonomie.',
    professionalPosture: 'Ponctuel, à l\'écoute, prend des initiatives.',
    positives: 'Bonne intégration dans l\'équipe.', difficulties: 'Manque de rigueur sur la check-list de fin de tâche.',
    tutorRemark: 'Très bon élève, motivé.', teacherRemark: 'Continuer à travailler la rigueur documentaire.',
    alertLevel: 'none', nextAction: 'Entretien intermédiaire en semaine 18.', status: 'validated',
  },
  {
    id: 'v2', establishmentId: E1, studentId: 's6', teacherId: 't_garcia', periodId: 'p_2',
    date: '2026-04-28', contactType: 'visit', studentPresent: false, tutorMet: true,
    conditions: 'Élève absent à plusieurs reprises sans justification.',
    tutorRemark: 'Tuteur veut interrompre le stage.', alertLevel: 'urgent',
    nextAction: 'Réunion équipe pédagogique + parents avant le 05/05.', status: 'validated',
  },
  {
    id: 'v3', establishmentId: E1, studentId: 's7', teacherId: 't_rossi', periodId: 'p_2',
    date: '2026-04-25', contactType: 'call', studentPresent: true, tutorMet: true,
    conditions: 'Bonne ambiance.', activities: 'Tenue de caisse, mise en rayon.',
    alertLevel: 'none', status: 'validated',
  },
  {
    id: 'v4', establishmentId: E1, studentId: 's20', teacherId: 't_garcia', periodId: 'p_2',
    date: '2026-04-30', contactType: 'visit', studentPresent: true, tutorMet: false,
    conditions: 'Tuteur indisponible le jour de la visite.', alertLevel: 'vigilance',
    nextAction: 'Recontacter le tuteur cette semaine.', status: 'draft',
  },
]

export const documents: Document[] = [
  { id: 'd1', establishmentId: E1, type: 'convention', studentId: 's1', periodId: 'p_2', companyId: 'co_renault', name: 'Convention Lucas Bernard', date: '2026-04-08', status: 'archived', authorId: 'u_admin' },
  { id: 'd2', establishmentId: E1, type: 'convention', studentId: 's4', periodId: 'p_2', companyId: 'co_renault', name: 'Convention Théo Leroy', date: '2026-04-15', status: 'draft' },
  { id: 'd3', establishmentId: E1, type: 'convention', studentId: 's12', periodId: 'p_2', companyId: 'co_carrefour', name: 'Convention Sami Haddad', date: '2026-04-15', status: 'missing' },
  { id: 'd4', establishmentId: E1, type: 'attestation', studentId: 's1', periodId: 'p_1', companyId: 'co_renault', name: 'Attestation PFMP1 Lucas Bernard', date: '2025-12-12', status: 'archived' },
  { id: 'd5', establishmentId: E1, type: 'attestation', studentId: 's7', periodId: 'p_1', companyId: 'co_carrefour', name: 'Attestation PFMP1 Léa Marin', date: '2025-12-12', status: 'missing' },
  { id: 'd6', establishmentId: E1, type: 'visit_report', studentId: 's1', periodId: 'p_2', name: 'CR visite Lucas Bernard', date: '2026-04-22', status: 'validated', authorId: 't_garcia' },
  { id: 'd7', establishmentId: E1, type: 'visit_report', studentId: 's20', periodId: 'p_2', name: 'CR visite Liam Mercier', date: '2026-04-30', status: 'draft', authorId: 't_garcia' },
  { id: 'd8', establishmentId: E1, type: 'evaluation', studentId: 's1', periodId: 'p_1', companyId: 'co_renault', name: 'Fiche éval. PFMP1 L. Bernard', date: '2025-12-12', status: 'archived' },
]

export const alerts: Alert[] = [
  { id: 'a1', establishmentId: E1, type: 'student_no_stage', severity: 'urgent', message: '4 élèves sans stage à 8 jours du début de la PFMP 2.', relatedEntity: { type: 'period', id: 'p_2', label: 'PFMP 2 — Printemps 2026' }, createdAt: '2026-05-01T08:00:00Z', resolved: false },
  { id: 'a2', establishmentId: E1, type: 'visit_late', severity: 'problem', message: 'Visite en retard pour Maxime Dubois (Peugeot Lyon Sud).', relatedEntity: { type: 'student', id: 's2', label: 'Maxime Dubois' }, createdAt: '2026-05-02T10:00:00Z', resolved: false },
  { id: 'a3', establishmentId: E1, type: 'stage_interrupted', severity: 'urgent', message: 'Stage interrompu : Nathan Faure chez Norauto Confluence.', relatedEntity: { type: 'student', id: 's6', label: 'Nathan Faure' }, createdAt: '2026-04-29T14:00:00Z', resolved: false },
  { id: 'a4', establishmentId: E1, type: 'missing_convention', severity: 'vigilance', message: 'Convention manquante pour Sami Haddad.', relatedEntity: { type: 'student', id: 's12', label: 'Sami Haddad' }, createdAt: '2026-04-25T09:00:00Z', resolved: false },
  { id: 'a5', establishmentId: E1, type: 'teacher_overload', severity: 'vigilance', message: 'Julien Garcia : 7 élèves affectés (seuil 6).', relatedEntity: { type: 'teacher', id: 't_garcia', label: 'Julien Garcia' }, createdAt: '2026-04-20T11:00:00Z', resolved: false },
  { id: 'a6', establishmentId: E1, type: 'company_watch', severity: 'vigilance', message: 'Mairie du 8e : tuteur peu réactif, à surveiller.', relatedEntity: { type: 'company', id: 'co_mairie', label: 'Mairie du 8e' }, createdAt: '2026-04-15T10:00:00Z', resolved: false },
  { id: 'a7', establishmentId: E2, type: 'low_activity_establishment', severity: 'vigilance', message: 'Lycée Voltaire : usage en baisse depuis 3 semaines.', relatedEntity: { type: 'establishment', id: E2, label: 'Lycée Voltaire' }, createdAt: '2026-04-30T08:00:00Z', resolved: false },
  { id: 'a8', establishmentId: E3, type: 'low_activity_establishment', severity: 'problem', message: 'Lycée Marie Curie : aucune connexion depuis le 12 mars.', relatedEntity: { type: 'establishment', id: E3, label: 'Lycée Marie Curie' }, createdAt: '2026-04-12T08:00:00Z', resolved: false },
  { id: 'a9', establishmentId: E5, type: 'low_activity_establishment', severity: 'vigilance', message: 'Lycée Émile Zola : base entreprises faible (5 fiches).', relatedEntity: { type: 'establishment', id: E5, label: 'Lycée Émile Zola' }, createdAt: '2026-04-22T08:00:00Z', resolved: false },
  // Alertes documentaires PFMP
  { id: 'a10', establishmentId: E1, type: 'document_unsigned_convention', severity: 'problem', message: 'Convention non signée à 5 jours du départ : Théo Leroy.', relatedEntity: { type: 'student', id: 's4', label: 'Théo Leroy' }, createdAt: '2026-05-03T08:00:00Z', resolved: false },
  { id: 'a11', establishmentId: E1, type: 'document_missing_pedagogical_annex', severity: 'vigilance', message: 'Annexe pédagogique manquante : Sami Haddad (Carrefour).', relatedEntity: { type: 'student', id: 's12', label: 'Sami Haddad' }, createdAt: '2026-05-02T09:00:00Z', resolved: false },
  { id: 'a12', establishmentId: E1, type: 'document_missing_company_stamp', severity: 'vigilance', message: 'Cachet entreprise manquant sur la convention de Yanis Cheikh.', relatedEntity: { type: 'student', id: 's3', label: 'Yanis Cheikh' }, createdAt: '2026-05-02T11:00:00Z', resolved: false },
  { id: 'a13', establishmentId: E1, type: 'document_missing_tutor', severity: 'vigilance', message: 'Tuteur non renseigné pour le placement de Adam Bouzid.', relatedEntity: { type: 'student', id: 's5', label: 'Adam Bouzid' }, createdAt: '2026-04-30T08:00:00Z', resolved: false },
  { id: 'a14', establishmentId: E1, type: 'document_predeparture_incomplete', severity: 'problem', message: 'Dossier incomplet avant départ PFMP : Sami Haddad (3 items manquants).', relatedEntity: { type: 'student', id: 's12', label: 'Sami Haddad' }, createdAt: '2026-05-04T07:30:00Z', resolved: false },
  { id: 'a15', establishmentId: E1, type: 'document_postpfmp_incomplete', severity: 'vigilance', message: 'Attestation et fiche évaluation manquantes : Léa Marin (PFMP 1).', relatedEntity: { type: 'student', id: 's7', label: 'Léa Marin' }, createdAt: '2026-04-10T08:00:00Z', resolved: false },
]

export const placements: Placement[] = students
  .filter((s) => s.companyId && s.tutorId && s.periodId)
  .map((s) => ({
    id: `pl_${s.id}`,
    establishmentId: E1,
    studentId: s.id,
    companyId: s.companyId!,
    tutorId: s.tutorId!,
    periodId: s.periodId!,
    referentId: s.referentId,
    startDate: '2026-04-13',
    endDate: '2026-05-29',
    status: s.stageStatus,
  }))

export const activityLog: ActivityLogEntry[] = [
  { id: 'log1', establishmentId: E1, userId: 't_garcia', action: 'visit_create', description: 'Visite créée pour Lucas Bernard chez Garage Renault Vaise.', createdAt: '2026-05-04T09:12:00Z' },
  { id: 'log2', establishmentId: E1, userId: 'u_ddfpt', action: 'assignment_update', description: 'Affectation : Sofia Almeida → Thomas Martin.', createdAt: '2026-05-03T15:42:00Z' },
  { id: 'log3', establishmentId: E1, userId: 'u_admin', action: 'import', description: 'Import CSV : 4 nouvelles entreprises.', createdAt: '2026-05-02T11:00:00Z' },
  { id: 'log4', establishmentId: E1, userId: 't_garcia', action: 'ai_generate', description: 'Génération IA : reformulation compte rendu Lucas Bernard.', createdAt: '2026-04-22T17:08:00Z' },
  { id: 'log5', establishmentId: E1, userId: 'u_ddfpt', action: 'report_validate', description: 'Compte rendu validé : visite Lucas Bernard.', createdAt: '2026-04-22T18:00:00Z' },
  { id: 'log6', establishmentId: E1, userId: 'u_admin', action: 'export', description: 'Export CSV : élèves classe 1ère MVA.', createdAt: '2026-05-01T10:30:00Z' },
]

export const CURRENT_USER_ID = 't_garcia'

export function getCurrentUser(): Profile {
  return profiles.find((p) => p.id === CURRENT_USER_ID)!
}

export const ESTABLISHMENT_ID = E1

// ---------------------------------------------------------------------------
// Helpers — intelligence réseau entreprises (mockés tant que Supabase n'est
// pas branché). Remplacer par des vues/fonctions SQL côté Postgres ensuite.
// ---------------------------------------------------------------------------

/**
 * Calcule un score de complétude 0..100 d'une fiche entreprise en se basant
 * sur les champs structurants (SIRET, contact, formations, tuteurs, etc.).
 * Volontairement simple : la version Supabase pourra raffiner.
 */
export function computeCompanyCompletion(c: Company): number {
  const checks = [
    Boolean(c.siret || c.siren),
    Boolean(c.phone || c.email),
    c.compatibleFormations.length > 0,
    Boolean(c.professionalFamily && c.professionalFamily !== 'autre'),
    Boolean(c.history && c.history.length > 0),
    c.studentsHosted > 0,
  ]
  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}

export function buildCompanyIntelligence(
  estId: string = ESTABLISHMENT_ID,
): CompanyIntelligenceSummary {
  const list = companies.filter((c) => c.establishmentId === estId)
  const tutorList = tutors.filter((t) => t.establishmentId === estId)
  const sectors = new Map<string, number>()
  const families = new Map<ProfessionalFamily, number>()
  for (const c of list) {
    sectors.set(c.sector, (sectors.get(c.sector) ?? 0) + 1)
    families.set(c.professionalFamily, (families.get(c.professionalFamily) ?? 0) + 1)
  }
  const completion = list.length === 0
    ? 0
    : Math.round(list.reduce((s, c) => s + computeCompanyCompletion(c), 0) / list.length)
  return {
    totalCompanies: list.length,
    activeCompanies: list.filter((c) => c.status === 'active' || c.status === 'strong_partner').length,
    strongPartners: list.filter((c) => c.status === 'strong_partner').length,
    toRecontact: list.filter((c) => c.status === 'to_recontact').length,
    toWatch: list.filter((c) => c.status === 'to_watch').length,
    toAvoid: list.filter((c) => c.status === 'to_avoid').length,
    tutorsCount: tutorList.length,
    tutorsWithEmail: tutorList.filter((t) => Boolean(t.email)).length,
    averageCompletionRate: completion,
    topSectors: [...sectors.entries()]
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topFamilies: [...families.entries()]
      .map(([family, count]) => ({ family, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  }
}

// ---------------------------------------------------------------------------
// Documents & signatures PFMP — données de démo
// ---------------------------------------------------------------------------

export const documentTemplates: DocumentTemplate[] = [
  {
    id: 'tpl_conv_generic',
    establishmentId: E1,
    name: 'Convention PFMP — modèle générique',
    category: 'convention',
    professionalFamily: null,
    compatibleFormations: [],
    version: '2025-09-v2',
    active: true,
    expectedSignatories: ['establishment_head', 'company', 'student_or_legal_guardian'],
    defaultSignatureMethod: 'simple_link',
    updatedAt: '2025-09-12T10:00:00Z',
    updatedBy: 'u_ddfpt',
    notes: 'Modèle académique standard — à valider chaque année par la direction.',
  },
  {
    id: 'tpl_conv_mva',
    establishmentId: E1,
    name: 'Convention PFMP — Maintenance véhicules',
    category: 'convention',
    professionalFamily: 'automobile',
    compatibleFormations: ['Bac Pro MVA', 'CAP MV'],
    version: '2026-01-v1',
    active: true,
    expectedSignatories: ['establishment_head', 'company', 'student_or_legal_guardian'],
    defaultSignatureMethod: 'simple_link',
    updatedAt: '2026-01-08T09:00:00Z',
    updatedBy: 'u_ddfpt',
  },
  {
    id: 'tpl_conv_commerce',
    establishmentId: E1,
    name: 'Convention PFMP — Commerce / Vente',
    category: 'convention',
    professionalFamily: 'commerce_vente',
    compatibleFormations: ['Bac Pro Commerce', 'Bac Pro MCV', 'CAP EPC'],
    version: '2025-09-v1',
    active: true,
    expectedSignatories: ['establishment_head', 'company', 'student_or_legal_guardian'],
    defaultSignatureMethod: 'simple_link',
    updatedAt: '2025-09-15T08:00:00Z',
    updatedBy: 'u_ddfpt',
  },
  {
    id: 'tpl_annex_pedago',
    establishmentId: E1,
    name: 'Annexe pédagogique — activités & compétences',
    category: 'pedagogical_annex',
    professionalFamily: null,
    compatibleFormations: [],
    version: '2025-09-v1',
    active: true,
    expectedSignatories: ['referent_teacher', 'tutor'],
    defaultSignatureMethod: 'internal_validation',
    updatedAt: '2025-09-15T08:00:00Z',
  },
  {
    id: 'tpl_annex_finance',
    establishmentId: E1,
    name: 'Annexe financière — gratification & frais',
    category: 'financial_annex',
    professionalFamily: null,
    compatibleFormations: [],
    version: '2025-09-v1',
    active: true,
    expectedSignatories: ['establishment_head', 'company'],
    defaultSignatureMethod: 'simple_link',
    updatedAt: '2025-09-15T08:00:00Z',
  },
  {
    id: 'tpl_attestation',
    establishmentId: E1,
    name: 'Attestation de stage',
    category: 'attestation',
    professionalFamily: null,
    compatibleFormations: [],
    version: '2025-09-v1',
    active: true,
    expectedSignatories: ['company'],
    defaultSignatureMethod: 'company_stamp',
    updatedAt: '2025-09-15T08:00:00Z',
    notes: 'Demandée à la fin de chaque PFMP. Cachet entreprise accepté.',
  },
  {
    id: 'tpl_booklet_mva',
    establishmentId: E1,
    name: 'Livret de suivi — Bac Pro MVA',
    category: 'tracking_booklet',
    professionalFamily: 'automobile',
    compatibleFormations: ['Bac Pro MVA'],
    version: '2025-10-v1',
    active: true,
    expectedSignatories: ['referent_teacher', 'tutor', 'student_or_legal_guardian'],
    defaultSignatureMethod: 'internal_validation',
    updatedAt: '2025-10-02T11:00:00Z',
  },
  {
    id: 'tpl_visit_sheet',
    establishmentId: E1,
    name: 'Fiche visite professeur',
    category: 'visit_sheet',
    professionalFamily: null,
    compatibleFormations: [],
    version: '2025-09-v3',
    active: true,
    expectedSignatories: ['referent_teacher'],
    defaultSignatureMethod: 'internal_validation',
    updatedAt: '2025-11-04T08:00:00Z',
  },
  {
    id: 'tpl_tutor_eval',
    establishmentId: E1,
    name: 'Fiche évaluation tuteur',
    category: 'tutor_evaluation',
    professionalFamily: null,
    compatibleFormations: [],
    version: '2025-09-v2',
    active: true,
    expectedSignatories: ['tutor'],
    defaultSignatureMethod: 'simple_link',
    updatedAt: '2025-09-15T08:00:00Z',
  },
  {
    id: 'tpl_safety_ebt',
    establishmentId: E1,
    name: 'Document sécurité — Ébénisterie',
    category: 'safety_document',
    professionalFamily: 'artisanat_art',
    compatibleFormations: ['CAP Ébéniste', 'Bac Pro Artisanat'],
    version: '2024-09-v1',
    active: false,
    expectedSignatories: ['establishment_head', 'company'],
    defaultSignatureMethod: 'simple_link',
    updatedAt: '2024-09-01T08:00:00Z',
    notes: 'Archivé — remplacé par la version générique inter-formation 2025.',
  },
]

export const documentRequirements: DocumentRequirement[] = [
  { id: 'req_conv', establishmentId: E1, category: 'convention', phase: 'before_pfmp', blocking: true, description: 'Convention signée par toutes les parties avant le départ.' },
  { id: 'req_annex_pedago', establishmentId: E1, category: 'pedagogical_annex', phase: 'before_pfmp', blocking: true, description: 'Annexe pédagogique renseignée (activités + compétences).' },
  { id: 'req_annex_finance', establishmentId: E1, category: 'financial_annex', phase: 'before_pfmp', blocking: false, description: 'Annexe financière jointe à la convention.' },
  { id: 'req_safety', establishmentId: E1, category: 'safety_document', phase: 'before_pfmp', blocking: true, description: 'Document sécurité spécifique signé pour les formations à risque.' },
  { id: 'req_booklet', establishmentId: E1, category: 'tracking_booklet', phase: 'during_pfmp', blocking: false, description: 'Livret de suivi tenu à jour pendant la PFMP.' },
  { id: 'req_visit', establishmentId: E1, category: 'visit_sheet', phase: 'during_pfmp', blocking: false, description: 'Fiche visite professeur saisie après chaque visite.' },
  { id: 'req_attestation', establishmentId: E1, category: 'attestation', phase: 'after_pfmp', blocking: true, description: 'Attestation de stage remise par l\'entreprise.' },
  { id: 'req_eval', establishmentId: E1, category: 'tutor_evaluation', phase: 'after_pfmp', blocking: true, description: 'Fiche évaluation tuteur complétée.' },
]

export const generatedDocuments: GeneratedDocument[] = [
  // Convention signée complètement (Lucas Bernard / Renault)
  {
    id: 'gd_conv_s1',
    establishmentId: E1,
    templateId: 'tpl_conv_mva',
    category: 'convention',
    name: 'Convention PFMP 2 — Lucas Bernard',
    studentId: 's1',
    periodId: 'p_2',
    companyId: 'co_renault',
    tutorId: 'tu_1',
    workflowStatus: 'fully_signed',
    dueDate: '2026-04-10',
    createdAt: '2026-04-01T10:00:00Z',
    authorId: 'u_admin',
    companyStampProvided: true,
    signatures: [
      { id: 'sg_s1_eh', documentId: 'gd_conv_s1', signatoryRole: 'establishment_head', signatoryName: 'Sophie Bernard', method: 'simple_link', status: 'signed', sentAt: '2026-04-02T09:00:00Z', signedAt: '2026-04-02T14:32:00Z', proofHash: 'sha256:8a1f…b22c' },
      { id: 'sg_s1_co', documentId: 'gd_conv_s1', signatoryRole: 'company', signatoryName: 'Garage Renault Vaise', signatoryEmail: 'contact@renault-vaise.fr', method: 'company_stamp', status: 'signed', sentAt: '2026-04-02T09:00:00Z', signedAt: '2026-04-05T11:08:00Z', proofHash: 'sha256:c4e2…7711' },
      { id: 'sg_s1_st', documentId: 'gd_conv_s1', signatoryRole: 'student_or_legal_guardian', signatoryName: 'Lucas Bernard (rep. légal)', method: 'simple_link', status: 'signed', sentAt: '2026-04-02T09:00:00Z', signedAt: '2026-04-03T18:42:00Z', proofHash: 'sha256:1d97…aa10' },
    ],
    proofFiles: [
      { id: 'pf_s1_orig', documentId: 'gd_conv_s1', kind: 'original', filename: 'convention_lucas_bernard_v1.docx', uploadedAt: '2026-04-01T10:00:00Z', uploadedBy: 'u_admin', sizeKb: 142, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { id: 'pf_s1_pdf', documentId: 'gd_conv_s1', kind: 'generated_pdf', filename: 'convention_lucas_bernard.pdf', hash: 'sha256:f9a7…0421', uploadedAt: '2026-04-02T09:00:00Z', uploadedBy: 'u_admin', sizeKb: 188, mimeType: 'application/pdf' },
      { id: 'pf_s1_stamp', documentId: 'gd_conv_s1', kind: 'company_stamp_scan', filename: 'cachet_renault_vaise.jpg', hash: 'sha256:c4e2…7711', uploadedAt: '2026-04-05T11:08:00Z', uploadedBy: 'u_admin', sizeKb: 96, mimeType: 'image/jpeg' },
      { id: 'pf_s1_audit', documentId: 'gd_conv_s1', kind: 'audit_log', filename: 'audit_convention_lucas.json', uploadedAt: '2026-04-05T11:09:00Z', sizeKb: 4, mimeType: 'application/json' },
    ],
  },
  // Convention en attente de signature (Théo Leroy / Renault)
  {
    id: 'gd_conv_s4',
    establishmentId: E1,
    templateId: 'tpl_conv_mva',
    category: 'convention',
    name: 'Convention PFMP 2 — Théo Leroy',
    studentId: 's4',
    periodId: 'p_2',
    companyId: 'co_renault',
    tutorId: 'tu_1',
    workflowStatus: 'awaiting_signature',
    dueDate: '2026-05-08',
    createdAt: '2026-04-15T11:00:00Z',
    authorId: 'u_admin',
    signatures: [
      { id: 'sg_s4_eh', documentId: 'gd_conv_s4', signatoryRole: 'establishment_head', signatoryName: 'Sophie Bernard', method: 'simple_link', status: 'signed', sentAt: '2026-04-16T09:00:00Z', signedAt: '2026-04-16T10:11:00Z', proofHash: 'sha256:b1c4…f028' },
      { id: 'sg_s4_co', documentId: 'gd_conv_s4', signatoryRole: 'company', signatoryName: 'Garage Renault Vaise', method: 'company_stamp', status: 'sent', sentAt: '2026-04-16T09:00:00Z', expiresAt: '2026-05-08' },
      { id: 'sg_s4_st', documentId: 'gd_conv_s4', signatoryRole: 'student_or_legal_guardian', signatoryName: 'Théo Leroy (rep. légal)', method: 'simple_link', status: 'pending' },
    ],
  },
  // Convention partiellement signée — cachet entreprise manquant (Yanis / Norauto)
  {
    id: 'gd_conv_s3',
    establishmentId: E1,
    templateId: 'tpl_conv_mva',
    category: 'convention',
    name: 'Convention PFMP 2 — Yanis Cheikh',
    studentId: 's3',
    periodId: 'p_2',
    companyId: 'co_norauto',
    tutorId: 'tu_7',
    workflowStatus: 'partially_signed',
    dueDate: '2026-05-06',
    createdAt: '2026-04-12T09:00:00Z',
    authorId: 'u_admin',
    companyStampProvided: false,
    signatures: [
      { id: 'sg_s3_eh', documentId: 'gd_conv_s3', signatoryRole: 'establishment_head', method: 'simple_link', status: 'signed', sentAt: '2026-04-12T10:00:00Z', signedAt: '2026-04-12T15:00:00Z', proofHash: 'sha256:0a44…5599' },
      { id: 'sg_s3_co', documentId: 'gd_conv_s3', signatoryRole: 'company', method: 'company_stamp', status: 'sent', sentAt: '2026-04-12T10:00:00Z', expiresAt: '2026-05-06' },
      { id: 'sg_s3_st', documentId: 'gd_conv_s3', signatoryRole: 'student_or_legal_guardian', method: 'simple_link', status: 'signed', sentAt: '2026-04-12T10:00:00Z', signedAt: '2026-04-14T09:00:00Z', proofHash: 'sha256:31d2…7c91' },
    ],
  },
  // Convention brouillon — incomplet (Sami Haddad)
  {
    id: 'gd_conv_s12',
    establishmentId: E1,
    templateId: 'tpl_conv_commerce',
    category: 'convention',
    name: 'Convention PFMP 2 — Sami Haddad',
    studentId: 's12',
    periodId: 'p_2',
    companyId: 'co_carrefour',
    tutorId: 'tu_3',
    workflowStatus: 'draft',
    dueDate: '2026-05-10',
    createdAt: '2026-04-25T08:00:00Z',
    signatures: [],
    internalNotes: 'Annexe pédagogique manquante — bloquant.',
  },
  // Annexe pédagogique signée (Lucas)
  {
    id: 'gd_annex_s1',
    establishmentId: E1,
    templateId: 'tpl_annex_pedago',
    category: 'pedagogical_annex',
    name: 'Annexe pédagogique — Lucas Bernard',
    studentId: 's1',
    periodId: 'p_2',
    companyId: 'co_renault',
    workflowStatus: 'fully_signed',
    createdAt: '2026-04-02T09:30:00Z',
    authorId: 't_garcia',
    signatures: [
      { id: 'sg_a1_t', documentId: 'gd_annex_s1', signatoryRole: 'referent_teacher', signatoryName: 'Julien Garcia', method: 'internal_validation', status: 'signed', signedAt: '2026-04-02T11:00:00Z' },
      { id: 'sg_a1_tu', documentId: 'gd_annex_s1', signatoryRole: 'tutor', signatoryName: 'Pierre Moreau', method: 'simple_link', status: 'signed', sentAt: '2026-04-02T12:00:00Z', signedAt: '2026-04-04T16:32:00Z', proofHash: 'sha256:7d6f…cc41' },
    ],
  },
  // Annexe pédagogique manquante / à corriger (Sami)
  {
    id: 'gd_annex_s12',
    establishmentId: E1,
    templateId: 'tpl_annex_pedago',
    category: 'pedagogical_annex',
    name: 'Annexe pédagogique — Sami Haddad',
    studentId: 's12',
    periodId: 'p_2',
    companyId: 'co_carrefour',
    workflowStatus: 'to_correct',
    createdAt: '2026-04-26T09:00:00Z',
    authorId: 't_martin',
    signatures: [
      { id: 'sg_a12_t', documentId: 'gd_annex_s12', signatoryRole: 'referent_teacher', method: 'internal_validation', status: 'pending' },
      { id: 'sg_a12_tu', documentId: 'gd_annex_s12', signatoryRole: 'tutor', method: 'simple_link', status: 'pending' },
    ],
    internalNotes: 'Compétences visées non renseignées — à compléter avec le référent.',
  },
  // Annexe financière envoyée (Lucas)
  {
    id: 'gd_finance_s1',
    establishmentId: E1,
    templateId: 'tpl_annex_finance',
    category: 'financial_annex',
    name: 'Annexe financière — Lucas Bernard',
    studentId: 's1',
    periodId: 'p_2',
    companyId: 'co_renault',
    workflowStatus: 'sent',
    dueDate: '2026-05-15',
    createdAt: '2026-04-08T09:00:00Z',
    authorId: 'u_admin',
    signatures: [
      { id: 'sg_f1_eh', documentId: 'gd_finance_s1', signatoryRole: 'establishment_head', method: 'simple_link', status: 'sent', sentAt: '2026-04-08T10:00:00Z', expiresAt: '2026-05-15' },
      { id: 'sg_f1_co', documentId: 'gd_finance_s1', signatoryRole: 'company', method: 'simple_link', status: 'sent', sentAt: '2026-04-08T10:00:00Z', expiresAt: '2026-05-15' },
    ],
  },
  // Attestation PFMP 1 archivée (Lucas)
  {
    id: 'gd_att_s1_p1',
    establishmentId: E1,
    templateId: 'tpl_attestation',
    category: 'attestation',
    name: 'Attestation PFMP 1 — Lucas Bernard',
    studentId: 's1',
    periodId: 'p_1',
    companyId: 'co_renault',
    workflowStatus: 'archived',
    createdAt: '2025-12-12T16:00:00Z',
    authorId: 'u_admin',
    companyStampProvided: true,
    signatures: [
      { id: 'sg_at1_co', documentId: 'gd_att_s1_p1', signatoryRole: 'company', signatoryName: 'Garage Renault Vaise', method: 'company_stamp', status: 'signed', signedAt: '2025-12-12T16:00:00Z', proofHash: 'sha256:9ea1…3344' },
    ],
    proofFiles: [
      { id: 'pf_at1_pdf', documentId: 'gd_att_s1_p1', kind: 'generated_pdf', filename: 'attestation_lucas_p1.pdf', hash: 'sha256:6cf4…8810', uploadedAt: '2025-12-12T16:00:00Z', sizeKb: 124, mimeType: 'application/pdf' },
      { id: 'pf_at1_stamp', documentId: 'gd_att_s1_p1', kind: 'company_stamp_scan', filename: 'cachet_renault_attestation.jpg', uploadedAt: '2025-12-12T16:00:00Z', sizeKb: 78, mimeType: 'image/jpeg' },
    ],
  },
  // Attestation manquante (Léa Marin / PFMP 1)
  {
    id: 'gd_att_s7_p1',
    establishmentId: E1,
    templateId: 'tpl_attestation',
    category: 'attestation',
    name: 'Attestation PFMP 1 — Léa Marin',
    studentId: 's7',
    periodId: 'p_1',
    companyId: 'co_carrefour',
    workflowStatus: 'expired',
    dueDate: '2026-01-15',
    createdAt: '2025-12-13T09:00:00Z',
    signatures: [
      { id: 'sg_at7_co', documentId: 'gd_att_s7_p1', signatoryRole: 'company', method: 'company_stamp', status: 'expired', sentAt: '2025-12-15T09:00:00Z', expiresAt: '2026-01-15' },
    ],
    internalNotes: 'Relance Carrefour Part-Dieu nécessaire.',
  },
  // Fiche visite professeur (Lucas)
  {
    id: 'gd_visit_s1',
    establishmentId: E1,
    templateId: 'tpl_visit_sheet',
    category: 'visit_sheet',
    name: 'Fiche visite — Lucas Bernard 22/04',
    studentId: 's1',
    periodId: 'p_2',
    companyId: 'co_renault',
    workflowStatus: 'fully_signed',
    createdAt: '2026-04-22T18:00:00Z',
    authorId: 't_garcia',
    signatures: [
      { id: 'sg_v1_t', documentId: 'gd_visit_s1', signatoryRole: 'referent_teacher', signatoryName: 'Julien Garcia', method: 'internal_validation', status: 'signed', signedAt: '2026-04-22T18:00:00Z' },
    ],
  },
  // Fiche évaluation tuteur (Lucas, signée)
  {
    id: 'gd_eval_s1_p1',
    establishmentId: E1,
    templateId: 'tpl_tutor_eval',
    category: 'tutor_evaluation',
    name: 'Fiche évaluation tuteur — Lucas Bernard PFMP 1',
    studentId: 's1',
    periodId: 'p_1',
    companyId: 'co_renault',
    tutorId: 'tu_1',
    workflowStatus: 'fully_signed',
    createdAt: '2025-12-14T10:00:00Z',
    signatures: [
      { id: 'sg_e1_tu', documentId: 'gd_eval_s1_p1', signatoryRole: 'tutor', signatoryName: 'Pierre Moreau', method: 'simple_link', status: 'signed', sentAt: '2025-12-13T10:00:00Z', signedAt: '2025-12-14T10:00:00Z', proofHash: 'sha256:bb22…aa78' },
    ],
  },
  // Livret de suivi en cours (Lucas)
  {
    id: 'gd_book_s1',
    establishmentId: E1,
    templateId: 'tpl_booklet_mva',
    category: 'tracking_booklet',
    name: 'Livret de suivi — Lucas Bernard',
    studentId: 's1',
    periodId: 'p_2',
    companyId: 'co_renault',
    workflowStatus: 'awaiting_signature',
    createdAt: '2026-04-13T08:00:00Z',
    signatures: [
      { id: 'sg_b1_t', documentId: 'gd_book_s1', signatoryRole: 'referent_teacher', method: 'internal_validation', status: 'pending' },
      { id: 'sg_b1_tu', documentId: 'gd_book_s1', signatoryRole: 'tutor', method: 'internal_validation', status: 'pending' },
      { id: 'sg_b1_st', documentId: 'gd_book_s1', signatoryRole: 'student_or_legal_guardian', method: 'simple_link', status: 'pending' },
    ],
  },
]

/**
 * Checklist instanciée pour un placement type — la version Supabase générera
 * une instance par placement automatiquement à partir de `documentRequirements`.
 */
function mkChecklist(
  studentId: string,
  done: Partial<Record<PreDepartureChecklistItem['key'], boolean>>,
): PreDepartureChecklistItem[] {
  const keys: Array<PreDepartureChecklistItem['key']> = [
    'convention_signed',
    'company_identified',
    'tutor_identified',
    'address_verified',
    'schedule_filled',
    'activities_filled',
    'skills_targeted',
    'referent_assigned',
    'first_contact_planned',
    'safety_document_verified',
  ]
  return keys.map((key) => ({
    id: `chk_${studentId}_${key}`,
    studentId,
    placementId: `pl_${studentId}`,
    key,
    label: PRE_DEPARTURE_CHECKLIST_LABELS[key],
    done: Boolean(done[key]),
    required: key !== 'safety_document_verified',
  }))
}

export const preDepartureChecklists: Record<string, PreDepartureChecklistItem[]> = {
  s1: mkChecklist('s1', {
    convention_signed: true,
    company_identified: true,
    tutor_identified: true,
    address_verified: true,
    schedule_filled: true,
    activities_filled: true,
    skills_targeted: true,
    referent_assigned: true,
    first_contact_planned: true,
    safety_document_verified: true,
  }),
  s4: mkChecklist('s4', {
    company_identified: true,
    tutor_identified: true,
    address_verified: true,
    schedule_filled: true,
    activities_filled: true,
    skills_targeted: true,
    referent_assigned: true,
  }),
  s12: mkChecklist('s12', {
    company_identified: true,
    tutor_identified: true,
    address_verified: true,
    referent_assigned: true,
  }),
}
