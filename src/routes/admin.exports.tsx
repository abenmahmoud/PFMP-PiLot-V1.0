import { createFileRoute } from '@tanstack/react-router'
import { ExportsPage } from './exports'

export const Route = createFileRoute('/admin/exports')({
  component: ExportsPage,
})
