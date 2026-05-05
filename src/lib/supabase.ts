/**
 * Supabase client placeholder.
 *
 * The application is designed to use Supabase for auth, database and storage,
 * with Row Level Security enforcing multi-tenant isolation by `establishment_id`.
 *
 * This file currently exposes a typed stub so the rest of the code can import
 * a stable shape. Wire up `@supabase/supabase-js` here once env vars are set:
 *
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 *   import { createClient } from '@supabase/supabase-js'
 *   export const supabase = createClient(
 *     import.meta.env.VITE_SUPABASE_URL,
 *     import.meta.env.VITE_SUPABASE_ANON_KEY,
 *   )
 */

export const supabase = {
  isMock: true as const,
  auth: {
    async signInWithPassword(_args: { email: string; password: string }) {
      return { data: null, error: null }
    },
    async signOut() {
      return { error: null }
    },
  },
}

export type SupabaseStub = typeof supabase
