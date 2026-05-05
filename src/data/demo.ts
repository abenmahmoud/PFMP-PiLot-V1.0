import type {
  Alert,
  Class,
  Company,
  CompanyIntelligenceSummary,
  Document,
  Establishment,
  PfmpPeriod,
  Placement,
  Profile,
  ProfessionalFamily,
  Student,
  Teacher,
  Tutor,
  Visit,
  ActivityLogEntry,
} from '@/types'

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
