import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/AuthProvider'
import { getSupabase } from '@/lib/supabase'
import type { EstablishmentRow } from '@/lib/database.types'

export function SuperadminTenantSwitcher() {
  const auth = useAuth()
  const [establishments, setEstablishments] = useState<EstablishmentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const active = auth.activeEstablishmentId

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
  }, [auth.role])

  if (auth.role !== 'superadmin') return null

  async function switchTenant(id: string | null) {
    setLoading(true)
    setError(null)
    const sb = getSupabase()
    const { error } = await sb.auth.updateUser({
      data: { active_establishment_id: id ?? '' },
    })
    if (error) {
      setLoading(false)
      setError(error.message)
      return
    }
    await sb.auth.refreshSession()
    window.location.reload()
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs">
      <span className="font-medium">SUPERADMIN</span>
      <select
        className="bg-transparent outline-none cursor-pointer max-w-56"
        value={active ?? ''}
        onChange={(e) => switchTenant(e.target.value || null)}
        disabled={loading}
        title={error ?? undefined}
      >
        <option value="">Vue globale</option>
        {establishments.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      {active && (
        <Link to="/dashboard" className="font-medium underline underline-offset-2">
          Ouvrir
        </Link>
      )}
    </div>
  )
}
