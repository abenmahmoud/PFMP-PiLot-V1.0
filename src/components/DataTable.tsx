import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  width?: string
  align?: 'left' | 'right' | 'center'
  hideOnMobile?: boolean
}

interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  empty?: ReactNode
  onRowClick?: (row: T) => void
  className?: string
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  empty,
  onRowClick,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0 && empty) {
    return <div className={className}>{empty}</div>
  }
  return (
    <div
      className={cn(
        'card overflow-hidden',
        className,
      )}
    >
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-muted)]/40">
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={{ width: c.width }}
                  className={cn(
                    'px-4 py-2.5 border-b border-[var(--color-border)] font-medium',
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center',
                    c.hideOnMobile && 'hidden sm:table-cell',
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-muted)]/40 transition-colors',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-4 py-3 text-[var(--color-text)]',
                      c.align === 'right' && 'text-right',
                      c.align === 'center' && 'text-center',
                      c.hideOnMobile && 'hidden sm:table-cell',
                    )}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
