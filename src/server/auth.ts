import type { CreateAuthOptions } from 'packages/core'
import { DrizzleAdapter } from 'packages/adapters/drizzle'
import { GitHub } from 'packages/oauth'
import { cloudflareAuth } from 'packages/runtimes/cloudflare'
import { Accounts, Users } from '~/db/schema/remote'
import { remoteDb } from '~/db/turso'
import { serverEnv } from '~/env/server'

export const authOptions = {
  adapter: DrizzleAdapter(remoteDb, Users, Accounts),
  providers: [
    GitHub({
      clientId: serverEnv.AUTH_GITHUB_ID,
      clientSecret: serverEnv.AUTH_GITHUB_SECRET,
      redirectUri: `${serverEnv.AUTH_URL}/api/auth/github/callback`,
    }),
  ],
  cookies: {
    secure: serverEnv.NODE_ENV === 'production',
  },
  jwt: {
    secret: serverEnv.AUTH_SECRET,
  },
  trustHosts: 'all',
} satisfies CreateAuthOptions

export const auth = cloudflareAuth(authOptions)
