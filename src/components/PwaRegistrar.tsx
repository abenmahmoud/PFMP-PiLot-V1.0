import { useEffect } from 'react'

export function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
        console.warn('PWA service worker registration failed:', error)
      })
    })
  }, [])

  return null
}
