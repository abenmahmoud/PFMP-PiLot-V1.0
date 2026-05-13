import { useCallback, useEffect, useState } from 'react'

export type QueuedActionType =
  | 'visit.update'
  | 'visit.complete'
  | 'visit.add_evaluation'
  | 'visit.photo_upload'

export interface QueuedAction {
  id: string
  type: QueuedActionType
  payload: Record<string, unknown>
  createdAt: number
  retryCount: number
}

export interface OfflineSyncResult {
  succeeded: number
  failed: number
}

type SyncHandler = (action: QueuedAction) => Promise<void>

const DB_NAME = 'pfmp-pilot-offline'
const DB_VERSION = 1
const STORE_NAME = 'queued-actions'

export class OfflineQueue {
  async enqueue(action: Omit<QueuedAction, 'id' | 'createdAt' | 'retryCount'> & Partial<QueuedAction>): Promise<void> {
    const db = await openDb()
    const entry: QueuedAction = {
      id: action.id ?? crypto.randomUUID(),
      type: action.type,
      payload: action.payload,
      createdAt: action.createdAt ?? Date.now(),
      retryCount: action.retryCount ?? 0,
    }
    await requestToPromise(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(entry))
    db.close()
  }

  async getAll(): Promise<QueuedAction[]> {
    const db = await openDb()
    const rows = await requestToPromise<QueuedAction[]>(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll())
    db.close()
    return rows.sort((a, b) => a.createdAt - b.createdAt)
  }

  async remove(id: string): Promise<void> {
    const db = await openDb()
    await requestToPromise(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id))
    db.close()
  }

  async incrementRetry(action: QueuedAction): Promise<void> {
    await this.enqueue({ ...action, retryCount: action.retryCount + 1 })
  }

  async syncAll(handler?: SyncHandler): Promise<OfflineSyncResult> {
    const rows = await this.getAll()
    if (!handler) return { succeeded: 0, failed: rows.length }

    let succeeded = 0
    let failed = 0
    for (const action of rows) {
      try {
        await handler(action)
        await this.remove(action.id)
        succeeded += 1
      } catch {
        await this.incrementRetry(action)
        failed += 1
      }
    }
    return { succeeded, failed }
  }
}

export const offlineQueue = new OfflineQueue()

export function useOfflineSync(handler?: SyncHandler) {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<OfflineSyncResult | null>(null)

  const refreshCount = useCallback(async () => {
    const rows = await offlineQueue.getAll()
    setPendingCount(rows.length)
  }, [])

  const syncNow = useCallback(async () => {
    setSyncing(true)
    try {
      const result = await offlineQueue.syncAll(handler)
      setLastResult(result)
      await refreshCount()
      return result
    } finally {
      setSyncing(false)
    }
  }, [handler, refreshCount])

  useEffect(() => {
    refreshCount().catch(() => undefined)
    function handleOnline() {
      setIsOnline(true)
      syncNow().catch(() => undefined)
    }
    function handleOffline() {
      setIsOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [refreshCount, syncNow])

  return { isOnline, pendingCount, syncing, lastResult, syncNow, refreshCount }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
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
