import { useState } from 'react'
import { FileSpreadsheet, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { TeacherImportRow } from '@/server/teachers.functions'

interface TeacherImportModalProps {
  submitting: boolean
  error: string | null
  onCancel: () => void
  onImport: (rows: TeacherImportRow[]) => void
}

type RawRow = Record<string, string>

const HEADER_ALIASES = {
  firstName: ['PRENOM', 'PRENOMS', 'FIRSTNAME', 'FIRST_NAME'],
  lastName: ['NOM', 'NOMFAMILLE', 'LASTNAME', 'LAST_NAME'],
  email: ['EMAIL', 'MAIL', 'COURRIEL'],
  phone: ['TELEPHONE', 'TEL', 'PHONE', 'MOBILE'],
  discipline: ['DISCIPLINE', 'MATIERE', 'SPECIALITE'],
}

export function TeacherImportModal({
  submitting,
  error,
  onCancel,
  onImport,
}: TeacherImportModalProps) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<TeacherImportRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)

  async function handleFile(file: File | null) {
    if (!file) return
    setFileName(file.name)
    setParseError(null)
    try {
      const parsed = await parseTeacherFile(file)
      setRows(parsed)
      if (parsed.length === 0) setParseError('Aucune ligne professeur exploitable.')
    } catch (e) {
      setRows([])
      setParseError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle icon={<FileSpreadsheet className="w-4 h-4" />}>Importer des professeurs</CardTitle>
          {rows.length > 0 && <Badge tone="brand">{rows.length} ligne(s)</Badge>}
        </CardHeader>
        <CardBody className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-muted)]/40 px-4 py-8 text-center">
            <Upload className="w-6 h-6 text-[var(--color-text-muted)]" />
            <span className="mt-2 text-sm font-medium text-[var(--color-text)]">
              CSV ou XLSX professeurs
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              Colonnes attendues : Prenom, Nom, Email, Telephone, Discipline
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
            />
          </label>

          {fileName && <p className="text-sm text-[var(--color-text-muted)]">Fichier : {fileName}</p>}
          {(parseError || error) && (
            <p className="text-sm font-medium text-[var(--color-danger)]">{parseError ?? error}</p>
          )}

          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-[var(--color-muted)]/50 text-xs uppercase text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Prenom</th>
                    <th className="px-3 py-2 text-left">Nom</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Discipline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {rows.slice(0, 5).map((row, index) => (
                    <tr key={`${row.firstName}-${row.lastName}-${index}`}>
                      <td className="px-3 py-2">{row.firstName}</td>
                      <td className="px-3 py-2">{row.lastName}</td>
                      <td className="px-3 py-2">{row.email ?? '-'}</td>
                      <td className="px-3 py-2">{row.discipline ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
              Annuler
            </Button>
            <Button type="button" onClick={() => onImport(rows)} disabled={submitting || rows.length === 0}>
              {submitting ? 'Import...' : 'Importer'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

async function parseTeacherFile(file: File): Promise<TeacherImportRow[]> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (extension === 'xlsx' || extension === 'xls') {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) return []
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
    return mapRows(rows.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v)]))))
  }
  const text = await file.text()
  return mapRows(parseCsv(text))
}

function mapRows(rawRows: RawRow[]): TeacherImportRow[] {
  const headers = Object.keys(rawRows[0] ?? {})
  const map = buildHeaderMap(headers)
  return rawRows
    .map((row) => ({
      firstName: read(row, map.firstName),
      lastName: read(row, map.lastName),
      email: normalizeEmail(read(row, map.email)),
      phone: read(row, map.phone) || null,
      discipline: read(row, map.discipline) || null,
    }))
    .filter((row) => row.firstName && row.lastName)
}

function buildHeaderMap(headers: string[]): Partial<Record<keyof typeof HEADER_ALIASES, string>> {
  const normalized = new Map(headers.map((header) => [normalizeHeader(header), header]))
  const map: Partial<Record<keyof typeof HEADER_ALIASES, string>> = {}
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<[
    keyof typeof HEADER_ALIASES,
    string[],
  ]>) {
    const found = aliases.find((alias) => normalized.has(alias))
    if (found) map[field] = normalized.get(found)
  }
  return map
}

function parseCsv(text: string): RawRow[] {
  const delimiter = (text.split(/\r?\n/)[0]?.match(/;/g)?.length ?? 0) >=
    (text.split(/\r?\n/)[0]?.match(/,/g)?.length ?? 0)
    ? ';'
    : ','
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

function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase()
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

