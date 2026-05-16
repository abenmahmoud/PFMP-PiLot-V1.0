import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/database.types'
import { canInvite } from '@/lib/permissions'
import { safeHandlerCall } from './_lib'

declare const process: {
  env: Record<string, string | undefined>
}

export type InviteUserRole = Exclude<UserRole, 'superadmin'>

export interface InviteUserToEstablishmentInput {
  accessToken: string
  establishmentId: string
  email: string
  firstName: string
  lastName: string
  role: InviteUserRole
}

export interface InviteUserToEstablishmentResult {
  ok: true
  userId: string | null
  email: string
  role: InviteUserRole
}

interface CallerProfile {
  id: string
  email: string
  role: UserRole
  establishment_id: string | null
}

interface EstablishmentForInvite {
  id: string
  name: string
  slug: string
}

interface ExistingProfileIdentity {
  id: string
  email: string
  role: UserRole
  establishment_id: string | null
  archived_at?: string | null
}

export const inviteUserToEstablishment = createServerFn({ method: 'POST' })
  .inputValidator(validateInviteInput)
  .handler(async ({ data }): Promise<InviteUserToEstablishmentResult> => {
    return safeHandlerCall(async () => inviteUserToEstablishmentUnsafe(data))
  })

export async function inviteUserToEstablishmentUnsafe(
  data: InviteUserToEstablishmentInput,
): Promise<InviteUserToEstablishmentResult> {
    const adminClient = createAdminClient()

    const { data: userResult, error: userError } = await adminClient.auth.getUser(data.accessToken)
    const caller = userResult.user
    if (userError || !caller) {
      throw new Error('Session invalide. Reconnectez-vous puis relancez l invitation.')
    }

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from('profiles')
      .select('id,email,role,establishment_id')
      .eq('id', caller.id)
      .maybeSingle()

    if (callerProfileError) {
      throw new Error(`Lecture profil appelant impossible: ${callerProfileError.message}`)
    }
    if (!callerProfile) {
      throw new Error('Profil appelant introuvable.')
    }

    assertInvitePermission(callerProfile as CallerProfile, data)

    const { data: establishment, error: establishmentError } = await adminClient
      .from('establishments')
      .select('id,name,slug')
      .eq('id', data.establishmentId)
      .maybeSingle()

    if (establishmentError) {
      throw new Error(`Lecture etablissement impossible: ${establishmentError.message}`)
    }
    if (!establishment) {
      throw new Error("Etablissement introuvable.")
    }

    const target = establishment as EstablishmentForInvite
    const redirectTo = `${getAppUrl()}/onboarding`
    const cleanEmail = data.email.toLowerCase()

    await assertInviteEmailIsSafe(adminClient, {
      email: cleanEmail,
      establishmentId: data.establishmentId,
      role: data.role,
    })

    const { data: inviteResult, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(cleanEmail, {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          establishment_id: data.establishmentId,
          establishment_name: target.name,
          role: data.role,
        },
        redirectTo,
      })

    if (inviteError) {
      throw new Error(`Invitation Supabase impossible: ${inviteError.message}`)
    }

    const invitedUserId = inviteResult.user?.id ?? null

    if (invitedUserId) {
      await assertInvitedIdentityIsSafe(adminClient, {
        userId: invitedUserId,
        email: cleanEmail,
        establishmentId: data.establishmentId,
        role: data.role,
      })

      const { error: profileError } = await adminClient.from('profiles').upsert(
        {
          id: invitedUserId,
          establishment_id: data.establishmentId,
          first_name: data.firstName,
          last_name: data.lastName,
          email: cleanEmail,
          role: data.role,
        },
        { onConflict: 'id' },
      )

      if (profileError) {
        throw new Error(`Profil invite impossible: ${profileError.message}`)
      }

      await ensureTeacherRowForPedagogicRole(adminClient, {
        profileId: invitedUserId,
        establishmentId: data.establishmentId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: cleanEmail,
        role: data.role,
      })
    }

    await adminClient.from('audit_logs').insert({
      establishment_id: data.establishmentId,
      user_id: caller.id,
      action: 'user.invited',
      description: `Invitation envoyee a ${cleanEmail} (${data.role})`,
      metadata: {
        invited_email: cleanEmail,
        invited_role: data.role,
        establishment_slug: target.slug,
        source: 'server.invitations',
      },
    })

    return {
      ok: true,
      userId: invitedUserId,
      email: cleanEmail,
      role: data.role,
    }
}

function validateInviteInput(raw: unknown): InviteUserToEstablishmentInput {
  const data = raw as Partial<InviteUserToEstablishmentInput>
  const accessToken = clean(data.accessToken)
  const establishmentId = clean(data.establishmentId)
  const email = clean(data.email).toLowerCase()
  const firstName = clean(data.firstName)
  const lastName = clean(data.lastName)
  const role = data.role

  if (!accessToken) throw new Error('Session manquante.')
  if (!establishmentId) throw new Error('Etablissement manquant.')
  if (!isEmail(email)) throw new Error('Email invalide.')
  if (!firstName) throw new Error('Prenom obligatoire.')
  if (!lastName) throw new Error('Nom obligatoire.')
  if (!isInviteRole(role)) throw new Error('Role invitation invalide.')

  return {
    accessToken,
    establishmentId,
    email,
    firstName,
    lastName,
    role,
  }
}

function assertInvitePermission(
  caller: CallerProfile,
  input: InviteUserToEstablishmentInput,
): void {
  if (caller.role !== 'superadmin' && caller.establishment_id !== input.establishmentId) {
    throw new Error('Acces refuse: vous ne pouvez inviter que dans votre etablissement.')
  }
  if (!canInvite(caller.role, input.role)) {
    throw new Error(
      `Acces refuse: en tant que ${caller.role}, vous ne pouvez pas inviter un utilisateur ${input.role}.`,
    )
  }
}

function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('SUPABASE_URL ou VITE_SUPABASE_URL manquant cote serveur.')
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant cote serveur Vercel.')
  }

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

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isInviteRole(value: unknown): value is InviteUserRole {
  return (
    value === 'admin' ||
    value === 'ddfpt' ||
    value === 'principal' ||
    value === 'referent' ||
    value === 'tuteur' ||
    value === 'eleve'
  )
}

async function ensureTeacherRowForPedagogicRole(
  adminClient: ReturnType<typeof createAdminClient>,
  input: {
    profileId: string
    establishmentId: string
    firstName: string
    lastName: string
    email: string
    role: InviteUserRole
  },
): Promise<void> {
  if (input.role !== 'referent' && input.role !== 'principal') return

  const { data: existing, error: selectError } = await adminClient
    .from('teachers')
    .select('id')
    .eq('profile_id', input.profileId)
    .eq('establishment_id', input.establishmentId)
    .maybeSingle()

  if (selectError) {
    throw new Error(`Verification professeur impossible: ${selectError.message}`)
  }

  if (existing?.id) {
    const { error: updateError } = await adminClient
      .from('teachers')
      .update({
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
      })
      .eq('id', existing.id)
    if (updateError) throw new Error(`Mise a jour professeur impossible: ${updateError.message}`)
    return
  }

  const { data: existingByEmail, error: emailSelectError } = await adminClient
    .from('teachers')
    .select('id,profile_id,email')
    .eq('establishment_id', input.establishmentId)
    .eq('email', input.email)
    .maybeSingle()

  if (emailSelectError) {
    throw new Error(`Verification professeur par email impossible: ${emailSelectError.message}`)
  }

  if (existingByEmail?.id) {
    const existingProfileId = (existingByEmail as { profile_id?: string | null }).profile_id ?? null
    if (existingProfileId && existingProfileId !== input.profileId) {
      throw new Error(
        "Ce professeur est deja rattache a un autre compte. Detachez l'ancien compte avant de renvoyer une invitation.",
      )
    }

    const { error: updateError } = await adminClient
      .from('teachers')
      .update({
        profile_id: input.profileId,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
      })
      .eq('id', existingByEmail.id)
    if (updateError) throw new Error(`Rattachement professeur impossible: ${updateError.message}`)
    return
  }

  const { error: insertError } = await adminClient.from('teachers').insert({
    establishment_id: input.establishmentId,
    profile_id: input.profileId,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
  })

  if (insertError) {
    throw new Error(`Creation professeur impossible: ${insertError.message}`)
  }
}

async function assertInviteEmailIsSafe(
  adminClient: ReturnType<typeof createAdminClient>,
  input: { email: string; establishmentId: string; role: InviteUserRole },
): Promise<void> {
  const { data: existingProfiles, error } = await adminClient
    .from('profiles')
    .select('id,email,role,establishment_id,archived_at')
    .eq('email', input.email)

  if (error) throw new Error(`Verification email invite impossible: ${error.message}`)

  for (const profile of (existingProfiles ?? []) as ExistingProfileIdentity[]) {
    assertProfileCanReceiveInvite(profile, input)
  }
}

async function assertInvitedIdentityIsSafe(
  adminClient: ReturnType<typeof createAdminClient>,
  input: { userId: string; email: string; establishmentId: string; role: InviteUserRole },
): Promise<void> {
  const { data: authUserResult, error: authError } = await adminClient.auth.admin.getUserById(input.userId)
  if (authError) throw new Error(`Verification compte auth invite impossible: ${authError.message}`)

  const authEmail = normalizeEmail(authUserResult.user?.email)
  if (authEmail && authEmail !== input.email) {
    throw new Error(
      `Invitation bloquee: le compte auth retourne (${authEmail}) au lieu de l'email invite (${input.email}). Deconnectez le telephone puis renvoyez l'invitation.`,
    )
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id,email,role,establishment_id,archived_at')
    .eq('id', input.userId)
    .maybeSingle()

  if (profileError) {
    throw new Error(`Verification profil invite impossible: ${profileError.message}`)
  }

  if (profile) {
    assertProfileCanReceiveInvite(profile as ExistingProfileIdentity, input)
  }
}

function assertProfileCanReceiveInvite(
  profile: ExistingProfileIdentity,
  input: { email: string; establishmentId: string; role: InviteUserRole },
): void {
  const profileEmail = normalizeEmail(profile.email)
  if (profileEmail && profileEmail !== input.email) {
    throw new Error(
      `Invitation bloquee: le compte cible est deja lie a ${profileEmail}, pas a ${input.email}.`,
    )
  }

  if (profile.role === 'superadmin') {
    throw new Error('Invitation bloquee: un compte superadmin ne peut jamais etre rattache comme professeur.')
  }

  if (profile.establishment_id && profile.establishment_id !== input.establishmentId) {
    throw new Error('Invitation bloquee: cet email est deja rattache a un autre etablissement.')
  }

  if (!profile.archived_at && profile.role !== input.role) {
    throw new Error(
      `Invitation bloquee: cet email possede deja le role ${profile.role}. Modifiez le role depuis Utilisateurs au lieu de renvoyer une invitation.`,
    )
  }
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}
