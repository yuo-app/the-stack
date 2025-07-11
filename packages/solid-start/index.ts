import type { CreateAuthOptions } from '../core'
import { createHandler } from '../core'

/**
 * Creates GET and POST handlers for SolidStart.
 *
 * @example
 * ```ts
 * // src/routes/api/auth/[...auth].ts
 * import { SolidAuth } from '@yuo-app/gau/solid-start'
 * import { authOptions } from '~/server/auth'
 *
 * export const { GET, POST } = SolidAuth(authOptions)
 * ```
 */
export function SolidAuth(options: CreateAuthOptions) {
  const handler = createHandler(options)
  const solidHandler = (event: any) => handler(event.request)
  return {
    GET: solidHandler,
    POST: solidHandler,
  }
}
