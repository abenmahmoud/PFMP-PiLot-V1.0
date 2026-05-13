import { createFileRoute } from '@tanstack/react-router'
import { ImportSieclePage } from './imports.siecle'

export const Route = createFileRoute('/admin/imports/siecle')({
  component: ImportSieclePage,
})
