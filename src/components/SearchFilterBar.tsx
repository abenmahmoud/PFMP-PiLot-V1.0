import { Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import type { ReactNode } from 'react'

interface Props {
  query: string
  onQueryChange: (v: string) => void
  placeholder?: string
  rightActions?: ReactNode
  filters?: ReactNode
}

export function SearchFilterBar({
  query,
  onQueryChange,
  placeholder = 'Rechercher…',
  rightActions,
  filters,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-subtle)]" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      {filters && (
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="w-4 h-4 text-[var(--color-text-subtle)] hidden sm:block" />
          {filters}
        </div>
      )}
      {rightActions && <div className="flex items-center gap-2">{rightActions}</div>}
    </div>
  )
}

export { Button }
