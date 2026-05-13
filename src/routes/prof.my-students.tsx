import { createFileRoute } from '@tanstack/react-router'
import { MyStudentsPage } from './my-students'

export const Route = createFileRoute('/prof/my-students')({
  component: MyStudentsPage,
})
