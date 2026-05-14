import { ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface RgpdConsentModalProps {
  onAccept: () => void
  onClose?: () => void
}

export function RgpdConsentModal({ onAccept, onClose }: RgpdConsentModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-xl rounded-xl border border-[var(--color-border)] bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text)]">Consentement RGPD et signature simple</h2>
              <p className="text-sm text-[var(--color-text-muted)]">Avant de signer, vous devez accepter le traitement des preuves de signature.</p>
            </div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-muted)]" aria-label="Fermer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="space-y-3 px-5 py-4 text-sm text-[var(--color-text-muted)]">
          <p>
            PFMP Pilot AI conserve le nom du signataire, l'adresse email, la date et l'heure de signature, l'adresse IP,
            le navigateur utilise et le hash cryptographique du document.
          </p>
          <p>
            Ces donnees servent uniquement a prouver la signature simple du document PFMP et a permettre l'archivage
            scolaire par l'etablissement. Elles ne sont pas revendues ni utilisees a des fins commerciales.
          </p>
          <p>
            Cette signature est une signature electronique simple. Elle ne constitue pas une signature qualifiee eIDAS.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
          {onClose && <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>}
          <Button type="button" onClick={onAccept}>J'accepte et je continue</Button>
        </div>
      </div>
    </div>
  )
}
