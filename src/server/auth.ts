import type { SolidAuthConfig } from '@solid-mediakit/auth'
import GitHub from '@auth/core/providers/github'
import { serverEnv } from '~/env/server'

declare module '@auth/core/types' {
  export type AuthUser = DefaultSession['user']

  export interface Session {
    user?: AuthUser
  }
}

export const authOptions: SolidAuthConfig = {
  providers: [
    GitHub({
      clientId: serverEnv.AUTH_GITHUB_ID,
      clientSecret: serverEnv.AUTH_GITHUB_SECRET,
    }),
  ],
  basePath: '/api/auth',
  trustHost: true,
  secret: serverEnv.AUTH_SECRET,
}
