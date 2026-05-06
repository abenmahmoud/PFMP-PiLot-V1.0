import { getRouteApi } from '@tanstack/react-router'

const rootRoute = getRouteApi('__root__')

/**
 * Hook React: retrieves the tenant resolved server-side.
 * Available from any component under the root route.
 */
export function useTenant() {
  return rootRoute.useRouteContext({ select: (c) => c.tenant })
}
