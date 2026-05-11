import { useMemo, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { CheckCircle2, Copy, Download, ExternalLink, Link2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import type { EstablishmentRow } from '@/lib/database.types'
import { getTenantAccessInfo } from '@/lib/tenantAccess'
import { cn } from '@/lib/cn'

interface TenantAccessCardProps {
  establishment: Pick<EstablishmentRow, 'slug' | 'subdomain' | 'custom_domain' | 'domain_verified'>
  className?: string
}

export function TenantAccessCard({ establishment, className }: TenantAccessCardProps) {
  const access = useMemo(() => getTenantAccessInfo(establishment), [establishment])
  const qrRef = useRef<HTMLCanvasElement | null>(null)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  async function handleCopy() {
    setCopyError(null)
    try {
      await copyText(access.url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setCopyError('Copie impossible depuis ce navigateur. Selectionnez le lien manuellement.')
    }
  }

  function handleOpen() {
    window.open(access.url, '_blank', 'noopener,noreferrer')
  }

  function handleDownload() {
    const canvas = qrRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `pfmp-pilot-${access.slug}-qr.png`
    link.click()
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex-col sm:flex-row">
        <div>
          <CardTitle icon={<Link2 className="w-4 h-4" />}>Acces etablissement</CardTitle>
          <CardDescription className="mt-1">
            Lien officiel a partager avec l equipe du lycee.
          </CardDescription>
        </div>
        <Badge tone={access.kind === 'custom-domain' ? 'success' : 'brand'} dot>
          {access.label}
        </Badge>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_190px] gap-5 items-center">
          <div className="space-y-4 min-w-0">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                Lien principal
              </p>
              <p className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/50 px-3 py-2 text-sm font-medium text-[var(--color-text)] break-all select-all">
                {access.url}
              </p>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">{access.description}</p>
            </div>

            {access.kind === 'custom-domain' && access.platformUrl !== access.url && (
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                  Lien plateforme de secours
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)] break-all select-all">
                  {access.platformUrl}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant={copied ? 'subtle' : 'secondary'}
                iconLeft={copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                onClick={handleCopy}
              >
                {copied ? 'Lien copie' : 'Copier le lien'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                iconLeft={<ExternalLink className="w-4 h-4" />}
                onClick={handleOpen}
              >
                Ouvrir l espace
              </Button>
              <Button
                type="button"
                variant="ghost"
                iconLeft={<Download className="w-4 h-4" />}
                onClick={handleDownload}
              >
                Telecharger QR
              </Button>
            </div>

            {copyError && <p className="text-sm text-red-700">{copyError}</p>}
          </div>

          <div className="flex justify-center md:justify-end">
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-sm">
              <QRCodeCanvas
                ref={qrRef}
                value={access.url}
                size={160}
                level="M"
                marginSize={2}
                title={`QR code ${access.url}`}
              />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!ok) throw new Error('copy failed')
}
