export interface StudentCodeCouponInput {
  first_name: string
  last_name: string
  class_name: string
  code_clear: string
}

export interface StudentCodeCouponEstablishment {
  name: string
}

const PORTAL_URL = 'https://www.pfmp-pilot.fr/eleve/login'

export async function renderStudentCodeCoupons(
  students: StudentCodeCouponInput[],
  establishment: StudentCodeCouponEstablishment,
): Promise<Uint8Array> {
  const [{ PDFDocument, StandardFonts, rgb }, QRCode] = await Promise.all([
    import('pdf-lib'),
    import('qrcode'),
  ])
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const mono = await pdf.embedFont(StandardFonts.CourierBold)
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 32
  const gap = 18
  const couponWidth = (pageWidth - margin * 2 - gap) / 2
  const couponHeight = (pageHeight - margin * 2 - gap) / 2
  const generatedAt = new Date().toLocaleDateString('fr-FR')

  for (let index = 0; index < students.length; index += 4) {
    const page = pdf.addPage([pageWidth, pageHeight])
    const chunk = students.slice(index, index + 4)

    for (let offset = 0; offset < chunk.length; offset += 1) {
      const student = chunk[offset]
      const col = offset % 2
      const row = Math.floor(offset / 2)
      const x = margin + col * (couponWidth + gap)
      const y = pageHeight - margin - couponHeight - row * (couponHeight + gap)

      drawDashedBorder(page, x, y, couponWidth, couponHeight, rgb(0.73, 0.78, 0.87))
      page.drawText(`Lycee ${establishment.name} - Acces portail eleve`, {
        x: x + 16,
        y: y + couponHeight - 28,
        size: 9,
        font,
        color: rgb(0.21, 0.28, 0.42),
      })
      page.drawText(`${student.last_name.toUpperCase()} ${student.first_name}`, {
        x: x + 16,
        y: y + couponHeight - 58,
        size: 16,
        font: bold,
        color: rgb(0.04, 0.07, 0.13),
      })
      page.drawText(student.class_name, {
        x: x + 16,
        y: y + couponHeight - 78,
        size: 11,
        font,
        color: rgb(0.27, 0.34, 0.47),
      })

      const codeBoxY = y + couponHeight - 145
      page.drawRectangle({
        x: x + 16,
        y: codeBoxY,
        width: couponWidth - 32,
        height: 48,
        borderWidth: 1,
        borderColor: rgb(0.15, 0.27, 0.61),
        color: rgb(0.94, 0.97, 1),
      })
      page.drawText(formatAccessCode(student.code_clear), {
        x: x + 26,
        y: codeBoxY + 15,
        size: 22,
        font: mono,
        color: rgb(0.08, 0.16, 0.43),
      })

      const qrDataUrl = await QRCode.toDataURL(PORTAL_URL, { margin: 1, width: 130 })
      const qrImage = await pdf.embedPng(dataUrlToBase64(qrDataUrl))
      page.drawImage(qrImage, { x: x + 16, y: y + 72, width: 78, height: 78 })
      page.drawText('Portail eleve', {
        x: x + 106,
        y: y + 132,
        size: 10,
        font: bold,
        color: rgb(0.04, 0.07, 0.13),
      })
      page.drawText(PORTAL_URL, {
        x: x + 106,
        y: y + 116,
        size: 8,
        font,
        color: rgb(0.15, 0.27, 0.61),
      })
      page.drawText('Saisissez le code ci-dessus.', {
        x: x + 106,
        y: y + 101,
        size: 8,
        font,
        color: rgb(0.35, 0.42, 0.55),
      })

      page.drawText('Personnel et confidentiel. A remettre en main propre.', {
        x: x + 16,
        y: y + 34,
        size: 8,
        font: bold,
        color: rgb(0.51, 0.23, 0.23),
      })
      page.drawText(`Date generation : ${generatedAt}`, {
        x: x + 16,
        y: y + 20,
        size: 7,
        font,
        color: rgb(0.39, 0.45, 0.55),
      })
    }
  }

  return pdf.save()
}

function formatAccessCode(value: string): string {
  return value.replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
}

function dataUrlToBase64(dataUrl: string): Uint8Array {
  const [, base64 = ''] = dataUrl.split(',')
  return Buffer.from(base64, 'base64')
}

function drawDashedBorder(
  page: unknown,
  x: number,
  y: number,
  width: number,
  height: number,
  color: unknown,
) {
  const pdfPage = page as { drawLine: (args: Record<string, unknown>) => void }
  const line = { thickness: 0.8, color, dashArray: [4, 4] }
  pdfPage.drawLine({ start: { x, y }, end: { x: x + width, y }, ...line })
  pdfPage.drawLine({ start: { x, y: y + height }, end: { x: x + width, y: y + height }, ...line })
  pdfPage.drawLine({ start: { x, y }, end: { x, y: y + height }, ...line })
  pdfPage.drawLine({ start: { x: x + width, y }, end: { x: x + width, y: y + height }, ...line })
}
