import type { CreateAuthOptions } from '../core'
import { createAuth, createHandler } from '../core'

type AuthInstance = ReturnType<typeof createAuth>

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
export function SolidAuth(optionsOrAuth: CreateAuthOptions | AuthInstance) {
  // TODO: Duck-type to check if we have an instance or raw options
  const isInstance = 'providerMap' in optionsOrAuth && 'signJWT' in optionsOrAuth

  const auth = isInstance
    ? (optionsOrAuth as AuthInstance)
    : createAuth(optionsOrAuth as CreateAuthOptions)

  const handler = createHandler(auth)
  const solidHandler = (event: any) => handler(event.request)
  return {
    GET: solidHandler,
    POST: solidHandler,
  }
}
