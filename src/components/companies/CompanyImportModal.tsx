import { useState } from 'react'
import { FileSpreadsheet, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { PROFESSIONAL_FAMILY_LABELS, type ProfessionalFamily } from '@/types'
import type { CompanyImportRow, ImportCompaniesResult } from '@/server/companies.functions'

interface CompanyImportModalProps {
  submitting: boolean
  error: string | null
  dryRunResult: ImportCompaniesResult | null
  onCancel: () => void
  onDryRun: (rows: CompanyImportRow[]) => void
  onImport: (rows: CompanyImportRow[]) => void
}

type RawRow = Record<string, string>

const HEADER_ALIASES = {
  name: ['NOM', 'ENTREPRISE', 'RAISONSOCIALE', 'RAISON_SOCIALE', 'SOCIETE'],
  siret: ['SIRET', 'NUMEROSIRET', 'NUMERO_SIRET'],
  address: ['ADRESSE', 'RUE', 'ADRESSE1'],
  zipCode: ['CODEPOSTAL', 'CODE_POSTAL', 'CP'],
  city: ['VILLE', 'COMMUNE'],
  phone: ['TELEPHONE', 'TEL', 'PHONE'],
  email: ['EMAIL', 'MAIL', 'COURRIEL'],
  website: ['SITE', 'WEBSITE', 'SITEWEB', 'SITE_WEB'],
  sector: ['SECTEUR', 'ACTIVITE', 'DOMAINE'],
  professionalFamily: ['FAMILLE', 'FAMILLE_METIER', 'FAMILLEMETIER'],
}

const FAMILY_ALIASES: Record<string, ProfessionalFamily> = {
  AUTOMOBILE: 'automobile',
  AUTO: 'automobile',
  COMMERCE: 'commerce_vente',
  VENTE: 'commerce_vente',
  GESTION: 'gestion_administration',
  ADMINISTRATION: 'gestion_administration',
  ARTISANAT: 'artisanat_art',
  ART: 'artisanat_art',
  HOTELLERIE: 'hotellerie_restauration',
  RESTAURATION: 'hotellerie_restauration',
  SANTE: 'sante_social',
  SOCIAL: 'sante_social',
  NUMERIQUE: 'numerique',
  DIGITAL: 'numerique',
  INDUSTRIE: 'industrie',
  BTP: 'btp',
  BATIMENT: 'btp',
  TRANSPORT: 'transport_logistique',
  LOGISTIQUE: 'transport_logistique',
  PUBLIC: 'service_public',
  AUTRE: 'autre',
}

export function CompanyImportModal({
  submitting,
  error,
  dryRunResult,
  onCancel,
  onDryRun,
  onImport,
}: CompanyImportModalProps) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<CompanyImportRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)

  async function handleFile(file: File | null) {
    if (!file) return
    setFileName(file.name)
    setParseError(null)
    try {
      const parsed = await parseCompanyFile(file)
      setRows(parsed)
      if (parsed.length === 0) setParseError('Aucune entreprise exploitable.')
    } catch (e) {
      setRows([])
      setParseError(e instanceof Error ? e.message : String(e))
    }
  }

  const blockingError = parseError ?? error

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="max-h-[92vh] w-full max-w-4xl overflow-y-auto">
        <CardHeader>
          <CardTitle icon={<FileSpreadsheet className="h-4 w-4" />}>Importer des entreprises</CardTitle>
          {rows.length > 0 && <Badge tone="brand">{rows.length} ligne(s)</Badge>}
        </CardHeader>
        <CardBody className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-muted)]/40 px-4 py-8 text-center">
            <Upload className="h-6 w-6 text-[var(--color-text-muted)]" />
            <span className="mt-2 text-sm font-medium text-[var(--color-text)]">CSV ou XLSX entreprises</span>
            <span className="text-xs text-[var(--color-text-muted)]">
              Colonnes : Nom, SIRET, Adresse, Code postal, Ville, Telephone, Email, Secteur
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
            />
          </label>

          {fileName && <p className="text-sm text-[var(--color-text-muted)]">Fichier : {fileName}</p>}
          {blockingError && <p className="text-sm font-medium text-[var(--color-danger)]">{blockingError}</p>}

          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[var(--color-muted)]/50 text-xs uppercase text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Nom</th>
                    <th className="px-3 py-2 text-left">SIRET</th>
                    <th className="px-3 py-2 text-left">Ville</th>
                    <th className="px-3 py-2 text-left">Secteur</th>
                    <th className="px-3 py-2 text-left">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {rows.slice(0, 8).map((row, index) => (
                    <tr key={`${row.name}-${row.siret ?? index}`}>
                      <td className="px-3 py-2 font-medium">{row.name}</td>
                      <td className="px-3 py-2">{row.siret ?? '-'}</td>
                      <td className="px-3 py-2">{row.city ?? '-'}</td>
                      <td className="px-3 py-2">{row.sector ?? '-'}</td>
                      <td className="px-3 py-2">{row.email ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {dryRunResult && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--color-brand-100)] bg-[var(--color-brand-50)] p-3 text-sm md:grid-cols-4">
              <ResultItem label="A creer" value={dryRunResult.created} />
              <ResultItem label="A mettre a jour" value={dryRunResult.updated} />
              <ResultItem label="Ignorees" value={dryRunResult.skipped} />
              <ResultItem label="Erreurs" value={dryRunResult.errors.length} />
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onDryRun(rows)}
              disabled={submitting || rows.length === 0}
            >
              {submitting ? 'Analyse...' : "Previsualiser l'import"}
            </Button>
            <Button
              type="button"
              onClick={() => onImport(rows)}
              disabled={submitting || rows.length === 0 || !dryRunResult}
            >
              {submitting ? 'Import...' : "Confirmer l'import"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function ResultItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">{label}</p>
      <p className="text-xl font-semibold text-[var(--color-text)]">{value}</p>
    </div>
  )
}

async function parseCompanyFile(file: File): Promise<CompanyImportRow[]> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (extension === 'xlsx' || extension === 'xls') {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) return []
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
    return mapRows(rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value)]))))
  }
  return mapRows(parseCsv(await file.text()))
}

function mapRows(rawRows: RawRow[]): CompanyImportRow[] {
  const headers = Object.keys(rawRows[0] ?? {})
  const map = buildHeaderMap(headers)
  return rawRows
    .map((row) => ({
      name: read(row, map.name),
      siret: normalizeSiret(read(row, map.siret)),
      address: read(row, map.address) || null,
      zipCode: read(row, map.zipCode) || null,
      city: read(row, map.city) || null,
      phone: read(row, map.phone) || null,
      email: normalizeEmail(read(row, map.email)),
      website: read(row, map.website) || null,
      sector: read(row, map.sector) || null,
      professionalFamily: normalizeFamily(read(row, map.professionalFamily)),
    }))
    .filter((row) => row.name)
}

function buildHeaderMap(headers: string[]): Partial<Record<keyof typeof HEADER_ALIASES, string>> {
  const normalized = new Map(headers.map((header) => [normalizeHeader(header), header]))
  const map: Partial<Record<keyof typeof HEADER_ALIASES, string>> = {}
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<[keyof typeof HEADER_ALIASES, string[]]>) {
    const found = aliases.find((alias) => normalized.has(alias))
    if (found) map[field] = normalized.get(found)
  }
  return map
}

function parseCsv(text: string): RawRow[] {
  const firstLine = text.split(/\r?\n/)[0] ?? ''
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  const headers = splitLine(lines[0] ?? '', delimiter)
  return lines.slice(1).map((line) => {
    const cells = splitLine(line, delimiter)
    const row: RawRow = {}
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? ''
    })
    return row
  })
}

function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      quoted = !quoted
      continue
    }
    if (char === delimiter && !quoted) {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

function read(row: RawRow, header: string | undefined): string {
  return header ? (row[header] ?? '').trim() : ''
}

function normalizeHeader(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function normalizeSiret(value: string): string | null {
  const siret = value.replace(/\s/g, '')
  return /^\d{14}$/.test(siret) ? siret : null
}

function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase()
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function normalizeFamily(value: string): ProfessionalFamily | null {
  const normalized = normalizeHeader(value)
  if (!normalized) return null
  if ((Object.keys(PROFESSIONAL_FAMILY_LABELS) as ProfessionalFamily[]).includes(normalized as ProfessionalFamily)) {
    return normalized as ProfessionalFamily
  }
  return FAMILY_ALIASES[normalized] ?? null
}
