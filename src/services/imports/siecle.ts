export interface SiecleRawRow {
  [key: string]: string
}

export interface SiecleStudent {
  firstName: string
  lastName: string
  email: string | null
  formation: string | null
  divisionName: string
}

export interface SiecleClass {
  name: string
  level: string
  formation: string
}

export interface SiecleParseResult {
  classes: SiecleClass[]
  students: SiecleStudent[]
  rawHeaders: string[]
  preview: SiecleRawRow[]
  errors: string[]
}

type CanonicalField = 'lastName' | 'firstName' | 'divisionName' | 'formationCode' | 'formationLabel' | 'email'

const HEADER_ALIASES: Record<CanonicalField, string[]> = {
  lastName: ['NOMELEVE', 'NOM', 'NOMFAMILLE', 'NOMUSUEL', 'NOMDELELEVE'],
  firstName: ['PRENOM', 'PRENOMELEVE', 'PRENOMS', 'PRENOMDELELEVE'],
  divisionName: ['DIVISION', 'CLASSE', 'CODEDIVISION', 'LIBELLEDIVISION'],
  formationCode: ['CODEMEF', 'MEF', 'CODEFORMATION'],
  formationLabel: ['LIBELLEMEF', 'LIBELLE', 'FORMATION', 'LIBELLEFORMATION'],
  email: ['EMAIL', 'EMAILELEVE', 'MAIL', 'COURRIEL', 'COURRIELELEVE'],
}

export async function parseSiecleFile(file: File): Promise<SiecleParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (extension === 'xlsx' || extension === 'xls') {
    return parseWorkbook(await file.arrayBuffer())
  }
  return parseCsvBuffer(await file.arrayBuffer())
}

async function parseWorkbook(buffer: ArrayBuffer): Promise<SiecleParseResult> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return emptyResult(['Le fichier XLS/XLSX ne contient aucune feuille.'])

  const worksheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  })
  const rawRows = rows.map((row) => {
    const normalized: SiecleRawRow = {}
    for (const [key, value] of Object.entries(row)) {
      normalized[String(key).trim()] = normalizeCell(value)
    }
    return normalized
  })
  return rowsToParseResult(rawRows)
}

function parseCsvBuffer(buffer: ArrayBuffer): SiecleParseResult {
  const text = decodeText(buffer).replace(/^\uFEFF/, '')
  const delimiter = detectDelimiter(text)
  const rows = parseCsv(text, delimiter)
  if (rows.length === 0) return emptyResult(['Le fichier CSV est vide.'])

  const rawHeaders = rows[0].map((header) => header.trim().replace(/^\uFEFF/, ''))
  const rawRows = rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => {
      const raw: SiecleRawRow = {}
      rawHeaders.forEach((header, index) => {
        raw[header] = row[index]?.trim() ?? ''
      })
      return raw
    })

  return rowsToParseResult(rawRows, rawHeaders)
}

function rowsToParseResult(rawRows: SiecleRawRow[], providedHeaders?: string[]): SiecleParseResult {
  const rawHeaders = providedHeaders ?? inferHeaders(rawRows)
  const errors: string[] = []
  const headerMap = buildHeaderMap(rawHeaders)

  for (const required of ['lastName', 'firstName', 'divisionName'] as CanonicalField[]) {
    if (!headerMap[required]) {
      errors.push(`Colonne obligatoire non detectee: ${required}.`)
    }
  }

  const students: SiecleStudent[] = []
  const classesByName = new Map<string, SiecleClass>()
  const seenStudents = new Set<string>()

  rawRows.forEach((row, index) => {
    const lastName = readField(row, headerMap.lastName)
    const firstName = readField(row, headerMap.firstName)
    const divisionName = readField(row, headerMap.divisionName)
    const formationLabel = readField(row, headerMap.formationLabel)
    const formationCode = readField(row, headerMap.formationCode)
    const email = normalizeEmail(readField(row, headerMap.email))
    const formation = formationLabel || formationCode || 'Formation non renseignee'

    if (!lastName || !firstName || !divisionName) {
      errors.push(`Ligne ${index + 2}: nom, prenom ou division manquant.`)
      return
    }

    const dedupeKey = normalizeKey([lastName, firstName, divisionName].join('|'))
    if (seenStudents.has(dedupeKey)) {
      errors.push(`Ligne ${index + 2}: doublon ignore pour ${firstName} ${lastName} (${divisionName}).`)
      return
    }
    seenStudents.add(dedupeKey)

    const cleanDivision = divisionName.trim()
    if (!classesByName.has(normalizeKey(cleanDivision))) {
      classesByName.set(normalizeKey(cleanDivision), {
        name: cleanDivision,
        level: extractLevel(cleanDivision),
        formation,
      })
    }

    students.push({
      firstName: titleCase(firstName),
      lastName: lastName.trim().toUpperCase(),
      email,
      formation,
      divisionName: cleanDivision,
    })
  })

  return {
    classes: [...classesByName.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    students,
    rawHeaders,
    preview: rawRows.slice(0, 10),
    errors,
  }
}

function buildHeaderMap(headers: string[]): Partial<Record<CanonicalField, string>> {
  const normalizedHeaders = new Map(headers.map((header) => [normalizeHeader(header), header]))
  const map: Partial<Record<CanonicalField, string>> = {}

  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<[CanonicalField, string[]]>) {
    const found = aliases.find((alias) => normalizedHeaders.has(alias))
    if (found) map[field] = normalizedHeaders.get(found)
  }
  return map
}

function readField(row: SiecleRawRow, header: string | undefined): string {
  return header ? (row[header] ?? '').trim() : ''
}

function decodeText(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('iso-8859-1').decode(buffer)
  }
}

function detectDelimiter(text: string): ';' | ',' {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? ''
  const semicolons = countCharOutsideQuotes(firstLine, ';')
  const commas = countCharOutsideQuotes(firstLine, ',')
  return semicolons >= commas ? ';' : ','
}

function parseCsv(text: string, delimiter: ';' | ','): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      row.push(cell)
      cell = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += char
  }

  row.push(cell)
  if (row.some((value) => value.length > 0)) rows.push(row)
  return rows
}

function countCharOutsideQuotes(value: string, searched: ';' | ','): number {
  let count = 0
  let inQuotes = false
  for (const char of value) {
    if (char === '"') inQuotes = !inQuotes
    if (!inQuotes && char === searched) count += 1
  }
  return count
}

function inferHeaders(rows: SiecleRawRow[]): string[] {
  const headers = new Set<string>()
  rows.forEach((row) => Object.keys(row).forEach((key) => headers.add(key)))
  return [...headers]
}

function normalizeHeader(value: string): string {
  return stripAccents(value).toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function normalizeKey(value: string): string {
  return stripAccents(value).toLowerCase().replace(/\s+/g, ' ').trim()
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase()
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function titleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/(^|[-' ])\p{L}/gu, (match) => match.toUpperCase())
}

function extractLevel(divisionName: string): string {
  const normalized = divisionName.trim().toUpperCase()
  if (/^CAP\s*1|^CAP1/.test(normalized)) return 'CAP 1'
  if (/^CAP\s*2|^CAP2/.test(normalized)) return 'CAP 2'
  const match = normalized.match(/^([123])\s*/)
  return match?.[1] ?? 'N/C'
}

function emptyResult(errors: string[]): SiecleParseResult {
  return {
    classes: [],
    students: [],
    rawHeaders: [],
    preview: [],
    errors,
  }
}
