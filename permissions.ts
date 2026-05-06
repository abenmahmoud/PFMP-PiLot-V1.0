/**
 * Permissions — duplication CÔTÉ CLIENT des règles RLS Postgres.
 *
 * IMPORTANT — POURQUOI ON DUPLIQUE :
 *
 *   La sécurité réelle vit dans Postgres (RLS). Toute requête vers Supabase
 *   est filtrée par les policies, peu importe ce qu'on fait côté client.
 *
 *   Mais pour l'UX, on a besoin de savoir AVANT d'envoyer la requête si
 *   l'action sera autorisée — pour griser un bouton, cacher un menu, ou
 *   afficher un message d'accès refusé. Ces fonctions servent UNIQUEMENT
 *   à ça.
 *
 *   Si une fonction ici dit "true" alors que la RLS dit "false", le pire
 *   qui arrive c'est que l'utilisateur clique sur un bouton et reçoive une
 *   erreur. La donnée n'est jamais exposée.
 *
 *   À l'inverse, si la RLS dit "true" mais qu'on dit "false" ici, on prive
 *   l'utilisateur d'une fonctionnalité légitime — c'est un bug d'UX, pas
 *   de sécurité.
 *
 *   En cas de divergence, la RLS est la source de vérité. Mettre à jour
 *   ces fonctions pour matcher.
 */

import type { UserRole } from './database.types'

export interface SessionContext {
  /** ID de l'utilisateur connecté (auth.uid()) */
  userId: string | null
  /** Rôle de l'utilisateur */
  role: UserRole | null
  /** Établissement de rattachement (null pour superadmin ou non-connecté) */
  establishmentId: string | null
  /** IDs des élèves dont l'utilisateur est référent (chargés via teacher_assignments) */
  referentStudentIds?: string[]
}

// ----------------------------------------------------------------------------
// Helpers de rôle
// ----------------------------------------------------------------------------

export function isAuthenticated(s: SessionContext): boolean {
  return Boolean(s.userId && s.role)
}

export function isSuperadmin(s: SessionContext): boolean {
  return s.role === 'superadmin'
}

export function isEstablishmentAdmin(s: SessionContext): boolean {
  return s.role === 'admin' || s.role === 'ddfpt'
}

export function canReadAllStudents(s: SessionContext): boolean {
  return (
    s.role === 'superadmin' ||
    s.role === 'admin' ||
    s.role === 'ddfpt' ||
    s.role === 'principal'
  )
}

export function isReferentOf(s: SessionContext, studentId: string): boolean {
  if (s.role !== 'referent') return false
  return Boolean(s.referentStudentIds?.includes(studentId))
}

// ----------------------------------------------------------------------------
// Permissions par entité — répliquent les policies RLS de 0001_init.sql
// ----------------------------------------------------------------------------

/** Peut-il voir cet élève ? */
export function canReadStudent(
  s: SessionContext,
  student: { establishmentId: string; id: string },
): boolean {
  if (isSuperadmin(s)) return true
  if (s.establishmentId !== student.establishmentId) return false
  return canReadAllStudents(s) || isReferentOf(s, student.id)
}

/** Peut-il créer/modifier des élèves ? (pas de modification student-par-student
 *  dans la RLS — qui peut écrire dans students peut tout écrire) */
export function canWriteStudents(s: SessionContext): boolean {
  return isSuperadmin(s) || isEstablishmentAdmin(s)
}

/** Peut-il voir cette visite ? */
export function canReadVisit(
  s: SessionContext,
  visit: { establishmentId: string; studentId: string },
): boolean {
  if (isSuperadmin(s)) return true
  if (s.establishmentId !== visit.establishmentId) return false
  return canReadAllStudents(s) || isReferentOf(s, visit.studentId)
}

/** Peut-il créer une visite pour cet élève ? */
export function canCreateVisitFor(
  s: SessionContext,
  studentId: string,
  studentEstablishmentId: string,
): boolean {
  if (isSuperadmin(s)) return true
  if (isEstablishmentAdmin(s) && s.establishmentId === studentEstablishmentId) return true
  if (s.role === 'referent' && isReferentOf(s, studentId)) return true
  return false
}

/** Peut-il modifier cette visite (status draft uniquement pour le référent) */
export function canEditVisit(
  s: SessionContext,
  visit: { establishmentId: string; studentId: string; status: string },
): boolean {
  if (isSuperadmin(s)) return true
  if (isEstablishmentAdmin(s) && s.establishmentId === visit.establishmentId) return true
  if (
    s.role === 'referent' &&
    isReferentOf(s, visit.studentId) &&
    visit.status === 'draft'
  ) {
    return true
  }
  return false
}

/** Peut-il créer / modifier une entreprise ? */
export function canWriteCompanies(s: SessionContext): boolean {
  return isSuperadmin(s) || isEstablishmentAdmin(s)
}

/** Peut-il créer / modifier des documents ? */
export function canWriteDocuments(s: SessionContext): boolean {
  return isSuperadmin(s) || isEstablishmentAdmin(s)
}

/** Peut-il supprimer une entité ? (en RLS, seul le superadmin peut delete) */
export function canDelete(s: SessionContext): boolean {
  return isSuperadmin(s)
}

/** Peut-il accéder aux réglages de l'établissement ? */
export function canAccessSettings(s: SessionContext): boolean {
  return isSuperadmin(s) || isEstablishmentAdmin(s)
}

/** Peut-il accéder à la console superadmin ? */
export function canAccessSuperadmin(s: SessionContext): boolean {
  return isSuperadmin(s)
}

// ----------------------------------------------------------------------------
// Helpers de redirection home (utilisé par routes/index.tsx)
// ----------------------------------------------------------------------------

export function getHomePathForRole(role: UserRole | null): string {
  switch (role) {
    case 'superadmin':
      return '/superadmin'
    case 'referent':
    case 'principal':
      return '/my-students'
    case 'admin':
    case 'ddfpt':
      return '/dashboard'
    case 'tuteur':
    case 'eleve':
      return '/my-account' // page future
    default:
      return '/login'
  }
}
