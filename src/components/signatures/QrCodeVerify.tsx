import { QRCodeCanvas } from 'qrcode.react'

export function QrCodeVerify({ url, size = 96 }: { url: string; size?: number }) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-white p-2">
      <QRCodeCanvas value={url} size={size} level="M" marginSize={1} />
    </div>
  )
}
