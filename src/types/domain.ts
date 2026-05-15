export type UUID = string
export type ISODate = string

import type { UserRole as DatabaseUserRole } from '@/lib/database.types'

export type UserRole = DatabaseUserRole

export interface Establishment {
  id: UUID
  name: string
  city: string
  uai?: string
  active: boolean
  studentCount: number
  userCount: number
  lastConnectionAt?: ISODate
  activityScore: number // 0..100
  createdAt: ISODate
  // Réseau entreprises — stats agrégées (mockées en attendant Supabase)
  companyCount?: number
  companyCompletionRate?: number // 0..100, % de fiches entreprises complètes
  strongPartnerCount?: number
}

export interface Profile {
  id: UUID
  establishmentId: UUID | null
  firstName: string
  lastName: string
  email: string
  role: UserRole
  avatarColor?: string
}

export interface Class {
  id: UUID
  establishmentId: UUID
  name: string
  level: 'CAP' | 'Bac Pro' | 'BTS'
  formation: string
  year: string
  studentCount: number
  principalId?: UUID
}

export type StageStatus =
  | 'draft'
  | 'confirmed'
  | 'no_stage'
  | 'found'
  | 'pending_convention'
  | 'signed_convention'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'interrupted'

export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  draft: 'Brouillon',
  confirmed: 'Valide DDFPT',
  no_stage: 'Recherche stage',
  found: 'Entreprise proposee',
  pending_convention: 'Convention a signer',
  signed_convention: 'Convention signée',
  in_progress: 'En stage',
  completed: 'Terminé',
  cancelled: 'Annulé',
  interrupted: 'Interrompu',
}

export interface Student {
  id: UUID
  establishmentId: UUID
  classId: UUID
  firstName: string
  lastName: string
  email?: string
  phone?: string
  formation: string
  stageStatus: StageStatus
  referentId?: UUID
  companyId?: UUID
  tutorId?: UUID
  periodId?: UUID
  notes?: string
}

export interface Teacher {
  id: UUID
  establishmentId: UUID
  firstName: string
  lastName: string
  email: string
  phone?: string
  classes: UUID[]
  studentLoad: number
}

// ---------------------------------------------------------------------------
// Entreprises et tuteurs
// ---------------------------------------------------------------------------

export type CompanyReliability = 'high' | 'medium' | 'low' | 'unknown'

export const COMPANY_RELIABILITY_LABELS: Record<CompanyReliability, string> = {
  high: 'Fiable',
  medium: 'Standard',
  low: 'À surveiller',
  unknown: 'Non évaluée',
}

export type CompanyStatus =
  | 'active'
  | 'strong_partner'
  | 'to_recontact'
  | 'to_watch'
  | 'to_avoid'

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  active: 'Active',
  strong_partner: 'Partenaire fort',
  to_recontact: 'À relancer',
  to_watch: 'À surveiller',
  to_avoid: 'À éviter',
}

/**
 * Famille de métiers — regroupement large utilisé pour piloter la couverture
 * d'un établissement. Aligné sur les familles de métiers Bac Pro / CAP.
 */
export type ProfessionalFamily =
  | 'automobile'
  | 'commerce_vente'
  | 'gestion_administration'
  | 'artisanat_art'
  | 'hotellerie_restauration'
  | 'sante_social'
  | 'numerique'
  | 'industrie'
  | 'btp'
  | 'transport_logistique'
  | 'service_public'
  | 'autre'

export const PROFESSIONAL_FAMILY_LABELS: Record<ProfessionalFamily, string> = {
  automobile: 'Automobile et mobilité',
  commerce_vente: 'Commerce et vente',
  gestion_administration: 'Gestion et administration',
  artisanat_art: 'Artisanat et métiers d\'art',
  hotellerie_restauration: 'Hôtellerie - restauration',
  sante_social: 'Santé et social',
  numerique: 'Numérique',
  industrie: 'Industrie',
  btp: 'Bâtiment et travaux publics',
  transport_logistique: 'Transport et logistique',
  service_public: 'Service public',
  autre: 'Autre',
}

export type TutorResponsiveness = 'fast' | 'medium' | 'slow' | 'unknown'

export const TUTOR_RESPONSIVENESS_LABELS: Record<TutorResponsiveness, string> = {
  fast: 'Très réactif',
  medium: 'Réactif',
  slow: 'Peu réactif',
  unknown: 'Non évalué',
}

export interface Company {
  id: UUID
  establishmentId: UUID
  name: string
  address: string
  city: string
  zipCode: string
  phone?: string
  email?: string
  website?: string
  /** SIRET (14 chiffres) — optionnel, à renseigner par l'établissement */
  siret?: string
  /** SIREN (9 chiffres) — optionnel */
  siren?: string
  /** Secteur libellé libre (ex. : « Automobile », « Grande distribution ») */
  sector: string
  /** Famille de métiers normalisée pour pilotage et matching */
  professionalFamily: ProfessionalFamily
  /** Formations compatibles (libellés courts, ex. « Bac Pro Commerce ») */
  compatibleFormations: string[]
  /** Nombre cumulé d'élèves accueillis depuis l'ouverture de la fiche */
  studentsHosted: number
  /** Date de la dernière période où l'entreprise a accueilli un élève */
  lastHostedAt?: ISODate
  reliability: CompanyReliability
  status: CompanyStatus
  internalNotes?: string
  /** Historique synthétique (3-5 lignes max) saisi par l'établissement */
  history?: string[]
}

export interface Tutor {
  id: UUID
  establishmentId: UUID
  firstName: string
  lastName: string
  function: string
  email?: string
  phone?: string
  companyId: UUID
  responsiveness?: TutorResponsiveness
  internalNotes?: string
}

/**
 * Synthèse "intelligence réseau entreprises" — agrégat exploité par le superadmin
 * et le DDFPT pour visualiser la santé d'une base entreprises.
 */
export interface CompanyIntelligenceSummary {
  totalCompanies: number
  activeCompanies: number
  strongPartners: number
  toRecontact: number
  toWatch: number
  toAvoid: number
  tutorsCount: number
  tutorsWithEmail: number
  averageCompletionRate: number // 0..100
  topSectors: Array<{ sector: string; count: number }>
  topFamilies: Array<{ family: ProfessionalFamily; count: number }>
}

export type PeriodStatus =
  | 'draft'
  | 'published'
  | 'preparation'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'archived'

export const PERIOD_STATUS_LABELS: Record<PeriodStatus, string> = {
  draft: 'Brouillon',
  published: 'Publiée',
  preparation: 'En préparation',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
  archived: 'Archivée',
}

export interface PfmpPeriod {
  id: UUID
  establishmentId: UUID
  name: string
  schoolYear: string
  classIds: UUID[]
  startDate: ISODate
  endDate: ISODate
  status: PeriodStatus
  studentCount: number
  assignmentRate: number
  visitRate: number
  missingDocuments: number
}

export type ContactType = 'visit' | 'call' | 'video' | 'email'
export type AlertLevel = 'none' | 'vigilance' | 'problem' | 'urgent'
export type VisitStatus = 'draft' | 'validated' | 'archived'

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  visit: 'Visite sur site',
  call: 'Appel téléphonique',
  video: 'Visioconférence',
  email: 'Email',
}

export const ALERT_LEVEL_LABELS: Record<AlertLevel, string> = {
  none: 'Aucune',
  vigilance: 'Vigilance',
  problem: 'Problème à traiter',
  urgent: 'Urgence',
}

export interface Visit {
  id: UUID
  establishmentId: UUID
  studentId: UUID
  teacherId: UUID
  periodId: UUID
  date: ISODate
  contactType: ContactType
  studentPresent: boolean
  tutorMet: boolean
  conditions?: string
  activities?: string
  professionalPosture?: string
  positives?: string
  difficulties?: string
  tutorRemark?: string
  teacherRemark?: string
  alertLevel: AlertLevel
  nextAction?: string
  status: VisitStatus
}

export type DocumentType =
  | 'convention'
  | 'attestation'
  | 'visit_report'
  | 'evaluation'
  | 'other'

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  convention: 'Convention',
  attestation: 'Attestation',
  visit_report: 'Compte rendu',
  evaluation: 'Fiche évaluation',
  other: 'Autre',
}

export interface Document {
  id: UUID
  establishmentId: UUID
  type: DocumentType
  studentId?: UUID
  periodId?: UUID
  companyId?: UUID
  name: string
  date: ISODate
  status: 'missing' | 'draft' | 'validated' | 'archived'
  authorId?: UUID
}

export type AlertType =
  | 'student_no_stage'
  | 'missing_convention'
  | 'visit_late'
  | 'missing_attestation'
  | 'teacher_overload'
  | 'stage_interrupted'
  | 'company_watch'
  | 'low_activity_establishment'

export interface Alert {
  id: UUID
  establishmentId: UUID
  type: AlertType
  severity: AlertLevel
  message: string
  relatedEntity: { type: string; id: UUID; label: string }
  createdAt: ISODate
  resolved: boolean
}

export interface Placement {
  id: UUID
  establishmentId: UUID
  studentId: UUID
  companyId: UUID
  tutorId: UUID
  periodId: UUID
  referentId?: UUID
  startDate: ISODate
  endDate: ISODate
  status: StageStatus
}

export interface ActivityLogEntry {
  id: UUID
  establishmentId: UUID
  userId: UUID
  action:
    | 'login'
    | 'import'
    | 'student_create'
    | 'assignment_update'
    | 'visit_create'
    | 'report_validate'
    | 'ai_generate'
    | 'export'
    | 'archive'
    | 'role_change'
  description: string
  createdAt: ISODate
}
