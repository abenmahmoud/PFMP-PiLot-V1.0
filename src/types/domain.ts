export type UUID = string
export type ISODate = string

export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'ddfpt'
  | 'principal'
  | 'referent'
  | 'tuteur'
  | 'eleve'

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Superadmin SaaS',
  admin: 'Admin établissement',
  ddfpt: 'DDFPT / Chef de travaux',
  principal: 'Professeur principal',
  referent: 'Professeur référent',
  tuteur: 'Tuteur entreprise',
  eleve: 'Élève',
}

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
  | 'no_stage'
  | 'found'
  | 'pending_convention'
  | 'signed_convention'
  | 'in_progress'
  | 'completed'
  | 'interrupted'

export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  no_stage: 'Pas de stage',
  found: 'Stage trouvé',
  pending_convention: 'Convention en attente',
  signed_convention: 'Convention signée',
  in_progress: 'En stage',
  completed: 'Terminé',
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

export type PeriodStatus = 'preparation' | 'in_progress' | 'completed' | 'archived'

export const PERIOD_STATUS_LABELS: Record<PeriodStatus, string> = {
  preparation: 'En préparation',
  in_progress: 'En cours',
  completed: 'Terminée',
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
  | 'document_unsigned_convention'
  | 'document_missing_pedagogical_annex'
  | 'document_missing_company_stamp'
  | 'document_missing_tutor'
  | 'document_predeparture_incomplete'
  | 'document_postpfmp_incomplete'

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

// ---------------------------------------------------------------------------
// Documents & signatures PFMP — préparation frontend
// ---------------------------------------------------------------------------
//
// Important : la signature simple par lien sécurisé ainsi que les cachets
// scannés transmis par les entreprises ne constituent PAS une signature
// électronique avancée ou qualifiée. Une intégration ultérieure avec un
// prestataire conforme eIDAS sera nécessaire pour les signatures juridiquement
// renforcées (DocuSign, Yousign, Universign…). Ces types préparent la
// traçabilité documentaire mais n'apportent aucune garantie eIDAS à ce stade.

/**
 * Statut détaillé d'un document dans son cycle de vie. Plus riche que le
 * `Document.status` existant — celui-ci reste pour la compat. À terme, fusionner.
 */
export type DocumentWorkflowStatus =
  | 'template_to_configure'
  | 'draft'
  | 'sent'
  | 'awaiting_signature'
  | 'partially_signed'
  | 'fully_signed'
  | 'refused'
  | 'expired'
  | 'archived'
  | 'to_correct'

export const DOCUMENT_WORKFLOW_STATUS_LABELS: Record<DocumentWorkflowStatus, string> = {
  template_to_configure: 'Modèle à paramétrer',
  draft: 'Brouillon',
  sent: 'Envoyé',
  awaiting_signature: 'En attente de signature',
  partially_signed: 'Signé partiellement',
  fully_signed: 'Signé complet',
  refused: 'Refusé',
  expired: 'Expiré',
  archived: 'Archivé',
  to_correct: 'À corriger',
}

/**
 * Méthode de signature ou de validation. Aucune de ces méthodes (hors la
 * future intégration eIDAS) ne constitue une signature électronique qualifiée.
 */
export type SignatureMethod =
  | 'internal_validation'
  | 'simple_link'
  | 'handwritten_scanned'
  | 'company_stamp'
  | 'eidas_provider_planned'

export const SIGNATURE_METHOD_LABELS: Record<SignatureMethod, string> = {
  internal_validation: 'Validation interne',
  simple_link: 'Signature simple par lien sécurisé',
  handwritten_scanned: 'Signature manuscrite scannée',
  company_stamp: 'Cachet fourni par l\'entreprise',
  eidas_provider_planned: 'Prestataire eIDAS (futur)',
}

export type SignatureStatus =
  | 'pending'
  | 'sent'
  | 'signed'
  | 'refused'
  | 'expired'

export const SIGNATURE_STATUS_LABELS: Record<SignatureStatus, string> = {
  pending: 'À envoyer',
  sent: 'Envoyée — en attente',
  signed: 'Signée',
  refused: 'Refusée',
  expired: 'Expirée',
}

export type SignatoryRole =
  | 'establishment_head'
  | 'company'
  | 'tutor'
  | 'referent_teacher'
  | 'student_or_legal_guardian'

export const SIGNATORY_ROLE_LABELS: Record<SignatoryRole, string> = {
  establishment_head: 'Chef d\'établissement',
  company: 'Entreprise',
  tutor: 'Tuteur entreprise',
  referent_teacher: 'Professeur référent',
  student_or_legal_guardian: 'Élève / représentant légal',
}

/**
 * Catégorie fonctionnelle plus fine que `DocumentType` historique. Utilisée
 * pour le pilotage par tableau de bord.
 */
export type DocumentCategory =
  | 'convention'
  | 'pedagogical_annex'
  | 'financial_annex'
  | 'attestation'
  | 'tracking_booklet'
  | 'visit_sheet'
  | 'tutor_evaluation'
  | 'safety_document'
  | 'other'

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  convention: 'Convention PFMP',
  pedagogical_annex: 'Annexe pédagogique',
  financial_annex: 'Annexe financière',
  attestation: 'Attestation de stage',
  tracking_booklet: 'Livret de suivi',
  visit_sheet: 'Fiche visite professeur',
  tutor_evaluation: 'Fiche évaluation tuteur',
  safety_document: 'Document sécurité',
  other: 'Autre',
}

/**
 * Modèle de document configurable par établissement. La version Supabase
 * stockera le contenu en Storage ; ici on ne garde que les métadonnées.
 */
export interface DocumentTemplate {
  id: UUID
  establishmentId: UUID
  name: string
  category: DocumentCategory
  /** Famille de métiers compatible — null = toutes */
  professionalFamily?: ProfessionalFamily | null
  /** Formations compatibles (libellés courts), [] = toutes */
  compatibleFormations: string[]
  version: string
  active: boolean
  /** Rôles attendus pour signer un document généré depuis ce modèle */
  expectedSignatories: SignatoryRole[]
  /** Méthode de signature prévue par défaut */
  defaultSignatureMethod: SignatureMethod
  updatedAt: ISODate
  updatedBy?: UUID
  notes?: string
}

/**
 * Document concret généré pour un élève / une période. Pendant la phase démo,
 * ce type cohabite avec `Document` historique. À terme, fusionner.
 */
export interface GeneratedDocument {
  id: UUID
  establishmentId: UUID
  templateId?: UUID
  category: DocumentCategory
  name: string
  studentId?: UUID
  periodId?: UUID
  companyId?: UUID
  tutorId?: UUID
  workflowStatus: DocumentWorkflowStatus
  /** Échéance pour la signature complète ou la remise du document */
  dueDate?: ISODate
  /** Date de création du document concret (PDF généré) */
  createdAt: ISODate
  /** Auteur qui a généré ou téléversé le document */
  authorId?: UUID
  /** Signatures attendues sur ce document */
  signatures: DocumentSignature[]
  /** Cachet entreprise fourni séparément (ex. scan reçu par mail) */
  companyStampProvided?: boolean
  /** Fichiers de preuve associés (originaux, scans, hashs simulés) */
  proofFiles?: ProofFile[]
  /** Notes internes équipe pédagogique */
  internalNotes?: string
}

export interface DocumentSignature {
  id: UUID
  documentId: UUID
  /** Rôle attendu — l'identité concrète peut être inconnue tant que pas envoyée */
  signatoryRole: SignatoryRole
  /** Identité du signataire (si connue) — libellé libre pour la démo */
  signatoryName?: string
  signatoryEmail?: string
  method: SignatureMethod
  status: SignatureStatus
  sentAt?: ISODate
  signedAt?: ISODate
  expiresAt?: ISODate
  /** Hash simulé pour la traçabilité (mock — pas de cryptographie réelle) */
  proofHash?: string
}

/**
 * Fichier de preuve associé à un document — original, PDF généré, scan de
 * cachet, capture d'audit log. Pendant la démo, on stocke seulement des méta.
 */
export interface ProofFile {
  id: UUID
  documentId: UUID
  kind: 'original' | 'generated_pdf' | 'company_stamp_scan' | 'audit_log' | 'other'
  filename: string
  /** Hash simulé — pas de garantie cryptographique en démo */
  hash?: string
  uploadedAt: ISODate
  uploadedBy?: UUID
  sizeKb?: number
  mimeType?: string
}

/**
 * Exigence documentaire (modèle requis) pour un placement / une PFMP. Permet
 * de calculer l'état "dossier complet ou non" avant et après PFMP.
 */
export interface DocumentRequirement {
  id: UUID
  establishmentId: UUID
  category: DocumentCategory
  /** Phase à laquelle le document est attendu */
  phase: 'before_pfmp' | 'during_pfmp' | 'after_pfmp'
  /** Bloquant pour le départ ? */
  blocking: boolean
  description: string
}

/**
 * Élément de la checklist "Avant départ PFMP" — instancié par placement.
 */
export interface PreDepartureChecklistItem {
  id: UUID
  placementId?: UUID
  studentId?: UUID
  key:
    | 'convention_signed'
    | 'company_identified'
    | 'tutor_identified'
    | 'address_verified'
    | 'schedule_filled'
    | 'activities_filled'
    | 'skills_targeted'
    | 'referent_assigned'
    | 'first_contact_planned'
    | 'safety_document_verified'
  label: string
  done: boolean
  required: boolean
  /** Information optionnelle — par ex. "non requis pour cette formation" */
  note?: string
}

export const PRE_DEPARTURE_CHECKLIST_LABELS: Record<
  PreDepartureChecklistItem['key'],
  string
> = {
  convention_signed: 'Convention signée',
  company_identified: 'Entreprise identifiée',
  tutor_identified: 'Tuteur identifié',
  address_verified: 'Adresse vérifiée',
  schedule_filled: 'Horaires renseignés',
  activities_filled: 'Activités prévues renseignées',
  skills_targeted: 'Compétences visées renseignées',
  referent_assigned: 'Professeur référent affecté',
  first_contact_planned: 'Premier contact planifié',
  safety_document_verified: 'Document sécurité vérifié si nécessaire',
}
