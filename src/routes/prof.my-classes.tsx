import { createFileRoute } from '@tanstack/react-router'
import { isDemoMode } from '@/lib/supabase'
import { ClassesDemo, ClassesSupabase } from './classes'

export const Route = createFileRoute('/prof/my-classes')({
  component: ProfMyClassesPage,
})

function ProfMyClassesPage() {
  if (isDemoMode()) return <ClassesDemo />
  return <ClassesSupabase />
}
