declare const process: {
  env: Record<string, string | undefined>
}

export interface SignatureEmailInput {
  to: string
  signerName: string
  magicLink: string
  docName: string
  role: string
}

export async function sendSignatureRequestEmail(input: SignatureEmailInput): Promise<{ sent: boolean; provider: string }> {
  const apiToken = process.env.MAILTRAP_API_TOKEN
  const from = process.env.MAILTRAP_FROM_EMAIL ?? 'noreply@pfmp-pilot.fr'
  if (!apiToken) {
    console.info('[signature-email]', input.to, input.magicLink)
    return { sent: false, provider: 'console' }
  }

  const response = await fetch('https://send.api.mailtrap.io/api/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: { email: from, name: 'PFMP Pilot AI' },
      to: [{ email: input.to, name: input.signerName }],
      subject: `Signature demandee - ${input.docName}`,
      html: buildSignatureEmailHtml(input),
      text: `Bonjour ${input.signerName}, signez le document ${input.docName}: ${input.magicLink}`,
    }),
  })
  if (!response.ok) throw new Error(`Mailtrap signature email failed: ${response.status}`)
  return { sent: true, provider: 'mailtrap' }
}

export function buildSignatureEmailHtml(input: SignatureEmailInput): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#0f172a">
    <h1 style="font-size:22px">PFMP Pilot AI</h1>
    <p>Bonjour ${escapeHtml(input.signerName)},</p>
    <p>Vous etes invite(e) a signer le document <strong>${escapeHtml(input.docName)}</strong> en tant que ${escapeHtml(input.role)}.</p>
    <p><a href="${input.magicLink}" style="display:inline-block;background:#1e3a8a;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Signer le document</a></p>
    <p style="font-size:12px;color:#64748b">Ce lien est personnel et expire automatiquement. PFMP Pilot AI conserve les preuves de signature pour l'etablissement dans le respect du RGPD.</p>
  </div>`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char)
}
