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
  | 'no_stage'
  | 'found'
  | 'pending_convention'
  | 'signed_convention'
  | 'in_progress'
  | 'completed'
  | 'interrupted'

export type PeriodStatus = 'preparation' | 'in_progress' | 'completed' | 'archived'
export type VisitStatus = 'draft' | 'validated' | 'archived'
export type ContactType = 'visit' | 'call' | 'video' | 'email'
export type AlertLevel = 'none' | 'vigilance' | 'problem' | 'urgent'
export type DocumentStatusEnum = 'missing' | 'draft' | 'validated' | 'archived'
export type EstablishmentStatus = 'active' | 'trial' | 'suspended' | 'archived'

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
  archived_at: string | null
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

export interface PfmpPeriodRow {
  id: string
  establishment_id: string
  name: string
  school_year: string
  start_date: string
  end_date: string
  status: PeriodStatus
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
  date: string
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
  created_at: string
  updated_at: string
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
