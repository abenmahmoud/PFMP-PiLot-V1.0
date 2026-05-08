import { createContext, useContext, useEffect, useState } from 'react'
import {
  initialAuthState,
  buildAuthState,
  subscribeToAuthChanges,
  type AuthState,
} from './auth'

const AuthContext = createContext<AuthState>(initialAuthState)
const AUTH_PROVIDER_TIMEOUT_MS = 10000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialAuthState)

  useEffect(() => {
    let mounted = true
    const timeout = window.setTimeout(() => {
      if (!mounted) return
      setState({
        ...initialAuthState,
        loading: false,
        error: 'Resolution de session Supabase trop longue.',
      })
    }, AUTH_PROVIDER_TIMEOUT_MS)

    buildAuthState().then((s) => {
      if (mounted) {
        window.clearTimeout(timeout)
        setState(s)
      }
    })
    const unsubscribe = subscribeToAuthChanges((s) => {
      if (mounted) {
        window.clearTimeout(timeout)
        setState(s)
      }
    })
    return () => {
      mounted = false
      window.clearTimeout(timeout)
      unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
