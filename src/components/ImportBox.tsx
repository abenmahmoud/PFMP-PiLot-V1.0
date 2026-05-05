import { useState } from 'react'
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from './ui/Button'
import { cn } from '@/lib/cn'

interface ImportBoxProps {
  label: string
  description: string
  templateUrl?: string
  expectedColumns: string[]
}

export function ImportBox({ label, description, expectedColumns }: ImportBoxProps) {
  const [file, setFile] = useState<File | null>(null)
  const [drag, setDrag] = useState(false)

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-2">
        <FileSpreadsheet className="w-4 h-4 text-[var(--color-brand-700)]" />
        <h3 className="font-semibold tracking-tight">{label}</h3>
      </div>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">{description}</p>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          const f = e.dataTransfer.files?.[0]
          if (f) setFile(f)
        }}
        className={cn(
          'border-2 border-dashed rounded-xl px-6 py-8 text-center transition-colors',
          drag
            ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)]'
            : 'border-[var(--color-border-strong)] bg-[var(--color-muted)]/40',
        )}
      >
        <UploadCloud className="w-6 h-6 text-[var(--color-text-muted)] mx-auto mb-2" />
        <p className="text-sm text-[var(--color-text)]">
          Déposez votre fichier CSV/Excel ici
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          .csv, .xlsx jusqu'à 10 Mo
        </p>
        <label className="inline-block">
          <input
            type="file"
            accept=".csv,.xls,.xlsx"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <span className="inline-flex h-9 px-3.5 items-center rounded-lg bg-white border border-[var(--color-border-strong)] text-sm font-medium hover:bg-[var(--color-muted)] cursor-pointer">
            Parcourir…
          </span>
        </label>
      </div>

      {file && (
        <div className="mt-4 rounded-lg border border-[var(--color-border)] p-3 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-[var(--color-success-fg)]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {(file.size / 1024).toFixed(1)} Ko · prêt pour mapping
            </p>
          </div>
          <Button size="sm" variant="secondary" disabled>
            Aperçu
          </Button>
          <Button size="sm" disabled>
            Importer
          </Button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {expectedColumns.map((c) => (
          <div
            key={c}
            className="text-xs px-2 py-1.5 rounded-md bg-[var(--color-muted)] text-[var(--color-text-muted)] font-mono"
          >
            {c}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
        <p>
          L'import réel sera connecté à Supabase. La structure (drop, mapping, validation,
          rapport d'erreurs) est déjà en place.
        </p>
      </div>
    </div>
  )
}
