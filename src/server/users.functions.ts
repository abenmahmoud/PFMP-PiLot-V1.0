import { createServerFn } from '@tanstack/react-start'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { EstablishmentRow, Json, ProfileRow, UserRole } from '@/lib/database.types'

declare const process: {
  env: Record<string, string | undefined>
}

export type UserStatusFilter = 'all' | 'confirmed' | 'pending' | 'archived'

export interface UserRowEnriched extends ProfileRow {
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  establishment_name: string | null
  establishment_slug: string | null
}

export interface ListUsersForTenantInput {
  accessToken: string
  establishmentId: string
  status?: UserStatusFilter
}

export interface ListAllUsersInput {
  accessToken: string
  filters?: {
    role?: UserRole | 'all'
    establishmentId?: string | 'all'
    status?: UserStatusFilter
  }
}

export interface UserActionInput {
  accessToken: string
  userId: string
}

export interface UpdateUserEmailInput extends UserActionInput {
  newEmail: string
}

export interface ChangeUserRoleInput extends UserActionInput {
  newRole: UserRole
}

export interface ChangeUserEstablishmentInput extends UserActionInput {
  newEstablishmentId: string | null
}

export interface HardDeleteUserInput extends UserActionInput {
  confirmEmail: string
}

interface CallerProfile extends ProfileRow {}

interface AuthUserSnapshot {
  id: string
  email: string | null
  email_confirmed_at: string | null
  last_sign_in_at: string | null
}

interface UserTarget {
  profile: ProfileRow
  authUser: AuthUserSnapshot | null
}

type AdminClient = SupabaseClient

const TENANT_ADMIN_ROLES: UserRole[] = ['admin']
const READ_TENANT_ROLES: UserRole[] = ['admin', 'ddfpt']
const PROTECTED_ADMIN_ROLES: UserRole[] = ['superadmin', 'admin']
const ROLE_VALUES: UserRole[] = [
  'superadmin',
  'admin',
  'ddfpt',
  'principal',
  'referent',
  'tuteur',
  'eleve',
]

export const listUsersForTenant = createServerFn({ method: 'POST' })
  .inputValidator(validateListUsersForTenantInput)
  .handler(async ({ data }): Promise<UserRowEnriched[]> => {
    const adminClient = createAdminClient()
    const caller = await getCallerProfile(adminClient, data.accessToken)
    assertTenantReadPermission(caller, data.establishmentId)

    const profiles = await fetchProfiles(adminClient, {
      establishmentId: data.establishmentId,
    })
    return enrichAndFilterUsers(adminClient, profiles, data.status ?? 'all')
  })

export const listAllUsers = createServerFn({ method: 'POST' })
  .inputValidator(validateListAllUsersInput)
  .handler(async ({ data }): Promise<UserRowEnriched[]> => {
    const adminClient = createAdminClient()
    const caller = await getCallerProfile(adminClient, data.accessToken)
    assertSuperadmin(caller)

    const profiles = await fetchProfiles(adminClient, {
      role: data.filters?.role,
      establishmentId: data.filters?.establishmentId,
    })
    return enrichAndFilterUsers(adminClient, profiles, data.filters?.status ?? 'all')
  })

export const resendInvitation = createServerFn({ method: 'POST' })
  .inputValidator(validateUserActionInput)
  .handler(async ({ data }): Promise<{ ok: true; sentAt: string }> => {
    const adminClient = createAdminClient()
    const caller = await getCallerProfile(adminClient, data.accessToken)
    const target = await getTargetUser(adminClient, data.userId)
    assertManageTargetPermission(caller, target.profile)

    if (target.authUser?.email_confirmed_at) {
      throw new Error("L'utilisateur a deja active son compte.")
    }

    const email = getTargetEmail(target)
    const redirectTo = `${getAppUrl()}/onboarding`
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name: target.profile.first_name,
        last_name: target.profile.last_name,
        establishment_id: target.profile.establishment_id,
        role: target.profile.role,
      },
      redirectTo,
    })

    if (inviteError) {
      const { error: resendError } = await adminClient.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirectTo },
      })
      if (resendError) {
        throw new Error(`Renvoi invitation impossible: ${resendError.message}`)
      }
    }

    const sentAt = new Date().toISOString()
    await insertAuditLog(adminClient, {
      caller,
      establishmentId: target.profile.establishment_id,
      action: 'user.invitation.resent',
      description: `Invitation renvoyee a ${email}`,
      metadata: {
        target_user_id: target.profile.id,
        target_email: email,
        source: 'server.users',
      },
    })
    return { ok: true, sentAt }
  })

export const sendPasswordReset = createServerFn({ method: 'POST' })
  .inputValidator(validateUserActionInput)
  .handler(async ({ data }): Promise<{ ok: true; sentAt: string }> => {
    const adminClient = createAdminClient()
    const caller = await getCallerProfile(adminClient, data.accessToken)
    const target = await getTargetUser(adminClient, data.userId)
    assertManageTargetPermission(caller, target.profile)

    if (!target.authUser?.email_confirmed_at) {
      throw new Error("Impossible d'envoyer un reset password a un utilisateur en attente.")
    }

    const email = getTargetEmail(target)
    const { error } = await adminClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAppUrl()}/onboarding`,
    })
    if (error) throw new Error(`Envoi reset password impossible: ${error.message}`)

    const sentAt = new Date().toISOString()
    await insertAuditLog(adminClient, {
      caller,
      establishmentId: target.profile.establishment_id,
      action: 'user.password.reset_sent',
      description: `Reset password envoye a ${email}`,
      metadata: {
        target_user_id: target.profile.id,
        target_email: email,
        source: 'server.users',
      },
    })
    return { ok: true, sentAt }
  })

export const updateUserEmail = createServerFn({ method: 'POST' })
  .inputValidator(validateUpdateUserEmailInput)
  .handler(async ({ data }): Promise<{ ok: true; oldEmail: string; newEmail: string }> => {
    const adminClient = createAdminClient()
    const caller = await getCallerProfile(adminClient, data.accessToken)
    const target = await getTargetUser(adminClient, data.userId)
    assertManageTargetPermission(caller, target.profile)

    if (target.authUser?.email_confirmed_at) {
      throw new Error("Impossible de modifier l'email d'un utilisateur confirme.")
    }

    const oldEmail = getTargetEmail(target)
    const newEmail = normalizeEmail(data.newEmail)
    const { error: authError } = await adminClient.auth.admin.updateUserById(data.userId, {
      email: newEmail,
      email_confirm: false,
    })
    if (authError) throw new Error(`Mise a jour email auth impossible: ${authError.message}`)

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', data.userId)
    if (profileError) throw new Error(`Mise a jour email profil impossible: ${profileError.message}`)

    await insertAuditLog(adminClient, {
      caller,
      establishmentId: target.profile.establishment_id,
      action: 'user.email.updated',
      description: `Email utilisateur modifie: ${oldEmail} -> ${newEmail}`,
      metadata: {
        target_user_id: target.profile.id,
        old_email: oldEmail,
        new_email: newEmail,
        source: 'server.users',
      },
    })
    return { ok: true, oldEmail, newEmail }
  })

export const changeUserRole = createServerFn({ method: 'POST' })
  .inputValidator(validateChangeUserRoleInput)
  .handler(async ({ data }): Promise<{ ok: true; oldRole: UserRole; newRole: UserRole }> => {
    const adminClient = createAdminClient()
    const caller = await getCallerProfile(adminClient, data.accessToken)
    const target = await getTargetUser(adminClient, data.userId)
    assertManageTargetPermission(caller, target.profile, data.newRole)

    const oldRole = target.profile.role
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ role: data.newRole })
      .eq('id', data.userId)
    if (profileError) throw new Error(`Changement role impossible: ${profileError.message}`)

    await syncPrimaryUserRole(adminClient, {
      userId: data.userId,
      establishmentId: target.profile.establishment_id,
      role: data.newRole,
    })

    await insertAuditLog(adminClient, {
      caller,
      establishmentId: target.profile.establishment_id,
      action: 'user.role.changed',
      description: `Role utilisateur modifie: ${oldRole} -> ${data.newRole}`,
      metadata: {
        target_user_id: target.profile.id,
        old_role: oldRole,
        new_role: data.newRole,
        source: 'server.users',
      },
    })
    return { ok: true, oldRole, newRole: data.newRole }
  })

export const changeUserEstablishment = createServerFn({ method: 'POST' })
  .inputValidator(validateChangeUserEstablishmentInput)
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; oldEstablishmentId: string | null; newEstablishmentId: string | null }> => {
      const adminClient = createAdminClient()
      const caller = await getCallerProfile(adminClient, data.accessToken)
      assertSuperadmin(caller)
      const target = await getTargetUser(adminClient, data.userId)

      if (data.newEstablishmentId) {
        await assertEstablishmentExists(adminClient, data.newEstablishmentId)
      }

      const oldEstablishmentId = target.profile.establishment_id
      const { error: profileError } = await adminClient
        .from('profiles')
        .update({ establishment_id: data.newEstablishmentId })
        .eq('id', data.userId)
      if (profileError) {
        throw new Error(`Changement etablissement impossible: ${profileError.message}`)
      }

      await syncPrimaryUserRole(adminClient, {
        userId: data.userId,
        establishmentId: data.newEstablishmentId,
        role: target.profile.role,
      })

      await insertAuditLog(adminClient, {
        caller,
        establishmentId: data.newEstablishmentId ?? oldEstablishmentId,
        action: 'user.establishment.changed',
        description: `Etablissement utilisateur modifie pour ${target.profile.email}`,
        metadata: {
          target_user_id: target.profile.id,
          old_establishment_id: oldEstablishmentId,
          new_establishment_id: data.newEstablishmentId,
          source: 'server.users',
        },
      })
      return { ok: true, oldEstablishmentId, newEstablishmentId: data.newEstablishmentId }
    },
  )

export const softDeleteUser = createServerFn({ method: 'POST' })
  .inputValidator(validateUserActionInput)
  .handler(async ({ data }): Promise<{ ok: true; archivedAt: string }> => {
    const adminClient = createAdminClient()
    const caller = await getCallerProfile(adminClient, data.accessToken)
    const target = await getTargetUser(adminClient, data.userId)
    assertNotSelf(caller.id, data.userId)
    assertManageTargetPermission(caller, target.profile)

    const archivedAt = new Date().toISOString()
    const { error } = await adminClient
      .from('profiles')
      .update({ archived_at: archivedAt })
      .eq('id', data.userId)
    if (error) throw new Error(`Archivage utilisateur impossible: ${error.message}`)

    await insertAuditLog(adminClient, {
      caller,
      establishmentId: target.profile.establishment_id,
      action: 'user.soft_deleted',
      description: `Utilisateur archive: ${target.profile.email}`,
      metadata: {
        target_user_id: target.profile.id,
        target_email: target.profile.email,
        source: 'server.users',
      },
    })
    return { ok: true, archivedAt }
  })

export const restoreUser = createServerFn({ method: 'POST' })
  .inputValidator(validateUserActionInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const adminClient = createAdminClient()
    const caller = await getCallerProfile(adminClient, data.accessToken)
    const target = await getTargetUser(adminClient, data.userId)
    assertManageTargetPermission(caller, target.profile)

    const { error } = await adminClient
      .from('profiles')
      .update({ archived_at: null })
      .eq('id', data.userId)
    if (error) throw new Error(`Restauration utilisateur impossible: ${error.message}`)

    await insertAuditLog(adminClient, {
      caller,
      establishmentId: target.profile.establishment_id,
      action: 'user.restored',
      description: `Utilisateur restaure: ${target.profile.email}`,
      metadata: {
        target_user_id: target.profile.id,
        target_email: target.profile.email,
        source: 'server.users',
      },
    })
    return { ok: true }
  })

export const hardDeleteUser = createServerFn({ method: 'POST' })
  .inputValidator(validateHardDeleteUserInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const adminClient = createAdminClient()
    const caller = await getCallerProfile(adminClient, data.accessToken)
    assertSuperadmin(caller)
    assertNotSelf(caller.id, data.userId)

    const target = await getTargetUser(adminClient, data.userId)
    const email = getTargetEmail(target)
    if (data.confirmEmail !== email) {
      throw new Error("L'email de confirmation ne correspond pas.")
    }
    if (target.profile.role === 'superadmin') {
      await assertAnotherActiveConfirmedSuperadmin(adminClient, target.profile.id)
    }

    await insertAuditLog(adminClient, {
      caller,
      establishmentId: target.profile.establishment_id,
      action: 'user.hard_deleted',
      description: `Utilisateur supprime definitivement: ${email}`,
      metadata: {
        snapshot: {
          profile: target.profile as unknown as Json,
          auth: target.authUser as unknown as Json,
        },
        source: 'server.users',
      },
    })

    await deleteRows(adminClient, 'audit_logs', 'user_id', data.userId, 'audit logs utilisateur')
    await deleteRows(adminClient, 'user_roles', 'user_id', data.userId, 'roles utilisateur')
    await deleteRows(adminClient, 'profiles', 'id', data.userId, 'profil utilisateur')

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(data.userId)
    if (deleteError) throw new Error(`Suppression auth impossible: ${deleteError.message}`)

    return { ok: true }
  })

function validateListUsersForTenantInput(raw: unknown): ListUsersForTenantInput {
  const data = raw as Partial<ListUsersForTenantInput>
  const accessToken = clean(data.accessToken)
  const establishmentId = clean(data.establishmentId)
  if (!accessToken) throw new Error('Session manquante.')
  validateUuid(establishmentId, 'Etablissement')
  return {
    accessToken,
    establishmentId,
    status: validateStatusFilter(data.status ?? 'all'),
  }
}

function validateListAllUsersInput(raw: unknown): ListAllUsersInput {
  const data = raw as Partial<ListAllUsersInput>
  const accessToken = clean(data.accessToken)
  if (!accessToken) throw new Error('Session manquante.')
  const filters = data.filters
  return {
    accessToken,
    filters: {
      role: filters?.role === 'all' || filters?.role === undefined ? filters?.role : validateUserRole(filters.role),
      establishmentId:
        filters?.establishmentId === 'all' || filters?.establishmentId === undefined
          ? filters?.establishmentId
          : validateUuid(filters.establishmentId, 'Etablissement'),
      status: validateStatusFilter(filters?.status ?? 'all'),
    },
  }
}

function validateUserActionInput(raw: unknown): UserActionInput {
  const data = raw as Partial<UserActionInput>
  const accessToken = clean(data.accessToken)
  const userId = clean(data.userId)
  if (!accessToken) throw new Error('Session manquante.')
  validateUuid(userId, 'Utilisateur')
  return { accessToken, userId }
}

function validateUpdateUserEmailInput(raw: unknown): UpdateUserEmailInput {
  const data = raw as Partial<UpdateUserEmailInput>
  const base = validateUserActionInput(data)
  const newEmail = normalizeEmail(data.newEmail)
  return { ...base, newEmail }
}

function validateChangeUserRoleInput(raw: unknown): ChangeUserRoleInput {
  const data = raw as Partial<ChangeUserRoleInput>
  const base = validateUserActionInput(data)
  return { ...base, newRole: validateUserRole(data.newRole) }
}

function validateChangeUserEstablishmentInput(raw: unknown): ChangeUserEstablishmentInput {
  const data = raw as Partial<ChangeUserEstablishmentInput>
  const base = validateUserActionInput(data)
  const next = data.newEstablishmentId === null ? null : clean(data.newEstablishmentId)
  return {
    ...base,
    newEstablishmentId: next ? validateUuid(next, 'Nouvel etablissement') : null,
  }
}

function validateHardDeleteUserInput(raw: unknown): HardDeleteUserInput {
  const data = raw as Partial<HardDeleteUserInput>
  const base = validateUserActionInput(data)
  const confirmEmail = normalizeEmail(data.confirmEmail)
  return { ...base, confirmEmail }
}

function createAdminClient(): AdminClient {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('SUPABASE_URL ou VITE_SUPABASE_URL manquant cote serveur.')
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant cote serveur Vercel.')

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function getAppUrl(): string {
  const rawUrl = (
    process.env.PFMP_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    'https://www.pfmp-pilot.fr'
  ).replace(/\/+$/, '')

  return rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
    ? rawUrl
    : `https://${rawUrl}`
}

async function getCallerProfile(adminClient: AdminClient, accessToken: string): Promise<CallerProfile> {
  const { data: userResult, error: userError } = await adminClient.auth.getUser(accessToken)
  const caller = userResult.user
  if (userError || !caller) {
    throw new Error('Session invalide. Reconnectez-vous.')
  }

  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', caller.id)
    .maybeSingle()
  if (error) throw new Error(`Lecture profil appelant impossible: ${error.message}`)
  if (!profile) throw new Error('Profil appelant introuvable.')
  return profile as unknown as CallerProfile
}

async function getTargetUser(adminClient: AdminClient, userId: string): Promise<UserTarget> {
  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(`Lecture profil cible impossible: ${error.message}`)
  if (!profile) throw new Error('Utilisateur introuvable.')

  const authUsers = await fetchAuthUsers(adminClient)
  const authUser = authUsers.get(userId) ?? null
  return {
    profile: profile as unknown as ProfileRow,
    authUser,
  }
}

async function fetchProfiles(
  adminClient: AdminClient,
  filters: { establishmentId?: string | 'all'; role?: UserRole | 'all' },
): Promise<ProfileRow[]> {
  let query = adminClient.from('profiles').select('*').order('last_name')
  if (filters.establishmentId && filters.establishmentId !== 'all') {
    query = query.eq('establishment_id', filters.establishmentId)
  }
  if (filters.role && filters.role !== 'all') {
    query = query.eq('role', filters.role)
  }
  const { data, error } = await query
  if (error) throw new Error(`Lecture utilisateurs impossible: ${error.message}`)
  return (data ?? []) as unknown as ProfileRow[]
}

async function enrichAndFilterUsers(
  adminClient: AdminClient,
  profiles: ProfileRow[],
  status: UserStatusFilter,
): Promise<UserRowEnriched[]> {
  const authUsers = await fetchAuthUsers(adminClient)
  const establishments = await fetchEstablishmentsMap(adminClient)

  return profiles
    .map((profile) => {
      const authUser = authUsers.get(profile.id) ?? null
      const establishment = profile.establishment_id
        ? establishments.get(profile.establishment_id) ?? null
        : null
      return {
        ...profile,
        email_confirmed_at: authUser?.email_confirmed_at ?? null,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        establishment_name: establishment?.name ?? null,
        establishment_slug: establishment?.slug ?? null,
      }
    })
    .filter((user) => matchesStatus(user, status))
}

async function fetchAuthUsers(adminClient: AdminClient): Promise<Map<string, AuthUserSnapshot>> {
  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(`Lecture auth.users impossible: ${error.message}`)
  const users = data.users ?? []
  return new Map(users.map((user) => [user.id, toAuthUserSnapshot(user)]))
}

async function fetchEstablishmentsMap(adminClient: AdminClient): Promise<Map<string, EstablishmentRow>> {
  const { data, error } = await adminClient.from('establishments').select('*')
  if (error) throw new Error(`Lecture etablissements impossible: ${error.message}`)
  const rows = (data ?? []) as unknown as EstablishmentRow[]
  return new Map(rows.map((row) => [row.id, row]))
}

function toAuthUserSnapshot(user: User): AuthUserSnapshot {
  return {
    id: user.id,
    email: user.email ?? null,
    email_confirmed_at: user.email_confirmed_at ?? null,
    last_sign_in_at: user.last_sign_in_at ?? null,
  }
}

function matchesStatus(user: UserRowEnriched, status: UserStatusFilter): boolean {
  if (status === 'archived') return Boolean(user.archived_at)
  if (user.archived_at) return false
  if (status === 'confirmed') return Boolean(user.email_confirmed_at)
  if (status === 'pending') return !user.email_confirmed_at
  return true
}

function assertTenantReadPermission(caller: CallerProfile, establishmentId: string): void {
  if (caller.role === 'superadmin') return
  if (!READ_TENANT_ROLES.includes(caller.role)) {
    throw new Error('Acces refuse: lecture utilisateurs non autorisee.')
  }
  if (caller.establishment_id !== establishmentId) {
    throw new Error('Acces refuse: vous ne pouvez lire que votre etablissement.')
  }
}

function assertManageTargetPermission(
  caller: CallerProfile,
  target: ProfileRow,
  requestedRole?: UserRole,
): void {
  if (caller.role === 'superadmin') return
  if (!TENANT_ADMIN_ROLES.includes(caller.role)) {
    throw new Error('Acces refuse: action reservee aux admins.')
  }
  if (!caller.establishment_id || caller.establishment_id !== target.establishment_id) {
    throw new Error('Acces refuse: utilisateur hors de votre etablissement.')
  }
  if (PROTECTED_ADMIN_ROLES.includes(target.role)) {
    throw new Error('Acces refuse: seul un superadmin peut modifier un admin ou superadmin.')
  }
  if (requestedRole && PROTECTED_ADMIN_ROLES.includes(requestedRole)) {
    throw new Error('Acces refuse: seul un superadmin peut attribuer ce role.')
  }
}

function assertSuperadmin(caller: CallerProfile): void {
  if (caller.role !== 'superadmin') {
    throw new Error('Acces refuse: action reservee au superadmin.')
  }
}

function assertNotSelf(callerId: string, targetUserId: string): void {
  if (callerId === targetUserId) {
    throw new Error('Impossible de supprimer son propre compte.')
  }
}

async function assertAnotherActiveConfirmedSuperadmin(
  adminClient: AdminClient,
  targetUserId: string,
): Promise<void> {
  const profiles = await fetchProfiles(adminClient, { role: 'superadmin' })
  const authUsers = await fetchAuthUsers(adminClient)
  const otherActive = profiles.some((profile) => {
    if (profile.id === targetUserId) return false
    if (profile.archived_at) return false
    return Boolean(authUsers.get(profile.id)?.email_confirmed_at)
  })
  if (!otherActive) {
    throw new Error('Au moins un superadmin actif requis.')
  }
}

async function assertEstablishmentExists(
  adminClient: AdminClient,
  establishmentId: string,
): Promise<void> {
  const { data, error } = await adminClient
    .from('establishments')
    .select('id')
    .eq('id', establishmentId)
    .maybeSingle()
  if (error) throw new Error(`Verification etablissement impossible: ${error.message}`)
  if (!data) throw new Error('Etablissement cible introuvable.')
}

async function syncPrimaryUserRole(
  adminClient: AdminClient,
  input: { userId: string; establishmentId: string | null; role: UserRole },
): Promise<void> {
  const { error: deleteError } = await adminClient
    .from('user_roles')
    .delete()
    .eq('user_id', input.userId)
  if (deleteError) throw new Error(`Synchronisation roles impossible: ${deleteError.message}`)

  if (!input.establishmentId || input.role === 'superadmin') return

  const { error: insertError } = await adminClient.from('user_roles').insert({
    user_id: input.userId,
    establishment_id: input.establishmentId,
    role: input.role,
  })
  if (insertError) throw new Error(`Creation role utilisateur impossible: ${insertError.message}`)
}

async function insertAuditLog(
  adminClient: AdminClient,
  input: {
    caller: CallerProfile
    establishmentId: string | null
    action: string
    description: string
    metadata: Json
  },
): Promise<void> {
  const metadata =
    input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
      ? { ...input.metadata, caller_role: input.caller.role }
      : { value: input.metadata, caller_role: input.caller.role }

  const { error } = await adminClient.from('audit_logs').insert({
    establishment_id: input.establishmentId,
    user_id: input.caller.id,
    action: input.action,
    description: input.description,
    metadata,
  })
  if (error) throw new Error(`Audit log impossible: ${error.message}`)
}

async function deleteRows(
  adminClient: AdminClient,
  table: string,
  column: string,
  value: string,
  label: string,
): Promise<void> {
  const { error } = await adminClient.from(table).delete().eq(column, value)
  if (error) throw new Error(`Suppression ${label} impossible: ${error.message}`)
}

function getTargetEmail(target: UserTarget): string {
  const email = normalizeEmail(target.authUser?.email ?? target.profile.email)
  if (!email) throw new Error('Email utilisateur introuvable.')
  return email
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeEmail(value: unknown): string {
  const email = clean(value).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email invalide.')
  return email
}

function validateUserRole(value: unknown): UserRole {
  if (ROLE_VALUES.includes(value as UserRole)) return value as UserRole
  throw new Error('Role utilisateur invalide.')
}

function validateStatusFilter(value: unknown): UserStatusFilter {
  if (value === 'confirmed' || value === 'pending' || value === 'archived' || value === 'all') {
    return value
  }
  throw new Error('Filtre statut invalide.')
}

function validateUuid(value: unknown, label: string): string {
  const uuid = clean(value)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) {
    throw new Error(`${label} invalide.`)
  }
  return uuid
}
