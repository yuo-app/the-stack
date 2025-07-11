import { DrizzleAdapter } from 'packages/adapters/drizzle'
import { createAuth } from 'packages/core'
import { GitHub } from 'packages/oauth'
import { Accounts, Users } from '~/db/schema/remote'
import { remoteDb } from '~/db/turso'
import { serverEnv } from '~/env/server'

export const authOptions = {
  adapter: DrizzleAdapter(remoteDb, Users, Accounts),
  providers: [
    GitHub({
      clientId: serverEnv.AUTH_GITHUB_ID,
      clientSecret: serverEnv.AUTH_GITHUB_SECRET,
    }),
  ],
  cookies: {
    secure: serverEnv.NODE_ENV === 'production',
  },
  jwt: {
    secret: serverEnv.AUTH_SECRET,
  },
}

export const auth = createAuth(authOptions)
