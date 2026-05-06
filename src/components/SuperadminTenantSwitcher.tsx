import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthProvider'
import { getSupabase } from '@/lib/supabase'
import type { EstablishmentRow } from '@/lib/database.types'

export function SuperadminTenantSwitcher() {
  const auth = useAuth()
  const [establishments, setEstablishments] = useState<EstablishmentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (auth.role !== 'superadmin') return
    const sb = getSupabase()
    sb.from('establishments')
      .select('*')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setEstablishments((data as EstablishmentRow[]) ?? [])
      })
    const claim = (auth.session?.user.user_metadata as Record<string, unknown> | null)?.[
      'active_establishment_id'
    ] as string | undefined
    setActive(claim ?? null)
  }, [auth.role, auth.session])

  if (auth.role !== 'superadmin') return null

  async function switchTenant(id: string | null) {
    setLoading(true)
    const sb = getSupabase()
    const { error } = await sb.auth.updateUser({
      data: { active_establishment_id: id ?? '' },
    })
    setLoading(false)
    if (error) {
      console.error('[switcher]', error.message)
      return
    }
    setActive(id)
    window.location.reload()
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs">
      <span className="font-medium">SUPERADMIN</span>
      <select
        className="bg-transparent outline-none cursor-pointer"
        value={active ?? ''}
        onChange={(e) => switchTenant(e.target.value || null)}
        disabled={loading}
      >
        <option value="">- Vue globale -</option>
        {establishments.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
    </div>
  )
}
