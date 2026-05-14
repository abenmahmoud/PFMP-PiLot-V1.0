import { Camera, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { compressPhoto, storePhotoOffline, uploadPhotoToSupabase } from '@/lib/photoCapture'
import type { VisitPhoto } from '@/lib/database.types'

export function PhotoCapture({
  visitId,
  disabled,
  onPhoto,
  onError,
}: {
  visitId: string
  disabled?: boolean
  onPhoto: (photo: VisitPhoto) => void
  onError: (message: string) => void
}) {
  async function handleFile(file: File | null) {
    if (!file) return
    try {
      const blob = await compressPhoto(file)
      const takenAt = new Date().toISOString()
      if (navigator.onLine) {
        const url = await uploadPhotoToSupabase(blob, visitId)
        onPhoto({ url, lat: null, lng: null, taken_at: takenAt })
      } else {
        const offlineId = await storePhotoOffline({ visitId, blob, lat: null, lng: null, takenAt })
        onPhoto({ url: null, offline_id: offlineId, lat: null, lng: null, taken_at: takenAt })
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <label className="inline-flex">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
      />
      <span>
        <Button type="button" size="sm" variant="secondary" iconLeft={<Camera className="w-4 h-4" />} disabled={disabled} tabIndex={-1}>
          <ImagePlus className="w-3.5 h-3.5" />
          Photo
        </Button>
      </span>
    </label>
  )
}
