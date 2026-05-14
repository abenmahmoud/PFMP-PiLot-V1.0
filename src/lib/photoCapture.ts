import { getSupabase } from '@/lib/supabase'

export interface OfflinePhotoMetadata {
  id: string
  visitId: string
  blob: Blob
  lat: number | null
  lng: number | null
  takenAt: string
}

const PHOTO_DB = 'pfmp-pilot-photos'
const PHOTO_STORE = 'offline-photos'

export async function compressPhoto(file: File | Blob, maxSize = 1200, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas photo indisponible.')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Compression photo impossible.'))
    }, 'image/jpeg', quality)
  })
}

export async function uploadPhotoToSupabase(blob: Blob, visitId: string): Promise<string> {
  const sb = getSupabase()
  const path = `${visitId}/${crypto.randomUUID()}.jpg`
  const { error } = await sb.storage.from('visit-photos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw new Error(`Upload photo impossible: ${error.message}`)
  const { data } = await sb.storage.from('visit-photos').createSignedUrl(path, 60 * 60)
  if (!data?.signedUrl) throw new Error('URL signee photo indisponible.')
  return data.signedUrl
}

export async function storePhotoOffline(input: Omit<OfflinePhotoMetadata, 'id' | 'takenAt'> & Partial<OfflinePhotoMetadata>): Promise<string> {
  const db = await openPhotoDb()
  const id = input.id ?? crypto.randomUUID()
  const row: OfflinePhotoMetadata = {
    id,
    visitId: input.visitId,
    blob: input.blob,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    takenAt: input.takenAt ?? new Date().toISOString(),
  }
  await requestToPromise(db.transaction(PHOTO_STORE, 'readwrite').objectStore(PHOTO_STORE).put(row))
  db.close()
  return id
}

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PHOTO_DB, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE, { keyPath: 'id' })
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

function requestToPromise<T = unknown>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}
