/**
 * Types de la base Supabase.
 *
 * Ce fichier devra être régénéré automatiquement avec :
 *
 *   supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 *
 * dès que le projet Supabase sera créé. En attendant, on définit un schéma
 * minimal qui couvre les tables manipulées par le frontend.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'ddfpt'
  | 'principal'
  | 'referent'
  | 'tuteur'
  | 'eleve'

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

export type PeriodStatus =
  | 'draft'
  | 'published'
  | 'preparation'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'archived'
export type VisitStatus =
  | 'draft'
  | 'validated'
  | 'archived'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
export type VisitType = 'mi_parcours' | 'fin_stage' | 'urgence' | 'autre'
export type VisitEvaluationLevel = 'non_evalue' | 'A' | 'B' | 'C' | 'NE'
export type VisitEvaluationRole = 'referent' | 'tutor' | 'student'
export type ContactType = 'visit' | 'call' | 'video' | 'email'
export type AlertLevel = 'none' | 'vigilance' | 'problem' | 'urgent'
export type DocumentStatusEnum = 'missing' | 'draft' | 'validated' | 'archived'
export type EstablishmentStatus = 'active' | 'trial' | 'suspended' | 'archived'
export type StudentAccessCodeStatus = 'active' | 'revoked' | 'expired'
export type SignatureWorkflowStatus = 'not_required' | 'pending_signatures' | 'partial_signed' | 'fully_signed'
export type SignatureStatus = 'pending' | 'sent' | 'viewed' | 'signed' | 'refused' | 'expired' | 'cancelled'
export type SignerRole = 'student' | 'parent' | 'tutor' | 'employer' | 'school' | 'referent' | 'principal' | 'ddfpt' | 'admin'
export type SignatureMethod = 'click_to_sign' | 'draw_signature' | 'sms_otp'
export type TokenStatus = 'active' | 'used' | 'revoked' | 'expired'
export type SalesLeadStatus = 'new' | 'qualified' | 'demo_scheduled' | 'proposal_sent' | 'won' | 'lost' | 'archived'
export type SalesLeadOrganizationType = 'lycee' | 'groupe_scolaire' | 'rectorat' | 'collectivite' | 'autre'

// ----------------------------------------------------------------------------
// Row types — extraits dans des interfaces nommées pour éviter
// l'auto-référence circulaire qui fait résoudre Row en `never`.
// ----------------------------------------------------------------------------

export interface EstablishmentRow {
  id: string
  name: string
  city: string | null
  uai: string | null
  slug: string
  subdomain: string | null
  custom_domain: string | null
  domain_verified: boolean
  primary_color: string | null
  status: EstablishmentStatus
  active: boolean
  created_at: string
  updated_at: string
}

export interface ProfileRow {
  id: string
  establishment_id: string | null
  first_name: string
  last_name: string
  email: string
  role: UserRole
  avatar_color: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface ClassRow {
  id: string
  establishment_id: string
  name: string
  level: string
  formation: string
  school_year: string
  principal_id: string | null
  created_at: string
  updated_at: string
}

export interface StudentRow {
  id: string
  establishment_id: string
  class_id: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  formation: string | null
  notes: string | null
  referent_id: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface StudentAccessCodeRow {
  id: string
  establishment_id: string
  student_id: string
  code_hash: string
  code_hint: string
  status: StudentAccessCodeStatus
  expires_at: string | null
  last_used_at: string | null
  created_by: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
}

export interface TeacherRow {
  id: string
  establishment_id: string
  profile_id: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  discipline: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface CompanyRow {
  id: string
  establishment_id: string
  name: string
  address: string | null
  city: string | null
  zip_code: string | null
  phone: string | null
  email: string | null
  website: string | null
  siret: string | null
  siren: string | null
  sector: string | null
  professional_family: string | null
  compatible_formations: string[]
  students_hosted: number
  last_hosted_at: string | null
  reliability: string
  status: string
  internal_notes: string | null
  history: string[] | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface TutorRow {
  id: string
  establishment_id: string
  company_id: string
  first_name: string
  last_name: string
  function: string | null
  email: string | null
  phone: string | null
  responsiveness: string | null
  internal_notes: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface SalesLeadRow {
  id: string
  contact_name: string
  email: string
  phone: string | null
  organization_name: string
  role_label: string | null
  organization_type: SalesLeadOrganizationType
  city: string | null
  establishments_count: number | null
  students_count: number | null
  message: string | null
  needs_demo: boolean
  status: SalesLeadStatus
  source: string
  created_at: string
  updated_at: string
}

export interface PfmpPeriodRow {
  id: string
  establishment_id: string
  class_id: string | null
  name: string
  type: string
  school_year: string
  start_date: string
  end_date: string
  status: PeriodStatus
  notes: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface PlacementRow {
  id: string
  establishment_id: string
  student_id: string
  period_id: string
  company_id: string | null
  tutor_id: string | null
  referent_id: string | null
  start_date: string | null
  end_date: string | null
  status: StageStatus
  notes: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface TeacherAssignmentRow {
  id: string
  establishment_id: string
  teacher_id: string
  student_id: string
  period_id: string | null
  created_at: string
}

export interface VisitRow {
  id: string
  establishment_id: string
  student_id: string
  teacher_id: string | null
  period_id: string | null
  placement_id: string | null
  referent_id: string | null
  type: VisitType
  date: string
  scheduled_at: string | null
  done_at: string | null
  duration_minutes: number | null
  location_lat: number | null
  location_lng: number | null
  summary: string | null
  full_report: string | null
  voice_transcript: string | null
  student_satisfaction: number | null
  tutor_satisfaction: number | null
  flagged_for_review: boolean
  flag_reason: string | null
  photos: VisitPhoto[]
  contact_type: ContactType
  student_present: boolean | null
  tutor_met: boolean | null
  conditions: string | null
  activities: string | null
  professional_posture: string | null
  positives: string | null
  difficulties: string | null
  tutor_remark: string | null
  teacher_remark: string | null
  alert_level: AlertLevel
  next_action: string | null
  status: VisitStatus
  validated_by: string | null
  validated_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface VisitPhoto {
  url: string | null
  offline_id?: string | null
  lat: number | null
  lng: number | null
  taken_at: string
  caption?: string | null
}

export interface VisitEvaluationRow {
  id: string
  visit_id: string
  competence_code: string
  competence_label: string
  level: VisitEvaluationLevel
  notes: string | null
  evaluated_by_role: VisitEvaluationRole
  created_at: string
}

export interface VisitReportRow {
  id: string
  visit_id: string
  body: string
  generated_by_ai: boolean
  created_at: string
}

export interface DocumentRow {
  id: string
  establishment_id: string
  type: string
  student_id: string | null
  period_id: string | null
  company_id: string | null
  placement_id: string | null
  template_id: string | null
  name: string
  storage_path: string | null
  status: DocumentStatusEnum
  author_id: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface GeneratedDocumentRow {
  id: string
  establishment_id: string
  document_id: string
  template_id: string | null
  version: number
  storage_path: string
  file_size_bytes: number | null
  mime_type: string | null
  sha256_hex: string | null
  generated_by: string | null
  generated_at: string
  rendered_with: Json | null
  signature_status: SignatureWorkflowStatus
  required_signers: Json
  final_signed_pdf_url: string | null
  final_signed_sha256_hex: string | null
  signature_proof: Json
}

export interface DocumentSignatureRow {
  id: string
  establishment_id: string
  document_id: string
  generated_document_id: string | null
  signer_email: string
  signer_name: string | null
  signer_role: SignerRole
  signer_user_id: string | null
  signer_tutor_id: string | null
  signer_student_id: string | null
  signer_phone: string | null
  status: SignatureStatus
  sent_at: string | null
  viewed_at: string | null
  signed_at: string | null
  refused_at: string | null
  refusal_reason: string | null
  signature_data: string | null
  signature_method: SignatureMethod | null
  signature_image_url: string | null
  signed_document_sha256: string | null
  document_hash: string | null
  ip_address: string | null
  user_agent: string | null
  signed_from_ip: string | null
  signed_from_user_agent: string | null
  geolocation: Json | null
  magic_link_token_hash: string | null
  magic_link_expires_at: string | null
  magic_link_used_at: string | null
  otp_code_hash: string | null
  otp_verified_at: string | null
  signing_order: number
  created_at: string
  updated_at: string
}

export interface TutorAccessTokenRow {
  id: string
  establishment_id: string
  tutor_id: string
  placement_id: string | null
  document_signature_id: string | null
  token_hash: string
  scope: string
  expires_at: string
  used_at: string | null
  used_count: number
  max_uses: number
  status: TokenStatus
  created_at: string
}

export interface SignatureRequestEmailRow {
  id: string
  establishment_id: string
  document_id: string
  signature_id: string | null
  signer_email: string
  signer_role: string
  token_hash: string
  sent_at: string
  delivered_at: string | null
  opened_at: string | null
  reminder_count: number
  last_reminder_at: string | null
}

export interface AlertRow {
  id: string
  establishment_id: string
  type: string
  severity: AlertLevel
  message: string
  related_entity_type: string | null
  related_entity_id: string | null
  resolved: boolean
  created_at: string
}

export interface AuditLogRow {
  id: string
  establishment_id: string | null
  user_id: string | null
  action: string
  description: string | null
  metadata: Json | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface EstablishmentSettingsRow {
  establishment_id: string
  school_year: string | null
  teacher_load_threshold: number | null
  ai_enabled: boolean | null
  rgpd_notice: string | null
  logo_url: string | null
  updated_at: string
}


// ----------------------------------------------------------------------------
// Database global type — VOLONTAIREMENT non exporté pour l'instant.
//
// Pourquoi : @supabase/supabase-js v2.105 attend un GenericSchema complexe
// (Insert/Update/Relationships/__InternalSupabase…) qui est instable et
// fragile à fabriquer à la main. La bonne approche est de générer ce type
// automatiquement via la CLI Supabase une fois le projet créé :
//
//   supabase gen types typescript --project-id <id> > src/lib/database.types.ts
//
// En attendant, le code applicatif utilise les Row types nommés ci-dessus
// (StudentRow, VisitRow, etc.) et le client Supabase reste non paramétré.
// Cette stratégie évite des dizaines d'heures de plumbing typé qui sera
// jeté lors de la première vraie génération.
// ----------------------------------------------------------------------------
