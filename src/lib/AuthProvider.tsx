import { createContext, useContext, useEffect, useState } from 'react'
import {
  initialAuthState,
  buildAuthState,
  subscribeToAuthChanges,
  type AuthState,
} from './auth'

const AuthContext = createContext<AuthState>(initialAuthState)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialAuthState)

  useEffect(() => {
    let mounted = true
    buildAuthState().then((s) => {
      if (mounted) setState(s)
    })
    const unsubscribe = subscribeToAuthChanges((s) => {
      if (mounted) setState(s)
    })
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
