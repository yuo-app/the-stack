import { drizzle } from 'drizzle-orm/libsql'
import { serverEnv } from '~/env/server'

export const remoteDb = drizzle({ connection: {
  url: serverEnv.TURSO_DB_URL,
  authToken: serverEnv.TURSO_AUTH_TOKEN,
} })
