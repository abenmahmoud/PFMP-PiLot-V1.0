import type { DocumentSignatureRow, GeneratedDocumentRow } from '@/lib/database.types'

export interface SignatureProofBundle {
  generatedDocumentId: string
  documentHash: string
  finalizedAt: string
  signatures: Array<{
    signerName: string
    signerRole: string
    signerEmail: string | null
    signedAt: string | null
    method: string | null
    ip: string | null
    userAgent: string | null
  }>
}

export function buildSignatureProofBundle(
  document: GeneratedDocumentRow,
  signatures: DocumentSignatureRow[],
): SignatureProofBundle {
  const documentHash = document.sha256_hex ?? document.final_signed_sha256_hex ?? document.storage_path
  return {
    generatedDocumentId: document.id,
    documentHash,
    finalizedAt: new Date().toISOString(),
    signatures: signatures.map((signature) => ({
      signerName: signature.signer_name ?? signature.signer_email,
      signerRole: signature.signer_role,
      signerEmail: signature.signer_email,
      signedAt: signature.signed_at,
      method: signature.signature_method,
      ip: signature.signed_from_ip ?? signature.ip_address,
      userAgent: signature.signed_from_user_agent ?? signature.user_agent,
    })),
  }
}

export async function embedSignaturesInPdf(
  pdfBuffer: Uint8Array,
  signatures: DocumentSignatureRow[],
  verificationUrl: string,
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const { toDataURL } = await import('qrcode')
  const pdfDoc = await PDFDocument.load(pdfBuffer)
  let page = pdfDoc.addPage([595.28, 841.89])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const left = 48
  let y = 780

  page.drawText('Dossier de preuve - signatures electroniques simples', {
    x: left,
    y,
    size: 16,
    font: bold,
    color: rgb(0.08, 0.11, 0.18),
  })
  y -= 28
  page.drawText('PFMP Pilot AI - signature simple, non qualifiee eIDAS', {
    x: left,
    y,
    size: 10,
    font,
    color: rgb(0.39, 0.45, 0.55),
  })
  y -= 26
  page.drawText(`Verification publique : ${verificationUrl}`, {
    x: left,
    y,
    size: 9,
    font,
    color: rgb(0.12, 0.28, 0.55),
  })
  try {
    const qrDataUrl = await toDataURL(verificationUrl, { margin: 1, width: 116 })
    const qr = await pdfDoc.embedPng(qrDataUrl)
    page.drawImage(qr, { x: 430, y: 690, width: 96, height: 96 })
    page.drawText('Verifier', { x: 459, y: 676, size: 8, font, color: rgb(0.39, 0.45, 0.55) })
  } catch {
    page.drawText('QR verification indisponible.', { x: 430, y: 700, size: 8, font, color: rgb(0.65, 0.16, 0.16) })
  }
  y -= 32

  for (const signature of signatures) {
    page.drawText(signature.signer_name ?? signature.signer_email, {
      x: left,
      y,
      size: 12,
      font: bold,
      color: rgb(0.08, 0.11, 0.18),
    })
    y -= 16
    const details = [
      `Role: ${signature.signer_role}`,
      `Methode: ${signature.signature_method ?? 'click_to_sign'}`,
      `Date: ${signature.signed_at ?? 'non signee'}`,
      `IP: ${signature.signed_from_ip ?? signature.ip_address ?? 'non disponible'}`,
    ]
    for (const detail of details) {
      page.drawText(detail, { x: left + 12, y, size: 9, font, color: rgb(0.2, 0.25, 0.33) })
      y -= 13
    }
    if (signature.document_hash) {
      for (const line of wrap(`Hash document: ${signature.document_hash}`, 90)) {
        page.drawText(line, { x: left + 12, y, size: 8, font, color: rgb(0.39, 0.45, 0.55) })
        y -= 11
      }
    }
    if (signature.signature_data?.startsWith('data:image/png;base64,')) {
      try {
        const png = await pdfDoc.embedPng(signature.signature_data)
        const width = Math.min(130, png.width)
        const height = (png.height / png.width) * width
        page.drawImage(png, { x: 390, y: y + 45, width, height })
      } catch {
        page.drawText('Signature dessinee non integrable dans le PDF.', { x: 390, y: y + 45, size: 8, font, color: rgb(0.65, 0.16, 0.16) })
      }
    }
    y -= 22
    if (y < 120) {
      y = 780
      page = pdfDoc.addPage([595.28, 841.89])
    }
  }

  return pdfDoc.save()
}

function wrap(text: string, max: number): string[] {
  const lines: string[] = []
  for (let index = 0; index < text.length; index += max) {
    lines.push(text.slice(index, index + max))
  }
  return lines
}
