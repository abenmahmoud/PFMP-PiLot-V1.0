import { createFileRoute } from '@tanstack/react-router'
import { DocumentsPage } from './documents'

export const Route = createFileRoute('/admin/documents')({
  component: DocumentsPage,
})
