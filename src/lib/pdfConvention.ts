import type {
  ClassRow,
  CompanyRow,
  DocumentTemplateRow,
  EstablishmentRow,
  PfmpPeriodRow,
  PlacementRow,
  ProfileRow,
  StudentRow,
  TutorRow,
} from '@/lib/database.types'
import { computeDocumentHash } from '@/lib/signatureCrypto'

export interface ConventionRenderData {
  establishment: EstablishmentRow
  student: StudentRow
  class: ClassRow | null
  period: PfmpPeriodRow
  placement: PlacementRow
  company: CompanyRow
  tutor: TutorRow
  ddfpt: ProfileRow | null
}

export async function renderConventionPdf(input: {
  template: DocumentTemplateRow
  data: ConventionRenderData
}): Promise<{ pdfBytes: Uint8Array; sha256Hex: string }> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const pageSize: [number, number] = [595.28, 841.89]
  const margin = 48
  let page = pdf.addPage(pageSize)
  let y = pageSize[1] - margin

  const drawText = (text: string, size = 10, isBold = false, indent = 0) => {
    const font = isBold ? bold : regular
    const maxWidth = pageSize[0] - margin * 2 - indent
    for (const line of wrapText(text, font, size, maxWidth)) {
      if (y < margin + 36) {
        page = pdf.addPage(pageSize)
        y = pageSize[1] - margin
      }
      page.drawText(line, {
        x: margin + indent,
        y,
        size,
        font,
        color: rgb(0.08, 0.1, 0.16),
      })
      y -= size + 5
    }
  }

  drawText('Convention de PFMP', 18, true)
  drawText(input.template.name, 11)
  y -= 10

  const markdown = interpolateTemplate(input.template.body_markdown || input.template.body_html || defaultTemplate(), input.data)
  for (const rawLine of markdownToLines(markdown)) {
    const line = rawLine.trim()
    if (!line) {
      y -= 7
      continue
    }
    if (line.startsWith('## ')) {
      y -= 4
      drawText(line.slice(3), 13, true)
      continue
    }
    if (line.startsWith('# ')) {
      y -= 6
      drawText(line.slice(2), 15, true)
      continue
    }
    if (line.startsWith('- ')) {
      drawText(`• ${stripMarkdown(line.slice(2))}`, 10, false, 12)
      continue
    }
    drawText(stripMarkdown(line), 10)
  }

  y -= 12
  drawText('Signatures', 14, true)
  drawSignatureBox('Tuteur entreprise', `${input.data.tutor.first_name} ${input.data.tutor.last_name}`.trim())
  drawSignatureBox('Responsable legal', parentName(input.data.student))
  drawSignatureBox('DDFPT / Etablissement', profileName(input.data.ddfpt))

  const bytes = await pdf.save()
  return {
    pdfBytes: bytes,
    sha256Hex: computeDocumentHash(bytes),
  }

  function drawSignatureBox(title: string, signer: string) {
    if (y < margin + 86) {
      page = pdf.addPage(pageSize)
      y = pageSize[1] - margin
    }
    const x = margin
    const width = pageSize[0] - margin * 2
    const height = 58
    page.drawRectangle({
      x,
      y: y - height,
      width,
      height,
      borderColor: rgb(0.75, 0.78, 0.85),
      borderWidth: 1,
      color: rgb(0.98, 0.99, 1),
    })
    page.drawText(title, { x: x + 12, y: y - 18, size: 10, font: bold, color: rgb(0.1, 0.13, 0.2) })
    page.drawText(`Signataire : ${signer || 'A renseigner'}`, { x: x + 12, y: y - 34, size: 9, font: regular, color: rgb(0.25, 0.28, 0.35) })
    page.drawText('Signe le ___ / ___ / ______', { x: x + 12, y: y - 49, size: 9, font: regular, color: rgb(0.25, 0.28, 0.35) })
    y -= height + 10
  }
}

export function interpolateTemplate(template: string, data: ConventionRenderData): string {
  const values: Record<string, string> = {
    'student.first_name': data.student.first_name,
    'student.last_name': data.student.last_name,
    'student.full_name': `${data.student.first_name} ${data.student.last_name}`.trim(),
    'student.birth_date': formatDate(data.student.birth_date),
    'student.parent_name': parentName(data.student),
    'student.parent_email': data.student.parent_email ?? '',
    'class.name': data.class?.name ?? '',
    'class.formation': data.class?.formation ?? data.student.formation ?? '',
    'period.label': `${data.period.name} (${formatDate(data.period.start_date)} - ${formatDate(data.period.end_date)})`,
    'period.name': data.period.name,
    'period.start_date': formatDate(data.period.start_date),
    'period.end_date': formatDate(data.period.end_date),
    'placement.start_date': formatDate(data.placement.start_date),
    'placement.end_date': formatDate(data.placement.end_date),
    'company.name': data.company.name,
    'company.address': data.company.address ?? '',
    'company.postal_code': data.company.zip_code ?? '',
    'company.zip_code': data.company.zip_code ?? '',
    'company.city': data.company.city ?? '',
    'company.full_address': companyAddress(data.company),
    'company.siret': data.company.siret ?? '',
    'company.phone': data.company.phone ?? '',
    'company.email': data.company.email ?? '',
    'tutor.first_name': data.tutor.first_name,
    'tutor.last_name': data.tutor.last_name,
    'tutor.full_name': `${data.tutor.first_name} ${data.tutor.last_name}`.trim(),
    'tutor.function': data.tutor.function ?? '',
    'tutor.email': data.tutor.email ?? '',
    'tutor.phone': data.tutor.phone ?? '',
    'establishment.name': data.establishment.name,
    'establishment.city': data.establishment.city ?? '',
    'ddfpt.full_name': profileName(data.ddfpt),
    'ddfpt.email': data.ddfpt?.email ?? '',
  }
  return stripHtml(template).replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => values[key] ?? '')
}

function defaultTemplate(): string {
  return `# Convention de periode de formation en milieu professionnel

## Eleve
{{student.full_name}} - Classe {{class.name}}

## Periode
{{period.label}}

## Entreprise d'accueil
{{company.name}}
{{company.full_address}}
SIRET : {{company.siret}}

## Tuteur entreprise
{{tutor.full_name}} - {{tutor.function}}
{{tutor.email}} {{tutor.phone}}

## Etablissement
{{establishment.name}} - {{ddfpt.full_name}}

La presente convention fixe les conditions d'accueil de l'eleve en PFMP. Les parties s'engagent a respecter les objectifs pedagogiques, les regles de securite et le suivi prevu par l'etablissement.`
}

function markdownToLines(markdown: string): string[] {
  return markdown.replace(/\r\n/g, '\n').split('\n')
}

function stripMarkdown(value: string): string {
  return value.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1').replace(/`/g, '')
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<h1>/gi, '# ')
    .replace(/<\/h1>/gi, '\n')
    .replace(/<h2>/gi, '## ')
    .replace(/<\/h2>/gi, '\n')
    .replace(/<[^>]+>/g, '')
}

function wrapText(text: string, font: { widthOfTextAtSize: (value: string, size: number) => number }, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next
      continue
    }
    if (line) lines.push(line)
    line = word
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString('fr-FR')
}

function companyAddress(company: CompanyRow): string {
  return [company.address, company.zip_code, company.city].filter(Boolean).join(', ')
}

function parentName(student: StudentRow): string {
  return [student.parent_first_name, student.parent_last_name].filter(Boolean).join(' ')
}

function profileName(profile: ProfileRow | null): string {
  if (!profile) return ''
  return `${profile.first_name} ${profile.last_name}`.trim()
}
